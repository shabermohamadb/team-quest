import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateRound1Points, calculateRound2Points, calculateRound3Points } from './scorer.js';
import { validateTextAnswer, validateOptionAnswer, validateReactionAnswer, validateCodeCrackerAnswer, isQuestionConfigured, isAnswerCorrect, normalizeTextAnswer } from './validator.js';
import { getEnforcedSafeHint } from './hintValidator.js';
import { participantManager } from './participantManager.js';
import { defaultStateStore } from './stateStore.js';
import { logRealtimeEvent } from './logger.js';
import { dbManager } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'game_history.json');

export const GAME_STATES = {
  LOBBY: 'LOBBY',
  START_COUNTDOWN: 'START_COUNTDOWN',
  // Round 1 — Clue Hunt
  ROUND_1_INTRO: 'ROUND_1_INTRO',
  ROUND_1_CLUE_1: 'ROUND_1_CLUE_1',
  ROUND_1_CLUE_2: 'ROUND_1_CLUE_2',
  ROUND_1_CLUE_3: 'ROUND_1_CLUE_3',
  ROUND_1_ANSWER_REVEAL: 'ROUND_1_ANSWER_REVEAL',
  ROUND_1_RESULT: 'ROUND_1_RESULT',
  ROUND_1_COMPLETE: 'ROUND_1_COMPLETE',
  // Round 2 — Pattern Break
  ROUND_2_INTRO: 'ROUND_2_INTRO',
  ROUND_2_ACTIVE: 'ROUND_2_ACTIVE',
  ROUND_2_RESULT: 'ROUND_2_RESULT',
  ROUND_2_COMPLETE: 'ROUND_2_COMPLETE',
  // Round 3 — Reaction Clash
  ROUND_3_INTRO: 'ROUND_3_INTRO',
  ROUND_3_ACTIVE: 'ROUND_3_ACTIVE',
  ROUND_3_RESULT: 'ROUND_3_RESULT',
  ROUND_3_COMPLETE: 'ROUND_3_COMPLETE',
  // Final Ceremony
  FINAL_RESULT: 'FINAL_RESULT',
  PAUSED: 'PAUSED',
  SKIPPED: 'SKIPPED',
  COMPLETED: 'COMPLETED'
};

export class GameManager {
  constructor(io, questionManager, teamManager) {
    this.io = io;
    this.questionManager = questionManager;
    this.teamManager = teamManager;
    this.participantManager = participantManager;

    this.gameCode = 'QUEST-2026';
    this.adminPin = 'admin123';
    this.gameSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    this.state = GAME_STATES.LOBBY;
    this.previousState = null;

    // Dynamic Team Count: 4 | 5 | 6 (default 4)
    this.teamCount = 4;
    this.teamManager.setTeamCount(this.teamCount);

    // Current Round Pointer: 1 | 2 | 3
    this.currentRoundNumber = 1;
    this.currentQuestionIndex = 0;
    this.round1TotalQuestions = 10;
    this.round2TotalQuestions = 10;
    this.round3TotalQuestions = 10;
    this.autoTransitionTimeout = null;
    this.questionConfigError = null;

    this.questionsFrozen = false;
    this.selectedRound1Questions = [];
    this.selectedRound2Questions = [];
    this.selectedRound3Questions = [];

    this.r1Questions = [];
    this.r2Patterns = [];
    this.r3CodeCrackers = [];
    this.r3Reactions = [];

    // Dynamic Scores, Locks & Cooldowns
    this._initTeamState();

    // Clue Progression (Round 1)
    this.activeClueNumber = 1;
    this.revealedClues = [true, false, false];

    // Reaction Timing (Round 3)
    this.reactionStartTime = 0;
    this.reactionClicks = []; // { team, reactionMs, isTarget }

    // Submissions for current round/question
    this.roundSubmissions = []; // { team, answer, isCorrect, rank, points, elapsedMs }

    // Timers
    this.timeRemaining = 30;
    this.timerInterval = null;
    this.clueStartedAt = null;
    this.clueDuration = 30;
    this.isTimerRunning = false;
    this.pausedRemaining = 30;
    this.startCountdownRemaining = 30;
    this.startCountdownInterval = null;
    this.resumeCountdownRemaining = 3;
    this.resumeCountdownInterval = null;

    // Configurable Settings (Supports configurable 5th/6th place points)
    this.settings = {
      round1TimerDuration: 30,
      round2TimerDuration: 30,
      round3TimerDuration: 30,
      cooldownSeconds: 5,
      fifthPlacePoints: 5,
      sixthPlacePoints: 3,
      r3PenaltyEnabled: false,
      r3PenaltyAmount: 5,
      soundEnabled: true
    };

    this.matchHistory = [];
    this.connectedSockets = new Map(); // socketId -> { team, isAdmin, isDisplay }
    this.adminTokens = new Set(); // Active authorized admin session tokens

    this.stateStore = defaultStateStore;
    this.stateVersion = 1;

    // Restore state from durable store if available
    const saved = this.stateStore.loadState();
    if (saved && saved.gameSessionId) {
      this._restoreFromStore(saved);
    }

    // Ensure active game and dynamic teams exist in authoritative SQLite DB
    try {
      dbManager.createGame({
        id: this.gameSessionId,
        gameCode: this.gameCode,
        teamCount: this.teamCount,
        status: this.state,
        currentRound: this.currentRoundNumber,
        currentQuestionIndex: this.currentQuestionIndex,
        currentClue: this.activeClueNumber
      });
      dbManager.syncTeams(this.gameSessionId, this.teamCount);
      const dbScores = dbManager.getTeamScores(this.gameSessionId);
      if (dbScores && dbScores.rows && dbScores.rows.length > 0) {
        for (const [t, s] of Object.entries(dbScores.scores)) {
          if (this.totalScores[t] === undefined || this.totalScores[t] === 0) {
            this.totalScores[t] = s;
          }
        }
        for (const [t, rs] of Object.entries(dbScores.roundScores)) {
          if (!this.roundScores[t] || (this.roundScores[t].r1 === 0 && this.roundScores[t].r2 === 0 && this.roundScores[t].r3 === 0)) {
            this.roundScores[t] = { ...rs };
          }
        }
      }
    } catch (err) {
      console.warn('[GameManager] Warning initializing SQLite game session:', err.message);
    }

    this.generateGameQuestions({ preserveFirstTestQuestion: true });
    this._saveToStore();
  }

  _saveToStore() {
    if (!this.stateStore) return;
    try {
      this.stateVersion += 1;
      this.stateStore.saveState({
        gameSessionId: this.gameSessionId,
        gameCode: this.gameCode,
        adminPin: this.adminPin,
        stateVersion: this.stateVersion,
        state: this.state,
        previousState: this.previousState,
        teamCount: this.teamCount,
        teams: this.teamManager.teams,
        totalScores: this.totalScores,
        roundScores: this.roundScores,
        teamLocks: this.teamLocks,
        teamSolvedAtClue: this.teamSolvedAtClue,
        teamCooldowns: this.teamCooldowns,
        teamSubmissionLocks: this.teamSubmissionLocks,
        currentRoundNumber: this.currentRoundNumber,
        currentQuestionIndex: this.currentQuestionIndex,
        activeClueNumber: this.activeClueNumber,
        revealedClues: this.revealedClues,
        timeRemaining: this.timeRemaining,
        clueStartedAt: this.clueStartedAt,
        clueDuration: this.clueDuration,
        isTimerRunning: this.isTimerRunning,
        isPaused: this.isPaused,
        pausedRemaining: this.pausedRemaining,
        questionsFrozen: this.questionsFrozen,
        selectedRound1Questions: this.selectedRound1Questions,
        selectedRound2Questions: this.selectedRound2Questions,
        selectedRound3Questions: this.selectedRound3Questions,
        roundSubmissions: this.roundSubmissions,
        finalResults: this.finalResults
      });

      // Keep SQLite games table in sync
      dbManager.updateGameState(this.gameSessionId, {
        status: this.state,
        teamCount: this.teamCount,
        currentRound: this.currentRoundNumber,
        currentQuestionIndex: this.currentQuestionIndex,
        currentClue: this.activeClueNumber,
        isPaused: this.isPaused,
        timerDuration: this.timeRemaining
      });
    } catch (e) {
      console.error('[GameManager] Failed to persist state to store/SQLite:', e.message);
    }
  }

