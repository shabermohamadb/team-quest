import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import assert from 'assert';

import { QuestionManager } from './questionManager.js';
import { TeamManager } from './teamManager.js';
import { GameManager } from './gameManager.js';

console.log('=== STARTING END-TO-END AUTOMATED TEST SUITE: TEAM QUEST ===');

const PORT = 5099; // Isolated test port
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const qm = new QuestionManager();
const tm = new TeamManager();
const gm = new GameManager(io, qm, tm);

// Setup socket event routing matching index.js
io.on('connection', (socket) => {
  socket.on('player_join', (data, cb) => cb(gm.handlePlayerJoin(socket, data || {})));
  socket.on('display_join', () => gm.handleDisplayJoin(socket));
  socket.on('admin_auth', (data, cb) => cb(gm.handleAdminAuth(socket, data || {})));

  socket.on('admin_start_game', () => gm.startGame());
  socket.on('admin_reveal_clue_2', () => gm.revealClue2());
  socket.on('admin_reveal_clue_3', () => gm.revealClue3());
  socket.on('admin_reveal_r1_answer', () => gm.revealRound1Answer());
  socket.on('admin_show_r1_result', () => gm.showRound1Result());

  socket.on('admin_start_r2', () => gm.startRound2Sequence());
  socket.on('admin_show_r2_result', () => gm.showRound2Result());

  socket.on('admin_start_r3', () => gm.startRound3Sequence());
  socket.on('admin_show_r3_result', () => gm.showRound3Result());

  socket.on('admin_show_final_results', () => gm.showFinalResults());
  socket.on('admin_next_question', () => gm.nextQuestion());
  socket.on('admin_reset_game', () => gm.resetGame());

  socket.on('player_submit_r1', (data, cb) => cb(gm.submitRound1Answer(socket, data || {})));
  socket.on('player_submit_r2', (data, cb) => cb(gm.submitRound2Option(socket, data || {})));
  socket.on('player_submit_r3', (data, cb) => cb(gm.submitRound3Reaction(socket, data || {})));

  socket.on('disconnect', () => gm.handleDisconnect(socket));
});

