import { io } from 'socket.io-client';

const URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createClient(name) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { reconnection: false, timeout: 5000 });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

async function runTests() {
  console.log('=== STARTING TEAM QUEST VALIDATION MASTER VERIFICATION ===\n');
  let failures = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`  ✓ PASS: ${desc}`);
    } else {
      console.error(`  ✕ FAIL: ${desc}`);
      failures++;
    }
  }

  const admin = await createClient('admin');
  const t1 = await createClient('team1');
  const t2 = await createClient('team2');
  const t3 = await createClient('team3');
  const t4 = await createClient('team4');

  try {
    // 1. Authenticate Admin
    await new Promise(r => admin.emit('admin_auth', { pin: 'admin123' }, r));
    admin.emit('admin_reset_game');
    admin.emit('admin_reset_teams');
    await wait(400);

    // 2. Join Teams using 'player_join' with { gameCode: 'QUEST-2026', team }
    const j1 = await new Promise(r => t1.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, r));
    const j2 = await new Promise(r => t2.emit('player_join', { gameCode: 'QUEST-2026', team: 2 }, r));
    const j3 = await new Promise(r => t3.emit('player_join', { gameCode: 'QUEST-2026', team: 3 }, r));
    const j4 = await new Promise(r => t4.emit('player_join', { gameCode: 'QUEST-2026', team: 4 }, r));

    assert(j1?.success && j2?.success && j3?.success && j4?.success, 'All 4 teams joined cleanly');

    let latestAdminState = null;
    admin.on('admin_state_update', (st) => {
      latestAdminState = st;
    });

    // 3. Start Game
    admin.emit('admin_start_game');
    console.log('Admin clicked start game, waiting for countdown (3s) and question 1 clue 1 (2s)...');
    await wait(6000);

    admin.emit('admin_refresh_state');
    await wait(400);

    assert(latestAdminState?.state === 'ROUND_1_CLUE_1', `Game state is ROUND_1_CLUE_1 (current: ${latestAdminState?.state})`);
    assert(latestAdminState?.round1Question?.website === 'GitHub', `Question 1 website is GitHub`);

    // TEST ROUND 1 CASE-INSENSITIVITY & SPACE NORMALIZATION:
    // Team 1 submits: "   github   "
    console.log('\n--- Test 1: Team 1 submits lowercase with spaces "   github   " ---');
    const r1_t1 = await new Promise(res => t1.emit('player_submit_r1', { answer: '   github   ' }, res));
    assert(r1_t1?.success === true, 'Team 1 submission success');
    assert(r1_t1?.isCorrect === true, 'Team 1 "   github   " is CORRECT');
    assert(r1_t1?.points > 0, `Team 1 awarded ${r1_t1?.points} points`);
    assert(r1_t1?.rank === 1, 'Team 1 rank is 1');

    // Verify Team 1 is now locked
    console.log('\n--- Test 2: Team 1 tries to submit again while locked ---');
    const r1_t1_again = await new Promise(res => t1.emit('player_submit_r1', { answer: 'github' }, res));
    assert(r1_t1_again?.success === false, 'Team 1 second submission rejected');
    assert(r1_t1_again?.error?.includes('LOCKED'), `Error mentions LOCKED: "${r1_t1_again?.error}"`);

    // Team 2 submits: "GITHUB"
    console.log('\n--- Test 3: Team 2 submits UPPERCASE "GITHUB" ---');
    const r1_t2 = await new Promise(res => t2.emit('player_submit_r1', { answer: 'GITHUB' }, res));
    assert(r1_t2?.success === true && r1_t2?.isCorrect === true, 'Team 2 "GITHUB" is CORRECT');
    assert(r1_t2?.rank === 2, 'Team 2 rank is 2');

    // Team 3 submits wrong answer: "GitLab"
    console.log('\n--- Test 4: Team 3 submits wrong answer "GitLab" ---');
    const r1_t3 = await new Promise(res => t3.emit('player_submit_r1', { answer: 'GitLab' }, res));
    assert(r1_t3?.success === true && r1_t3?.isCorrect === false, 'Team 3 "GitLab" is INCORRECT');
    assert(r1_t3?.points === 0, 'Team 3 points is 0');
    assert(r1_t3?.cooldownSeconds === 5, 'Team 3 cooldownSeconds is 5');

    // Team 3 tries immediately during cooldown
    console.log('\n--- Test 5: Team 3 tries to submit during cooldown ---');
    const r1_t3_cooldown = await new Promise(res => t3.emit('player_submit_r1', { answer: 'github' }, res));
    assert(r1_t3_cooldown?.success === false, 'Team 3 rejected during cooldown');
    assert(r1_t3_cooldown?.error?.includes('Wait') || r1_t3_cooldown?.error?.includes('retrying'), `Error mentions wait/retrying: "${r1_t3_cooldown?.error}"`);

    // Team 4 submits mixed-case: "gItHuB"
    console.log('\n--- Test 6: Team 4 submits mixed case "gItHuB" ---');
    const r1_t4 = await new Promise(res => t4.emit('player_submit_r1', { answer: 'gItHuB' }, res));
    assert(r1_t4?.success === true && r1_t4?.isCorrect === true, 'Team 4 "gItHuB" is CORRECT');
    assert(r1_t4?.rank === 3, 'Team 4 rank is 3');

    // Check admin team status view
    admin.emit('admin_refresh_state');
    await wait(300);
    console.log('\n--- Test 7: Admin team question statuses ---');
    const statuses = latestAdminState?.teamQuestionStatuses;
    assert(statuses?.[1]?.state === 'SOLVED', `Team 1 status: ${statuses?.[1]?.label}`);
    assert(statuses?.[2]?.state === 'SOLVED', `Team 2 status: ${statuses?.[2]?.label}`);
    assert(statuses?.[3]?.state === 'COOLDOWN', `Team 3 status: ${statuses?.[3]?.label}`);
    assert(statuses?.[4]?.state === 'SOLVED', `Team 4 status: ${statuses?.[4]?.label}`);

    // Wait for Team 3 cooldown to expire (5.2s)
    console.log('\nWaiting for Team 3 cooldown to expire (5.2s)...');
    await wait(5200);

    // Team 3 now submits accepted domain format "github.com"
    console.log('\n--- Test 8: Team 3 submits accepted domain format "github.com" after cooldown ---');
    const r1_t3_retry = await new Promise(res => t3.emit('player_submit_r1', { answer: 'github.com' }, res));
    assert(r1_t3_retry?.success === true && r1_t3_retry?.isCorrect === true, 'Team 3 "github.com" is CORRECT');
    assert(r1_t3_retry?.rank === 4, 'Team 3 rank is 4');

    // Verify scores: Team 1 rank 1 > Team 2 rank 2 > Team 4 rank 3 > Team 3 rank 4
    admin.emit('admin_refresh_state');
    await wait(300);
    console.log('\n--- Test 9: Scoreboard validation after Question 1 ---');
    const s = latestAdminState?.scores;
    console.log('Scores:', s);
    assert(s[1] > s[2] && s[2] > s[4] && s[4] > s[3], 'Points correctly awarded strictly descending by rank');

    // Fast forward to Round 2 to test Multiple Choice Pattern Break
    console.log('\n--- Fast Forward to Round 2 ---');
    admin.emit('admin_skip_round');
    await wait(1000);

    // Start Round 2
    admin.emit('admin_start_r2');
    console.log('Waiting for Round 2 intro (2.5s)...');
    await wait(2800);

    admin.emit('admin_refresh_state');
    await wait(300);

    assert(latestAdminState?.state === 'ROUND_2_ACTIVE', `Round 2 state is ROUND_2_ACTIVE (current: ${latestAdminState?.state})`);
    assert(latestAdminState?.round2Pattern?.correctOptionId === 'B', `Pattern 1 correctOptionId is B (64)`);

    // TEST ROUND 2 MULTIPLE CHOICE:
    // Pattern 1: 2 -> 4 -> 8 -> 16 -> 32 -> ?
    // Options: A: 48, B: 64, C: 56, D: 72. Correct: B
    console.log('\n--- Test 10: Round 2 - Team 1 submits wrong option "A" (48) ---');
    const r2_t1_wrong = await new Promise(res => t1.emit('player_submit_r2', { optionId: 'A' }, res));
    assert(r2_t1_wrong?.success === true && r2_t1_wrong?.isCorrect === false, 'Team 1 option A is INCORRECT');
    assert(r2_t1_wrong?.cooldownSeconds === 5, 'Team 1 in 5s cooldown');

    console.log('\n--- Test 11: Round 2 - Team 2 submits correct option "B" (64) ---');
    const r2_t2_correct = await new Promise(res => t2.emit('player_submit_r2', { optionId: 'B' }, res));
    assert(r2_t2_correct?.success === true && r2_t2_correct?.isCorrect === true, 'Team 2 option B is CORRECT');
    assert(r2_t2_correct?.points > 0, `Team 2 awarded ${r2_t2_correct?.points} points`);
    assert(r2_t2_correct?.rank === 1, 'Team 2 rank 1');

    console.log('\n--- Test 12: Round 2 - Team 2 tries to submit option again while locked ---');
    const r2_t2_again = await new Promise(res => t2.emit('player_submit_r2', { optionId: 'B' }, res));
    assert(r2_t2_again?.success === false, 'Team 2 second submission rejected');
    assert(r2_t2_again?.error?.includes('LOCKED'), `Team 2 error mentions LOCKED: "${r2_t2_again?.error}"`);

    console.log('\n--- Test 13: Round 2 - Backward compatibility: Team 3 submits optionKey "B" ---');
    const r2_t3_correct = await new Promise(res => t3.emit('player_submit_r2', { optionKey: 'B' }, res));
    assert(r2_t3_correct?.success === true && r2_t3_correct?.isCorrect === true, 'Team 3 optionKey "B" is CORRECT');
    assert(r2_t3_correct?.rank === 2, 'Team 3 rank 2');

    console.log('\n--- Test 14: Round 2 - Check Admin team question statuses ---');
    admin.emit('admin_refresh_state');
    await wait(300);
    const r2_statuses = latestAdminState?.teamQuestionStatuses;
    assert(r2_statuses?.[1]?.state === 'COOLDOWN', `Team 1 status: ${r2_statuses?.[1]?.label}`);
    assert(r2_statuses?.[2]?.state === 'SOLVED', `Team 2 status: ${r2_statuses?.[2]?.label}`);
    assert(r2_statuses?.[3]?.state === 'SOLVED', `Team 3 status: ${r2_statuses?.[3]?.label}`);

    console.log('\n======================================================');
    if (failures === 0) {
      console.log('🏆 ALL VALIDATION TESTS PASSED WITH 100% SUCCESS!');
    } else {
      console.error(`💥 ${failures} TEST(S) FAILED!`);
    }
    console.log('======================================================\n');

  } finally {
    admin.disconnect();
    t1.disconnect();
    t2.disconnect();
    t3.disconnect();
    t4.disconnect();
  }

  process.exit(failures > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
