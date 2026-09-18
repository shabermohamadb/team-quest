import React, { useState, useEffect, useCallback, useRef } from 'react';
import socket, { getApiUrl, isMissingBackendConfig } from './utils/socket';
import Navbar from './components/Navbar';
import LoginLobbyView from './views/LoginLobbyView';
import PlayerView from './views/PlayerView';
import AdminView from './views/AdminView';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import GameErrorBoundary from './components/GameErrorBoundary';
import { GAME_STATES } from './utils/constants';

function getInitialView() {
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.startsWith('/admin') || hash.startsWith('#admin')) return 'admin';
  return 'player';
}

export default function App() {
  const [activeView, setActiveView] = useState(getInitialView);
  const [connectionStatus, setConnectionStatus] = useState(
    socket.connected ? 'CONNECTED' : 'CONNECTING'
  );
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false);
  const disconnectTimerRef = useRef(null);

  const [gameState, setGameState] = useState(null);
  const [playerTeam, setPlayerTeam] = useState(null);

  const [feedback, setFeedback] = useState(null);

  // Sync route changes
  const switchView = useCallback((newView) => {
    setActiveView(newView);
    if (newView === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/game');
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initial REST fetch to guarantee instant teamCount & state on page load
  useEffect(() => {
    fetch(getApiUrl('/api/game-state'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data === 'object') {
          setGameState((prev) => prev || data);
        }
      })
      .catch(() => {});
  }, []);

  // Socket connection & state updates
  useEffect(() => {
    const onConnect = () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      setShowDisconnectBanner(false);
      setConnectionStatus('CONNECTED');
      setReconnectAttempt(0);

      // Immediately request active game state from server to sync teamCount and teamsStatus
      socket.emit('get_game_state', {}, (res) => {
        if (res && typeof res === 'object') {
          setGameState(res);
        }
      });

      // If player was previously connected, attempt auto-reconnect with sessionToken & gameSessionId
      const saved = localStorage.getItem('team_quest_session');
      if (saved) {
        try {
          const { team, sessionToken, gameSessionId } = JSON.parse(saved);
          if (team && sessionToken && gameSessionId) {
            socket.emit(
              'player_reconnect',
              { team: Number(team), sessionToken, gameSessionId },
              (res) => {
                if (res?.success) {
                  setPlayerTeam(Number(team));
                  if (res.gameState) {
                    setGameState(res.gameState);
                  }
                } else {
                  // Stale or expired session
                  localStorage.removeItem('team_quest_session');
                  setPlayerTeam(null);
                }
              }
            );
          } else {
            localStorage.removeItem('team_quest_session');
            setPlayerTeam(null);
          }
        } catch (e) {
          localStorage.removeItem('team_quest_session');
          setPlayerTeam(null);
        }
      }
    };

    const onDisconnect = () => {
      setConnectionStatus('DISCONNECTED');
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      // Section 10: Grace period before showing reconnect banner to avoid flashes
      disconnectTimerRef.current = setTimeout(() => {
        setShowDisconnectBanner(true);
        setConnectionStatus('RECONNECTING');
      }, 1200);
    };

    const onReconnectAttempt = (attempt) => {
      setReconnectAttempt(attempt);
      setConnectionStatus('RECONNECTING');
      setShowDisconnectBanner(true);
    };

    const onReconnectFailed = () => {
      setConnectionStatus('ERROR');
      setShowDisconnectBanner(true);
    };

    const onConnectError = (err) => {
      console.warn('[Socket] Connection error:', err?.message);
    };

    const onSupersededSession = () => {
      localStorage.removeItem('team_quest_session');
      setPlayerTeam(null);
    };

    const onGameStateUpdate = (data) => {
      setGameState(data);
      if (data?.gameSessionId) {
        try {
          const saved = localStorage.getItem('team_quest_session');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.gameSessionId && parsed.gameSessionId !== data.gameSessionId) {
              // Current server gameSessionId changed (e.g. Admin reset or new match)
              localStorage.removeItem('team_quest_session');
              setPlayerTeam(null);
            }
          }
        } catch (e) {}
      }
    };

    const onGameSessionReset = () => {
      localStorage.removeItem('team_quest_session');
      setPlayerTeam(null);
    };

    const onTimerTick = (data) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeRemaining: data.timeRemaining,
          clueStartedAt: data.clueStartedAt,
          clueDuration: data.clueDuration,
          isTimerRunning: data.isTimerRunning,
          isPaused: data.isPaused,
          serverTime: data.serverTime
        };
      });
    };

    const onStartCountdownTick = (data) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          startCountdownRemaining: data.secondsRemaining
        };
      });
    };

    const onResumeCountdownTick = (data) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          resumeCountdownRemaining: data.secondsRemaining
        };
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('superseded_session', onSupersededSession);
    if (socket.io) {
      socket.io.on('reconnect_attempt', onReconnectAttempt);
      socket.io.on('reconnect_failed', onReconnectFailed);
    }
    socket.on('game_state_update', onGameStateUpdate);
    socket.on('game_session_reset', onGameSessionReset);
    socket.on('timer_tick', onTimerTick);
    socket.on('start_countdown_tick', onStartCountdownTick);
    socket.on('resume_countdown_tick', onResumeCountdownTick);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('superseded_session', onSupersededSession);
      if (socket.io) {
        socket.io.off('reconnect_attempt', onReconnectAttempt);
        socket.io.off('reconnect_failed', onReconnectFailed);
      }
      socket.off('game_state_update', onGameStateUpdate);
      socket.off('game_session_reset', onGameSessionReset);
      socket.off('timer_tick', onTimerTick);
      socket.off('start_countdown_tick', onStartCountdownTick);
      socket.off('resume_countdown_tick', onResumeCountdownTick);
    };
  }, []);

  // Application Heartbeat (Every 15s when connected)
  useEffect(() => {
    if (connectionStatus !== 'CONNECTED') return;

    const pingInterval = setInterval(() => {
      socket.emit('app_ping', { timestamp: Date.now() });
    }, 15000);

    return () => clearInterval(pingInterval);
  }, [connectionStatus]);

  // Player Join Handler (Fresh user click on [ JOIN GAME ])
  const handleJoinTeam = ({ team }, callback) => {
    socket.emit('player_join', { team: Number(team) }, (res) => {
      if (res?.success) {
        setPlayerTeam(Number(team));
        try {
          localStorage.setItem(
            'team_quest_session',
            JSON.stringify({
              team: Number(team),
              sessionToken: res.sessionToken,
              gameSessionId: res.gameSessionId
            })
          );
        } catch (e) {}
      }
      if (typeof callback === 'function') callback(res);
    });
  };

  // Player Submissions Handlers
  const handleSubmitRound1 = (payload, callback) => {
    const answer = typeof payload === 'string'
      ? payload
      : (payload?.answer ?? payload?.text ?? payload?.value ?? payload?.input ?? '');
    const questionId = typeof payload === 'object'
      ? (payload?.questionId ?? gameState?.currentChallenge?.id)
      : gameState?.currentChallenge?.id;
    const clueIndex = typeof payload === 'object'
      ? (payload?.clueIndex ?? ((gameState?.currentChallenge?.activeClueNumber || 1) - 1))
      : ((gameState?.currentChallenge?.activeClueNumber || 1) - 1);

    socket.emit('player_submit_r1', {
      answer,
      questionId,
      clueIndex,
      teamId: playerTeam
    }, (res) => {
      if (res?.success) {
        setFeedback({
          isCorrect: res.isCorrect,
          points: res.points,
          cooldownSeconds: res.cooldownSeconds
        });
      } else {
        setFeedback({
          isCorrect: false,
          error: res?.error || 'Submission failed'
        });
      }
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleSubmitRound2 = (payload, callback) => {
    const optionId = typeof payload === 'string'
      ? payload
      : (payload?.optionId ?? payload?.optionKey ?? payload?.option ?? '');
    const questionId = typeof payload === 'object'
      ? (payload?.questionId ?? gameState?.currentChallenge?.id)
      : gameState?.currentChallenge?.id;

    socket.emit('player_submit_r2', {
      optionId,
      optionKey: optionId,
      questionId,
      teamId: playerTeam
    }, (res) => {
      if (res?.success) {
        setFeedback({
          isCorrect: res.isCorrect,
          points: res.points,
          cooldownSeconds: res.cooldownSeconds
        });
      } else {
        setFeedback({
          isCorrect: false,
          error: res?.error || 'Submission failed'
        });
      }
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleSubmitRound3 = (payload, callback) => {
    const code = typeof payload === 'object'
      ? (payload?.code ?? payload?.answer ?? payload?.text ?? payload?.value ?? payload?.clickedValue)
      : payload;
    const challengeId = typeof payload === 'object'
      ? (payload?.challengeId ?? payload?.questionId ?? gameState?.currentChallenge?.id)
      : gameState?.currentChallenge?.id;

    socket.emit('player_submit_r3', {
      code,
      challengeId,
      teamId: playerTeam
    }, (res) => {
      if (res?.success) {
        setFeedback({
          isCorrect: res.isCorrect,
          points: res.points,
          cooldownSeconds: res.cooldownSeconds
        });
      } else {
        setFeedback({
          isCorrect: false,
          error: res?.error || 'Submission failed'
        });
      }
      if (typeof callback === 'function') callback(res);
    });
  };

  // Determine what player screen displays:
  // 1. If not joined or game in LOBBY: show LoginLobbyView
  // 2. If joined AND game started: show PlayerView
  const isGameActive = gameState?.state && gameState.state !== GAME_STATES.LOBBY;
  const showActivePlayerView = Boolean(playerTeam && isGameActive);

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navigation Bar for Player & Lobby */}
      {activeView !== 'admin' && (
        <Navbar
          playerTeam={playerTeam}
          isConnected={connectionStatus === 'CONNECTED'}
        />
      )}

      {/* Missing Backend Advisory (Vercel deployment without backend URL configured) */}
      {isMissingBackendConfig && (
        <div className="bg-amber-950/90 border-b border-amber-600 text-amber-200 text-xs font-mono text-center py-2.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
          <span className="font-bold">⚠️ Vercel Realtime Setup:</span>
          <span>Set <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">VITE_REALTIME_URL=https://your-backend-url</code> in Vercel Environment Variables.</span>
        </div>
      )}

      {/* Reconnection Status Banner with Grace Period */}
      {showDisconnectBanner && connectionStatus === 'RECONNECTING' && (
        <div className="bg-amber-950/85 border-b border-amber-700 text-amber-300 text-xs font-mono text-center py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>RECONNECTING TO GAME SERVER{reconnectAttempt > 0 ? ` (ATTEMPT ${reconnectAttempt})...` : '...'}</span>
        </div>
      )}

      {/* Connection Error Banner with Manual Retry */}
      {connectionStatus === 'ERROR' && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 text-xs font-mono text-center py-2 px-4 flex items-center justify-center gap-3 sticky top-0 z-50">
          <span>✕ UNABLE TO REACH GAME SERVER.</span>
          <button
            onClick={() => {
              setConnectionStatus('RECONNECTING');
              socket.disconnect();
              socket.connect();
            }}
            className="px-2.5 py-0.5 bg-rose-800 hover:bg-rose-700 text-white rounded font-bold uppercase transition text-xs"
          >
            Reconnect Now
          </button>
        </div>
      )}

      {/* VIEW ROUTING */}
      <div className="flex-1 flex flex-col">
        {activeView === 'player' && (
          <GameErrorBoundary>
            {showActivePlayerView ? (
              <PlayerView
                gameState={gameState}
                playerTeam={playerTeam}
                onSubmitRound1={handleSubmitRound1}
                onSubmitRound2={handleSubmitRound2}
                onSubmitRound3={handleSubmitRound3}
                feedback={feedback}
                setFeedback={setFeedback}
              />
            ) : (
              <LoginLobbyView
                gameState={gameState}
                playerTeam={playerTeam}
                onJoinTeam={handleJoinTeam}
              />
            )}
          </GameErrorBoundary>
        )}

        {activeView === 'admin' && (
          <AdminErrorBoundary>
            <AdminView onSwitchView={switchView} />
          </AdminErrorBoundary>
        )}
      </div>
    </div>
  );
}