  _restoreFromStore(saved) {
    try {
      this.gameSessionId = saved.gameSessionId || this.gameSessionId;
      this.state = saved.state || GAME_STATES.LOBBY;
      this.previousState = saved.previousState || null;
      this.stateVersion = saved.stateVersion || 1;
      if (saved.teamCount) {
        this.teamCount = saved.teamCount;
        this.teamManager.restoreTeams(saved.teams, saved.teamCount);
      }
      if (saved.totalScores) this.totalScores = { ...saved.totalScores };
      if (saved.roundScores) this.roundScores = { ...saved.roundScores };
      if (saved.teamLocks) this.teamLocks = { ...saved.teamLocks };
      if (saved.teamSolvedAtClue) this.teamSolvedAtClue = { ...saved.teamSolvedAtClue };
      if (saved.teamCooldowns) this.teamCooldowns = { ...saved.teamCooldowns };
      if (saved.teamSubmissionLocks) this.teamSubmissionLocks = { ...saved.teamSubmissionLocks };
      if (typeof saved.currentRoundNumber === 'number') this.currentRoundNumber = saved.currentRoundNumber;
      if (typeof saved.currentQuestionIndex === 'number') this.currentQuestionIndex = saved.currentQuestionIndex;
      if (typeof saved.activeClueNumber === 'number') this.activeClueNumber = saved.activeClueNumber;
      if (Array.isArray(saved.revealedClues)) this.revealedClues = [...saved.revealedClues];
      if (saved.selectedRound1Questions) this.selectedRound1Questions = saved.selectedRound1Questions;
      if (saved.selectedRound2Questions) this.selectedRound2Questions = saved.selectedRound2Questions;
      if (saved.selectedRound3Questions) this.selectedRound3Questions = saved.selectedRound3Questions;
      if (typeof saved.questionsFrozen === 'boolean') this.questionsFrozen = saved.questionsFrozen;
      if (Array.isArray(saved.roundSubmissions)) this.roundSubmissions = saved.roundSubmissions;
      if (saved.finalResults) this.finalResults = saved.finalResults;

      console.log(`[GameManager] Restored authoritative game state (${this.state}, Session: ${this.gameSessionId}, Teams: ${this.teamCount})`);
    } catch (e) {
      console.error('[GameManager] Error during state restoration:', e.message);
    }
  }

  _initTeamState() {
    this.totalScores = {};
    this.roundScores = {};
    this.teamLocks = {};
    this.teamSolvedAtClue = {};
    this.teamCooldowns = {};
    this.teamSubmissionLocks = {};
    for (let t = 1; t <= this.teamCount; t++) {
      this.totalScores[t] = 0;
      this.roundScores[t] = { r1: 0, r2: 0, r3: 0 };
      this.teamLocks[t] = false;
      this.teamSolvedAtClue[t] = null;
      this.teamCooldowns[t] = 0;
      this.teamSubmissionLocks[t] = false;
    }
  }

  setTeamCount(count) {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot change team count while game is in progress' };
    }
    const raw = (typeof count === 'object' && count !== null) ? (count.teamCount ?? count.count) : count;
    const num = Number(raw);
    if (![4, 5, 6].includes(num)) {
      return { success: false, error: 'Team count must be 4, 5, or 6' };
    }
    this.teamCount = num;
    this.teamManager.setTeamCount(num);
    this._initTeamState();

    try {
      dbManager.updateGameState(this.gameSessionId, { teamCount: num });
      dbManager.syncTeams(this.gameSessionId, num);
    } catch (e) {
      console.warn('[GameManager] Warning syncing teams in SQLite:', e.message);
    }

