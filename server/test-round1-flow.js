import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import assert from 'assert';

import { QuestionManager } from './questionManager.js';
import { TeamManager } from './teamManager.js';
import { GameManager, GAME_STATES } from './gameManager.js';

console.log('=== STARTING ROUND 1: 10-QUESTION AUTOMATIC PROGRESSION TEST ===');

const PORT = 5098;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const qm = new QuestionManager();
const tm = new TeamManager();
const gm = new GameManager(io, qm, tm);

// Setup socket event routing
io.on('connection', (socket) => {
  socket.on('player_join', (data, cb) => cb(gm.handlePlayerJoin(socket, data || {})));
  socket.on('display_join', () => gm.handleDisplayJoin(socket));
  socket.on('admin_auth', (data, cb) => cb(gm.handleAdminAuth(socket, data || {})));

  socket.on('admin_start_game', () => gm.startGame());
  socket.on('admin_show_r1_answer', () => gm.revealRound1AnswerEarly());
  socket.on('admin_reveal_r1_answer', () => gm.revealRound1AnswerEarly());
  socket.on('admin_skip_question', () => gm.skipQuestion());
  socket.on('admin_end_round_1', () => gm.completeRound1());
  socket.on('admin_start_r2', () => gm.startRound2Sequence());
  socket.on('admin_pause_game', () => gm.pauseGame());
  socket.on('admin_resume_game', () => gm.resumeGame());

  socket.on('player_submit_r1', (data, cb) => cb(gm.submitRound1Answer(socket, data || {})));
  socket.on('disconnect', () => gm.handleDisconnect(socket));
});

