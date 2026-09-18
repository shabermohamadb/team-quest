import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createSocket() {
  return io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });
}

function waitForState(socket, validStates, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const states = Array.isArray(validStates) ? validStates : [validStates];
    const timer = setTimeout(() => {
      socket.off('game_state_update', onUpdate);
      reject(new Error(`Timed out waiting for states: ${states.join(', ')}`));
    }, timeoutMs);

    function onUpdate(data) {
      if (states.includes(data?.state)) {
        clearTimeout(timer);
        socket.off('game_state_update', onUpdate);
        resolve(data);
      }
    }

    socket.on('game_state_update', onUpdate);
  });
}

async function runMasterTest() {
  console.log('=== STARTING TEAM QUEST MASTER INTEGRATION TEST ===\n');

  const adminSocket = createSocket();
  const team1Socket = createSocket();
  const team2Socket = createSocket();
  const team3Socket = createSocket();
  const team4Socket = createSocket();

  await wait(500);

  // 1. ADMIN AUTH
  console.log('1. Authenticating Admin...');
  const authRes = await new Promise(resolve => {
    adminSocket.emit('admin_auth', { pin: 'admin123' }, resolve);
  });
  if (!authRes?.success) throw new Error('Admin auth failed: ' + JSON.stringify(authRes));
  console.log('✓ Admin authenticated successfully.');

  // Reset any previous state
  adminSocket.emit('admin_reset_game');
  await wait(400);

  // 2. JOIN 4 TEAMS
  console.log('\n2. Joining 4 Teams...');
  for (const [idx, sock] of [team1Socket, team2Socket, team3Socket, team4Socket].entries()) {
    const teamNum = idx + 1;
    const joinRes = await new Promise(resolve => {
      sock.emit('player_join', { team: teamNum }, resolve);
    });
    if (!joinRes?.success) throw new Error(`Team ${teamNum} join failed: ` + JSON.stringify(joinRes));
    console.log(`✓ Team ${teamNum} joined successfully with token: ${joinRes.sessionToken}`);
  }

  // Verify teams are occupied
  const teamsApiRes = await fetch(`${SERVER_URL}/api/teams`).then(r => r.json());
  const allClaimed = Object.values(teamsApiRes).every(t => t.claimed === true);
  if (!allClaimed) throw new Error('Not all teams claimed in API: ' + JSON.stringify(teamsApiRes));
  console.log('✓ All 4 teams correctly reported as claimed in /api/teams.');

  // 3. START GAME & VERIFY ROUND 1 CLUE HUNT
  console.log('\n3. Starting Game (Round 1: Clue Hunt)...');
  const r1WaitPromise = waitForState(team1Socket, ['ROUND_1_CLUE_1', 'ROUND_1_CLUE_2', 'ROUND_1_CLUE_3']);
  adminSocket.emit('admin_start_game');
  const r1ActiveState = await r1WaitPromise;

  console.log(`Active state reached: ${r1ActiveState?.state}, Round: ${r1ActiveState?.currentRoundNumber}`);
  console.log(`Active Clue 0${r1ActiveState?.currentChallenge?.activeClueNumber}: "${r1ActiveState?.currentChallenge?.activeClues?.[0]?.text}"`);

  // Team 1 submits correct answer "GitHub"
  console.log('\nTesting Round 1 submission ("github")...');
  const r1SubRes = await new Promise(resolve => {
    team1Socket.emit('player_submit_r1', {
      answer: '  github  ',
      questionId: r1ActiveState?.currentChallenge?.id,
      clueIndex: 0,
      teamId: 1
    }, resolve);
  });
  console.log('Round 1 submission response:', r1SubRes);
  if (!r1SubRes?.isCorrect || r1SubRes?.points <= 0) {
    throw new Error('Round 1 submission should be correct: ' + JSON.stringify(r1SubRes));
  }
  console.log(`✓ Team 1 solved Clue Hunt question (+${r1SubRes.points} PTS, rank ${r1SubRes.rank})`);

  // 4. TRANSITION TO ROUND 2: PATTERN BREAK
  console.log('\n4. Transitioning to Round 2 (Pattern Break)...');
  const r2WaitPromise = waitForState(team1Socket, 'ROUND_2_ACTIVE');
  adminSocket.emit('admin_start_r2');
  const r2ActiveState = await r2WaitPromise;

  console.log(`Active state reached: ${r2ActiveState?.state}, Round: ${r2ActiveState?.currentRoundNumber}`);
  console.log(`Pattern: "${r2ActiveState?.currentChallenge?.patternText}"`);
  console.log(`Options:`, r2ActiveState?.currentChallenge?.options?.map(o => `[${o.key}] ${o.text}`).join(' | '));

  // Team 2 submits incorrect option first -> cooldown
  console.log('\nTesting Round 2 wrong option cooldown...');
  const wrongRes = await new Promise(resolve => {
    team2Socket.emit('player_submit_r2', {
      optionId: 'Z',
      questionId: r2ActiveState?.currentChallenge?.id,
      teamId: 2
    }, resolve);
  });
  console.log('Wrong option response:', wrongRes);
  if (wrongRes?.isCorrect !== false || !wrongRes?.cooldownSeconds) {
    throw new Error('Wrong option should return isCorrect: false and cooldownSeconds: ' + JSON.stringify(wrongRes));
  }
  console.log('✓ Team 2 received 5s cooldown for incorrect option.');

  // Reveal correct option in admin
  let adminState = null;
  adminSocket.on('admin_state_update', (d) => { adminState = d; });
  adminSocket.emit('admin_refresh_state');
  await wait(400);
  const correctOpt = adminState?.round2Pattern?.correctOption;
  console.log(`Correct pattern option from Admin: [ ${correctOpt} ]`);

  // Team 3 submits correct option
  const r2SubRes = await new Promise(resolve => {
    team3Socket.emit('player_submit_r2', {
      optionId: correctOpt,
      questionId: r2ActiveState?.currentChallenge?.id,
      teamId: 3
    }, resolve);
  });
  console.log('Team 3 correct submission response:', r2SubRes);
  if (!r2SubRes?.isCorrect || r2SubRes?.points <= 0) {
    throw new Error('Correct option submission failed: ' + JSON.stringify(r2SubRes));
  }
  console.log(`✓ Team 3 solved Pattern Break (+${r2SubRes.points} PTS)`);

  // 5. TRANSITION TO ROUND 3: CODE CRACKER 🔐
  console.log('\n5. Transitioning to Round 3 (Code Cracker 🔐)...');
  const r3WaitPromise = waitForState(team1Socket, 'ROUND_3_ACTIVE');
  adminSocket.emit('admin_start_r3');
  const r3ActiveState = await r3WaitPromise;

  console.log(`Active state reached: ${r3ActiveState?.state}, Round: ${r3ActiveState?.currentRoundNumber}`);
  const r3Challenge = r3ActiveState?.currentChallenge;
  console.log(`Challenge: "${r3Challenge?.title}"`);
  console.log(`Encrypted Code: [ ${r3Challenge?.code} ]`);
  console.log(`Hint: "${r3Challenge?.hint}"`);

  // Ensure secret correctCode was NOT leaked to player state (Zero-Leak Privacy!)
  if (r3Challenge?.correctCode) {
    throw new Error('CRITICAL ZERO-LEAK VIOLATION: correctCode leaked to player socket!');
  }
  console.log('✓ Strict Zero-Leak privacy verified: player socket does NOT receive correctCode.');

  // Fetch target passcode from admin
  adminSocket.emit('admin_refresh_state');
  await wait(400);
  const adminTargetCode = adminState?.round3Challenge?.correctCode;
  console.log(`Admin authoritative passcode: "${adminTargetCode}"`);

  // Team 4 submits wrong passcode -> 5s cooldown
  console.log('\nTesting Code Cracker wrong submission...');
  const wrongCodeRes = await new Promise(resolve => {
    team4Socket.emit('player_submit_r3', {
      code: 'WRONGCODE123',
      challengeId: r3Challenge?.id,
      teamId: 4
    }, resolve);
  });
  console.log('Wrong code response:', wrongCodeRes);
  if (wrongCodeRes?.isCorrect !== false || !wrongCodeRes?.cooldownSeconds) {
    throw new Error('Wrong code should return cooldown: ' + JSON.stringify(wrongCodeRes));
  }
  console.log('✓ Team 4 received 5s cooldown for wrong passcode.');

  // Team 2 submits correct passcode (with lowercase & whitespace to test normalization)
  console.log(`\nTesting Code Cracker normalized submission: "  ${adminTargetCode.toLowerCase()}  "...`);
  const correctCodeRes = await new Promise(resolve => {
    team2Socket.emit('player_submit_r3', {
      code: `  ${adminTargetCode.toLowerCase()}  `,
      challengeId: r3Challenge?.id,
      teamId: 2
    }, resolve);
  });
  console.log('Correct code response:', correctCodeRes);
  if (!correctCodeRes?.isCorrect || correctCodeRes?.points <= 0) {
    throw new Error('Correct code submission failed: ' + JSON.stringify(correctCodeRes));
  }
  console.log(`✓ Team 2 cracked cipher (+${correctCodeRes.points} PTS, rank 1)`);

  // 6. FINAL RESULTS & MASTER WINNER REVEAL
  console.log('\n6. Concluding Match & Triggering Master Winner Reveal...');
  const finalWaitPromise = waitForState(team1Socket, 'FINAL_RESULT');
  adminSocket.emit('admin_show_final_results');
  const finalState = await finalWaitPromise;

  console.log(`Current state: ${finalState?.state}`);
  const finalResults = finalState?.finalResults;
  console.log('Final Results Standings:');
  finalResults?.standings?.forEach((s, idx) => {
    console.log(`  #${idx + 1} Team ${s.team}: ${s.total} PTS (R1: ${s.r1}, R2: ${s.r2}, R3: ${s.r3})`);
  });

  if (finalResults?.isTie) {
    console.log(`✓ Tie Detected between teams: ${finalResults.tiedTeams.join(', ')}`);
    console.log('Testing Admin Tiebreaker trigger...');
    const tiebreakerWait = waitForState(team1Socket, 'ROUND_3_ACTIVE');
    adminSocket.emit('admin_start_tiebreaker');
    const tiebreakerState = await tiebreakerWait;
    console.log(`Post-tiebreaker state: ${tiebreakerState?.state}`);
    const tieFinalWait = waitForState(team1Socket, 'FINAL_RESULT');
    adminSocket.emit('admin_show_final_results');
    await tieFinalWait;
  } else {
    console.log(`✓ Definitive Winner: Team ${finalResults?.winner} with ${finalResults?.winnerScore} PTS!`);
  }

  // 7. CLEAN RESET
  console.log('\n7. Testing Admin Reset...');
  adminSocket.emit('admin_reset_game');
  await wait(500);

  const resetTeamsRes = await fetch(`${SERVER_URL}/api/teams`).then(r => r.json());
  const allAvailable = Object.values(resetTeamsRes).every(t => t.claimed === false);
  if (!allAvailable) throw new Error('Teams not released on reset: ' + JSON.stringify(resetTeamsRes));
  console.log('✓ All 4 teams successfully released back to AVAILABLE on reset.');

  console.log('\n=== ALL TEAM QUEST MASTER TESTS PASSED FLAWLESSLY! ===');

  adminSocket.disconnect();
  team1Socket.disconnect();
  team2Socket.disconnect();
  team3Socket.disconnect();
  team4Socket.disconnect();
  process.exit(0);
}

runMasterTest().catch(err => {
  console.error('\n❌ MASTER TEST FAILED:', err);
  process.exit(1);
});
