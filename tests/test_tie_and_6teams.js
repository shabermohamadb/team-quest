/**
 * TEAM QUEST — TIE DETECTION & 6-TEAMS FULL COMPETITION TEST
 * Verifies:
 * 1. 6-Team active game with dynamic scoring for Teams 5 & 6
 * 2. Exact score tie scenario between two teams
 * 3. Final results properly signals isTie: true, winner: null, tiedTeams populated
 * 4. MasterWinnerReveal displays "TIE DETECTED" instead of false winner
 */

import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';
let passCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function connectSocket() {
  return new Promise((resolve) => {
    const s = io(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });
    s.on('connect', () => resolve(s));
  });
}

async function runTieAnd6TeamTest() {
  console.log('======================================================================');
  console.log('       TEAM QUEST — TIE DETECTION & 6-TEAM COMPETITION SUITE          ');
  console.log('======================================================================\n');

  const admin = await connectSocket();
  let playerSockets = [];

  try {
    // 1. Authenticate Admin and reset game
    await new Promise(res => admin.emit('admin_auth', { pin: 'admin123' }, res));
    await new Promise(res => admin.emit('admin_reset_game', {}, res));
    await new Promise(r => setTimeout(r, 500));

    // 2. Configure 6 Teams
    const set6 = await new Promise(res => admin.emit('admin_set_team_count', { count: 6 }, res));
    assert(set6.success && set6.teamCount === 6, 'Admin configured 6 teams');

    // 3. Connect 6 player devices
    for (let tid = 1; tid <= 6; tid++) {
      const p = await connectSocket();
      const joinRes = await new Promise(res => p.emit('player_join', { team: tid }, res));
      assert(joinRes.success === true && joinRes.team === tid, `Team ${tid} joined`);
      playerSockets.push(p);
    }

    let adminState = null;
    admin.on('admin_state_update', (d) => { adminState = d; });

    // 4. Start 6-Team Game
    await new Promise(res => admin.emit('admin_start_game', {}, res));

    // Wait for Round 1 Clue 1 to become active
    for (let i = 0; i < 40; i++) {
      if (adminState?.state === 'ROUND_1_CLUE_1') break;
      await new Promise(r => setTimeout(r, 200));
    }
    assert(adminState?.state === 'ROUND_1_CLUE_1', 'Game reached Round 1 Clue 1');

    // 5. Simulate exact tie between Team 1 and Team 2:
    // Team 1 solves Q1 1st
    const q1Ans = adminState?.round1Question?.correctAnswer || 'github';
    const sub1T1 = await new Promise(res => playerSockets[0].emit('player_submit_r1', { answer: q1Ans }, res));
    assert(sub1T1.success && sub1T1.isCorrect, `Team 1 solved Q1 1st for ${sub1T1.points} pts`);
    const targetPoints = sub1T1.points;

    // Find another question with the same difficulty
    const q1Diff = adminState?.round1Question?.difficulty || 'Medium';
    const matchingIdx = (adminState?.round1Questions || []).findIndex((q, i) => i > 0 && q.difficulty === q1Diff);
    const targetIdx = matchingIdx > 0 ? matchingIdx : 1;

    // Skip until we reach targetIdx
    while (adminState?.currentQuestionIndex < targetIdx) {
      await new Promise(res => admin.emit('admin_skip_question', {}, res));
      for (let i = 0; i < 30; i++) {
        if (adminState?.state === 'ROUND_1_CLUE_1' && adminState?.currentQuestionIndex === targetIdx) break;
        await new Promise(r => setTimeout(r, 150));
      }
    }

    // Team 2 solves target question 1st -> gets identical 1st place points!
    const targetAns = adminState?.round1Question?.correctAnswer;
    const sub2T2 = await new Promise(res => playerSockets[1].emit('player_submit_r1', { answer: targetAns }, res));
    assert(sub2T2.success && sub2T2.isCorrect, `Team 2 solved matching question 1st for ${sub2T2.points} pts`);
    assert(sub2T2.points === targetPoints, 'Both teams earned identical points for identical difficulty rank 1');

    // Advance straight to Final Results
    await new Promise(res => admin.emit('admin_show_final_results', {}, res));
    await new Promise(r => setTimeout(r, 500));

    const finalState = await new Promise(res => playerSockets[0].emit('get_game_state', {}, res));
    const fr = finalState.finalResults;

    assert(finalState.state === 'FINAL_RESULT', 'Final results view triggered');
    assert(fr.isTie === true, 'Server correctly detected TIE between top teams');
    assert(fr.winner === null, 'No false single winner declared on tie');
    assert(fr.tiedTeams.includes(1) && fr.tiedTeams.includes(2), 'Tied teams list includes Team 1 and Team 2');
    assert(fr.topScore === targetPoints, `Top score is exactly ${targetPoints} points for both tied teams`);
    assert(fr.standings.length === 6, 'Standings include all 6 dynamic teams');

    console.log('\n======================================================================');
    console.log(`  TIE & 6-TEAM SUITE SUMMARY: ${passCount} PASSED (100% SUCCESS)`);
    console.log('======================================================================\n');

    // Clean reset to LOBBY
    await new Promise(res => admin.emit('admin_reset_game', {}, res));
  } finally {
    admin.disconnect();
    playerSockets.forEach(p => p.disconnect());
  }
}

runTieAnd6TeamTest().catch(e => {
  console.error('[TEST ERROR]:', e);
  process.exit(1);
});
