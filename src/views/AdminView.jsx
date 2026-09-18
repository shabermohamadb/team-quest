import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Award,
  BookOpen,
  Settings,
  HelpCircle,
  AlertTriangle,
  Volume2,
  VolumeX,
  ExternalLink,
  ChevronRight,
  LogOut,
  Zap,
  Lock,
  Unlock,
  RefreshCw,
  Loader2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Shuffle,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import socket, { getApiUrl } from '../utils/socket';
import { TEAMS, GAME_STATES, ROUND_NAMES } from '../utils/constants';
import TeamBadge from '../components/TeamBadge';
import DifficultyBadge from '../components/DifficultyBadge';
import Leaderboard from '../components/Leaderboard';
import Timer from '../components/Timer';
import { MasterWinnerReveal } from '../components/MasterWinnerReveal';
import { QuestionPreviewModal, QuestionEditModal, SelectedQuestionsModal } from '../components/QuestionModals';
import ParticipantTeamSetup from '../components/ParticipantTeamSetup';
import { soundEffects } from '../utils/sound';

export default function AdminView({ onSwitchView }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'teams' | 'questions' | 'leaderboard' | 'settings'

  // Admin state from backend
  const [adminState, setAdminState] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdownRemaining, setCountdownRemaining] = useState(null);
  const [liveTimer, setLiveTimer] = useState(null);
  const [resumeRemaining, setResumeRemaining] = useState(null);

  // Lazy loaded roster and participant data
  const [participantsList, setParticipantsList] = useState([]);
  const [rostersData, setRostersData] = useState({});
  const [teamsLoading, setTeamsLoading] = useState(false);

  // Question Bank & Selection Management
  const [qBankData, setQBankData] = useState(null);
  const [qBankLoading, setQBankLoading] = useState(false);
  const [qBankRoundFilter, setQBankRoundFilter] = useState('all');
  const [qBankDiffFilter, setQBankDiffFilter] = useState('all');
  const [qBankStatusFilter, setQBankStatusFilter] = useState('all');
  const [qBankSearch, setQBankSearch] = useState('');
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showSelectedModal, setShowSelectedModal] = useState(false);

  const fetchQuestionBank = () => {
    setQBankLoading(true);
    socket.emit('admin_get_question_bank', {}, (res) => {
      setQBankLoading(false);
      if (res?.success) {
        setQBankData(res);
      }
    });
  };

  const fetchParticipantsAndRosters = () => {
    setTeamsLoading(true);
    socket.emit('admin_get_participants_and_rosters', {}, (res) => {
      setTeamsLoading(false);
      if (res?.success) {
        if (Array.isArray(res.participants)) setParticipantsList(res.participants);
        if (res.rosters) setRostersData(res.rosters);
      }
    });
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'questions') {
      fetchQuestionBank();
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'teams') {
      fetchParticipantsAndRosters();
    }
  }, [isAuthenticated, activeTab]);

  const handleRegenerateSelection = () => {
    if (adminState?.questionsFrozen) return;
    setIsRegenerating(true);
    socket.emit('admin_regenerate_selection', {}, (res) => {
      setIsRegenerating(false);
      if (res?.success) {
        fetchQuestionBank();
      }
    });
  };

  const handleToggleQuestionActive = (round, id, currentActive) => {
    socket.emit('admin_toggle_question', { round, id, isActive: !currentActive }, (res) => {
      if (res?.success) {
        fetchQuestionBank();
      }
    });
  };

  const handleDeleteQuestion = (round, id) => {
    setConfirmModal({
      title: 'DELETE CHALLENGE?',
      message: `Are you sure you want to permanently delete challenge "${id}" from the repository?`,
      confirmText: 'DELETE QUESTION',
      onConfirm: () => {
        socket.emit('admin_delete_question', { round, id }, (res) => {
          setConfirmModal(null);
          if (res?.success) {
            fetchQuestionBank();
          }
        });
      }
    });
  };

  const handleDuplicateQuestion = (round, id) => {
    socket.emit('admin_duplicate_question', { round, id }, (res) => {
      if (res?.success) {
        fetchQuestionBank();
      }
    });
  };

  const handleSaveQuestion = (qData) => {
    socket.emit('admin_save_question', qData, (res) => {
      if (res?.success) {
        setEditingQuestion(null);
        fetchQuestionBank();
      } else {
        alert(res?.error || 'Failed to save question');
      }
    });
  };

  // Authenticate with admin PIN using fast lightweight REST endpoint
  const handleLogin = async (e) => {
    e?.preventDefault();
    if (isAuthenticating) return;
    const cleanPin = pinInput.trim();
    if (!cleanPin) {
      setAuthError('Please enter admin password');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      const response = await fetch(getApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanPin })
      });

      const res = await response.json();

      if (res?.success && res.token) {
        sessionStorage.setItem('team_quest_admin_token', res.token);
        sessionStorage.setItem('team_quest_admin_pin', cleanPin);

        // Connect socket now that admin is authenticated
        if (!socket.connected) {
          socket.connect();
        }

        socket.emit('admin_auth', { token: res.token, pin: cleanPin }, (authRes) => {
          setIsAuthenticating(false);
          if (authRes?.success) {
            setIsAuthenticated(true);
          } else {
            setAuthError(authRes?.error || 'Authentication failed');
          }
        });
      } else {
        setIsAuthenticating(false);
        setAuthError(res?.error || 'Invalid Admin Password');
      }
    } catch (err) {
      // Fallback: socket direct auth if REST unreachable
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('admin_auth', { pin: cleanPin }, (socketRes) => {
        setIsAuthenticating(false);
        if (socketRes?.success) {
          if (socketRes.token) {
            sessionStorage.setItem('team_quest_admin_token', socketRes.token);
          }
          sessionStorage.setItem('team_quest_admin_pin', cleanPin);
          setIsAuthenticated(true);
        } else {
          setAuthError(socketRes?.error || 'Invalid Admin Password');
        }
      });
    }
  };

  // Reconnect if stored in session
  useEffect(() => {
    const savedToken = sessionStorage.getItem('team_quest_admin_token');
    const savedPin = sessionStorage.getItem('team_quest_admin_pin');

    if (savedToken || savedPin) {
      if (!socket.connected) {
        socket.connect();
      }

      socket.emit('admin_auth', { token: savedToken, pin: savedPin }, (res) => {
        if (res?.success) {
          setIsAuthenticated(true);
        } else {
          sessionStorage.removeItem('team_quest_admin_token');
          sessionStorage.removeItem('team_quest_admin_pin');
          socket.disconnect();
          setIsAuthenticated(false);
        }
      });
    }
  }, []);

  // Listen for admin state updates & real-time ticks ONLY when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleAdminUpdate = (data) => {
      console.log('[ADMIN] Received new game state:', data?.state);
      setAdminState(data);
      if (data?.startCountdownRemaining !== undefined) {
        setCountdownRemaining(data.startCountdownRemaining);
      }
      if (data?.timeRemaining !== undefined) {
        setLiveTimer(data.timeRemaining);
      }
    };

    const handleCountdownTick = ({ secondsRemaining }) => {
      setCountdownRemaining(secondsRemaining);
    };

    const handleTimerTick = (tick) => {
      if (typeof tick?.timeRemaining === 'number') {
        setLiveTimer(Math.max(0, tick.timeRemaining));
      }
      setAdminState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timeRemaining: tick.timeRemaining,
          clueStartedAt: tick.clueStartedAt,
          clueDuration: tick.clueDuration,
          isTimerRunning: tick.isTimerRunning,
          isPaused: tick.isPaused,
          serverTime: tick.serverTime
        };
      });
    };

    const handleResumeTick = ({ secondsRemaining }) => {
      setResumeRemaining(secondsRemaining);
    };

    socket.on('admin_state_update', handleAdminUpdate);
    socket.on('display_state_update', handleAdminUpdate);
    socket.on('start_countdown_tick', handleCountdownTick);
    socket.on('timer_tick', handleTimerTick);
    socket.on('resume_countdown_tick', handleResumeTick);

    // Initial state refresh on auth
    socket.emit('admin_refresh_state');

    return () => {
      socket.off('admin_state_update', handleAdminUpdate);
      socket.off('display_state_update', handleAdminUpdate);
      socket.off('start_countdown_tick', handleCountdownTick);
      socket.off('timer_tick', handleTimerTick);
      socket.off('resume_countdown_tick', handleResumeTick);
    };
  }, [isAuthenticated]);

  // Game Control Actions
  const handleStartGame = () => {
    console.log('[ADMIN] Start Game clicked');
    soundEffects.clashBuzzer();
    socket.emit('admin_start_game');
  };

  const handleRevealClue2 = () => {
    soundEffects.clueReveal();
    socket.emit('admin_reveal_clue_2');
  };

  const handleRevealClue3 = () => {
    soundEffects.clueReveal();
    socket.emit('admin_reveal_clue_3');
  };

  const handleRevealR1Answer = () => {
    soundEffects.correctAnswer();
    socket.emit('admin_reveal_r1_answer');
  };

  const handleShowR1Answer = handleRevealR1Answer;

  const handleShowR1Result = () => {
    socket.emit('admin_show_r1_result');
  };

  const handleStartR2 = () => {
    soundEffects.clashBuzzer();
    socket.emit('admin_start_r2');
  };

  const handleShowR2Result = () => {
    socket.emit('admin_show_r2_result');
  };

  const handleStartR3 = () => {
    soundEffects.clashBuzzer();
    socket.emit('admin_start_r3');
  };

  const handleShowR3Result = () => {
    socket.emit('admin_show_r3_result');
  };

  const handleShowFinalResults = () => {
    soundEffects.winnerCeremony();
    socket.emit('admin_show_final_results');
  };

  const handleNextQuestion = () => {
    socket.emit('admin_next_question');
  };

  const handlePause = () => {
    socket.emit('admin_pause_game');
  };

  const handleResume = () => {
    socket.emit('admin_resume_game');
  };

  const handleSkipQuestion = () => {
    setConfirmModal({
      title: 'SKIP THIS QUESTION?',
      message: 'No points will be awarded for this question. The game will advance to the next challenge.',
      confirmLabel: 'SKIP',
      onConfirm: () => {
        socket.emit('admin_skip_question');
        setConfirmModal(null);
      }
    });
  };

  const handleSkipRound = () => {
    setConfirmModal({
      title: `SKIP ROUND ${currentRound}?`,
      message: `This will end the current round. Points already earned will be kept, and unfinished questions will receive 0 points.`,
      confirmLabel: 'SKIP ROUND',
      onConfirm: () => {
        socket.emit('admin_skip_round');
        setConfirmModal(null);
      }
    });
  };

  const handleEndRound1 = () => {
    setConfirmModal({
      title: 'END ROUND 1 NOW?',
      message: 'This will conclude Round 1 and display the score summary.',
      confirmLabel: 'END ROUND 1',
      onConfirm: () => {
        socket.emit('admin_end_round_1');
        setConfirmModal(null);
      }
    });
  };

  const handleResetGame = () => {
    setConfirmModal({
      title: 'RESET GAME?',
      message: 'This will disconnect all player sessions and make all teams available.',
      confirmText: 'RESET GAME',
      onConfirm: () => {
        socket.emit('admin_reset_game');
        setConfirmModal(null);
      }
    });
  };

  const handleReleaseTeam = (teamId) => {
    socket.emit('admin_release_team', { teamId });
  };

  const handleResetAllTeams = () => {
    setConfirmModal({
      title: 'Reset All Team Logins?',
      message: 'All active sessions will be terminated. All teams will be free to join again.',
      onConfirm: () => {
        socket.emit('admin_reset_teams');
        setConfirmModal(null);
      }
    });
  };

  // Dynamic Team & Participant Management Handlers
  const handleSetTeamCount = (count) => {
    socket.emit('admin_set_team_count', { teamCount: count });
  };

  const handleAddParticipant = (name, callback) => {
    socket.emit('admin_add_participant', { name }, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleAddParticipantsBulk = (names, callback) => {
    socket.emit('admin_add_participants_bulk', { names }, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleUpdateParticipant = (id, updates, callback) => {
    socket.emit('admin_update_participant', { id, ...updates }, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleRemoveParticipant = (id, callback) => {
    socket.emit('admin_remove_participant', { id }, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleClearParticipants = (callback) => {
    socket.emit('admin_clear_participants', {}, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleAutoAssignTeams = (callback) => {
    socket.emit('admin_auto_assign_teams', {}, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleShuffleTeams = (callback) => {
    socket.emit('admin_shuffle_teams', {}, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleMoveParticipant = (participantId, targetTeamId, callback) => {
    socket.emit('admin_move_participant', { participantId, targetTeamId }, (res) => {
      if (res?.success) fetchParticipantsAndRosters();
      if (typeof callback === 'function') callback(res);
    });
  };

  const handleUpdateSettings = (newSettings) => {
    socket.emit('admin_update_settings', newSettings);
  };

  const handleSetRoundTiming = (round, duration) => {
    socket.emit('admin_set_round_timing', { round, duration });
  };

  const handleLogout = () => {
    const savedToken = sessionStorage.getItem('team_quest_admin_token');
    if (savedToken) {
      fetch(getApiUrl('/api/admin/logout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken })
      }).catch(() => {});
    }
    sessionStorage.removeItem('team_quest_admin_token');
    sessionStorage.removeItem('team_quest_admin_pin');
    socket.disconnect();
    setIsAuthenticated(false);
    setPinInput('');
    setAdminState(null);
    setLiveTimer(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070A12] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0E1524] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black font-mono tracking-tight text-white">
              ADMIN LOGIN
            </h1>
            <p className="text-xs text-slate-400 font-mono">
              Authorized control center access
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase font-bold text-slate-300 mb-2 tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="••••••••••"
                className="w-full bg-[#131C2E] border border-slate-700 rounded-xl px-4 py-3 text-white text-center font-mono text-lg focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                autoFocus
              />
            </div>

            {authError && (
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 animate-shake">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating || !pinInput.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60 text-black font-black py-3.5 px-4 rounded-xl transition-all font-mono text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <span>LOGIN</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => onSwitchView?.('player')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-mono cursor-pointer"
            >
              ← Back to Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentGameState = adminState?.state || GAME_STATES.LOBBY;
  const isPaused = currentGameState === GAME_STATES.PAUSED;
  const isStarting = currentGameState === GAME_STATES.START_COUNTDOWN;
  const isLive = currentGameState.startsWith('ROUND_1') || currentGameState.startsWith('ROUND_2') || currentGameState.startsWith('ROUND_3');

  // Console log game state transitions
  console.log(`[ADMIN] Rendering Dashboard with state: ${currentGameState}`);

  const rawTimer = liveTimer !== null ? liveTimer : (adminState?.timeRemaining ?? 30);
  const displayTimerSec = typeof rawTimer === 'number' && !isNaN(rawTimer) ? Math.max(0, rawTimer) : 30;
  const timerDisplay = isStarting
    ? 'READY'
    : currentGameState === GAME_STATES.LOBBY
    ? '30s'
    : `${String(displayTimerSec).padStart(2, '0')}s`;

  const currentRound = adminState?.currentRoundNumber ?? 1;
  const configuredDuration = currentRound === 1
    ? (adminState?.settings?.round1TimerDuration ?? 30)
    : (currentRound === 2
        ? (adminState?.settings?.round2TimerDuration ?? 30)
        : (adminState?.settings?.round3TimerDuration ?? 30));
  const questionNumber = adminState?.questionNumber ?? (adminState?.currentQuestionIndex !== undefined ? adminState.currentQuestionIndex + 1 : 1);
  const totalQuestions = adminState?.totalQuestions ?? 10;
  const formattedCounter = adminState?.formattedCounter || `QUESTION ${String(questionNumber).padStart(2, '0')} / ${String(totalQuestions).padStart(2, '0')}`;
  const activeClue = adminState?.activeClueNumber || 1;
  const teamCount = Number(adminState?.teamCount) || 4;
  const teamIds = Array.from({ length: teamCount }, (_, i) => i + 1);

  const defaultScores = {};
  const defaultRoundScores = {};
  const defaultLocks = {};
  teamIds.forEach(id => {
    defaultScores[id] = 0;
    defaultRoundScores[id] = { r1: 0, r2: 0, r3: 0 };
    defaultLocks[id] = false;
  });

  const scores = adminState?.scores || defaultScores;
  const roundScores = adminState?.roundScores || defaultRoundScores;
  const publicTeams = Array.isArray(adminState?.publicTeams) ? adminState.publicTeams : [];
  const teamLocks = adminState?.teamLocks || defaultLocks;
  const submissions = Array.isArray(adminState?.roundSubmissions) ? adminState.roundSubmissions : [];
  const participants = participantsList.length > 0 ? participantsList : (Array.isArray(adminState?.participants) ? adminState.participants : []);
  const rosters = Object.keys(rostersData).length > 0 ? rostersData : (adminState?.rosters?.rosters || adminState?.rosters || {});
  const totalParticipantsCount = adminState?.participantCount ?? (adminState?.participants?.length || participants.length);
  const isTeamSetupFrozen = Boolean(adminState?.teamSetupFrozen || adminState?.questionsFrozen || (currentGameState !== GAME_STATES.LOBBY));

  const getStatusLabel = () => {
    if (isStarting) return 'STARTING';
    if (isLive) return 'LIVE';
    if (isPaused) return 'PAUSED';
    return (currentGameState || 'LOBBY').replace(/_/g, ' ');
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans">
      {/* TOP ADMIN BAR */}
      <header className="bg-[#0B1120] border-b border-slate-800 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-white">TEAM QUEST</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
                  HOST CONTROL
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                ROOM: <span className="text-white font-bold">{adminState?.gameCode || 'QUEST-2026'}</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Current State Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono uppercase">GAME STATUS:</span>
            <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
              isStarting
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                : isLive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isPaused
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {getStatusLabel()}
            </span>
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0F172A] border border-slate-700 text-xs font-mono shadow-sm">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-bold">TIMER: <span className="text-white">{displayTimerSec}s</span></span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400 text-[11px]">Configured: <span className="text-amber-400 font-bold">{configuredDuration}s</span></span>
            </div>
            <Timer
              seconds={displayTimerSec}
              total={adminState?.clueDuration || configuredDuration}
              clueStartedAt={adminState?.clueStartedAt}
              clueDuration={adminState?.clueDuration || configuredDuration}
              isTimerRunning={adminState?.isTimerRunning}
              isPaused={isPaused}
              size="sm"
            />
          </div>
        </div>

        {/* Global Emergency Actions */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button
              onClick={handleResume}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              RESUME MATCH
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={currentGameState === GAME_STATES.LOBBY || currentGameState === GAME_STATES.FINAL_RESULT}
              className="bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              PAUSE
            </button>
          )}

          <button
            onClick={handleSkipQuestion}
            disabled={currentGameState === GAME_STATES.LOBBY || currentGameState === GAME_STATES.FINAL_RESULT}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono border border-slate-700 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            SKIP QUESTION
          </button>

          <button
            onClick={handleSkipRound}
            disabled={currentGameState === GAME_STATES.LOBBY || currentGameState === GAME_STATES.FINAL_RESULT}
            className="bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono border border-rose-800/40 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
            SKIP ROUND
          </button>

          <button
            onClick={handleResetGame}
            className="bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono border border-rose-800/40 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET GAME
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1 hidden md:block" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono border border-slate-700 cursor-pointer"
            title="Log out from Admin Console"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOGOUT</span>
          </button>
        </div>
      </header>

      {/* ADMIN TABS NAVIGATION */}
      <div className="bg-[#0D1527] border-b border-slate-800 px-6 shrink-0 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('live')}
          className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'live'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          Live Game Control
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'teams'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Teams & Rosters ({publicTeams.filter((t) => t.isOccupied).length}/{teamCount})
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'leaderboard'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          Scoreboard
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'questions'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Questions Bank
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'settings'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Settings
        </button>
      </div>

      {/* MAIN TAB CONTENT */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto">
        {/* ================= TAB 1: LIVE GAME CONTROL ================= */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* PAUSED BANNER */}
            {isPaused && (
              <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                    <Pause className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-300 font-mono text-sm">GAME IS CURRENTLY PAUSED</h3>
                    <p className="text-xs text-slate-400">All player inputs and timers are frozen until resumed.</p>
                  </div>
                </div>
                <button
                  onClick={handleResume}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl font-mono text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                >
                  <Play className="w-4 h-4" />
                  RESUME GAME
                </button>
              </div>
            )}

            {/* ACTION COCKPIT */}
            <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-white tracking-wider font-mono uppercase flex items-center gap-3">
                    <span>ROUND {currentRound} — {ROUND_NAMES[currentRound] || 'CLUE HUNT'}</span>
                    <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded">
                      {formattedCounter}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono flex flex-wrap items-center gap-2 mt-1">
                    <span>
                      {currentRound === 1 && 'Automatic Clue Progression · Progressive Points Tier'}
                      {currentRound === 2 && 'Pattern Break Logic · Rank Points'}
                      {currentRound === 3 && 'Reaction Clash · Speed Timestamps'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                      TIMER: {displayTimerSec}s · Configured: {configuredDuration}s (Round {currentRound})
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-mono block">CONNECTED TEAMS</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {publicTeams.filter((t) => t.isOccupied).length} OF {teamCount} READY
                  </span>
                </div>
              </div>

              {/* DYNAMIC ACTION BUTTONS BASED ON PHASE */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* LOBBY ACTIONS */}
                {currentGameState === GAME_STATES.LOBBY && (
                  <div className="col-span-full bg-[#1A243B]/80 border border-slate-700/80 rounded-2xl p-6 space-y-6">
                    {/* STEP 1 & 2 QUICK TEAM SETUP COCKPIT */}
                    <div className="bg-[#0F172A] border border-amber-500/30 rounded-xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-0.5">
                            STEP 1 & 2 · DYNAMIC TEAM & PARTICIPANT SETUP
                          </span>
                          <h4 className="text-sm font-black text-white font-mono flex items-center gap-2">
                            <span>TEAM CONFIGURATION</span>
                            <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {totalParticipantsCount} PARTICIPANTS ENTERED
                            </span>
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab('teams')}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>MANAGE ROSTER</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleAutoAssignTeams}
                            disabled={isTeamSetupFrozen || totalParticipantsCount === 0}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                          >
                            <Shuffle className="w-3.5 h-3.5" />
                            <span>AUTO ASSIGN</span>
                          </button>
                        </div>
                      </div>

                      {/* Quick 4/5/6 Selector & Roster Distribution Summary */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 font-semibold">Teams:</span>
                          {[4, 5, 6].map(count => (
                            <button
                              key={count}
                              type="button"
                              disabled={isTeamSetupFrozen}
                              onClick={() => handleSetTeamCount(count)}
                              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-black border transition-all cursor-pointer ${
                                teamCount === count
                                  ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                                  : 'bg-[#161F34] text-slate-400 border-slate-700 hover:text-white'
                              }`}
                            >
                              {count} TEAMS
                            </button>
                          ))}
                        </div>

                        {/* Roster Size Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                          {teamIds.map(tid => {
                            const size = rosters?.[tid]?.length || 0;
                            return (
                              <span
                                key={tid}
                                className="px-2 py-1 rounded bg-[#161F34] border border-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TEAMS[tid]?.color }} />
                                <strong className="text-white">T{tid}:</strong> {size}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-1">
                          QUESTION BANK & BALANCED RANDOM SELECTION ENGINE
                        </span>
                        <h3 className="text-lg font-black text-white font-mono flex items-center gap-2">
                          <span>MATCH CHALLENGE POOL</span>
                          <span className="text-xs font-mono font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                            {adminState?.questionsFrozen ? '🔒 SELECTION FROZEN' : '⚡ BALANCED SELECTION READY'}
                          </span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRegenerateSelection}
                          disabled={adminState?.questionsFrozen || isRegenerating}
                          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 border transition-all ${
                            adminState?.questionsFrozen
                              ? 'bg-slate-800/40 text-slate-600 border-slate-800 cursor-not-allowed'
                              : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:border-indigo-400 active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10'
                          }`}
                        >
                          <Shuffle className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                          <span>{isRegenerating ? 'REGENERATING...' : 'REGENERATE SELECTION'}</span>
                        </button>

                        <button
                          onClick={() => setShowSelectedModal(true)}
                          className="px-3 py-2.5 rounded-xl font-mono text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>VIEW (30)</span>
                        </button>
                      </div>
                    </div>

                    {/* 3 Rounds Selection Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Round 1 */}
                      <div className="bg-[#0F172A] border border-cyan-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-cyan-400">ROUND 1: CLUE HUNT</span>
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                            10 OF 50 PLAYED
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black font-mono text-white">50</span>
                          <span className="text-xs font-mono text-slate-400">AVAILABLE</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-2xl font-black font-mono text-cyan-400">10</span>
                          <span className="text-xs font-mono text-cyan-300">SELECTED</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Balanced Difficulty: 3 Easy · 4 Medium · 3 Hard
                        </div>
                      </div>

                      {/* Round 2 */}
                      <div className="bg-[#0F172A] border border-amber-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-400">ROUND 2: PATTERN BREAK</span>
                          <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                            10 OF 50 PLAYED
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black font-mono text-white">50</span>
                          <span className="text-xs font-mono text-slate-400">AVAILABLE</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-2xl font-black font-mono text-amber-400">10</span>
                          <span className="text-xs font-mono text-amber-300">SELECTED</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Option IDs: A, B, C, D · Server-Evaluated
                        </div>
                      </div>

                      {/* Round 3 */}
                      <div className="bg-[#0F172A] border border-rose-500/30 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-rose-400">ROUND 3: CODE CRACKER</span>
                          <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                            10 OF 50 PLAYED
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black font-mono text-white">50</span>
                          <span className="text-xs font-mono text-slate-400">AVAILABLE</span>
                          <span className="text-slate-600">·</span>
                          <span className="text-2xl font-black font-mono text-rose-400">10</span>
                          <span className="text-xs font-mono text-rose-300">SELECTED</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Ciphers: Binary, Caesar, A1Z26, Atbash, Hex
                        </div>
                      </div>
                    </div>

                    {/* Start Game Action Button */}
                    <div className="pt-2 text-center space-y-3">
                      <p className="text-xs text-slate-400 max-w-md mx-auto font-mono">
                        Starting the tournament freezes the 30 selected questions for this session and begins the 3-second live countdown.
                      </p>
                      <button
                        onClick={handleStartGame}
                        className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-lg py-4 px-10 rounded-xl font-mono tracking-wider shadow-xl shadow-amber-500/20 flex items-center gap-3 mx-auto transition-all cursor-pointer"
                      >
                        <Play className="w-6 h-6 fill-current" />
                        START GAME
                      </button>
                    </div>
                  </div>
                )}

                {/* COUNTDOWN PHASE */}
                {currentGameState === GAME_STATES.START_COUNTDOWN && (
                  <div className="col-span-full bg-[#1A243B] border-2 border-amber-500/50 rounded-xl p-8 text-center space-y-4 shadow-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>GAME STATUS: STARTING</span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                        ROUND {currentRound} · {formattedCounter}
                      </div>
                      <div className="text-amber-400 font-mono text-7xl md:text-8xl font-black animate-pulse my-2">
                        {countdownRemaining === 0 ? 'GO' : (countdownRemaining !== null && countdownRemaining > 0 ? countdownRemaining : (adminState?.startCountdownRemaining ?? 3))}
                      </div>
                      <p className="text-sm font-mono text-slate-200">
                        GET READY! Round 1 starting in a moment...
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        onClick={handlePause}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold px-4 py-2 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        PAUSE
                      </button>
                      <button
                        onClick={handleResetGame}
                        className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-mono text-xs font-bold px-4 py-2 rounded-lg border border-rose-800/40 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        ABORT / RESET
                      </button>
                    </div>
                  </div>
                )}

                {/* ROUND 1 CONTROLS */}
                {currentGameState.startsWith('ROUND_1') && currentGameState !== GAME_STATES.ROUND_1_COMPLETE && (
                  <>
                    {/* Clue Progression Indicator */}
                    <div className="bg-[#1A243B] border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1 font-bold">
                          AUTOMATIC CLUE PROGRESSION
                        </span>
                        <h4 className="font-bold text-white text-sm mb-2">30s Clue Timer Active</h4>
                        <div className="space-y-1.5 font-mono text-xs mb-3">
                          <div className={`p-2 rounded flex items-center justify-between border ${activeClue === 1 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : activeClue > 1 ? 'bg-slate-900/60 text-slate-400 border-slate-800' : 'bg-slate-900/30 text-slate-500 border-slate-800'}`}>
                            <span>CLUE 1</span>
                            <span className="text-[10px] uppercase font-bold">{activeClue === 1 ? 'CURRENT' : activeClue > 1 ? 'REVEALED' : 'WAITING'}</span>
                          </div>
                          <div className={`p-2 rounded flex items-center justify-between border ${activeClue === 2 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : activeClue > 2 ? 'bg-slate-900/60 text-slate-400 border-slate-800' : 'bg-slate-900/30 text-slate-500 border-slate-800'}`}>
                            <span>CLUE 2</span>
                            <span className="text-[10px] uppercase font-bold">{activeClue === 2 ? 'CURRENT' : activeClue > 2 ? 'REVEALED' : 'AUTOMATIC (30s)'}</span>
                          </div>
                          <div className={`p-2 rounded flex items-center justify-between border ${activeClue === 3 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900/30 text-slate-500 border-slate-800'}`}>
                            <span>CLUE 3</span>
                            <span className="text-[10px] uppercase font-bold">{activeClue === 3 ? 'CURRENT' : 'AUTOMATIC (30s)'}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Clues progress automatically when timer hits 00:00.
                      </span>
                    </div>

                    {/* Question Actions */}
                    <div className="bg-[#1A243B] border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                          QUESTION CONTROLS
                        </span>
                        <h4 className="font-bold text-white text-sm mb-2">Early Reveal & Resolution</h4>
                        <p className="text-xs text-slate-400 mb-4">
                          Stops the timer early, reveals official answer, and advances through results.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <button
                          onClick={handleShowR1Answer}
                          disabled={currentGameState === GAME_STATES.ROUND_1_ANSWER_REVEAL || currentGameState === GAME_STATES.ROUND_1_RESULT}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold py-2.5 px-4 rounded-lg font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          SHOW ANSWER
                        </button>
                        <button
                          onClick={handleSkipQuestion}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-lg font-mono text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                          SKIP QUESTION
                        </button>
                      </div>
                    </div>

                    {/* Round 1 Management */}
                    <div className="bg-[#1A243B] border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block mb-1">
                          STAGE MANAGEMENT
                        </span>
                        <h4 className="font-bold text-white text-sm mb-2">Round 1 Controls</h4>
                        <p className="text-xs text-slate-400 mb-4">
                          Round 1 automatically plays 10 questions. You can conclude Round 1 early at any time.
                        </p>
                      </div>
                      <button
                        onClick={handleEndRound1}
                        className="w-full bg-rose-900/40 hover:bg-rose-900/70 text-rose-300 font-bold py-2.5 px-4 rounded-lg font-mono text-xs flex items-center justify-center gap-2 transition-all border border-rose-800/50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        END ROUND 1
                      </button>
                    </div>
                  </>
                )}

                {/* ROUND 1 COMPLETE — WAITING FOR ADMIN */}
                {currentGameState === GAME_STATES.ROUND_1_COMPLETE && (
                  <div className="col-span-full bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-8 text-center space-y-6 animate-reveal">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                        ROUND 1 FINISHED
                      </span>
                      <h3 className="text-2xl md:text-3xl font-black font-mono text-white mt-1">
                        ROUND 1 COMPLETE — CLUE HUNT FINISHED
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-2">
                        Round 1 has concluded. Review official scores below before launching Round 2.
                      </p>
                    </div>

                    <div className="max-w-xl mx-auto bg-[#0F172A] border border-slate-700/80 rounded-xl p-6 shadow-xl space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold text-left pb-2 border-b border-slate-800">
                        ROUND 1 SCORE SUMMARY
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                        {teamIds.map((tid) => (
                          <div key={tid} className="p-3 bg-[#1A243B] rounded-lg border border-slate-700 flex items-center justify-between">
                            <TeamBadge team={tid} size="sm" />
                            <span className="font-black text-base text-white">
                              {adminState?.round1Scores?.[tid] ?? adminState?.roundScores?.[tid]?.r1 ?? 0} PTS
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleStartR2}
                      className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-base py-4 px-8 rounded-xl font-mono tracking-wider shadow-xl shadow-amber-500/20 inline-flex items-center gap-2 transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      START ROUND 2 (PATTERN BREAK) →
                    </button>
                  </div>
                )}

                {/* ROUND 2 CONTROLS */}
                {currentGameState.startsWith('ROUND_2') && (
                  <>
                    <div className="bg-[#1A243B] border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                          PATTERN STATUS
                        </span>
                        <h4 className="font-bold text-white text-sm mb-2">Pattern Break Active</h4>
                        <p className="text-xs text-slate-400 mb-4">
                          All 4 teams choose between Option A, B, C, D. First correct answer earns top rank.
                        </p>
                      </div>
                      {currentGameState === GAME_STATES.ROUND_2_ACTIVE ? (
                        <button
                          onClick={handleShowR2Result}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg font-mono text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          SHOW RESULTS & CORRECT OPTION
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleNextQuestion}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-2 rounded-lg font-mono text-xs flex items-center justify-center gap-1 transition-all"
                          >
                            NEXT PATTERN
                          </button>
                          <button
                            onClick={handleStartR3}
                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-2 rounded-lg font-mono text-xs flex items-center justify-center gap-1 transition-all"
                          >
                            START ROUND 3 →
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ROUND 3 CONTROLS */}
                {currentGameState.startsWith('ROUND_3') && (
                  <>
                    <div className="bg-[#1A243B] border border-slate-700 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 block mb-1 font-bold">
                          CODE CRACKER 🔐
                        </span>
                        <h4 className="font-bold text-white text-sm mb-2">Decryption & Escape Room</h4>
                        <p className="text-xs text-slate-400 mb-4">
                          Teams decrypt the encrypted message and submit the passcode. First correct team claims top score.
                        </p>
                      </div>
                      {currentGameState === GAME_STATES.ROUND_3_ACTIVE ? (
                        <button
                          onClick={handleShowR3Result}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg font-mono text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          REVEAL PASSCODE & SHOW SCORES
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={handleNextQuestion}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-2 rounded-lg font-mono text-xs flex items-center justify-center gap-1 transition-all"
                          >
                            NEXT CIPHER
                          </button>
                          <button
                            onClick={handleShowFinalResults}
                            className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-2 rounded-lg font-mono text-xs flex items-center justify-center gap-1 transition-all"
                          >
                            FINAL RESULTS 🏆
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* FINAL RESULTS CEREMONY */}
                {currentGameState === GAME_STATES.FINAL_RESULT && (
                  <div className="col-span-full">
                    <MasterWinnerReveal
                      finalResults={adminState?.finalResults}
                      isAdmin={true}
                      onReset={handleResetGame}
                      onStartTiebreaker={() => socket.emit('admin_start_tiebreaker')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* QUESTION CONFIGURATION ERROR BANNER */}
            {adminState?.questionConfigError && (
              <div className="bg-rose-950/80 border-2 border-rose-500 text-rose-200 px-5 py-4 rounded-xl font-mono text-xs flex items-center gap-3 shadow-lg animate-pulse">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold text-rose-300 text-sm block">QUESTION CONFIGURATION WARNING:</span>
                  <span>{adminState.questionConfigError}</span>
                </div>
              </div>
            )}

            {/* ROUND TIMING CONTROL PANEL (ROUND 1, 2, 3) */}
            <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-mono uppercase tracking-wider flex items-center gap-2">
                      <span>ROUND TIMING</span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                        HOST TIMING CONTROL
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Set duration per round. Active countdown is never interrupted mid-question; new timing applies on next clue/question.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs self-start sm:self-auto">
                  <span className="text-slate-400">CURRENT COUNTDOWN:</span>
                  <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white font-bold">
                    {displayTimerSec}s
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ROUND 1 */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentRound === 1
                    ? 'bg-[#151D2F] border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                    : 'bg-[#0B1120] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      ROUND 1 (CLUE HUNT)
                    </span>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {adminState?.settings?.round1TimerDuration ?? 30}s
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mb-2.5">Clue Duration</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[15, 20, 30, 45, 60].map((dur) => {
                      const isSelected = (adminState?.settings?.round1TimerDuration ?? 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleSetRoundTiming(1, dur)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ROUND 2 */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentRound === 2
                    ? 'bg-[#151D2F] border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.08)]'
                    : 'bg-[#0B1120] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      ROUND 2 (PATTERN BREAK)
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      {adminState?.settings?.round2TimerDuration ?? 30}s
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mb-2.5">Pattern Duration</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[15, 20, 30, 45, 60].map((dur) => {
                      const isSelected = (adminState?.settings?.round2TimerDuration ?? 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleSetRoundTiming(2, dur)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ROUND 3 */}
                <div className={`p-4 rounded-xl border transition-all ${
                  currentRound === 3
                    ? 'bg-[#151D2F] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                    : 'bg-[#0B1120] border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold uppercase text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      ROUND 3 (CODE CRACKER)
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {adminState?.settings?.round3TimerDuration ?? 30}s
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mb-2.5">Cipher Duration</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[15, 20, 30, 45, 60].map((dur) => {
                      const isSelected = (adminState?.settings?.round3TimerDuration ?? 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleSetRoundTiming(3, dur)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400 font-black'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* REAL-TIME QUESTION TEAM STATUS (SECTION 8) */}
            {isLive && (
              <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    LIVE QUESTION TEAM STATUS
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    REAL-TIME PROGRESS
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {teamIds.map((tid) => {
                    const statusObj = adminState?.teamQuestionStatuses?.[tid] || {
                      state: adminState?.teamLocks?.[tid] ? 'SOLVED' : 'ACTIVE',
                      label: adminState?.teamLocks?.[tid] ? '✓ SOLVED' : 'ACTIVE',
                      detail: adminState?.teamLocks?.[tid] ? 'SOLVED' : 'ACTIVE',
                      cooldownSec: 0
                    };

                    const isSolved = statusObj.state === 'SOLVED';
                    const isCooldown = statusObj.state === 'COOLDOWN';

                    return (
                      <div
                        key={tid}
                        className={`p-3 rounded-xl border font-mono transition-all flex flex-col justify-between ${
                          isSolved
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-sm'
                            : isCooldown
                            ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                            : 'bg-[#161F34] border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <TeamBadge team={tid} size="sm" />
                          {isSolved ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : isCooldown ? (
                            <Clock className="w-4 h-4 text-rose-400 animate-spin" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="text-xs font-bold tracking-wider uppercase">
                            {statusObj.label}
                          </div>
                          {isSolved && statusObj.detail && (
                            <div className="text-[10px] text-emerald-400/90 font-semibold truncate">
                              {statusObj.detail}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LIVE QUESTION INSPECTOR & SUBMISSIONS FEED */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Question Preview */}
              <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-6">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  ACTIVE CHALLENGE DETAILS
                </h3>

                {currentRound === 1 && (
                  adminState?.round1Question ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded font-mono">
                          {adminState.round1Question.domain || 'Programming'}
                        </span>
                        <DifficultyBadge difficulty={adminState.round1Question.difficulty || 'Medium'} />
                      </div>

                      <div className="space-y-2 font-mono text-xs">
                        <div className="p-3 bg-[#1A243B] border border-slate-700 rounded-lg">
                          <span className="text-cyan-400 font-bold block mb-1">CLUE 1:</span>
                          <p className="text-slate-200">{adminState.round1Question.clue1 || 'Loading Clue 1...'}</p>
                        </div>
                        <div className="p-3 bg-[#1A243B] border border-slate-700 rounded-lg">
                          <span className="text-cyan-400 font-bold block mb-1">CLUE 2:</span>
                          <p className="text-slate-200">{adminState.round1Question.clue2 || 'Loading Clue 2...'}</p>
                        </div>
                        <div className="p-3 bg-[#1A243B] border border-slate-700 rounded-lg">
                          <span className="text-cyan-400 font-bold block mb-1">CLUE 3:</span>
                          <p className="text-slate-200">{adminState.round1Question.clue3 || 'Loading Clue 3...'}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono">
                        <span className="text-emerald-400 font-bold block mb-1">CORRECT ANSWER:</span>
                        <span className="text-white font-bold text-sm tracking-wide">
                          {adminState.round1Question.correctAnswer || '---'}
                        </span>
                        {adminState.round1Question.acceptedAnswers && (
                          <div className="text-[10px] text-slate-400 mt-1">
                            Also accepted: {adminState.round1Question.acceptedAnswers.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center font-mono">
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                      <span className="text-xs text-slate-400">LOADING QUESTION...</span>
                    </div>
                  )
                )}

                {currentRound === 2 && (
                  adminState?.round2Pattern ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded font-mono">
                          {adminState.round2Pattern.category || adminState.round2Pattern.title}
                        </span>
                        <DifficultyBadge difficulty={adminState.round2Pattern.difficulty} />
                      </div>

                      <div className="p-4 bg-[#1A243B] border border-slate-700 rounded-lg">
                        <span className="text-[10px] font-mono text-slate-400 block mb-1">PATTERN:</span>
                        <div className="font-mono text-lg font-black text-amber-400">
                          {adminState.round2Pattern.patternText}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        {adminState.round2Pattern.options?.map((opt, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded border ${
                              opt.key === adminState.round2Pattern.correctOption
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                                : 'bg-slate-800 border-slate-700 text-slate-300'
                            }`}
                          >
                            <span className="text-amber-400 font-bold mr-1.5">[{opt.key}]</span>
                            <span>{opt.text}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono">
                        <span className="text-emerald-400 font-bold block mb-1">
                          CORRECT OPTION: [ {adminState.round2Pattern.correctOption} ]
                        </span>
                        <p className="text-[10px] text-slate-300 mt-1">
                          Rule: {adminState.round2Pattern.explanation}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center font-mono">
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                      <span className="text-xs text-slate-400">LOADING PATTERN...</span>
                    </div>
                  )
                )}

                {currentRound === 3 && (
                  (adminState?.round3Challenge || adminState?.round3Reaction) ? (
                    (() => {
                      const challenge = adminState.round3Challenge || adminState.round3Reaction;
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-300 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded font-mono">
                              {challenge.category || 'Code Cracker'}
                            </span>
                            <DifficultyBadge difficulty={challenge.difficulty || 'Hard'} />
                          </div>

                          <div className="p-4 bg-[#1A243B] border border-slate-700 rounded-lg font-mono space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-rose-400">
                                {challenge.title || 'Cipher Challenge'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {challenge.timeLimit || 45}s LIMIT
                              </span>
                            </div>

                            <div className="p-3 bg-[#0A0E18] border border-amber-500/30 rounded-lg text-center">
                              <span className="text-[10px] text-zinc-500 uppercase block font-bold">ENCRYPTED MESSAGE</span>
                              <div className="text-xl font-black text-amber-300 tracking-widest py-1">
                                {challenge.code || challenge.target || '---'}
                              </div>
                            </div>

                            {challenge.hint && (
                              <div className="text-xs text-slate-300 bg-[#0E1524] p-2.5 rounded border border-slate-800">
                                <strong className="text-cyan-400 mr-1.5">HINT:</strong>
                                {challenge.hint}
                              </div>
                            )}
                          </div>

                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono">
                            <span className="text-emerald-400 font-bold block mb-1">CORRECT PASSCODE:</span>
                            <span className="text-white font-bold text-sm tracking-wide">
                              {challenge.correctCode || challenge.target || '---'}
                            </span>
                            {challenge.alternateCodes?.length > 0 && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Also accepted: {challenge.alternateCodes.join(', ')}
                              </div>
                            )}
                            {challenge.explanation && (
                              <p className="text-[11px] text-slate-300 mt-1">
                                Decryption: {challenge.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-8 border border-dashed border-slate-800 rounded-xl text-center font-mono">
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
                      <span className="text-xs text-slate-400">LOADING CIPHER CHALLENGE...</span>
                    </div>
                  )
                )}
              </div>

              {/* Live Submissions Tracker */}
              <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    LIVE SUBMISSION LOG
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    {submissions.length} ATTEMPT(S)
                  </span>
                </div>

                {submissions.length === 0 ? (
                  <div className="h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
                    <Clock className="w-6 h-6 mb-2 opacity-40 animate-pulse" />
                    Waiting for teams to submit answers...
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-xs">
                    {submissions.map((sub, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          sub.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-slate-400 text-[10px]">#{idx + 1}</span>
                          <TeamBadge teamId={sub.team} size="sm" />
                          <span className="font-bold">
                            {sub.isCorrect ? 'CORRECT' : 'INCORRECT'}
                          </span>
                          {sub.reactionMs && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({(sub.reactionMs / 1000).toFixed(2)}s)
                            </span>
                          )}
                        </div>

                        <div className="font-bold text-sm">
                          {sub.isCorrect ? `+${sub.points} PTS` : '0 PTS'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: TEAMS & PARTICIPANT SETUP ================= */}
        {activeTab === 'teams' && (
          <div className="space-y-8">
            {/* 1. PARTICIPANT & TEAM SETUP STUDIO */}
            <ParticipantTeamSetup
              teamCount={teamCount}
              participants={participants}
              rosters={rosters}
              scores={scores}
              isLocked={isTeamSetupFrozen}
              onSetTeamCount={handleSetTeamCount}
              onAddParticipant={handleAddParticipant}
              onAddBulk={handleAddParticipantsBulk}
              onUpdateParticipant={handleUpdateParticipant}
              onRemoveParticipant={handleRemoveParticipant}
              onClearParticipants={handleClearParticipants}
              onAutoAssign={handleAutoAssignTeams}
              onShuffle={handleShuffleTeams}
              onMoveParticipant={handleMoveParticipant}
            />

            {/* 2. ACTIVE DEVICE SESSIONS & SEAT CONTROLS */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    ACTIVE DEVICE SESSIONS ({publicTeams.filter((t) => t.isOccupied).length} / {teamCount})
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Strict 1-device-per-team rule enforced. Reconnecting from same device restores session.
                  </p>
                </div>

                <button
                  onClick={handleResetAllTeams}
                  className="bg-rose-900/30 hover:bg-rose-900/60 text-rose-300 font-bold px-4 py-2 rounded-xl text-xs font-mono border border-rose-800/40 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RELEASE ALL SESSIONS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamIds.map((tid) => {
                  const teamData = TEAMS[tid] || TEAMS[1];
                  const publicData = publicTeams.find((t) => t.id === tid);
                  const isOccupied = publicData?.isOccupied;
                  const isLocked = teamLocks[tid];

                  return (
                    <div
                      key={tid}
                      className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <TeamBadge team={tid} size="md" />
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                              isOccupied
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isOccupied ? 'ONLINE' : 'EMPTY / AVAILABLE'}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs font-mono mb-4 text-slate-300">
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-400">Total Score:</span>
                            <span className="font-bold text-white">{scores[tid] || 0} PTS</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-800">
                            <span className="text-slate-400">Question Lock:</span>
                            <span className={isLocked ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                              {isLocked ? 'LOCKED (ANSWERED)' : 'UNLOCKED'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">Round Breakdown:</span>
                            <span className="text-slate-300">
                              R1: {roundScores[tid]?.r1 || 0} | R2: {roundScores[tid]?.r2 || 0} | R3: {roundScores[tid]?.r3 || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex gap-2">
                        <button
                          onClick={() => handleReleaseTeam(tid)}
                          disabled={!isOccupied}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs font-bold py-2 rounded-lg font-mono transition-all border border-slate-700 cursor-pointer"
                        >
                          DISCONNECT & RELEASE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: LEADERBOARD ================= */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white font-mono">OFFICIAL TOURNAMENT STANDINGS</h2>
                <p className="text-xs text-slate-400 font-mono">
                  Cumulative scoring across all 3 rounds. Visible only in Admin Panel.
                </p>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-slate-700/80 rounded-2xl p-6 shadow-xl max-w-2xl mx-auto">
              <Leaderboard scores={scores} roundScores={roundScores} />
            </div>
          </div>
        )}

        {/* ================= TAB 4: QUESTIONS BANK ================= */}
        {activeTab === 'questions' && (() => {
          const r1List = qBankData?.round1 || adminState?.round1Questions || [];
          const r2List = qBankData?.round2 || adminState?.round2Patterns || [];
          const r3List = qBankData?.round3 || adminState?.round3CodeCrackers || [];

          const selectedR1Ids = new Set(adminState?.selectedQuestionsSummary?.round1?.map(q => q.id) || []);
          const selectedR2Ids = new Set(adminState?.selectedQuestionsSummary?.round2?.map(q => q.id) || []);
          const selectedR3Ids = new Set(adminState?.selectedQuestionsSummary?.round3?.map(q => q.id) || []);

          let combined = [];
          if (qBankRoundFilter === 'all' || qBankRoundFilter === 1) {
            combined.push(...r1List.map(q => ({ ...q, round: 1, isSelectedForMatch: selectedR1Ids.has(q.id) })));
          }
          if (qBankRoundFilter === 'all' || qBankRoundFilter === 2) {
            combined.push(...r2List.map(q => ({ ...q, round: 2, isSelectedForMatch: selectedR2Ids.has(q.id) })));
          }
          if (qBankRoundFilter === 'all' || qBankRoundFilter === 3) {
            combined.push(...r3List.map(q => ({ ...q, round: 3, isSelectedForMatch: selectedR3Ids.has(q.id) })));
          }

          if (qBankDiffFilter !== 'all') {
            combined = combined.filter(q => (q.difficulty || '').toLowerCase() === qBankDiffFilter.toLowerCase());
          }

          if (qBankStatusFilter !== 'all') {
            const expectActive = qBankStatusFilter === 'active';
            combined = combined.filter(q => (q.isActive !== false) === expectActive);
          }

          if (qBankSearch.trim()) {
            const query = qBankSearch.trim().toLowerCase();
            combined = combined.filter(q => {
              const str = [
                q.id,
                q.title,
                q.website,
                q.domain,
                q.category,
                q.correctAnswer,
                q.correctCode,
                q.patternText,
                q.clue1,
                q.clue2,
                q.clue3,
                q.hint,
                q.explanation
              ].filter(Boolean).join(' ').toLowerCase();
              return str.includes(query);
            });
          }

          const r1Total = r1List.length;
          const r2Total = r2List.length;
          const r3Total = r3List.length;
          const grandTotal = r1Total + r2Total + r3Total;

          return (
            <div className="space-y-6">
              {/* HEADER & COUNTERS */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block mb-1">
                    QUESTION BANK MANAGEMENT ({grandTotal} TOTAL CHALLENGES)
                  </span>
                  <h2 className="text-xl font-black text-white font-mono flex items-center gap-2">
                    <span>150-CHALLENGE REPOSITORY</span>
                    <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      50 / ROUND
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Balanced, server-authoritative pool. 10 unique challenges selected per round for each match.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingQuestion({ round: qBankRoundFilter === 'all' ? 1 : Number(qBankRoundFilter) })}
                    className="bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-xl font-mono text-xs tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD CHALLENGE</span>
                  </button>

                  <button
                    onClick={fetchQuestionBank}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2.5 rounded-xl font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${qBankLoading ? 'animate-spin' : ''}`} />
                    <span>REFRESH</span>
                  </button>
                </div>
              </div>

              {/* STATS BANNER */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  onClick={() => setQBankRoundFilter(qBankRoundFilter === 1 ? 'all' : 1)}
                  className={`cursor-pointer transition-all border rounded-xl p-4 font-mono ${
                    qBankRoundFilter === 1
                      ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/30'
                      : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>ROUND 1: CLUE HUNT</span>
                    <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950 px-1.5 py-0.5 rounded">
                      10 SELECTED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-cyan-400 mt-1">
                    {r1Total} <span className="text-xs text-slate-400 font-normal">QUESTIONS</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Technical Platforms & Developer Domains
                  </div>
                </div>

                <div
                  onClick={() => setQBankRoundFilter(qBankRoundFilter === 2 ? 'all' : 2)}
                  className={`cursor-pointer transition-all border rounded-xl p-4 font-mono ${
                    qBankRoundFilter === 2
                      ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30'
                      : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>ROUND 2: PATTERN BREAK</span>
                    <span className="text-[10px] text-amber-400 font-bold bg-amber-950 px-1.5 py-0.5 rounded">
                      10 SELECTED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {r2Total} <span className="text-xs text-slate-400 font-normal">CHALLENGES</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Logical Progressions & Options A-D
                  </div>
                </div>

                <div
                  onClick={() => setQBankRoundFilter(qBankRoundFilter === 3 ? 'all' : 3)}
                  className={`cursor-pointer transition-all border rounded-xl p-4 font-mono ${
                    qBankRoundFilter === 3
                      ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30'
                      : 'bg-[#0F172A] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>ROUND 3: CODE CRACKER</span>
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-950 px-1.5 py-0.5 rounded">
                      10 SELECTED
                    </span>
                  </div>
                  <div className="text-2xl font-black text-rose-400 mt-1">
                    {r3Total} <span className="text-xs text-slate-400 font-normal">CIPHERS</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Digital Escape-Room Passcodes
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between font-mono text-xs">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={qBankSearch}
                    onChange={(e) => setQBankSearch(e.target.value)}
                    placeholder="Search by ID, keyword, answer..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  {qBankSearch && (
                    <button
                      onClick={() => setQBankSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Round Filter */}
                  <select
                    value={qBankRoundFilter}
                    onChange={(e) => setQBankRoundFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  >
                    <option value="all">All Rounds ({grandTotal})</option>
                    <option value="1">Round 1 (50)</option>
                    <option value="2">Round 2 (50)</option>
                    <option value="3">Round 3 (50)</option>
                  </select>

                  {/* Difficulty Filter */}
                  <select
                    value={qBankDiffFilter}
                    onChange={(e) => setQBankDiffFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={qBankStatusFilter}
                    onChange={(e) => setQBankStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-mono"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Disabled Only</option>
                  </select>

                  <span className="text-slate-400 pl-2">
                    Showing {combined.length} of {grandTotal}
                  </span>
                </div>
              </div>

              {/* CHALLENGE CARDS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {combined.map((q) => {
                  const isR1 = q.round === 1;
                  const isR2 = q.round === 2;
                  const isR3 = q.round === 3;
                  const isActive = q.isActive !== false;

                  return (
                    <div
                      key={q.id}
                      className={`bg-[#0F172A] border rounded-xl p-4 font-mono text-xs space-y-3 transition-all ${
                        q.isSelectedForMatch
                          ? 'border-indigo-500/60 ring-1 ring-indigo-500/40 bg-indigo-950/10'
                          : isActive
                          ? 'border-slate-800 hover:border-slate-700'
                          : 'border-slate-800/60 opacity-60 bg-slate-950/40'
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {q.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isR1 ? 'bg-cyan-500/10 text-cyan-400' : isR2 ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            R{q.round}
                          </span>
                          <DifficultyBadge difficulty={q.difficulty} />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {q.isSelectedForMatch && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              ★ SELECTED
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isActive ? 'ACTIVE' : 'DISABLED'}
                          </span>
                        </div>
                      </div>

                      {/* CARD BODY */}
                      <div className="text-slate-200">
                        <div className="font-bold text-white text-sm">
                          {q.title || q.website || q.domain || q.id}
                        </div>

                        {isR1 && (
                          <div className="text-slate-300 space-y-1 mt-2 text-[11px]">
                            <p className="line-clamp-1"><strong className="text-cyan-400">1:</strong> {q.clue1 || q.clues?.[0]}</p>
                            <p className="line-clamp-1"><strong className="text-cyan-400">2:</strong> {q.clue2 || q.clues?.[1]}</p>
                            <p className="line-clamp-1"><strong className="text-cyan-400">3:</strong> {q.clue3 || q.clues?.[2]}</p>
                            <div className="pt-1 text-emerald-400 font-bold">
                              Answer: {q.correctAnswer}
                            </div>
                          </div>
                        )}

                        {isR2 && (
                          <div className="space-y-1.5 mt-2">
                            <div className="text-amber-300 font-bold text-xs py-0.5">
                              {q.patternText}
                            </div>
                            <div className="text-[11px] text-emerald-400 font-bold">
                              Option [{q.correctOptionId || q.correctOption}] ({q.explanation})
                            </div>
                          </div>
                        )}

                        {isR3 && (
                          <div className="space-y-1.5 mt-2">
                            <div className="text-amber-300 font-bold text-xs tracking-wider">
                              Cipher: {q.code}
                            </div>
                            {q.hint && (
                              <div className="text-slate-400 text-[11px] line-clamp-1">
                                <strong className="text-cyan-400">Hint:</strong> {q.hint}
                              </div>
                            )}
                            <div className="text-[11px] text-emerald-400 font-bold">
                              Passcode: {q.correctCode}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CARD ACTIONS */}
                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setPreviewQuestion(q)}
                            className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => setEditingQuestion(q)}
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDuplicateQuestion(q.round, q.id)}
                            className="text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Clone</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleQuestionActive(q.round, q.id, isActive)}
                            className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                              isActive
                                ? 'text-amber-300 hover:bg-amber-950/50'
                                : 'text-emerald-400 hover:bg-emerald-950/50'
                            }`}
                          >
                            {isActive ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.round, q.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {combined.length === 0 && (
                <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 font-mono">
                  No challenges matched your search filters.
                </div>
              )}
            </div>
          );
        })()}

        {/* ================= TAB 5: SETTINGS & TOOLS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-4xl pb-16">
            <div>
              <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                ADMIN SETTINGS & TOURNAMENT CONFIGURATION
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Configure dynamic teams, custom 5th/6th place scoring, live timer limits, and audio preferences.
              </p>
            </div>

            {/* 1. DYNAMIC NUMBER OF TEAMS */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    TOURNAMENT TEAM COUNT
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Select how many competitive teams participate in this match. Dynamically creates Team 1 through Team N.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {isTeamSetupFrozen ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold rounded-lg">
                      <Lock className="w-3.5 h-3.5" />
                      LOCKED (MATCH IN PROGRESS)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold rounded-lg">
                      <Unlock className="w-3.5 h-3.5" />
                      CONFIGURABLE
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[4, 5, 6].map((count) => {
                  const isSelected = teamCount === count;
                  return (
                    <button
                      key={count}
                      onClick={() => !isTeamSetupFrozen && handleSetTeamCount(count)}
                      disabled={isTeamSetupFrozen}
                      className={`relative p-4 rounded-xl font-mono text-center transition-all border ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                          : isTeamSetupFrozen
                          ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xl font-black">{count} TEAMS</div>
                      <div className="text-[11px] font-medium opacity-80 mt-1">
                        Team 1 .. Team {count}
                      </div>
                      {isSelected && (
                        <div className="mt-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/20 py-0.5 px-2 rounded-full inline-block">
                          ACTIVE
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {isTeamSetupFrozen && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>Team count is locked while the match is underway. Reset match in Lobby to reconfigure.</span>
                </div>
              )}
            </div>

            {/* 2. DYNAMIC SCORING SETTINGS */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  DYNAMIC SCORING CONFIGURATION
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  1st through 4th place award standard tournament points. 5th and 6th place points are dynamically applied when 5 or 6 teams participate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-violet-300">
                      5th Place Points (Team 5 & 6 games)
                    </label>
                    <span className="text-xs font-mono font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {adminState?.settings?.fifthPlacePoints ?? 5} PTS
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={adminState?.settings?.fifthPlacePoints ?? 5}
                    onChange={(e) => handleUpdateSettings({ fifthPlacePoints: parseInt(e.target.value, 10) })}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0 PTS (No points)</span>
                    <span>Default: 5 PTS</span>
                    <span>15 PTS</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-sky-300">
                      6th Place Points (Team 6 games)
                    </label>
                    <span className="text-xs font-mono font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {adminState?.settings?.sixthPlacePoints ?? 3} PTS
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={adminState?.settings?.sixthPlacePoints ?? 3}
                    onChange={(e) => handleUpdateSettings({ sixthPlacePoints: parseInt(e.target.value, 10) })}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>0 PTS (No points)</span>
                    <span>Default: 3 PTS</span>
                    <span>10 PTS</span>
                  </div>
                </div>
              </div>

              {/* POINTS REFERENCE LADDER */}
              <div className="rounded-xl bg-[#090D16] border border-slate-800/80 p-4 space-y-3">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  ACTIVE TOURNAMENT SCORING SCALE
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="pb-2">ROUND</th>
                        <th className="pb-2 text-emerald-400">1ST</th>
                        <th className="pb-2 text-blue-400">2ND</th>
                        <th className="pb-2 text-amber-400">3RD</th>
                        <th className="pb-2 text-red-400">4TH</th>
                        <th className="pb-2 text-violet-400">5TH (NEW)</th>
                        <th className="pb-2 text-sky-400">6TH (NEW)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="py-2 font-bold text-white">R1: Clue Hunt (Easy/Med/Hard)</td>
                        <td className="py-2 text-emerald-300 font-bold">30 / 20 / 10</td>
                        <td className="py-2 text-blue-300 font-bold">20 / 15 / 8</td>
                        <td className="py-2 text-amber-300 font-bold">15 / 10 / 5</td>
                        <td className="py-2 text-red-300 font-bold">10 / 5 / 2</td>
                        <td className="py-2 text-violet-400 font-black">{adminState?.settings?.fifthPlacePoints ?? 5} PTS</td>
                        <td className="py-2 text-sky-400 font-black">{adminState?.settings?.sixthPlacePoints ?? 3} PTS</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-white">R2: Pattern Breaker</td>
                        <td className="py-2 text-emerald-300 font-bold">40 / 30 / 20</td>
                        <td className="py-2 text-blue-300 font-bold">30 / 22 / 15</td>
                        <td className="py-2 text-amber-300 font-bold">20 / 15 / 10</td>
                        <td className="py-2 text-red-300 font-bold">10 / 7 / 5</td>
                        <td className="py-2 text-violet-400 font-black">{adminState?.settings?.fifthPlacePoints ?? 5} PTS</td>
                        <td className="py-2 text-sky-400 font-black">{adminState?.settings?.sixthPlacePoints ?? 3} PTS</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-bold text-white">R3: Final Challenge</td>
                        <td className="py-2 text-emerald-300 font-bold">50 / 35 / 20</td>
                        <td className="py-2 text-blue-300 font-bold">35 / 25 / 15</td>
                        <td className="py-2 text-amber-300 font-bold">25 / 18 / 10</td>
                        <td className="py-2 text-red-300 font-bold">15 / 10 / 5</td>
                        <td className="py-2 text-violet-400 font-black">{adminState?.settings?.fifthPlacePoints ?? 5} PTS</td>
                        <td className="py-2 text-sky-400 font-black">{adminState?.settings?.sixthPlacePoints ?? 3} PTS</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 3. TIMERS & COOLDOWN */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  TIMERS & COOLDOWN CONTROLS
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Adjust default question countdown limits and lockout duration on incorrect submissions.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-slate-300 block font-bold uppercase">
                      ROUND 1 (CLUE HUNT)
                    </label>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {adminState?.settings?.round1TimerDuration ?? 30}s
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[15, 20, 30, 45, 60].map((dur) => {
                      const isSelected = (adminState?.settings?.round1TimerDuration ?? 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleSetRoundTiming(1, dur)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-slate-300 block font-bold uppercase">
                      ROUND 2 (PATTERN BREAK)
                    </label>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      {adminState?.settings?.round2TimerDuration ?? 30}s
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[15, 20, 30, 45, 60].map((dur) => {
                      const isSelected = (adminState?.settings?.round2TimerDuration ?? 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleSetRoundTiming(2, dur)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-slate-300 block font-bold uppercase">
                      ROUND 3 (CODE CRACKER)
                    </label>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {adminState?.settings?.round3TimerDuration ?? 30}s
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[15, 20, 30, 45, 60].map((dur) => {
                      const isSelected = (adminState?.settings?.round3TimerDuration ?? 30) === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => handleSetRoundTiming(3, dur)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#090D16] border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-mono text-slate-400 block font-bold">
                    WRONG COOLDOWN
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="2"
                      max="30"
                      value={adminState?.settings?.cooldownSeconds ?? 5}
                      onChange={(e) => handleUpdateSettings({ cooldownSeconds: parseInt(e.target.value, 10) || 5 })}
                      className="w-20 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs font-mono text-slate-400">seconds</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PENALTY & AUDIO TOGGLES */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800/80 pb-4">
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  MATCH RULES & AUDIO
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <div>
                  <span className="text-sm font-mono font-bold text-white block">
                    Round 3 Wrong Answer Penalty
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Deduct 5 PTS for incorrect answers in the high-stakes final round.
                  </span>
                </div>
                <button
                  onClick={() => handleUpdateSettings({ r3PenaltyEnabled: !adminState?.settings?.r3PenaltyEnabled })}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all border ${
                    adminState?.settings?.r3PenaltyEnabled
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {adminState?.settings?.r3PenaltyEnabled ? 'PENALTY ENABLED (-5 PTS)' : 'PENALTY DISABLED'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#090D16] border border-slate-800">
                <div>
                  <span className="text-sm font-mono font-bold text-white block">
                    Sound Effects
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Play audio cues for buzzer, countdown timer, correct answers, and winner fanfares.
                  </span>
                </div>
                <button
                  onClick={() => {
                    const nextSound = !(adminState?.settings?.soundEnabled ?? soundEnabled);
                    setSoundEnabled(nextSound);
                    handleUpdateSettings({ soundEnabled: nextSound });
                  }}
                  className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all border ${
                    (adminState?.settings?.soundEnabled ?? soundEnabled)
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {(adminState?.settings?.soundEnabled ?? soundEnabled) ? (
                    <>
                      <Volume2 className="w-4 h-4" />
                      AUDIO ENABLED
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      AUDIO MUTED
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-mono">{confirmModal.title}</h3>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">{confirmModal.message}</p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl font-mono text-xs transition-all border border-slate-700"
              >
                CANCEL
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl font-mono text-xs transition-all shadow-lg shadow-amber-500/20"
              >
                {confirmModal.confirmText || 'CONFIRM ACTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTION PREVIEW MODAL */}
      {previewQuestion && (
        <QuestionPreviewModal
          question={previewQuestion}
          onClose={() => setPreviewQuestion(null)}
        />
      )}

      {/* QUESTION EDIT / ADD MODAL */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion.id ? editingQuestion : null}
          round={editingQuestion.round || 1}
          onSave={handleSaveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}

      {/* SELECTED TOURNAMENT QUESTIONS MODAL */}
      {showSelectedModal && (
        <SelectedQuestionsModal
          summary={adminState?.selectedQuestionsSummary}
          onClose={() => setShowSelectedModal(false)}
        />
      )}
    </div>
  );
}