server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  try {
    const URL = `http://localhost:${PORT}`;

    // 1. Admin connects & authenticates
    console.log('[TEST 1] Admin Authentication...');
    const adminSocket = ioClient(URL);
    await new Promise((res) => adminSocket.on('connect', res));

    const authRes = await new Promise((res) => {
      adminSocket.emit('admin_auth', { pin: 'admin123' }, res);
    });
    assert.strictEqual(authRes.success, true, 'Admin PIN authentication should succeed');
    console.log('✅ Admin authenticated successfully.');

    // 2. Display connects
    console.log('[TEST 2] Projector Display Connection...');
    const displaySocket = ioClient(URL);
    await new Promise((res) => displaySocket.on('connect', res));
    displaySocket.emit('display_join');
    console.log('✅ Display joined display_room.');

    // 3. Team 1 Joins
    console.log('[TEST 3] Team 1 Representative Join...');
    const team1Socket = ioClient(URL);
    await new Promise((res) => team1Socket.on('connect', res));

    const t1Join = await new Promise((res) => {
      team1Socket.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, res);
    });
    assert.strictEqual(t1Join.success, true, 'Team 1 should join successfully');
    assert.ok(t1Join.sessionToken, 'Team 1 should receive sessionToken');
    const t1Token = t1Join.sessionToken;
    console.log(`✅ Team 1 joined with token: ${t1Token.slice(0, 8)}...`);

    // 4. Duplicate Team 1 Attempt (Second Device) -> MUST BE REJECTED
    console.log('[TEST 4] Rejecting Second Device Attempt on Team 1...');
    const duplicateSocket = ioClient(URL);
    await new Promise((res) => duplicateSocket.on('connect', res));

    const dupJoin = await new Promise((res) => {
      duplicateSocket.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, res);
    });
    assert.strictEqual(dupJoin.success, false, 'Second device for Team 1 must be rejected');
    assert.ok(dupJoin.error.toLowerCase().includes('already joined'), 'Rejection error message must specify already joined');
    duplicateSocket.disconnect();
    console.log('✅ Second device for Team 1 successfully blocked!');

    // 5. Same Device Reconnection with SessionToken -> MUST BE ACCEPTED
    console.log('[TEST 5] Reconnection of Team 1 with SessionToken...');
    const reconnectSocket = ioClient(URL);
    await new Promise((res) => reconnectSocket.on('connect', res));

    const reconJoin = await new Promise((res) => {
      reconnectSocket.emit('player_join', { gameCode: 'QUEST-2026', team: 1, sessionToken: t1Token }, res);
    });
    assert.strictEqual(reconJoin.success, true, 'Reconnection with valid token must succeed');
    assert.strictEqual(reconJoin.reconnected, true, 'Reconnection flag must be true');
    console.log('✅ Team 1 reconnected successfully without losing seat!');

    // 6. Connect Teams 2, 3, 4
    console.log('[TEST 6] Joining Teams 2, 3, and 4...');
    const team2Socket = ioClient(URL);
    const team3Socket = ioClient(URL);
    const team4Socket = ioClient(URL);

    await Promise.all([
      new Promise((res) => team2Socket.on('connect', res)),
      new Promise((res) => team3Socket.on('connect', res)),
      new Promise((res) => team4Socket.on('connect', res))
    ]);

    const [j2, j3, j4] = await Promise.all([
      new Promise((res) => team2Socket.emit('player_join', { gameCode: 'QUEST-2026', team: 2 }, res)),
      new Promise((res) => team3Socket.emit('player_join', { gameCode: 'QUEST-2026', team: 3 }, res)),
      new Promise((res) => team4Socket.emit('player_join', { gameCode: 'QUEST-2026', team: 4 }, res))
    ]);

    assert.ok(j2.success && j3.success && j4.success, 'Teams 2, 3, 4 must all join successfully');
    console.log('✅ All 4 teams joined and ready.');

    // 7. Admin Starts Game & Round 1 Question
    console.log('[TEST 7] Starting Game and Round 1: Clue Hunt...');
    gm.startRound1Clue1(); // bypass 30s countdown for test speed
    assert.strictEqual(gm.state, 'ROUND_1_CLUE_1', 'State should be ROUND_1_CLUE_1');
    assert.strictEqual(gm.activeClueNumber, 1, 'Active clue must be Clue 1');

    const curQ = gm.getCurrentRound1Question();
    console.log(`Current Question: "${curQ.clue1}" (Answer: ${curQ.correctAnswer}, Difficulty: ${curQ.difficulty})`);

    // Team 1 submits wrong answer
    const t1Wrong = await new Promise((res) => {
      reconnectSocket.emit('player_submit_r1', { answer: 'totally wrong answer' }, res);
    });
    assert.strictEqual(t1Wrong.success, true);
    assert.strictEqual(t1Wrong.isCorrect, false, 'Should be incorrect');
    assert.strictEqual(gm.totalScores[1], 0, 'No points for wrong answer');

    // Admin reveals Clue 2
    gm.revealClue2();
    assert.strictEqual(gm.activeClueNumber, 2, 'Active clue should now be 2');

    // Team 2 submits correct answer on Clue 2!
    const t2Correct = await new Promise((res) => {
      team2Socket.emit('player_submit_r1', { answer: curQ.correctAnswer }, res);
    });
    assert.strictEqual(t2Correct.success, true);
    assert.strictEqual(t2Correct.isCorrect, true, 'Team 2 answer should be correct');
    assert.ok(t2Correct.points > 0, 'Team 2 should earn points');
    console.log(`✅ Team 2 scored ${t2Correct.points} PTS on Clue 2!`);

    // Team 2 tries to submit again -> MUST BE LOCKED
    const t2Again = await new Promise((res) => {
      team2Socket.emit('player_submit_r1', { answer: curQ.correctAnswer }, res);
    });
    assert.strictEqual(t2Again.success, false, 'Team 2 must be locked after correct answer');
    console.log('✅ Team 2 correctly locked from submitting again.');

    // 8. Round 2: Pattern Break
    console.log('[TEST 8] Starting Round 2: Pattern Break...');
    gm.startRound2Active();
    assert.strictEqual(gm.state, 'ROUND_2_ACTIVE', 'State should be ROUND_2_ACTIVE');

    const curPattern = gm.getCurrentRound2Pattern();
    console.log(`Current Pattern: "${curPattern.patternText}" (Correct: ${curPattern.correctOption})`);

    // Team 3 submits correct option
    const t3Submit = await new Promise((res) => {
      team3Socket.emit('player_submit_r2', { option: curPattern.correctOption }, res);
    });
    assert.strictEqual(t3Submit.success, true);
    assert.strictEqual(t3Submit.isCorrect, true);
    assert.ok(t3Submit.points > 0, 'Team 3 should earn points for Pattern Break');
    console.log(`✅ Team 3 scored ${t3Submit.points} PTS on Pattern Break!`);

    // 9. Round 3: Reaction Clash
    console.log('[TEST 9] Starting Round 3: Reaction Clash...');
    gm.startRound3Active();
    assert.strictEqual(gm.state, 'ROUND_3_ACTIVE', 'State should be ROUND_3_ACTIVE');

    // Simulate high-speed target hits
    const t4Reaction = await new Promise((res) => {
      team4Socket.emit('player_submit_r3', { reactionMs: 1450 }, res);
    });
    assert.strictEqual(t4Reaction.success, true);
    assert.strictEqual(t4Reaction.isCorrect, true);
    assert.ok(t4Reaction.points > 0, 'Team 4 should earn points for fastest reaction');
    console.log(`✅ Team 4 hit reaction target in 1.45s and scored ${t4Reaction.points} PTS!`);

    // 10. Final Results Ceremony
    console.log('[TEST 10] Final Results & Cumulative Scoring Calculation...');
    gm.showFinalResults();
    assert.strictEqual(gm.state, 'FINAL_RESULT');

    const displayFinal = gm.getDisplayState();
    console.log('Final Scoreboard Breakdown:', displayFinal.scores);
    assert.strictEqual(
      displayFinal.scores[2],
      displayFinal.roundScores[2].r1 + displayFinal.roundScores[2].r2 + displayFinal.roundScores[2].r3,
      'Total score must equal sum of R1 + R2 + R3'
    );
    console.log('✅ Cumulative scoring calculation verified (Total = R1 + R2 + R3)!');

    // Disconnect clients and stop server
    adminSocket.disconnect();
    displaySocket.disconnect();
    team1Socket.disconnect();
    team2Socket.disconnect();
    team3Socket.disconnect();
    team4Socket.disconnect();
    reconnectSocket.disconnect();

    server.close(() => {
      console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
});