    this.broadcastState();
    console.log(`[GameManager] Dynamic team count set to ${num} TEAMS`);
    return { success: true, teamCount: num };
  }

  // ================= PARTICIPANT & ROSTER MANAGEMENT =================

  addParticipant(name) {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot modify participants while game is in progress' };
    }
    try {
      const p = this.participantManager.addParticipant(name);
      this.broadcastState();
      return { success: true, participant: p };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  addParticipantsBulk(names) {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot modify participants while game is in progress' };
    }
    try {
      const added = this.participantManager.addParticipantsBulk(names);
      this.broadcastState();
      return { success: true, count: added.length, addedCount: added.length, participants: added };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  updateParticipant(id, updates) {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot modify participants while game is in progress' };
    }
    try {
      const updated = this.participantManager.updateParticipant(id, updates);
      this.broadcastState();
      return { success: true, participant: updated };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  removeParticipant(id) {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot modify participants while game is in progress' };
    }
    const res = this.participantManager.removeParticipant(id);
    this.broadcastState();
    return res;
  }

  clearParticipants() {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot clear participants while game is in progress' };
    }
    const res = this.participantManager.clearParticipants();
    this.broadcastState();
    return res;
  }

  autoAssignTeams() {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot auto-assign teams while game is in progress' };
    }
    try {
      const result = this.participantManager.autoAssignTeams(this.teamCount);
      this.broadcastState();
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  shuffleTeams() {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot shuffle teams while game is in progress' };
    }
    try {
      const result = this.participantManager.shuffleTeams(this.teamCount);
      this.broadcastState();
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  moveParticipant(participantId, targetTeamId) {
    if (this.questionsFrozen || this.state !== GAME_STATES.LOBBY) {
      return { success: false, error: 'Cannot move participants while game is in progress' };
    }
    try {
      const p = this.participantManager.moveParticipant(participantId, targetTeamId);
      const result = this.participantManager.getRosters(this.teamCount);
      this.broadcastState();
      return { success: true, participant: p, ...result };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ================= ADMIN AUTH & CONNECTIONS =================

  handleSocketConnect(socket) {
    if (!this.connectedSockets.has(socket.id)) {
      this.connectedSockets.set(socket.id, {
        isAdmin: false,
        isDisplay: false,
        team: null
      });
    }
    socket.join(this.gameCode);

    // Section 12: Application-level Heartbeat
    socket.on('app_ping', (data) => {
      socket.emit('app_pong', {
        clientTimestamp: data?.timestamp || null,
        serverTime: Date.now(),
        stateVersion: this.stateVersion
      });
    });

    logRealtimeEvent('REALTIME_CONNECT', {
      gameId: this.gameSessionId,
      socketId: socket.id,
      state: this.state
    });

    // Immediately emit current sanitized state with active teamCount & teamsStatus
    const sockData = this.connectedSockets.get(socket.id);
    const team = sockData?.team || null;
    socket.emit('game_state_update', this.getPlayerSanitizedState(team));
  }

  generateAdminToken() {
    const token = 'admin_sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 14);
    this.adminTokens.add(token);
    return token;
  }

  isValidAdminToken(token) {
    if (!token || typeof token !== 'string') return false;
    return this.adminTokens.has(token);
  }

  revokeAdminToken(token) {
    if (token) {
      this.adminTokens.delete(token);
    }
  }

  handleAdminAuth(socket, { pin, token } = {}) {
    const isPinValid = Boolean(pin && pin === this.adminPin);
    const isTokenValid = Boolean(token && this.isValidAdminToken(token));

    // If pin provided, check it; if token provided, check it.
    // If neither was provided, or if the provided credentials fail, reject:
    if (!isPinValid && !isTokenValid) {
      return { success: false, error: 'Invalid Admin PIN or Session' };
    }

    const sessionToken = isTokenValid ? token : this.generateAdminToken();

    this.connectedSockets.set(socket.id, {
      isAdmin: true,
      isDisplay: false,
      team: null
    });
    socket.join('admin_room');
    socket.join(this.gameCode);
    this.sendAdminState(socket);
    return { success: true, role: 'admin', token: sessionToken };
  }

  handleDisplayJoin(socket) {
    this.connectedSockets.set(socket.id, {
      isAdmin: false,
      isDisplay: true,
      team: null
    });
    socket.join('display_room');
    socket.join(this.gameCode);
    const displayState = this.getDisplayState();
    socket.emit('display_state_update', displayState);
    socket.emit('game_state_update', displayState);
  }

  handlePlayerJoin(socket, payload = {}) {
    const gameCode = payload.gameCode;
    const team = payload.team ?? payload.teamId;
    if (gameCode && gameCode.trim().toUpperCase() !== this.gameCode) {
      return { success: false, error: 'Invalid Game Code' };
    }

    const tid = Number(team);
    const joinResult = this.teamManager.joinTeam(tid, socket.id, this.gameSessionId);

    if (!joinResult.success) {
      return joinResult;
    }

    this.connectedSockets.set(socket.id, {
      isAdmin: false,
      isDisplay: false,
      team: tid,
      sessionToken: joinResult.sessionToken,
      gameSessionId: this.gameSessionId
    });

    socket.join(`team_${tid}`);
    socket.join(this.gameCode);

    logRealtimeEvent('TEAM_JOIN', {
      gameId: this.gameSessionId,
      teamId: tid,
      socketId: socket.id,
      state: this.state
    });

    // Immediately broadcast updated team readiness
    this.broadcastState();

    return {
      success: true,
      team: tid,
      sessionToken: joinResult.sessionToken,
      gameSessionId: this.gameSessionId,
      reconnected: false
    };
  }

  handlePlayerReconnect(socket, { team, sessionToken, gameSessionId, lastKnownStateVersion }) {
    const tid = Number(team);
    const reconnResult = this.teamManager.reconnectTeam(
      tid,
      sessionToken,
      gameSessionId,
      socket.id,
      this.gameSessionId
    );

    if (!reconnResult.success) {
      logRealtimeEvent('TEAM_RECONNECT', {
        gameId: this.gameSessionId,
        teamId: tid,
        socketId: socket.id,
        state: this.state,
        details: { success: false, error: reconnResult.error }
      });
      return reconnResult;
    }

    // Section 14: Disconnect previous superseded socket if still alive
    if (reconnResult.previousSocketId && reconnResult.previousSocketId !== socket.id) {
      try {
        const oldSocket = this.io.sockets.sockets.get(reconnResult.previousSocketId);
        if (oldSocket) {
          oldSocket.emit('superseded_session', { message: 'Session reconnected from another tab or window' });
          oldSocket.disconnect(true);
        }
        this.connectedSockets.delete(reconnResult.previousSocketId);
      } catch (_) {}
    }

    this.connectedSockets.set(socket.id, {
      isAdmin: false,
      isDisplay: false,
      team: tid,
      sessionToken: reconnResult.sessionToken,
      gameSessionId: this.gameSessionId
    });

    socket.join(`team_${tid}`);
    socket.join(this.gameCode);

    this.broadcastState();

    logRealtimeEvent('TEAM_RECONNECT', {
      gameId: this.gameSessionId,
      teamId: tid,
      socketId: socket.id,
      state: this.state,
      details: { success: true }
    });
    logRealtimeEvent('REALTIME_RECONNECT', {
      gameId: this.gameSessionId,
      teamId: tid,
      socketId: socket.id,
      state: this.state
    });

    return {
      success: true,
      team: tid,
      sessionToken: reconnResult.sessionToken,
      gameSessionId: this.gameSessionId,
      stateVersion: this.stateVersion,
      gameState: this.getPlayerSanitizedState(tid),
      reconnected: true
    };
  }

  handleDisconnect(socket) {
    const sockData = this.connectedSockets.get(socket.id);
    const tid = sockData?.team || null;
    this.teamManager.handleDisconnect(socket.id);
    this.connectedSockets.delete(socket.id);
    this.broadcastState();

    logRealtimeEvent('REALTIME_DISCONNECT', {
      gameId: this.gameSessionId,
      teamId: tid,
      socketId: socket.id,
      state: this.state
    });
  }

  // ================= QUESTION SELECTION & GAME HISTORY =================

  getRecentQuestionHistory(limitMatches = 3) {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
        const history = JSON.parse(raw);
        if (Array.isArray(history)) {
          const recentMatches = history.slice(-limitMatches);
          const usedIds = [];
          for (const m of recentMatches) {
            if (m.selectedQuestions) {
              if (m.selectedQuestions.round1) usedIds.push(...m.selectedQuestions.round1);
              if (m.selectedQuestions.round2) usedIds.push(...m.selectedQuestions.round2);
              if (m.selectedQuestions.round3) usedIds.push(...m.selectedQuestions.round3);
            }
          }
          return usedIds;
        }
      }
    } catch (e) {
      console.warn('[GameManager] Could not load game history:', e);
    }
    return [];
  }

  generateGameQuestions(options = {}) {
    if (this.questionsFrozen) {
      return { success: false, reason: 'Game has already started; questions are frozen' };
    }

    const recentHistory = this.getRecentQuestionHistory(3);
    const preserveFirstTestQuestion = options.preserveFirstTestQuestion ?? true;

    this.selectedRound1Questions = this.questionManager.selectQuestionsForGame(1, this.round1TotalQuestions || 10, recentHistory, { preserveFirstTestQuestion });
    this.selectedRound2Questions = this.questionManager.selectQuestionsForGame(2, this.round2TotalQuestions || 10, recentHistory, { preserveFirstTestQuestion });
    this.selectedRound3Questions = this.questionManager.selectQuestionsForGame(3, this.round3TotalQuestions || 10, recentHistory, { preserveFirstTestQuestion });

    this.r1Questions = this.selectedRound1Questions;
    this.r2Patterns = this.selectedRound2Questions;
    this.r3CodeCrackers = this.selectedRound3Questions;
    this.r3Reactions = this.r3CodeCrackers;

    console.log(`[GameManager] Selected 30 challenges for session ${this.gameSessionId} (10 R1, 10 R2, 10 R3)`);
    if (this.io) {
      this.broadcastState();
    }
    return {
      success: true,
      counts: {
        round1: this.selectedRound1Questions.length,
        round2: this.selectedRound2Questions.length,
        round3: this.selectedRound3Questions.length
      }
    };
  }

  regenerateGameQuestions() {
    if (this.questionsFrozen) {
      return { success: false, reason: 'Questions are frozen; cannot regenerate during an active game' };
    }
    return this.generateGameQuestions({ preserveFirstTestQuestion: false });
  }

  saveGameHistoryRecord() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      let history = [];
      if (fs.existsSync(HISTORY_FILE)) {
        try {
          history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
          if (!Array.isArray(history)) history = [];
        } catch (e) {
          history = [];
        }
      }
      const record = {
        sessionId: this.gameSessionId,
        teamCount: this.teamCount,
        completedAt: new Date().toISOString(),
        selectedQuestions: {
          round1: (this.selectedRound1Questions || []).map(q => q.id),
          round2: (this.selectedRound2Questions || []).map(q => q.id),
          round3: (this.selectedRound3Questions || []).map(q => q.id)
        },
        scores: { ...this.totalScores },
        winner: this.getFinalWinnerInfo()?.winner || null
      };
      history.push(record);
      if (history.length > 50) history = history.slice(-50);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
      console.log(`[GameManager] Game history record saved for session ${this.gameSessionId}`);

      // Save to SQLite game_history
      try {
        const winnerInfo = this.getFinalWinnerInfo();
        dbManager.saveGameFinalResult({
          gameId: this.gameSessionId,
          gameCode: this.gameCode,
          teamCount: this.teamCount,
          round1Scores: Object.fromEntries(Object.entries(this.roundScores).map(([t, s]) => [t, s.r1])),
          round2Scores: Object.fromEntries(Object.entries(this.roundScores).map(([t, s]) => [t, s.r2])),
          round3Scores: Object.fromEntries(Object.entries(this.roundScores).map(([t, s]) => [t, s.r3])),
          finalScores: { ...this.totalScores },
          winner: winnerInfo?.winner ? `Team ${winnerInfo.winner}` : 'TIE',
          winnerDetails: winnerInfo || {},
          completedAt: record.completedAt
        });
      } catch (dbErr) {
        console.error('[DB] Error saving game history to SQLite:', dbErr.message);
      }
    } catch (err) {
      console.error('[GameManager] Failed to save game history record:', err);
    }
  }

  // ================= GAME LIFECYCLE & TIMERS =================

  startGame() {
    if (this.startCountdownInterval) clearInterval(this.startCountdownInterval);
    this.stopTimer();

    // Freeze questions for this entire match
    this.questionsFrozen = true;
    console.log('[SERVER] Game state changed to STARTING (Selected questions frozen)');
    this.state = GAME_STATES.START_COUNTDOWN;
    this.startCountdownRemaining = 3;
    this.roundSkipped = null;
    this.timeRemaining = 30;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();

    this.startCountdownInterval = setInterval(() => {
      this.startCountdownRemaining -= 1;
      const tickData = { secondsRemaining: this.startCountdownRemaining };
      this.io.to(this.gameCode).emit('start_countdown_tick', tickData);
      this.io.to('admin_room').emit('start_countdown_tick', tickData);

      if (this.startCountdownRemaining < 0) {
        clearInterval(this.startCountdownInterval);
        this.startCountdownInterval = null;
        this.startRound1Sequence();
      }
    }, 1000);
  }

  clearAutoTransitions() {
    if (this.autoTransitionTimeout) {
      clearTimeout(this.autoTransitionTimeout);
      this.autoTransitionTimeout = null;
    }
  }

  // ---------------- ROUND 1: CLUE HUNT (10 QUESTIONS) ----------------

  startRound1Sequence() {
    this.roundSkipped = null;
    this.currentRoundNumber = 1;
    this.currentQuestionIndex = 0;
    this.startRound1Question(0);
  }

  startRound1Question(index) {
    this.stopTimer();
    this.clearAutoTransitions();
    this.currentRoundNumber = 1;
    this.currentQuestionIndex = index;
    this.resetQuestionState();

    const q = this.getCurrentRound1Question();
    const configCheck = isQuestionConfigured(q, 1);
    this.questionConfigError = configCheck.isValid ? null : `Question ${index + 1} Error: ${configCheck.reason}`;
    if (!configCheck.isValid) {
      console.error(`[SERVER CONFIG ERROR] ${this.questionConfigError}`);
    }

    this.state = GAME_STATES.ROUND_1_INTRO;
    this.timeRemaining = this.settings.round1TimerDuration;
    this.clueStartedAt = null;
    this.clueDuration = this.settings.round1TimerDuration;
    this.isTimerRunning = false;
    console.log(`[SERVER] Game state changed to ROUND_1_INTRO (Question ${index + 1})`);
    this.broadcastState();

    this.autoTransitionTimeout = setTimeout(() => {
      this.startRound1Clue1();
    }, 2000); // 2-second intro / difficulty animation
  }

  startRound1Clue1() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_1_CLUE_1;
    this.activeClueNumber = 1;
    this.revealedClues = [true, false, false];
    console.log('[SERVER] Game state changed to ROUND_1_CLUE_1 (LIVE)');

    this.startChallengeTimer(this.settings.round1TimerDuration, () => {
      // Clue 1 expired -> automatically move to Clue 2
      this.startRound1Clue2();
    });
    this.broadcastState();
  }

  startRound1Clue2() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_1_CLUE_2;
    this.activeClueNumber = 2;
    this.revealedClues = [true, true, false];
    console.log('[SERVER] Game state changed to ROUND_1_CLUE_2 (LIVE)');

    this.startChallengeTimer(this.settings.round1TimerDuration, () => {
      // Clue 2 expired -> automatically move to Clue 3
      this.startRound1Clue3();
    });
    this.broadcastState();
  }

  revealClue2() {
    this.startRound1Clue2();
  }

  startRound1Clue3() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_1_CLUE_3;
    this.activeClueNumber = 3;
    this.revealedClues = [true, true, true];
    console.log('[SERVER] Game state changed to ROUND_1_CLUE_3 (LIVE)');

    this.startChallengeTimer(this.settings.round1TimerDuration, () => {
      // Clue 3 expired -> automatically reveal answer
      this.revealRound1Answer();
    });
    this.broadcastState();
  }

  revealClue3() {
    this.startRound1Clue3();
  }

  revealRound1Answer() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.revealedClues = [true, true, true];
    this.state = GAME_STATES.ROUND_1_ANSWER_REVEAL;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastTimerTick();
    this.broadcastState();

    // After 3.5s answer reveal, show question results
    this.autoTransitionTimeout = setTimeout(() => {
      this.showRound1Result();
    }, 3500);
  }

  revealRound1AnswerEarly() {
    // Admin clicked [SHOW ANSWER] early
    this.revealRound1Answer();
  }

  showRound1Result() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_1_RESULT;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();

    // After 4s question result screen, automatically advance to next question
    this.autoTransitionTimeout = setTimeout(() => {
      if (this.currentQuestionIndex + 1 < this.round1TotalQuestions) {
        this.startRound1Question(this.currentQuestionIndex + 1);
      } else {
        // Question 10 finished! Conclude Round 1, wait for Admin
        this.completeRound1();
      }
    }, 4000);
  }

  completeRound1() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_1_COMPLETE;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();
  }

  // ---------------- ROUND 2: PATTERN BREAK (10 CHALLENGES) ----------------

  startRound2Sequence() {
    this.roundSkipped = null;
    this.currentRoundNumber = 2;
    this.currentQuestionIndex = 0;
    this.startRound2Question(0);
  }

  startRound2Question(index) {
    this.stopTimer();
    this.clearAutoTransitions();
    this.currentRoundNumber = 2;
    this.currentQuestionIndex = index;
    this.resetQuestionState();

    const p = this.getCurrentRound2Pattern();
    const configCheck = isQuestionConfigured(p, 2);
    this.questionConfigError = configCheck.isValid ? null : `Pattern ${index + 1} Error: ${configCheck.reason}`;
    if (!configCheck.isValid) {
      console.error(`[SERVER CONFIG ERROR] ${this.questionConfigError}`);
    }

    this.state = GAME_STATES.ROUND_2_INTRO;
    this.timeRemaining = this.settings.round2TimerDuration;
    this.clueStartedAt = null;
    this.clueDuration = this.settings.round2TimerDuration;
    this.isTimerRunning = false;
    this.broadcastState();

    this.autoTransitionTimeout = setTimeout(() => {
      this.startRound2Active();
    }, 2000);
  }

  startRound2Active() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_2_ACTIVE;
    console.log('[SERVER] Game state changed to ROUND_2_ACTIVE (LIVE)');

    this.startChallengeTimer(this.settings.round2TimerDuration, () => {
      this.showRound2Result();
    });
    this.broadcastState();
  }

  showRound2Result() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_2_RESULT;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();

    this.autoTransitionTimeout = setTimeout(() => {
      if (this.currentQuestionIndex + 1 < this.round2TotalQuestions) {
        this.startRound2Question(this.currentQuestionIndex + 1);
      } else {
        this.completeRound2();
      }
    }, 4000);
  }

  completeRound2() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_2_COMPLETE;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();
  }

  // ---------------- ROUND 3: CODE CRACKER (10 CHALLENGES) ----------------

  startRound3Sequence() {
    this.roundSkipped = null;
    this.currentRoundNumber = 3;
    this.currentQuestionIndex = 0;
    this.startRound3Question(0);
  }

  startRound3Question(index) {
    this.stopTimer();
    this.clearAutoTransitions();
    this.currentRoundNumber = 3;
    this.currentQuestionIndex = index;
    this.resetQuestionState();

    const c = this.getCurrentRound3CodeCracker();
    const configCheck = isQuestionConfigured(c, 3);
    this.questionConfigError = configCheck.isValid ? null : `Code Cracker ${index + 1} Error: ${configCheck.reason}`;
    if (!configCheck.isValid) {
      console.error(`[SERVER CONFIG ERROR] ${this.questionConfigError}`);
    }

    const duration = this.settings.round3TimerDuration || 30;
    this.state = GAME_STATES.ROUND_3_INTRO;
    this.timeRemaining = duration;
    this.clueStartedAt = null;
    this.clueDuration = duration;
    this.isTimerRunning = false;
    this.broadcastState();

    this.autoTransitionTimeout = setTimeout(() => {
      this.startRound3Active();
    }, 2500);
  }

  startRound3Active() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_3_ACTIVE;
    console.log('[SERVER] Game state changed to ROUND_3_ACTIVE (LIVE)');

    const duration = this.settings.round3TimerDuration || 30;

    this.startChallengeTimer(duration, () => {
      this.showRound3Result();
    });
    this.broadcastState();
  }

  showRound3Result() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_3_RESULT;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();

    this.autoTransitionTimeout = setTimeout(() => {
      if (this.currentQuestionIndex + 1 < this.round3TotalQuestions) {
        this.startRound3Question(this.currentQuestionIndex + 1);
      } else {
        this.completeRound3();
      }
    }, 4000);
  }

  completeRound3() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_3_COMPLETE;
    this.timeRemaining = 0;
    this.clueStartedAt = null;
    this.isTimerRunning = false;
    this.broadcastState();
  }

  // ---------------- FINAL RESULTS & TIEBREAKER ----------------

  getFinalWinnerInfo() {
    const teamsList = [];
    const teamScores = {};
    for (let tid = 1; tid <= this.teamCount; tid++) {
      const r1 = this.roundScores[tid]?.r1 || 0;
      const r2 = this.roundScores[tid]?.r2 || 0;
      const r3 = this.roundScores[tid]?.r3 || 0;
      const total = r1 + r2 + r3;
      const item = { team: tid, r1, r2, r3, total };
      teamsList.push(item);
      teamScores[tid] = item;
    }

    const sorted = [...teamsList].sort((a, b) => b.total - a.total);
    const topScore = sorted[0]?.total || 0;
    const topTeams = sorted.filter(t => t.total === topScore);
    const isTie = topTeams.length > 1;

    return {
      isTie,
      topScore,
      tiedTeams: isTie ? topTeams.map(t => t.team) : [],
      winner: isTie ? null : sorted[0]?.team,
      winnerScore: isTie ? null : topScore,
      standings: sorted,
      teamScores
    };
  }

  showFinalResults() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.FINAL_RESULT;
    this.saveGameHistoryRecord();
    this.broadcastState();
  }

  startTiebreaker() {
    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.ROUND_3_ACTIVE;
    this.currentRoundNumber = 3;
    this.resetQuestionState();
    const duration = 45;
    this.clueDuration = duration;
    this.timeRemaining = duration;
    this.startChallengeTimer(duration, () => {
      this.showFinalResults();
    });
    this.broadcastState();
  }

  // ---------------- PAUSE, RESUME, SKIP ----------------

  pauseGame() {
    if (this.state === GAME_STATES.PAUSED || this.state === GAME_STATES.LOBBY || this.state === GAME_STATES.FINAL_RESULT) return;

    this.previousState = this.state;
    if (this.isTimerRunning && this.clueStartedAt) {
      const elapsedSec = (Date.now() - this.clueStartedAt) / 1000;
      this.pausedRemaining = Math.max(0, Math.ceil(this.clueDuration - elapsedSec));
      this.timeRemaining = this.pausedRemaining;
    } else {
      this.pausedRemaining = this.timeRemaining;
    }

    this.stopTimer();
    this.clearAutoTransitions();
    this.state = GAME_STATES.PAUSED;
    this.broadcastTimerTick();
    this.broadcastState();
  }

  resumeGame() {
    if (this.state !== GAME_STATES.PAUSED) return;

    if (this.resumeCountdownInterval) clearInterval(this.resumeCountdownInterval);
    this.resumeCountdownRemaining = 3;

    this.io.to(this.gameCode).emit('resume_countdown_tick', {
      secondsRemaining: this.resumeCountdownRemaining
    });
    this.io.to('admin_room').emit('resume_countdown_tick', {
      secondsRemaining: this.resumeCountdownRemaining
    });

    this.resumeCountdownInterval = setInterval(() => {
      this.resumeCountdownRemaining -= 1;
      const tickData = { secondsRemaining: this.resumeCountdownRemaining };
      this.io.to(this.gameCode).emit('resume_countdown_tick', tickData);
      this.io.to('admin_room').emit('resume_countdown_tick', tickData);

      if (this.resumeCountdownRemaining <= 0) {
        clearInterval(this.resumeCountdownInterval);
        this.resumeCountdownInterval = null;
        const targetState = this.previousState || GAME_STATES.ROUND_1_CLUE_1;
        this.state = targetState;

        if (targetState === GAME_STATES.ROUND_1_CLUE_1) {
          this.resumeTimer(() => this.startRound1Clue2());
        } else if (targetState === GAME_STATES.ROUND_1_CLUE_2) {
          this.resumeTimer(() => this.startRound1Clue3());
        } else if (targetState === GAME_STATES.ROUND_1_CLUE_3) {
          this.resumeTimer(() => this.revealRound1Answer());
        } else if (targetState === GAME_STATES.ROUND_1_ANSWER_REVEAL) {
          this.autoTransitionTimeout = setTimeout(() => this.showRound1Result(), 3000);
        } else if (targetState === GAME_STATES.ROUND_1_RESULT) {
          this.autoTransitionTimeout = setTimeout(() => {
            if (this.currentQuestionIndex + 1 < this.round1TotalQuestions) {
              this.startRound1Question(this.currentQuestionIndex + 1);
            } else {
              this.completeRound1();
            }
          }, 3000);
        } else if (targetState === GAME_STATES.ROUND_2_ACTIVE) {
          this.resumeTimer(() => this.showRound2Result());
        } else if (targetState === GAME_STATES.ROUND_2_RESULT) {
          this.autoTransitionTimeout = setTimeout(() => {
            if (this.currentQuestionIndex + 1 < this.round2TotalQuestions) {
              this.startRound2Question(this.currentQuestionIndex + 1);
            } else {
              this.completeRound2();
            }
          }, 3000);
        } else if (targetState === GAME_STATES.ROUND_3_ACTIVE) {
          this.resumeTimer(() => this.showRound3Result());
        } else if (targetState === GAME_STATES.ROUND_3_RESULT) {
          this.autoTransitionTimeout = setTimeout(() => {
            if (this.currentQuestionIndex + 1 < this.round3TotalQuestions) {
              this.startRound3Question(this.currentQuestionIndex + 1);
            } else {
              this.completeRound3();
            }
          }, 3000);
        } else {
          this.resumeTimer();
        }

        this.broadcastState();
      }
    }, 1000);
  }

  skipQuestion() {
    this.stopTimer();
    this.clearAutoTransitions();
    if (this.currentRoundNumber === 1) {
      if (this.currentQuestionIndex + 1 < this.round1TotalQuestions) {
        this.startRound1Question(this.currentQuestionIndex + 1);
      } else {
        this.completeRound1();
      }
    } else if (this.currentRoundNumber === 2) {
      if (this.currentQuestionIndex + 1 < this.round2TotalQuestions) {
        this.startRound2Question(this.currentQuestionIndex + 1);
      } else {
        this.completeRound2();
      }
    } else if (this.currentRoundNumber === 3) {
      if (this.currentQuestionIndex + 1 < this.round3TotalQuestions) {
        this.startRound3Question(this.currentQuestionIndex + 1);
      } else {
        this.completeRound3();
      }
    }
  }

  nextQuestion() {
    this.skipQuestion();
  }

  skipRound() {
    this.stopTimer();
    this.clearAutoTransitions();
    if (this.currentRoundNumber === 1) {
      this.roundSkipped = 1;
      this.completeRound1();
    } else if (this.currentRoundNumber === 2) {
      this.roundSkipped = 2;
      this.completeRound2();
    } else if (this.currentRoundNumber === 3) {
      this.roundSkipped = 3;
      this.completeRound3();
    }
  }

  resetGame() {
    this.stopTimer();
    if (this.startCountdownInterval) clearInterval(this.startCountdownInterval);
    if (this.resumeCountdownInterval) clearInterval(this.resumeCountdownInterval);
    this.clearAutoTransitions();

    // Generate a brand new game session ID to invalidate any stale client sessions
    this.gameSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

    // Completely release all teams and clear any active disconnect timers
    this.teamManager.resetAllTeams();

    // Clear player team claims while preserving active socket connections
    for (const [sId, sData] of this.connectedSockets.entries()) {
      if (!sData.isAdmin && !sData.isDisplay) {
        sData.team = null;
        sData.sessionToken = null;
      }
    }

    this.state = GAME_STATES.LOBBY;
    this.previousState = null;
    this.currentRoundNumber = 1;
    this.currentQuestionIndex = 0;
    this.roundSkipped = null;
    this._initTeamState();
    this.participantManager.resetAssignments();
    this.resetQuestionState();
    this.timeRemaining = 30;
    this.clueStartedAt = null;
    this.clueDuration = 30;
    this.isTimerRunning = false;
    this.pausedRemaining = 30;
    this.questionsFrozen = false;
    this.generateGameQuestions({ preserveFirstTestQuestion: true });

    // Notify all connected clients to wipe session storage and return to team select
    this.io.emit('game_session_reset', { gameSessionId: this.gameSessionId });

    this.broadcastState();
  }

  // ================= SUBMISSION HANDLERS =================

  // Round 1 Submission (Clue Hunt: Text Answer)
  submitRound1Answer(socket, payload = {}) {
    const sockData = this.connectedSockets.get(socket.id);
    if (!sockData || !sockData.team) {
      return { success: false, error: 'Not logged into any team' };
    }

    const team = sockData.team;
    const answer = typeof payload === 'string'
      ? payload
      : (payload.answer ?? payload.text ?? payload.value ?? payload.input ?? '');

    if (this.state === GAME_STATES.PAUSED) {
      return { success: false, error: 'Game is currently paused' };
    }

    if (![GAME_STATES.ROUND_1_CLUE_1, GAME_STATES.ROUND_1_CLUE_2, GAME_STATES.ROUND_1_CLUE_3].includes(this.state)) {
      return { success: false, error: 'Answer submission is closed for this round' };
    }

    if (this.teamLocks[team]) {
      return { success: false, error: `TEAM ${team} ALREADY SOLVED · LOCKED` };
    }

    // Cooldown check
    if (Date.now() < (this.teamCooldowns[team] || 0)) {
      const waitSec = Math.ceil((this.teamCooldowns[team] - Date.now()) / 1000);
      return { success: false, error: `Wait ${waitSec}s before retrying` };
    }

    // Atomic mutex lock
    if (this.teamSubmissionLocks[team]) {
      return { success: false, error: 'TEAM ANSWER ALREADY SUBMITTED' };
    }
    this.teamSubmissionLocks[team] = true;

    try {
      const q = this.getCurrentRound1Question();
      if (!q || !q.correctAnswer) {
        console.error('[VALIDATION ERROR] QUESTION CONFIGURATION ERROR: Round 1 question or correctAnswer is missing', q);
        return { success: false, error: 'QUESTION CONFIGURATION ERROR: Round 1 question or correctAnswer is missing' };
      }

      if (payload.questionId && q.id && payload.questionId !== q.id) {
        console.warn(`[VALIDATION MISMATCH] Submitted questionId "${payload.questionId}" does not match active questionId "${q.id}"`);
        return { success: false, error: 'SUBMISSION EXPIRED: Question has changed' };
      }

      const validation = validateTextAnswer(answer, q.correctAnswer, q.acceptedAnswers);
      const isCorrect = validation.isCorrect;

      // Authoritative server debug logs required for definitive verification
      console.log('[VALIDATION DEBUG] Question ID:', q.id);
      console.log('[VALIDATION DEBUG] Submitted:', answer);
      console.log('[VALIDATION DEBUG] Normalized Submitted:', normalizeTextAnswer(answer));
      console.log('[VALIDATION DEBUG] Correct:', q.correctAnswer);
      console.log('[VALIDATION DEBUG] Normalized Correct:', normalizeTextAnswer(q.correctAnswer));
      console.log('[VALIDATION DEBUG] Accepted Answers:', q.acceptedAnswers);
      console.log('[VALIDATION DEBUG] Match:', isCorrect);

      if (isCorrect) {
        // Calculate correct order rank (1st, 2nd, 3rd, 4th)
        const correctCount = this.roundSubmissions.filter(s => s.isCorrect).length;
        const rank = correctCount + 1;
        const points = calculateRound1Points(q.difficulty, this.activeClueNumber, rank, this.settings);

        this.teamLocks[team] = true;
        this.teamSolvedAtClue[team] = this.activeClueNumber;
        this.totalScores[team] += points;
        this.roundScores[team].r1 += points;

        // Persist score event & lock in SQLite
        try {
          dbManager.recordScoreEvent({
            gameId: this.gameSessionId,
            teamId: team,
            round: 1,
            questionId: q.id,
            clueNumber: this.activeClueNumber,
            points,
            isCorrect: 1,
            submittedAnswer: answer
          });
          dbManager.recordTeamLock({
            gameId: this.gameSessionId,
            teamId: team,
            questionId: q.id,
            status: 'SOLVED',
            solvedClue: this.activeClueNumber,
            pointsAwarded: points
          });
        } catch (dbErr) {
          console.error('[DB] Error recording Round 1 score/lock in SQLite:', dbErr.message);
        }

        const sub = {
          team,
          answer,
          isCorrect: true,
          rank,
          points,
          clueNumber: this.activeClueNumber,
          timestamp: Date.now()
        };
        this.roundSubmissions.push(sub);

        // Check if all active teams have solved early
        const allSolved = Array.from({ length: this.teamCount }, (_, i) => i + 1).every(t => this.teamLocks[t]);
        if (allSolved) {
          console.log(`[GameManager] All ${this.teamCount} teams have solved Question ${this.currentQuestionIndex + 1} early on Clue ${this.activeClueNumber}! Triggering immediate answer reveal.`);
          this.revealRound1Answer();
        } else {
          this.broadcastState();
        }

        return {
          success: true,
          isCorrect: true,
          points,
          rank
        };
      } else {
        // Record incorrect submission event in SQLite
        try {
          dbManager.recordScoreEvent({
            gameId: this.gameSessionId,
            teamId: team,
            round: 1,
            questionId: q.id,
            clueNumber: this.activeClueNumber,
            points: 0,
            isCorrect: 0,
            submittedAnswer: answer
          });
        } catch (dbErr) {
          console.error('[DB] Error recording Round 1 incorrect event in SQLite:', dbErr.message);
        }

        // Incorrect: 5s cooldown
        const cooldownDuration = this.settings.cooldownSeconds || 5;
        this.teamCooldowns[team] = Date.now() + (cooldownDuration * 1000);

        this.broadcastState();

        return {
          success: true,
          isCorrect: false,
          points: 0,
          cooldownSeconds: cooldownDuration
        };
      }
    } finally {
      this.teamSubmissionLocks[team] = false;
    }
  }

  // Round 2 Submission (Pattern Break: Options A, B, C, D)
  submitRound2Option(socket, payload = {}) {
    const sockData = this.connectedSockets.get(socket.id);
    if (!sockData || !sockData.team) {
      return { success: false, error: 'Not logged into any team' };
    }

    const team = sockData.team;

    if (this.state === GAME_STATES.PAUSED) {
      return { success: false, error: 'Game is currently paused' };
    }

    if (this.state !== GAME_STATES.ROUND_2_ACTIVE) {
      return { success: false, error: 'Pattern Break is not active' };
    }

    if (this.teamLocks[team]) {
      return { success: false, error: `TEAM ${team} ALREADY SUBMITTED · LOCKED` };
    }

    // Cooldown check
    if (Date.now() < (this.teamCooldowns[team] || 0)) {
      const waitSec = Math.ceil((this.teamCooldowns[team] - Date.now()) / 1000);
      return { success: false, error: `Wait ${waitSec}s before retrying` };
    }

    // Atomic mutex lock
    if (this.teamSubmissionLocks[team]) {
      return { success: false, error: 'TEAM OPTION ALREADY SUBMITTING' };
    }
    this.teamSubmissionLocks[team] = true;

    try {
      const selectedOptionId = typeof payload === 'string'
        ? payload
        : (payload.optionId || payload.optionKey || payload.option || payload.value || payload.id || '');
      const pattern = this.getCurrentRound2Pattern();
      const validation = validateOptionAnswer(selectedOptionId, pattern);
      const isCorrect = validation.isCorrect;

      if (isCorrect) {
        const correctCount = this.roundSubmissions.filter(s => s.isCorrect).length;
        const rank = correctCount + 1;
        const points = calculateRound2Points(pattern.difficulty, rank, this.settings);

        this.teamLocks[team] = true;
        this.totalScores[team] += points;
        this.roundScores[team].r2 += points;

        // Persist score event & lock in SQLite
        try {
          dbManager.recordScoreEvent({
            gameId: this.gameSessionId,
            teamId: team,
            round: 2,
            questionId: pattern.id,
            clueNumber: null,
            points,
            isCorrect: 1,
            submittedAnswer: validation.selectedOptionId || selectedOptionId
          });
          dbManager.recordTeamLock({
            gameId: this.gameSessionId,
            teamId: team,
            questionId: pattern.id,
            status: 'SOLVED',
            solvedClue: null,
            pointsAwarded: points
          });
        } catch (dbErr) {
          console.error('[DB] Error recording Round 2 score/lock in SQLite:', dbErr.message);
        }

        this.roundSubmissions.push({
          team,
          optionKey: validation.selectedOptionId || selectedOptionId,
          isCorrect: true,
          rank,
          points,
          timestamp: Date.now()
        });

        // Check if all active teams have solved early
        const allSolved = Array.from({ length: this.teamCount }, (_, i) => i + 1).every(t => this.teamLocks[t]);
        if (allSolved) {
          console.log(`[GameManager] All ${this.teamCount} teams have solved Pattern ${this.currentQuestionIndex + 1} early! Triggering immediate result.`);
          this.showRound2Result();
        } else {
          this.broadcastState();
        }

        return {
          success: true,
          isCorrect: true,
          points,
          rank
        };
      } else {
        // Record incorrect submission event in SQLite
        try {
          dbManager.recordScoreEvent({
            gameId: this.gameSessionId,
            teamId: team,
            round: 2,
            questionId: pattern.id,
            clueNumber: null,
            points: 0,
            isCorrect: 0,
            submittedAnswer: validation.selectedOptionId || selectedOptionId
          });
        } catch (dbErr) {
          console.error('[DB] Error recording Round 2 incorrect event in SQLite:', dbErr.message);
        }

        const cooldownDuration = this.settings.cooldownSeconds || 5;
        this.teamCooldowns[team] = Date.now() + (cooldownDuration * 1000);
        this.broadcastState();

        return {
          success: true,
          isCorrect: false,
          points: 0,
          cooldownSeconds: cooldownDuration
        };
      }
    } finally {
      this.teamSubmissionLocks[team] = false;
    }
  }

  // Round 3 Submission (Code Cracker: Text / Numerical / Cipher Code)
  submitRound3Code(socket, payload = {}) {
    const sockData = this.connectedSockets.get(socket.id);
    if (!sockData || !sockData.team) {
      return { success: false, error: 'Not logged into any team' };
    }

    const team = sockData.team;

    if (this.state === GAME_STATES.PAUSED) {
      return { success: false, error: 'Game is currently paused' };
    }

    if (this.state !== GAME_STATES.ROUND_3_ACTIVE) {
      return { success: false, error: 'Code Cracker is not active' };
    }

    if (this.teamLocks[team]) {
      return { success: false, error: `TEAM ${team} ALREADY CRACKED · LOCKED` };
    }

    // Cooldown check
    if (Date.now() < (this.teamCooldowns[team] || 0)) {
      const waitSec = Math.ceil((this.teamCooldowns[team] - Date.now()) / 1000);
      return { success: false, error: `Wait ${waitSec}s before retrying` };
    }

    // Atomic mutex lock
    if (this.teamSubmissionLocks[team]) {
      return { success: false, error: 'TEAM CODE ALREADY SUBMITTING' };
    }
    this.teamSubmissionLocks[team] = true;

    try {
      const challenge = this.getCurrentRound3CodeCracker();
      const code = typeof payload === 'string'
        ? payload
        : (payload.code ?? payload.answer ?? payload.text ?? payload.value ?? payload.input ?? '');

      if (!challenge || !challenge.correctCode) {
        console.error('[VALIDATION ERROR] Code Cracker challenge or correctCode is missing', challenge);
        return { success: false, error: 'CHALLENGE CONFIGURATION ERROR: Missing correctCode' };
      }

      if (payload.challengeId && challenge.id && payload.challengeId !== challenge.id) {
        return { success: false, error: 'SUBMISSION EXPIRED: Challenge has changed' };
      }

      const validation = validateCodeCrackerAnswer(code, challenge);
      const isCorrect = validation.isCorrect;

      console.log('[CODE CRACKER DEBUG] Challenge ID:', challenge.id);
      console.log('[CODE CRACKER DEBUG] Submitted:', code);
      console.log('[CODE CRACKER DEBUG] Target:', challenge.correctCode);
      console.log('[CODE CRACKER DEBUG] Match:', isCorrect);

      if (isCorrect) {
        const correctCount = this.roundSubmissions.filter(s => s.isCorrect).length;
        const rank = correctCount + 1;
        const points = calculateRound3Points(challenge.difficulty, rank, this.settings);

        this.teamLocks[team] = true;
        this.totalScores[team] += points;
        this.roundScores[team].r3 += points;

        // Persist score event & lock in SQLite
        try {
          dbManager.recordScoreEvent({
            gameId: this.gameSessionId,
            teamId: team,
            round: 3,
            questionId: challenge.id,
            clueNumber: null,
            points,
            isCorrect: 1,
            submittedAnswer: code
          });
          dbManager.recordTeamLock({
            gameId: this.gameSessionId,
            teamId: team,
            questionId: challenge.id,
            status: 'SOLVED',
            solvedClue: null,
            pointsAwarded: points
          });
        } catch (dbErr) {
          console.error('[DB] Error recording Round 3 score/lock in SQLite:', dbErr.message);
        }

        this.roundSubmissions.push({
          team,
          code,
          isCorrect: true,
          rank,
          points,
          timestamp: Date.now()
        });

        // Check if all active teams have solved early
        const allSolved = Array.from({ length: this.teamCount }, (_, i) => i + 1).every(t => this.teamLocks[t]);
        if (allSolved) {
          console.log(`[GameManager] All ${this.teamCount} teams have solved Code Cracker ${this.currentQuestionIndex + 1} early! Triggering immediate result.`);
          this.showRound3Result();
        } else {
          this.broadcastState();
        }

        return {
          success: true,
          isCorrect: true,
          points,
          rank
        };
      } else {
        // Record incorrect submission event in SQLite
        try {
          dbManager.recordScoreEvent({
            gameId: this.gameSessionId,
            teamId: team,
            round: 3,
            questionId: challenge.id,
            clueNumber: null,
            points: 0,
            isCorrect: 0,
            submittedAnswer: code
          });
        } catch (dbErr) {
          console.error('[DB] Error recording Round 3 incorrect event in SQLite:', dbErr.message);
        }

        const cooldownDuration = this.settings.cooldownSeconds || 5;
        this.teamCooldowns[team] = Date.now() + (cooldownDuration * 1000);
        this.broadcastState();

        return {
          success: true,
          isCorrect: false,
          points: 0,
          cooldownSeconds: cooldownDuration
        };
      }
    } finally {
      this.teamSubmissionLocks[team] = false;
    }
  }

  // Alias for backward compatibility
  submitRound3Reaction(socket, payload = {}) {
    return this.submitRound3Code(socket, payload);
  }

  getQuestionTeamStatuses() {
    const now = Date.now();
    const statuses = {};
    for (let team = 1; team <= this.teamCount; team++) {
      const isLocked = Boolean(this.teamLocks[team]);
      const solvedClue = this.teamSolvedAtClue ? this.teamSolvedAtClue[team] : null;
      const sub = this.roundSubmissions.find(s => s.team === team && s.isCorrect);
      const cooldownUntil = this.teamCooldowns[team] || 0;
      const cooldownSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

      if (isLocked) {
        const clueText = solvedClue ? `CLUE ${solvedClue}` : (sub?.clueNumber ? `CLUE ${sub.clueNumber}` : null);
        const pointsText = sub ? `(+${sub.points} pts)` : '';
        const label = clueText ? `✓ SOLVED (${clueText})` : '✓ SOLVED';
        const detail = clueText ? `SOLVED ON ${clueText} ${pointsText}`.trim() : `SOLVED ${pointsText}`.trim();
        statuses[team] = {
          state: 'SOLVED',
          label,
          detail,
          solvedAtClue: solvedClue || sub?.clueNumber || null,
          points: sub ? sub.points : 0,
          cooldownSec: 0
        };
      } else if (cooldownSec > 0) {
        statuses[team] = {
          state: 'COOLDOWN',
          label: `COOLDOWN (${cooldownSec}s)`,
          detail: `COOLDOWN (${cooldownSec}s)`,
          solvedAtClue: null,
          points: 0,
          cooldownSec
        };
      } else {
        statuses[team] = {
          state: 'ACTIVE',
          label: 'ACTIVE',
          detail: 'ACTIVE',
          solvedAtClue: null,
          points: 0,
          cooldownSec: 0
        };
      }
    }
    return statuses;
  }

  // ================= STATE GETTERS & SANITIZATION =================

  resetQuestionState() {
    this.teamLocks = {};
    this.teamCooldowns = {};
    this.teamSubmissionLocks = {};
    this.teamSolvedAtClue = {};
    for (let team = 1; team <= this.teamCount; team++) {
      this.teamLocks[team] = false;
      this.teamCooldowns[team] = 0;
      this.teamSubmissionLocks[team] = false;
      this.teamSolvedAtClue[team] = null;
    }
    this.roundSubmissions = [];
  }

  getCurrentRound1Question() {
    return this.r1Questions[this.currentQuestionIndex % this.r1Questions.length];
  }

  getCurrentRound2Pattern() {
    return this.r2Patterns[this.currentQuestionIndex % this.r2Patterns.length];
  }

  getCurrentRound3CodeCracker() {
    const list = this.r3CodeCrackers || this.questionManager.getRound3All();
    return list[this.currentQuestionIndex % list.length];
  }

  getCurrentRound3Reaction() {
    return this.getCurrentRound3CodeCracker();
  }

  // Strict Sanitized State for Player Screen:
  // MUST NOT contain scores, team rankings, other teams' points, or other teams' answer statuses
  getPlayerSanitizedState(playerTeam = null) {
    const isPaused = this.state === GAME_STATES.PAUSED;

    // Active Challenge Info based on Current Round
    let currentChallenge = null;

    if ([GAME_STATES.ROUND_1_INTRO, GAME_STATES.ROUND_1_CLUE_1, GAME_STATES.ROUND_1_CLUE_2, GAME_STATES.ROUND_1_CLUE_3, GAME_STATES.ROUND_1_ANSWER_REVEAL, GAME_STATES.ROUND_1_RESULT].includes(this.state)) {
      const q = this.getCurrentRound1Question();
      const isAnswerVisible = [GAME_STATES.ROUND_1_ANSWER_REVEAL, GAME_STATES.ROUND_1_RESULT, GAME_STATES.FINAL_RESULT].includes(this.state);

      const activeClues = [];
      if (this.revealedClues[0]) activeClues.push({ number: 1, text: q.clue1 });
      if (this.revealedClues[1]) activeClues.push({ number: 2, text: q.clue2 });
      if (this.revealedClues[2]) activeClues.push({ number: 3, text: q.clue3 });

      currentChallenge = {
        roundNumber: 1,
        domain: q.domain,
        difficulty: q.difficulty,
        activeClues,
        activeClueNumber: this.activeClueNumber,
        revealedAnswer: isAnswerVisible ? q.correctAnswer : null
      };
    } else if ([GAME_STATES.ROUND_2_INTRO, GAME_STATES.ROUND_2_ACTIVE, GAME_STATES.ROUND_2_RESULT].includes(this.state)) {
      const p = this.getCurrentRound2Pattern();
      const isAnswerVisible = [GAME_STATES.ROUND_2_RESULT, GAME_STATES.FINAL_RESULT].includes(this.state);

      currentChallenge = {
        roundNumber: 2,
        title: p.title,
        category: p.category,
        difficulty: p.difficulty,
        patternText: p.patternText,
        options: p.options, // [{ key: 'A', text: '48' }, ...]
        revealedOption: isAnswerVisible ? p.correctOption : null,
        explanation: isAnswerVisible ? p.explanation : null
      };
    } else if ([GAME_STATES.ROUND_3_INTRO, GAME_STATES.ROUND_3_ACTIVE, GAME_STATES.ROUND_3_RESULT].includes(this.state)) {
      const c = this.getCurrentRound3CodeCracker();
      const isAnswerVisible = [GAME_STATES.ROUND_3_RESULT, GAME_STATES.FINAL_RESULT].includes(this.state);

      currentChallenge = {
        id: c.id,
        roundNumber: 3,
        challengeNumber: this.currentQuestionIndex + 1,
        title: c.title,
        category: c.category,
        difficulty: c.difficulty,
        code: c.code || c.puzzle,
        puzzle: c.puzzle || c.code,
        hint: getEnforcedSafeHint(c),
        prompt: c.prompt,
        timeLimit: c.timeLimit || 45,
        revealedCode: isAnswerVisible ? (c.correctCode || c.correctAnswer) : null
      };
    }

    // Only player's OWN team status
    let myTeamData = null;
    if (playerTeam) {
      const isLocked = Boolean(this.teamLocks[playerTeam]);
      const solvedClue = (this.teamSolvedAtClue && this.teamSolvedAtClue[playerTeam]) || null;
      const mySub = this.roundSubmissions.find(s => s.team === playerTeam && s.isCorrect);
      const now = Date.now();
      const cooldownUntil = this.teamCooldowns[playerTeam] || 0;
      const cooldownRemaining = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

      let status = 'WAITING';
      if (isLocked) status = 'SOLVED';
      else if (cooldownRemaining > 0) status = 'WRONG';

      myTeamData = {
        id: playerTeam,
        isLocked,
        solvedAtClue: solvedClue || (mySub?.clueNumber) || null,
        cooldownRemaining,
        status,
        mySubmission: mySub ? {
          isCorrect: true,
          points: mySub.points,
          clueNumber: mySub.clueNumber || solvedClue
        } : null
      };
    }

    const totalQuestions = this.currentRoundNumber === 1
      ? this.round1TotalQuestions
      : (this.currentRoundNumber === 2 ? this.round2TotalQuestions : this.round3TotalQuestions);
    const questionNumber = this.currentQuestionIndex + 1;
    const formattedCounter = `QUESTION ${String(questionNumber).padStart(2, '0')} / ${String(totalQuestions).padStart(2, '0')}`;
    const isRoundComplete = [GAME_STATES.ROUND_1_COMPLETE, GAME_STATES.ROUND_2_COMPLETE, GAME_STATES.ROUND_3_COMPLETE].includes(this.state);

    return {
      gameCode: this.gameCode,
      gameSessionId: this.gameSessionId,
      state: this.state,
      isPaused,
      teamCount: this.teamCount,
      currentRoundNumber: this.currentRoundNumber,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions,
      questionNumber,
      formattedCounter,
      isRoundComplete,
      roundSkipped: this.roundSkipped,
      roundCompleteMessage: this.roundSkipped ? `ROUND ${this.roundSkipped} SKIPPED — Waiting for the admin...` : 'Waiting for the admin...',
      startCountdownRemaining: this.startCountdownRemaining,
      resumeCountdownRemaining: this.resumeCountdownRemaining,
      timeRemaining: Math.max(0, this.timeRemaining ?? 30),
      clueStartedAt: this.clueStartedAt,
      clueDuration: this.clueDuration,
      isTimerRunning: this.isTimerRunning,
      serverTime: Date.now(),
      currentChallenge,
      teamsStatus: this.teamManager.getPublicTeamStatus(),
      myTeam: myTeamData,
      finalResults: this.state === GAME_STATES.FINAL_RESULT ? this.getFinalWinnerInfo() : null
      // STRICTLY EXCLUDES: totalScores, roundScores, other teams' submissions, other teams' points, and participants/rosters
    };
  }

  // Display / Projector state (Live Leaderboard included)
  getDisplayState() {
    const isPaused = this.state === GAME_STATES.PAUSED;
    const playerBase = this.getPlayerSanitizedState(null);

    const r1Scores = {};
    const r2Scores = {};
    const r3Scores = {};
    for (let t = 1; t <= this.teamCount; t++) {
      r1Scores[t] = this.roundScores[t]?.r1 || 0;
      r2Scores[t] = this.roundScores[t]?.r2 || 0;
      r3Scores[t] = this.roundScores[t]?.r3 || 0;
    }

    return {
      ...playerBase,
      teamLocks: this.teamLocks,
      scores: this.totalScores,
      roundScores: this.roundScores,
      round1Scores: r1Scores,
      round2Scores: r2Scores,
      round3Scores: r3Scores,
      roundSubmissions: this.roundSubmissions.map(s => ({
        team: s.team,
        isCorrect: s.isCorrect,
        rank: s.rank,
        points: s.points,
        reactionMs: s.reactionMs
      }))
    };
  }

  // Full Administrative state (Cockpit Optimized: streams high-priority live controls, excludes bulk repo dumps)
  getAdminFullState() {
    const displayState = this.getDisplayState();
    const r3 = this.getCurrentRound3Reaction();

    return {
      ...displayState,
      teamCount: this.teamCount,
      adminPin: this.adminPin,
      // Active question objects for current round
      round1Question: this.getCurrentRound1Question(),
      round2Pattern: this.getCurrentRound2Pattern(),
      round3Challenge: r3,
      round3Reaction: r3 ? {
        ...r3,
        prompt: r3.title || r3.targetLabel || r3.prompt,
        target: r3.targetValue || r3.targetLabel || r3.correctCode
      } : null,
      // Active selected round questions (only the 10 chosen questions, not 50 repo dump)
      round1Questions: this.selectedRound1Questions || [],
      publicTeams: Object.values(this.teamManager.getPublicTeamStatus()).map(t => ({
        id: t.id,
        name: t.name,
        isOccupied: t.claimed,
        isConnected: t.connected
      })),
      activeClueNumber: this.activeClueNumber,
      startCountdownRemaining: this.startCountdownRemaining,
      timeRemaining: this.timeRemaining,
      settings: this.settings,
      teamManagerData: this.teamManager.teams,
      connectedClientsCount: this.connectedSockets.size,
      teamQuestionStatuses: this.getQuestionTeamStatuses(),
      teamLocks: this.teamLocks,
      teamCooldowns: this.teamCooldowns,
      questionConfigError: this.questionConfigError,
      finalResults: this.getFinalWinnerInfo(),
      questionsFrozen: this.questionsFrozen,
      teamSetupFrozen: this.questionsFrozen,
      participantCount: this.participantManager.getParticipants().length,
      questionBankStats: this.questionManager.getBankStats(),
      selectedQuestionsSummary: {
        round1: (this.selectedRound1Questions || []).map(q => ({ id: q.id, title: q.website || q.domain || q.id, difficulty: q.difficulty })),
        round2: (this.selectedRound2Questions || []).map(q => ({ id: q.id, title: q.title || q.category || q.id, difficulty: q.difficulty })),
        round3: (this.selectedRound3Questions || []).map(q => ({ id: q.id, title: q.title || q.category || q.id, difficulty: q.difficulty }))
      }
    };
  }

  getAdminParticipantsAndRosters() {
    return {
      success: true,
      participantCount: this.participantManager.getParticipants().length,
      participants: this.participantManager.getParticipants(),
      rosters: this.participantManager.getRosters(this.teamCount)
    };
  }

  broadcastState() {
    this._saveToStore();

    // 1. Admin room receives full administrative payload
    this.io.to('admin_room').emit('admin_state_update', this.getAdminFullState());

    // 2. Display room receives presentation payload (includes live leaderboard)
    const displayState = this.getDisplayState();
    this.io.to('display_room').emit('display_state_update', displayState);
    this.io.to('display_room').emit('game_state_update', displayState);

    // 3. Every connected socket (player or unjoined login/lobby screen) receives sanitized state
    const unjoinedState = this.getPlayerSanitizedState(null);
    for (const [socketId, sock] of this.io.sockets.sockets.entries()) {
      const socketData = this.connectedSockets.get(socketId);
      if (socketData?.isAdmin || socketData?.isDisplay) {
        continue;
      }
      if (socketData?.team) {
        sock.emit('game_state_update', this.getPlayerSanitizedState(socketData.team));
      } else {
        sock.emit('game_state_update', unjoinedState);
      }
    }
  }

  updateSettings(newSettings) {
    if (newSettings && typeof newSettings === 'object') {
      this.settings = { ...this.settings, ...newSettings };
      this.broadcastState();
    }
  }

  setRoundTiming(payload = {}) {
    const rawRound = payload.round ?? payload.roundNumber;
    const rawDur = payload.duration ?? payload.seconds ?? payload.time;
    const allowedDurations = [15, 20, 30, 45, 60];

    const dur = Number(rawDur);
    if (!allowedDurations.includes(dur)) {
      return { success: false, error: `Invalid duration: ${rawDur}. Allowed options: 15, 20, 30, 45, 60.` };
    }

    const round = Number(rawRound);
    if (round === 1) {
      this.settings.round1TimerDuration = dur;
    } else if (round === 2) {
      this.settings.round2TimerDuration = dur;
    } else if (round === 3) {
      this.settings.round3TimerDuration = dur;
    } else {
      return { success: false, error: `Invalid round: ${rawRound}. Allowed: 1, 2, 3.` };
    }

    console.log(`[GameManager] Round ${round} timing set to ${dur}s`);
    this.broadcastState();
    return { success: true, round, duration: dur, settings: this.settings };
  }

  sendAdminState(socket) {
    socket.emit('admin_state_update', this.getAdminFullState());
  }

  startChallengeTimer(durationSeconds, onExpire = null) {
    this.stopTimer();
    const duration = Math.max(1, durationSeconds || 30);
    this.clueDuration = duration;
    this.timeRemaining = duration;
    this.clueStartedAt = Date.now();
    this.isTimerRunning = true;

    // Broadcast immediate timer tick to establish sync across server, admin, players
    this.broadcastTimerTick();

    this.timerInterval = setInterval(() => {
      if (this.state === GAME_STATES.PAUSED) return;

      const elapsedSec = (Date.now() - this.clueStartedAt) / 1000;
      this.timeRemaining = Math.max(0, Math.ceil(this.clueDuration - elapsedSec));
      this.broadcastTimerTick();

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
    }, 1000);
  }

  resumeTimer(onExpire = null) {
    this.stopTimer();
    const remaining = Math.max(1, this.pausedRemaining || this.timeRemaining || 30);
    this.clueDuration = remaining;
    this.timeRemaining = remaining;
    this.clueStartedAt = Date.now();
    this.isTimerRunning = true;

    this.broadcastTimerTick();

    this.timerInterval = setInterval(() => {
      if (this.state === GAME_STATES.PAUSED) return;

      const elapsedSec = (Date.now() - this.clueStartedAt) / 1000;
      this.timeRemaining = Math.max(0, Math.ceil(this.clueDuration - elapsedSec));
      this.broadcastTimerTick();

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
    }, 1000);
  }

  startTimer(onExpire = null) {
    this.startChallengeTimer(this.timeRemaining || 30, onExpire);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  broadcastTimerTick() {
    const tickData = {
      timeRemaining: Math.max(0, this.timeRemaining ?? 0),
      clueStartedAt: this.clueStartedAt,
      clueDuration: this.clueDuration,
      isTimerRunning: this.isTimerRunning,
      isPaused: this.state === GAME_STATES.PAUSED,
      serverTime: Date.now()
    };
    this.io.to(this.gameCode).emit('timer_tick', tickData);
    this.io.to('admin_room').emit('timer_tick', tickData);
  }
}
