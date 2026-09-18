import fs from 'fs';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { QuestionManager } from './questionManager.js';
import { TeamManager } from './teamManager.js';
import { GameManager } from './gameManager.js';
import { participantManager } from './participantManager.js';
import { dbManager } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const configuredOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true; // Direct server-to-server, same-origin, or CLI/tools
  if (configuredOrigins.length === 0) return true; // Default permissive in dev
  if (configuredOrigins.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true; // Allow any Vercel deployment/preview
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Socket connection from disallowed origin: ${origin}`);
        callback(new Error('Disallowed by CORS origin policy'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Disallowed by CORS origin policy'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Initialize Domain Managers
const questionManager = new QuestionManager();
const teamManager = new TeamManager();
const gameManager = new GameManager(io, questionManager, teamManager);
teamManager.onStateChanged = () => gameManager.broadcastState();

// Static frontend serving
const distPath = path.join(__dirname, '..', 'dist');
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(distPath));
app.use(express.static(publicPath));

// REST APIs
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'TEAM QUEST',
    state: gameManager.state,
    teams: teamManager.getPublicTeamStatus()
  });
});

app.get('/api/teams', (req, res) => {
  res.json({
    teamCount: gameManager.teamCount,
    teams: teamManager.getPublicTeamStatus()
  });
});

app.get('/api/game-state', (req, res) => {
  res.json(gameManager.getPlayerSanitizedState(null));
});

app.get('/api/questions/r1', (req, res) => {
  res.json(questionManager.getRound1All());
});

app.get('/api/questions/r2', (req, res) => {
  res.json(questionManager.getRound2All());
});

app.get('/api/questions/r3', (req, res) => {
  res.json(questionManager.getRound3All());
});

app.get('/api/question-bank', (req, res) => {
  res.json({
    stats: questionManager.getBankStats(),
    round1: questionManager.getRound1All(),
    round2: questionManager.getRound2All(),
    round3: questionManager.getRound3All(),
    questionsFrozen: gameManager.questionsFrozen,
    selectedQuestionsSummary: {
      round1: (gameManager.selectedRound1Questions || []).map(q => q.id),
      round2: (gameManager.selectedRound2Questions || []).map(q => q.id),
      round3: (gameManager.selectedRound3Questions || []).map(q => q.id)
    }
  });
});

app.get('/api/game-history', (req, res) => {
  try {
    const history = dbManager.getGameHistory();
    if (Array.isArray(history) && history.length > 0) {
      return res.json(history);
    }
  } catch (_) {}
  const historyFile = path.join(__dirname, '..', 'data', 'game_history.json');
  if (fs.existsSync(historyFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      return res.json(data);
    } catch (e) {}
  }
  res.json([]);
});

// Authoritative SQLite Database Inspection Endpoints
app.get('/api/db/stats', (req, res) => {
  try {
    res.json({ success: true, stats: dbManager.getStats() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/db/members', (req, res) => {
  try {
    const members = dbManager.getMembers(req.query.gameId || null);
    res.json({ success: true, count: members.length, members });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/db/scores', (req, res) => {
  try {
    const gameId = req.query.gameId || gameManager.gameSessionId;
    const scores = dbManager.getTeamScores(gameId);
    res.json({ success: true, gameId, ...scores });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/db/score-events', (req, res) => {
  try {
    const gameId = req.query.gameId || gameManager.gameSessionId;
    const events = dbManager.getScoreEvents(gameId, req.query);
    res.json({ success: true, gameId, count: events.length, events });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/db/locks', (req, res) => {
  try {
    const gameId = req.query.gameId || gameManager.gameSessionId;
    const qId = req.query.questionId || null;
    const locks = qId ? dbManager.getTeamLocks(gameId, qId) : {};
    res.json({ success: true, gameId, questionId: qId, locks });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/participants', (req, res) => {
  res.json({
    total: participantManager.getParticipants().length,
    participants: participantManager.getParticipants()
  });
});

app.get('/api/rosters', (req, res) => {
  res.json(participantManager.getRosters(gameManager.teamCount));
});

app.get(['/api/teammembers', '/api/team-members'], (req, res) => {
  const data = participantManager.getRosters(gameManager.teamCount);
  res.json({
    success: true,
    ...data
  });
});

app.get('/api/validate-code', (req, res) => {
  const code = (req.query.code || '').trim().toUpperCase();
  const valid = code === gameManager.gameCode.toUpperCase();
  res.json({ valid, gameCode: valid ? gameManager.gameCode : null });
});

// Lightweight Admin Authentication Endpoints
app.post('/api/admin/login', (req, res) => {
  const { pin, password } = req.body || {};
  const provided = String(pin || password || '').trim();
  if (!provided || provided !== gameManager.adminPin) {
    return res.status(401).json({ success: false, error: 'Invalid Admin Password' });
  }
  const token = gameManager.generateAdminToken();
  res.json({ success: true, role: 'admin', token });
});

app.post('/api/admin/verify', (req, res) => {
  const token = req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (token && gameManager.isValidAdminToken(token)) {
    return res.json({ success: true, role: 'admin' });
  }
  res.status(401).json({ success: false, error: 'Invalid or expired session' });
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.body?.token || req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (token) {
    gameManager.revokeAdminToken(token);
  }
  res.json({ success: true });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  // Immediately register socket and emit sanitized initial state
  gameManager.handleSocketConnect(socket);

  socket.on('get_game_state', (data, callback) => {
    const cb = typeof data === 'function' ? data : callback;
    const sockData = gameManager.connectedSockets.get(socket.id);
    const team = sockData?.team || null;
    const state = gameManager.getPlayerSanitizedState(team);
    if (typeof cb === 'function') {
      cb(state);
    } else {
      socket.emit('game_state_update', state);
    }
  });

  socket.on('player_get_state', (data, callback) => {
    const cb = typeof data === 'function' ? data : callback;
    const sockData = gameManager.connectedSockets.get(socket.id);
    const team = sockData?.team || null;
    const state = gameManager.getPlayerSanitizedState(team);
    if (typeof cb === 'function') {
      cb(state);
    } else {
      socket.emit('game_state_update', state);
    }
  });

  socket.on('get_rosters', (data, callback) => {
    const cb = typeof data === 'function' ? data : callback;
    const rosters = participantManager.getRosters(gameManager.teamCount);
    if (typeof cb === 'function') cb(rosters);
  });

  socket.on('validate_game_code', (data, callback) => {
    const code = (data?.gameCode || '').trim().toUpperCase();
    const valid = code === gameManager.gameCode.toUpperCase();
    if (typeof callback === 'function') {
      callback({ valid, gameCode: valid ? gameManager.gameCode : null });
    }
  });

  socket.on('player_join', (data, callback) => {
    const result = gameManager.handlePlayerJoin(socket, data || {});
    if (typeof callback === 'function') callback(result);
  });

  socket.on('player_reconnect', (data, callback) => {
    const result = gameManager.handlePlayerReconnect(socket, data || {});
    if (typeof callback === 'function') callback(result);
  });

  socket.on('display_join', () => {
    gameManager.handleDisplayJoin(socket);
  });

  socket.on('admin_auth', (data, callback) => {
    const result = gameManager.handleAdminAuth(socket, data || {});
    if (typeof callback === 'function') callback(result);
  });

  // Admin Game Lifecycle
  socket.on('admin_start_game', (data, cb) => {
    gameManager.startGame();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_reveal_clue_2', (data, cb) => {
    gameManager.revealClue2();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_reveal_clue_3', (data, cb) => {
    gameManager.revealClue3();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_reveal_r1_answer', (data, cb) => {
    gameManager.revealRound1AnswerEarly();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_show_r1_answer', (data, cb) => {
    gameManager.revealRound1AnswerEarly();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_show_r1_result', (data, cb) => {
    gameManager.showRound1Result();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_end_round_1', (data, cb) => {
    gameManager.completeRound1();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('admin_start_r2', (data, cb) => {
    gameManager.startRound2Sequence();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_start_round_2', (data, cb) => {
    gameManager.startRound2Sequence();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_show_r2_result', (data, cb) => {
    gameManager.showRound2Result();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('admin_start_r3', (data, cb) => {
    gameManager.startRound3Sequence();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_start_round_3', (data, cb) => {
    gameManager.startRound3Sequence();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_show_r3_result', (data, cb) => {
    gameManager.showRound3Result();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('admin_show_final_results', (data, cb) => {
    gameManager.showFinalResults();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_start_tiebreaker', (data, cb) => {
    gameManager.startTiebreaker();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('admin_pause_game', (data, cb) => {
    gameManager.pauseGame();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_resume_game', (data, cb) => {
    gameManager.resumeGame();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_skip_question', (data, cb) => {
    gameManager.skipQuestion();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_skip_round', (data, cb) => {
    gameManager.skipRound();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_next_question', (data, cb) => {
    gameManager.nextQuestion();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });
  socket.on('admin_reset_game', (data, cb) => {
    gameManager.resetGame();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true });
  });

  socket.on('admin_reset_teams', () => {
    teamManager.resetAllTeams();
    for (const [sId, sData] of gameManager.connectedSockets.entries()) {
      if (!sData.isAdmin && !sData.isDisplay) {
        sData.team = null;
        sData.sessionToken = null;
      }
    }
    io.emit('game_session_reset', { gameSessionId: gameManager.gameSessionId });
    gameManager.broadcastState();
  });

  socket.on('admin_release_team', (data, cb) => {
    const teamId = typeof data === 'object' ? data?.teamId : data;
    const tid = Number(teamId);
    teamManager.releaseTeam(tid);
    for (const [sId, sData] of gameManager.connectedSockets.entries()) {
      if (sData.team === tid) {
        sData.team = null;
        sData.sessionToken = null;
        const sock = io.sockets.sockets.get(sId);
        if (sock) {
          sock.emit('game_session_reset', { gameSessionId: gameManager.gameSessionId });
        }
      }
    }
    gameManager.broadcastState();
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback({ success: true, teamId: tid });
  });

  socket.on('admin_update_settings', (newSettings) => {
    gameManager.updateSettings(newSettings);
  });

  socket.on('admin_set_round_timing', (data, cb) => {
    const res = gameManager.setRoundTiming(data || {});
    const callback = typeof data === 'function' ? data : cb;
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_get_state', (data, callback) => {
    const cb = typeof data === 'function' ? data : callback;
    const st = gameManager.getAdminFullState();
    if (typeof cb === 'function') {
      cb(st);
    } else {
      socket.emit('admin_state_update', st);
    }
  });

  socket.on('admin_refresh_state', () => {
    gameManager.sendAdminState(socket);
    gameManager.broadcastState();
  });

  // Dynamic Team & Participant Management
  socket.on('admin_set_team_count', (data, callback) => {
    const teamCount = data?.teamCount ?? data?.count ?? data;
    const res = gameManager.setTeamCount(teamCount);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_add_participant', (data, callback) => {
    const res = gameManager.addParticipant(data?.name);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_add_participants_bulk', (data, callback) => {
    const res = gameManager.addParticipantsBulk(data?.names || []);
    if (typeof callback === 'function') callback(res);
  });
  socket.on('admin_bulk_add_participants', (data, callback) => {
    const res = gameManager.addParticipantsBulk(data?.names || []);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_update_participant', (data, callback) => {
    const res = gameManager.updateParticipant(data?.id, data);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_remove_participant', (data, callback) => {
    const res = gameManager.removeParticipant(data?.id);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_clear_participants', (data, callback) => {
    const res = gameManager.clearParticipants();
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_auto_assign_teams', (data, callback) => {
    const res = gameManager.autoAssignTeams();
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_shuffle_teams', (data, callback) => {
    const res = gameManager.shuffleTeams();
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_move_participant', (data, callback) => {
    const res = gameManager.moveParticipant(data?.participantId, data?.targetTeamId);
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_get_participants_and_rosters', (data, callback) => {
    const cb = typeof data === 'function' ? data : callback;
    const res = gameManager.getAdminParticipantsAndRosters();
    if (typeof cb === 'function') cb(res);
  });

  // Admin Question Bank & Random Selection Engine
  socket.on('admin_generate_questions', (data, callback) => {
    const res = gameManager.regenerateGameQuestions();
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_regenerate_selection', (data, callback) => {
    const res = gameManager.regenerateGameQuestions();
    if (typeof callback === 'function') callback(res);
  });

  socket.on('admin_get_question_bank', (data, callback) => {
    if (typeof callback === 'function') {
      callback({
        success: true,
        stats: questionManager.getBankStats(),
        round1: questionManager.getRound1All(),
        round2: questionManager.getRound2All(),
        round3: questionManager.getRound3All(),
        frozen: gameManager.questionsFrozen,
        selectedIds: {
          round1: (gameManager.selectedRound1Questions || []).map(q => q.id),
          round2: (gameManager.selectedRound2Questions || []).map(q => q.id),
          round3: (gameManager.selectedRound3Questions || []).map(q => q.id)
        }
      });
    }
  });

  socket.on('admin_save_question', (data, callback) => {
    try {
      let saved;
      if (data?.id && questionManager.getQuestionById(data.round, data.id)) {
        saved = questionManager.updateQuestion(data.round, data.id, data);
      } else {
        saved = questionManager.addQuestion(data.round, data);
      }
      gameManager.broadcastState();
      if (typeof callback === 'function') callback({ success: true, question: saved });
    } catch (e) {
      if (typeof callback === 'function') callback({ success: false, error: e.message });
    }
  });

  socket.on('admin_delete_question', (data, callback) => {
    try {
      const res = questionManager.deleteQuestion(data.round, data.id);
      gameManager.broadcastState();
      if (typeof callback === 'function') callback(res);
    } catch (e) {
      if (typeof callback === 'function') callback({ success: false, error: e.message });
    }
  });

  socket.on('admin_duplicate_question', (data, callback) => {
    try {
      const dup = questionManager.duplicateQuestion(data.round, data.id);
      gameManager.broadcastState();
      if (typeof callback === 'function') callback({ success: true, question: dup });
    } catch (e) {
      if (typeof callback === 'function') callback({ success: false, error: e.message });
    }
  });

  socket.on('admin_toggle_question', (data, callback) => {
    try {
      const res = questionManager.toggleQuestionStatus(data.round, data.id, data.isActive);
      gameManager.broadcastState();
      if (typeof callback === 'function') callback(res);
    } catch (e) {
      if (typeof callback === 'function') callback({ success: false, error: e.message });
    }
  });

  // Player Submissions
  socket.on('player_submit_r1', (data, callback) => {
    const res = gameManager.submitRound1Answer(socket, data || {});
    if (typeof callback === 'function') callback(res);
  });
  socket.on('player_submit_round_1', (data, callback) => {
    const res = gameManager.submitRound1Answer(socket, data || {});
    if (typeof callback === 'function') callback(res);
  });

  socket.on('player_submit_r2', (data, callback) => {
    const res = gameManager.submitRound2Option(socket, data || {});
    if (typeof callback === 'function') callback(res);
  });
  socket.on('player_submit_round_2', (data, callback) => {
    const res = gameManager.submitRound2Option(socket, data || {});
    if (typeof callback === 'function') callback(res);
  });

  socket.on('player_submit_r3', (data, callback) => {
    const res = gameManager.submitRound3Code(socket, data || {});
    if (typeof callback === 'function') callback(res);
  });
  socket.on('player_submit_round_3', (data, callback) => {
    const res = gameManager.submitRound3Code(socket, data || {});
    if (typeof callback === 'function') callback(res);
  });

  socket.on('disconnect', () => {
    gameManager.handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[TEAM QUEST] Live competition server running at http://localhost:${PORT}`);
  console.log(`[TEAM QUEST] Game Code: ${gameManager.gameCode}`);
});
