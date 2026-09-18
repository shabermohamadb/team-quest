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

function waitForState(client, targetState, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for state ${targetState}`));
    }, timeoutMs);
    const handler = (st) => {
      if (st?.state === targetState) {
        clearTimeout(timer);
        client.off('admin_state_update', handler);
        client.off('game_state_update', handler);
        resolve(st);
      }
    };
    client.on('admin_state_update', handler);
    client.on('game_state_update', handler);
  });
}

async function runTests() {
  console.log('=== STARTING ROUND 1 DEFINITIVE VALIDATION TEST ===\n');
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
    // 1. Admin Authentication & Reset
    await new Promise(r => admin.emit('admin_auth', { pin: 'admin123' }, r));
    admin.emit('admin_reset_game');
    admin.emit('admin_reset_teams');
    await wait(400);

    // 2. Join 4 Teams
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
    console.log('Admin starting game...');
    const startP = waitForState(admin, 'ROUND_1_CLUE_1');
    admin.emit('admin_start_game');
    await startP;

    assert(latestAdminState?.state === 'ROUND_1_CLUE_1', `State is ROUND_1_CLUE_1 (current: ${latestAdminState?.state})`);
    const q1 = latestAdminState?.round1Question;
    assert(q1?.id === 'round1-test-01', `Question 1 ID is round1-test-01 (got: ${q1?.id})`);
    assert(q1?.questionNumber === 1, `Question 1 number is 1`);
    assert(q1?.website === 'GitHub', `Question 1 website is GitHub`);
    assert(q1?.clues?.[0]?.includes('collaborate on code repositories'), `Clue 1 matches prompt spec`);
    assert(q1?.clues?.[1]?.includes('repositories, branches and pull requests'), `Clue 2 matches prompt spec`);
    assert(q1?.clues?.[2]?.includes("starts with 'Git' and ends with 'Hub'"), `Clue 3 matches prompt spec`);

    // 4. Test Submissions for all 4 variations
    // Team 1: "GitHub" with structured object
    console.log('\n--- Variation 1: Team 1 submits "GitHub" (Exact match, structured payload) ---');
    const res1 = await new Promise(res => t1.emit('player_submit_r1', {
      answer: 'GitHub',
      questionId: 'round1-test-01',
      clueIndex: 0,
      teamId: 1
    }, res));
    assert(res1?.success === true, 'Team 1 call returned success');
    assert(res1?.isCorrect === true, 'Team 1 "GitHub" returned isCorrect: true');
    assert(res1?.rank === 1, 'Team 1 rank is 1');
    assert(res1?.points === 50, `Team 1 points is 50 for Medium Clue 1 1st place (got: ${res1?.points})`);

    // Team 2: "github" with structured object
    console.log('\n--- Variation 2: Team 2 submits "github" (Lowercase, structured payload) ---');
    const res2 = await new Promise(res => t2.emit('player_submit_r1', {
      answer: 'github',
      questionId: 'round1-test-01',
      clueIndex: 0,
      teamId: 2
    }, res));
    assert(res2?.success === true, 'Team 2 call returned success');
    assert(res2?.isCorrect === true, 'Team 2 "github" returned isCorrect: true');
    assert(res2?.rank === 2, 'Team 2 rank is 2');
    assert(res2?.points === 30, `Team 2 points is 30 for Medium Clue 1 2nd place (got: ${res2?.points})`);

    // Team 3: "GITHUB" with plain string payload
    console.log('\n--- Variation 3: Team 3 submits "GITHUB" (Uppercase, string payload) ---');
    const res3 = await new Promise(res => t3.emit('player_submit_r1', 'GITHUB', res));
    assert(res3?.success === true, 'Team 3 call returned success');
    assert(res3?.isCorrect === true, 'Team 3 "GITHUB" returned isCorrect: true');
    assert(res3?.rank === 3, 'Team 3 rank is 3');
    assert(res3?.points === 20, `Team 3 points is 20 for Medium Clue 1 3rd place (got: ${res3?.points})`);

    // Team 4: "   GitHub   " with leading/trailing whitespace
    console.log('\n--- Variation 4: Team 4 submits "   GitHub   " (Whitespace-padded string payload) ---');
    const res4 = await new Promise(res => t4.emit('player_submit_r1', '   GitHub   ', res));
    assert(res4?.success === true, 'Team 4 call returned success');
    assert(res4?.isCorrect === true, 'Team 4 "   GitHub   " returned isCorrect: true');
    assert(res4?.rank === 4, 'Team 4 rank is 4');
    assert(res4?.points === 10, `Team 4 points is 10 for Medium Clue 1 4th place (got: ${res4?.points})`);

    // 5. Test Lock Rejection (Zero duplicate points)
    console.log('\n--- Test 5: Re-submitting while locked ---');
    const lockRes = await new Promise(res => t1.emit('player_submit_r1', { answer: 'GitHub' }, res));
    assert(lockRes?.success === false, 'Team 1 re-submission rejected');
    assert(lockRes?.error?.includes('LOCKED'), `Team 1 error indicates locked: "${lockRes?.error}"`);

    // 6. Test Wrong Answer & Cooldown
    console.log('\n--- Test 6: Testing Wrong Answer & Cooldown after fresh question reset ---');
    admin.emit('admin_reset_game');
    admin.emit('admin_reset_teams');
    await wait(400);

    await new Promise(r => t1.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, r));
    const startP2 = waitForState(admin, 'ROUND_1_CLUE_1');
    admin.emit('admin_start_game');
    await startP2;

    const wrongRes = await new Promise(res => t1.emit('player_submit_r1', { answer: 'GitLab' }, res));
    assert(wrongRes?.success === true, 'Wrong answer call succeeded');
    assert(wrongRes?.isCorrect === false, 'Wrong answer "GitLab" returned isCorrect: false');
    assert(wrongRes?.points === 0, 'Wrong answer awarded 0 points');
    assert(wrongRes?.cooldownSeconds === 5, 'Wrong answer triggered 5s cooldown');

    // Immediately retry during cooldown
    const retryRes = await new Promise(res => t1.emit('player_submit_r1', { answer: 'GitHub' }, res));
    assert(retryRes?.success === false, 'Retry during cooldown was rejected');
    assert(retryRes?.error?.includes('Wait') || retryRes?.error?.includes('retrying'), `Cooldown message present: "${retryRes?.error}"`);

    // 7. Test Round 2 Multiple Choice
    console.log('\n--- Test 7: Verify Round 2 Multiple-Choice still works properly ---');
    const r2Wait = waitForState(admin, 'ROUND_2_ACTIVE');
    admin.emit('admin_start_r2');
    await r2Wait;

    assert(latestAdminState?.state === 'ROUND_2_ACTIVE', `State is ROUND_2_ACTIVE (got: ${latestAdminState?.state})`);
    const r2Res = await new Promise(res => t1.emit('player_submit_r2', { optionId: 'B' }, res));
    assert(r2Res?.success === true, 'Round 2 submission processed');
    assert(typeof r2Res?.isCorrect === 'boolean', `Round 2 returns boolean isCorrect (${r2Res?.isCorrect})`);

    console.log(`\n=== TEST COMPLETE: ${failures === 0 ? 'ALL TESTS PASSED' : failures + ' FAILURES'} ===`);
  } catch (err) {
    console.error('Unexpected error:', err);
    failures++;
  } finally {
    admin.disconnect();
    t1.disconnect();
    t2.disconnect();
    t3.disconnect();
    t4.disconnect();
    process.exit(failures > 0 ? 1 : 0);
  }
}

runTests();