server.listen(PORT, async () => {
  console.log(`Round 1 test server running on port ${PORT}`);

  try {
    const URL = `http://localhost:${PORT}`;

    // 1. Connect Admin
    console.log('[TEST 1] Admin Authentication...');
    const adminSocket = ioClient(URL);
    await new Promise((res) => adminSocket.on('connect', res));
    const authRes = await new Promise((res) => {
      adminSocket.emit('admin_auth', { pin: 'admin123' }, res);
    });
    assert.strictEqual(authRes.success, true);
    console.log('✅ Admin authenticated.');

    // 2. Connect Display
    console.log('[TEST 2] Projector Display Connection...');
    const displaySocket = ioClient(URL);
    await new Promise((res) => displaySocket.on('connect', res));
    displaySocket.emit('display_join');
    console.log('✅ Display joined.');

    // 3. Connect Teams 1 & 2
    console.log('[TEST 3] Connecting Teams 1 and 2...');
    const team1Socket = ioClient(URL);
    const team2Socket = ioClient(URL);
    await Promise.all([
      new Promise((res) => team1Socket.on('connect', res)),
      new Promise((res) => team2Socket.on('connect', res))
    ]);

    const [j1, j2] = await Promise.all([
      new Promise((res) => team1Socket.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, res)),
      new Promise((res) => team2Socket.emit('player_join', { gameCode: 'QUEST-2026', team: 2 }, res))
    ]);
    assert.ok(j1.success && j2.success);
    console.log('✅ Teams 1 and 2 connected.');

    // 4. Start Round 1: Question 01 / 10
    console.log('[TEST 4] Starting Round 1: Question 01 / 10...');
    gm.startRound1Question(0);

    assert.strictEqual(gm.currentQuestionIndex, 0);
    assert.strictEqual(gm.round1TotalQuestions, 10);

    const displayStateQ1 = gm.getDisplayState();
    assert.strictEqual(displayStateQ1.formattedCounter, 'QUESTION 01 / 10');
    assert.strictEqual(displayStateQ1.questionNumber, 1);
    assert.strictEqual(displayStateQ1.totalQuestions, 10);
    console.log('✅ Question counter verified:', displayStateQ1.formattedCounter);

    // 5. Automatic Clue Progression: Clue 1 -> Clue 2 -> Clue 3
    console.log('[TEST 5] Testing Automatic Clue Progression...');
    gm.startRound1Clue1();
    assert.strictEqual(gm.state, GAME_STATES.ROUND_1_CLUE_1);
    assert.strictEqual(gm.activeClueNumber, 1);
    assert.deepStrictEqual(gm.revealedClues, [true, false, false]);

    // Team 1 solves during Clue 1
    const curQ = gm.getCurrentRound1Question();
    const t1Solve = await new Promise((res) => {
      team1Socket.emit('player_submit_r1', { answer: curQ.correctAnswer }, res);
    });
    assert.strictEqual(t1Solve.success, true);
    assert.strictEqual(t1Solve.isCorrect, true);
    assert.ok(t1Solve.points > 0);
    assert.strictEqual(gm.teamLocks[1], true, 'Team 1 must be locked');
    console.log(`✅ Team 1 solved on Clue 1 (+${t1Solve.points} PTS) and is locked.`);

    // Clue 1 timer reaches 0 -> Clue 2 automatically appears
    gm.startRound1Clue2();
    assert.strictEqual(gm.state, GAME_STATES.ROUND_1_CLUE_2);
    assert.strictEqual(gm.activeClueNumber, 2);
    assert.deepStrictEqual(gm.revealedClues, [true, true, false]);
    assert.strictEqual(gm.teamLocks[1], true, 'Team 1 must remain locked during Clue 2');
    console.log('✅ Clue 2 automatically revealed. Team 1 remains locked.');

    // Team 1 tries to submit again on Clue 2 -> Rejected
    const t1Again = await new Promise((res) => {
      team1Socket.emit('player_submit_r1', { answer: curQ.correctAnswer }, res);
    });
    assert.strictEqual(t1Again.success, false, 'Locked team cannot submit on Clue 2');

    // Clue 2 timer reaches 0 -> Clue 3 automatically appears
    gm.startRound1Clue3();
    assert.strictEqual(gm.state, GAME_STATES.ROUND_1_CLUE_3);
    assert.strictEqual(gm.activeClueNumber, 3);
    assert.deepStrictEqual(gm.revealedClues, [true, true, true]);
    console.log('✅ Clue 3 automatically revealed.');

    // 6. Early Show Answer (Admin Action)
    console.log('[TEST 6] Admin Early [SHOW ANSWER]...');
    gm.revealRound1AnswerEarly();
    assert.strictEqual(gm.state, GAME_STATES.ROUND_1_ANSWER_REVEAL);
    console.log('✅ Early Answer Reveal successful.');

    // 7. Skip Question Test (Question 1 -> Question 2)
    console.log('[TEST 7] Admin [SKIP QUESTION]...');
    gm.skipQuestion();
    assert.strictEqual(gm.currentQuestionIndex, 1);
    const pStateQ2 = gm.getPlayerSanitizedState(1);
    assert.strictEqual(pStateQ2.formattedCounter, 'QUESTION 02 / 10');
    console.log('✅ Question skipped. Loaded next question:', pStateQ2.formattedCounter);

    // 8. Fast-forward to Question 10 / 10
    console.log('[TEST 8] Advancing to QUESTION 10 / 10...');
    gm.currentQuestionIndex = 9; // Question 10 (0-indexed 9)
    const pStateQ10 = gm.getPlayerSanitizedState(1);
    assert.strictEqual(pStateQ10.formattedCounter, 'QUESTION 10 / 10');
    assert.strictEqual(pStateQ10.questionNumber, 10);
    console.log('✅ Verified final Round 1 question counter:', pStateQ10.formattedCounter);

    // 9. Question 10 Finishes -> Concludes Round 1 (DO NOT AUTO-START ROUND 2)
    console.log('[TEST 9] Concluding Question 10 and Round 1...');
    gm.completeRound1();
    assert.strictEqual(gm.state, GAME_STATES.ROUND_1_COMPLETE);

    const playerRound1Complete = gm.getPlayerSanitizedState(1);
    assert.strictEqual(playerRound1Complete.state, 'ROUND_1_COMPLETE');
    assert.strictEqual(playerRound1Complete.isRoundComplete, true);
    assert.strictEqual(playerRound1Complete.scores, undefined, 'Player MUST NOT receive scores in ROUND_1_COMPLETE');
    assert.strictEqual(playerRound1Complete.roundScores, undefined, 'Player MUST NOT receive roundScores');
    assert.strictEqual(playerRound1Complete.leaderboard, undefined, 'Player MUST NOT receive leaderboard');
    console.log('✅ Player state in ROUND_1_COMPLETE verified completely leak-free!');

    const adminRound1Complete = gm.getAdminFullState();
    assert.strictEqual(adminRound1Complete.state, 'ROUND_1_COMPLETE');
    assert.ok(adminRound1Complete.round1Scores, 'Admin must receive Round 1 scores summary');
    console.log('✅ Admin received Round 1 score summary:', adminRound1Complete.round1Scores);

    // 10. Admin Manually Launches Round 2
    console.log('[TEST 10] Admin Launches Round 2...');
    gm.startRound2Sequence();
    assert.strictEqual(gm.currentRoundNumber, 2);
    assert.strictEqual(gm.currentQuestionIndex, 0);
    console.log('✅ Round 2 successfully started by Admin.');

    adminSocket.disconnect();
    displaySocket.disconnect();
    team1Socket.disconnect();
    team2Socket.disconnect();

    server.close(() => {
      console.log('=== ALL ROUND 1 SPECIFICATION TESTS PASSED! ===');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
});
