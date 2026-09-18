import React, { useState, useEffect, useCallback } from 'react';
import socket from './utils/socket';
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
  const [isConnected, setIsConnected] = useState(socket.connected);
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
    fetch('/api/game-state')
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
      setIsConnected(true);

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
            socket.emit('player_reconnect', { team: Number(team), sessionToken, gameSessionId }, (res) => {
              if (res?.success) {
                setPlayerTeam(Number(team));
              } else {
                // Stale or expired session
                localStorage.removeItem('team_quest_session');
                setPlayerTeam(null);
              }
            });
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
      setIsConnected(false);
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
    socket.on('game_state_update', onGameStateUpdate);
    socket.on('game_session_reset', onGameSessionReset);
    socket.on('timer_tick', onTimerTick);
    socket.on('start_countdown_tick', onStartCountdownTick);
    socket.on('resume_countdown_tick', onResumeCountdownTick);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('game_state_update', onGameStateUpdate);
      socket.off('game_session_reset', onGameSessionReset);
      socket.off('timer_tick', onTimerTick);
      socket.off('start_countdown_tick', onStartCountdownTick);
      socket.off('resume_countdown_tick', onResumeCountdownTick);
    };
  }, []);

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
          isConnected={isConnected}
        />
      )}

      {/* Disconnection Warning */}
      {!isConnected && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs font-mono text-center py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>Disconnected from game server. Reconnecting automatically...</span>
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
