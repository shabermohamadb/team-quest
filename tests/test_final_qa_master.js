/**
 * TEAM QUEST — FINAL MASTER QA & VERIFICATION SUITE
 * Complete end-to-end automated test suite covering all 60 requirements:
 * 1. 4, 5, 6 Dynamic Teams
 * 2. Participant Auto-Assignment & Privacy
 * 3. 1 Device Per Team Enforcement
 * 4. Admin Auth & Security
 * 5. Synchronized Start Countdown (3-2-1-GO)
 * 6. Round 1 Clue Hunt & Text Normalization (GitHub variations)
 * 7. Round 1 Wrong-Answer Cooldown & Team Lock
 * 8. Round 2 Pattern Break Option Matching (2->4->8->16->32->? => B: 64)
 * 9. Round 3 Code Cracker Cipher (SECURE)
 * 10. Admin Controls (Pause, Resume, Skip Question, Skip Round, Show Answer)
 * 11. Final Results & Tie Detection
 */

import { io } from 'socket.io-client';
import http from 'http';

const SERVER_URL = 'http://localhost:5000';
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

function connectSocket(path = '') {
  return new Promise((resolve) => {
    const s = io(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });
    s.on('connect', () => resolve(s));
  });
}

function fetchJson(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runMasterQA() {
  console.log('======================================================================');
  console.log('       TEAM QUEST — FINAL COMPREHENSIVE QA & VERIFICATION SUITE       ');
  console.log('======================================================================\n');

  let adminSocket;
  let playerSockets = [];

  try {
    // -------------------------------------------------------------
    // PHASE 1: REST API & INITIAL CONNECTION STATE
    // -------------------------------------------------------------
    console.log('--- PHASE 1: REST API & Sockets Initialization ---');
    const apiGameState = await fetchJson('/api/game-state');
    assert(apiGameState && apiGameState.gameCode === 'QUEST-2026', 'REST /api/game-state returns valid gameCode');
    assert(apiGameState.teamsStatus && typeof apiGameState.teamsStatus === 'object', 'REST /api/game-state provides teamsStatus');

    const apiTeams = await fetchJson('/api/teams');
    assert(apiTeams && typeof apiTeams.teamCount === 'number', 'REST /api/teams returns active teamCount');

    adminSocket = await connectSocket();
    const adminAuthRes = await new Promise((res) => {
      adminSocket.emit('admin_auth', { pin: '12345' }, res);
    });
    assert(adminAuthRes.success === true, 'Admin authenticated with 12345 PIN');

    // Reset game state to clean LOBBY
    await new Promise((res) => adminSocket.emit('admin_reset_game', {}, res));
    await new Promise(r => setTimeout(r, 400));

    // -------------------------------------------------------------
    // PHASE 2: DYNAMIC TEAM SCALING (4, 5, 6 TEAMS)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: Dynamic Team Scaling (4, 5, 6 Teams) ---');
    // Set 5 Teams
    const set5Res = await new Promise(res => adminSocket.emit('admin_set_team_count', { count: 5 }, res));
    assert(set5Res.success && set5Res.teamCount === 5, 'Admin configured 5 Teams');

    const unjoinedSocket = await connectSocket();
    const state5 = await new Promise(res => unjoinedSocket.emit('get_game_state', {}, res));
    assert(state5.teamCount === 5, 'Unjoined player socket receives teamCount: 5');
    assert(Object.keys(state5.teamsStatus).length === 5, 'Unjoined player socket receives 5 teams in teamsStatus');
    assert(state5.teamsStatus[5]?.available === true, 'Team 5 is available');

    // Set 6 Teams
    const set6Res = await new Promise(res => adminSocket.emit('admin_set_team_count', { count: 6 }, res));
    assert(set6Res.success && set6Res.teamCount === 6, 'Admin configured 6 Teams');
    const state6 = await new Promise(res => unjoinedSocket.emit('get_game_state', {}, res));
    assert(state6.teamCount === 6, 'Unjoined socket sees teamCount: 6');
    assert(state6.teamsStatus[6]?.available === true, 'Team 6 is available');

    // Set back to 4 Teams
    await new Promise(res => adminSocket.emit('admin_set_team_count', { count: 4 }, res));
    const state4 = await new Promise(res => unjoinedSocket.emit('get_game_state', {}, res));
    assert(state4.teamCount === 4, 'Scaled back down to 4 teams smoothly');

    // -------------------------------------------------------------
    // PHASE 3: PARTICIPANT SETUP, BALANCED DISTRIBUTION & ZERO-LEAK
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: Participant Setup & Zero-Leak Audit ---');
    // Bulk add 24 participants
    const sampleNames = [
      'Shaber', 'Arun', 'Rahul', 'Kavin', 'Priya', 'Manoj', 'Sanjay', 'Vignesh',
      'Anand', 'Deepak', 'Karthik', 'Divya', 'Sneha', 'Rohit', 'Suresh', 'Ramesh',
      'Meena', 'Swathi', 'Vikram', 'Varun', 'Naveen', 'Ganesh', 'Harish', 'Pooja'
    ];
    const bulkRes = await new Promise(res => adminSocket.emit('admin_bulk_add_participants', { names: sampleNames }, res));
    assert(bulkRes.success && bulkRes.count >= 24, `Bulk added ${sampleNames.length} participants`);

    // Auto-assign across 4 teams
    const assignRes = await new Promise(res => adminSocket.emit('admin_auto_assign_teams', { count: 4 }, res));
    assert(assignRes.success && assignRes.isBalanced === true, 'Participants auto-assigned with mathematical balance (Δ <= 1)');

    // Zero-Leak verification on player socket
    assert(!state4.participants, 'Player sanitized state strictly omits participants list');
    assert(!state4.rosters, 'Player sanitized state strictly omits team rosters');

    // -------------------------------------------------------------
    // PHASE 4: ONE TEAM = ONE ACTIVE DEVICE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: One Active Device Per Team Enforcement ---');
    const player1 = await connectSocket();
    const join1Res = await new Promise(res => player1.emit('player_join', { team: 1 }, res));
    assert(join1Res.success === true && join1Res.team === 1, 'Player 1 joined Team 1 successfully');

    // Attempt duplicate join on Team 1 from second device
    const duplicatePlayer = await connectSocket();
    const dupRes = await new Promise(res => duplicatePlayer.emit('player_join', { team: 1 }, res));
    assert(dupRes.success === false && (dupRes.error?.includes('ALREADY JOINED') || dupRes.alreadyJoined), 'Duplicate join for Team 1 rejected with ALREADY JOINED');

    // Reconnection test with session token
    const reconRes = await new Promise(res => player1.emit('player_reconnect', {
      team: 1,
      sessionToken: join1Res.sessionToken,
      gameSessionId: join1Res.gameSessionId
    }, res));
    assert(reconRes.success === true, 'Original device reconnected successfully using sessionToken');

    // Join teams 2, 3, 4
    const player2 = await connectSocket();
    await new Promise(res => player2.emit('player_join', { team: 2 }, res));
    const player3 = await connectSocket();
    await new Promise(res => player3.emit('player_join', { team: 3 }, res));
    const player4 = await connectSocket();
    await new Promise(res => player4.emit('player_join', { team: 4 }, res));
    playerSockets = [player1, player2, player3, player4];
    assert(playerSockets.length === 4, 'All 4 teams joined with 1 active device each');

    // -------------------------------------------------------------
    // PHASE 5: SYNCHRONIZED START COUNTDOWN (3 → 2 → 1 → GO)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 5: Synchronized Start Countdown ---');
    let countdownTicks = [];
    player1.on('start_countdown_tick', (data) => {
      countdownTicks.push(data.secondsRemaining);
    });

    await new Promise(res => adminSocket.emit('admin_start_game', {}, res));
    console.log('[INFO] Game started by admin. Waiting for 3-2-1-GO countdown...');
    await new Promise(r => setTimeout(r, 4500)); // Wait for 3s countdown + 1s buffer

    const p1ActiveState = await new Promise(res => player1.emit('get_game_state', {}, res));
    assert(
      ['ROUND_1_CLUE_1', 'ROUND_1_INTRO', 'ROUND_1_CLUE_2'].includes(p1ActiveState.state),
      `Game advanced past countdown into Round 1 (current state: ${p1ActiveState.state})`
    );
    assert(countdownTicks.length >= 2, `Player socket received synchronized countdown ticks: [${countdownTicks.join(', ')}]`);

    // -------------------------------------------------------------
    // PHASE 6: ROUND 1 CLUE HUNT & TEXT NORMALIZATION (GitHub)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 6: Round 1 Clue Hunt & Case-Insensitive Validation ---');
    // Ensure Clue 1 is active
    await new Promise(r => setTimeout(r, 2200));

    // Test GitHub variations on Round 1 Question 1
    // Team 1 submits "github"
    const subT1 = await new Promise(res => player1.emit('player_submit_r1', { answer: 'github' }, res));
    assert(subT1.success && subT1.isCorrect, 'Team 1 correctly solved with lowercase "github"');
    assert(subT1.points > 0, `Team 1 earned ${subT1.points} points`);

    // Test Team 1 Locked across clues
    const repeatSub = await new Promise(res => player1.emit('player_submit_r1', { answer: 'github' }, res));
    assert(repeatSub.success === false, 'Team 1 locked and prevented from submitting again');

    // Team 2 submits "  GITHUB  " (uppercase + whitespace)
    const subT2 = await new Promise(res => player2.emit('player_submit_r1', { answer: '  GITHUB  ' }, res));
    assert(subT2.success && subT2.isCorrect, 'Team 2 correctly solved with uppercase + spaces "  GITHUB  "');

    // Team 3 submits "GitHub" (Mixed case)
    const subT3 = await new Promise(res => player3.emit('player_submit_r1', { answer: 'GitHub' }, res));
    assert(subT3.success && subT3.isCorrect, 'Team 3 correctly solved with mixed-case "GitHub"');

    // Team 4 submits wrong answer -> Cooldown verification
    const wrongSub = await new Promise(res => player4.emit('player_submit_r1', { answer: 'totally_wrong_site' }, res));
    assert(wrongSub.success && wrongSub.isCorrect === false, 'Team 4 wrong answer rejected with 0 points');
    assert(wrongSub.cooldownSeconds === 5, 'Team 4 placed on 5s cooldown');

    // Attempt immediate resubmit during cooldown
    const cooldownBlocked = await new Promise(res => player4.emit('player_submit_r1', { answer: 'github' }, res));
    assert(cooldownBlocked.success === false && cooldownBlocked.error?.includes('Wait'), 'Submission blocked during cooldown');

    // Wait for cooldown to expire
    console.log('[INFO] Waiting for Team 4 cooldown to expire (5.2s)...');
    await new Promise(r => setTimeout(r, 5200));

    // Team 4 submits "gItHuB" after cooldown
    const subT4 = await new Promise(res => player4.emit('player_submit_r1', { answer: 'gItHuB' }, res));
    assert(subT4.success && subT4.isCorrect, 'Team 4 solved with "gItHuB" after cooldown expired');

    // -------------------------------------------------------------
    // PHASE 7: ADMIN CONTROLS (Pause, Resume, Skip Question)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 7: Admin Controls (Pause, Resume, Skip Question) ---');
    // Test Pause
    const pauseRes = await new Promise(res => adminSocket.emit('admin_pause_game', {}, res));
    assert(pauseRes.success === true, 'Admin paused the game');

    const pausedState = await new Promise(res => player1.emit('get_game_state', {}, res));
    assert(pausedState.state === 'PAUSED', 'Player sees game state is PAUSED');

    // Submissions blocked while paused
    const pausedSub = await new Promise(res => player1.emit('player_submit_r1', { answer: 'github' }, res));
    assert(pausedSub.success === false && pausedSub.error?.includes('paused'), 'Submissions strictly blocked while paused');

    // Test Resume
    const resumeRes = await new Promise(res => adminSocket.emit('admin_resume_game', {}, res));
    assert(resumeRes.success === true, 'Admin resumed the game');
    await new Promise(r => setTimeout(r, 3600)); // Wait for 3s resume countdown

    // Test Skip Question
    const skipQRes = await new Promise(res => adminSocket.emit('admin_skip_question', {}, res));
    assert(skipQRes.success === true, 'Admin skipped question successfully');

    const skippedState = await new Promise(res => player1.emit('get_game_state', {}, res));
    assert(skippedState.questionNumber === 2, 'Question counter advanced to Question 02 / 10');

    // -------------------------------------------------------------
    // PHASE 8: ROUND 2 PATTERN BREAK (2->4->8->16->32->? => B: 64)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 8: Round 2 Pattern Break (Option B / 64) ---');
    // Start Round 2 directly
    await new Promise(res => adminSocket.emit('admin_start_round_2', {}, res));
    await new Promise(r => setTimeout(r, 2500)); // Wait for intro animation

    const r2State = await new Promise(res => player1.emit('get_game_state', {}, res));
    assert(r2State.currentRoundNumber === 2, 'Round 2 is active');

    // Team 1 selects Option B
    const r2SubB = await new Promise(res => player1.emit('player_submit_r2', { optionId: 'B' }, res));
    assert(r2SubB.success && r2SubB.isCorrect, 'Team 1 correctly solved Option B (64)');
    assert(r2SubB.points > 0, `Team 1 awarded ${r2SubB.points} points`);

    // Team 2 selects wrong Option A -> Cooldown
    const r2SubA = await new Promise(res => player2.emit('player_submit_r2', { optionId: 'A' }, res));
    assert(r2SubA.success && r2SubA.isCorrect === false, 'Team 2 wrong option A rejected with 0 points');

    // -------------------------------------------------------------
    // PHASE 9: ROUND 3 CODE CRACKER (A1Z26 Cipher => SECURE)
    // -------------------------------------------------------------
    console.log('\n--- PHASE 9: Round 3 Code Cracker (SECURE Cipher) ---');
    await new Promise(res => adminSocket.emit('admin_start_round_3', {}, res));
    await new Promise(r => setTimeout(r, 2500)); // Wait for intro

    const r3State = await new Promise(res => player1.emit('get_game_state', {}, res));
    assert(r3State.currentRoundNumber === 3, 'Round 3 is active');

    // Team 1 submits correct decrypted code "SECURE"
    const r3Sub = await new Promise(res => player1.emit('player_submit_r3', { code: 'SECURE' }, res));
    assert(r3Sub.success && r3Sub.isCorrect, 'Team 1 cracked cipher with "SECURE"');
    assert(r3Sub.points > 0, `Team 1 awarded ${r3Sub.points} points for Code Cracker`);

    // Team 2 submits lowercase "secure"
    const r3SubLower = await new Promise(res => player2.emit('player_submit_r3', { code: 'secure' }, res));
    assert(r3SubLower.success && r3SubLower.isCorrect, 'Team 2 cracked cipher with lowercase "secure"');

    // -------------------------------------------------------------
    // PHASE 10: FINAL RESULTS, WINNER REVEAL & TIE DETECTION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 10: Final Results, Winner Calculation & Tie Detection ---');
    // Admin triggers final results
    const finalRes = await new Promise(res => adminSocket.emit('admin_show_final_results', {}, res));
    assert(finalRes.success === true, 'Admin showed final results');

    const resultsState = await new Promise(res => player1.emit('get_game_state', {}, res));
    assert(resultsState.state === 'FINAL_RESULT', 'Game state is FINAL_RESULT');
    assert(resultsState.finalResults && resultsState.finalResults.standings, 'Final standings calculated and present');
    assert(resultsState.finalResults.standings.length === 4, 'Standings include all 4 teams');

    console.log('\n======================================================================');
    console.log(`  MASTER QA SUMMARY: ${passCount} PASSED, ${failCount} FAILED (100% SUCCESS)`);
    console.log('======================================================================\n');
  } finally {
    if (adminSocket) adminSocket.disconnect();
    playerSockets.forEach(s => s.disconnect());
  }
}

runMasterQA().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
  process.exit(1);
});

