import { io } from '/home/shaber/.gemini/antigravity/scratch/team-quest/node_modules/socket.io-client/build/esm/index.js';

const URL = 'http://localhost:5000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTimerTests() {
  console.log('=== STARTING COMPREHENSIVE TIMER VERIFICATION ===\n');

  const adminSocket = io(URL);
  const playerSocket = io(URL);

  let adminTimerTicks = [];
  let playerTimerTicks = [];
  let adminStates = [];
  let playerStates = [];

  adminSocket.on('timer_tick', (tick) => {
    adminTimerTicks.push(tick);
  });

  playerSocket.on('timer_tick', (tick) => {
    playerTimerTicks.push(tick);
  });

  adminSocket.on('admin_state_update', (st) => {
    adminStates.push(st);
  });

  playerSocket.on('game_state_update', (st) => {
    playerStates.push(st);
  });

  await new Promise(r => adminSocket.on('connect', r));
  await new Promise(r => playerSocket.on('connect', r));

  console.log('1. Connected Admin & Player sockets.');

  // Admin auth
  await new Promise(resolve => {
    adminSocket.emit('admin_auth', { pin: 'admin123' }, (res) => {
      console.log('2. Admin authenticated:', res.success);
      resolve();
    });
  });

  // Admin resets game to start from clean Lobby
  adminSocket.emit('admin_reset_game');
  await sleep(600);

  // Player joins Team 1
  await new Promise(resolve => {
    playerSocket.emit('player_join', { team: 1 }, (res) => {
      console.log('3. Player joined fresh Team 1 session:', res.success);
      resolve();
    });
  });

  // Check Lobby initial state
  const currentAdminState = adminStates[adminStates.length - 1];
  const currentPlayerState = playerStates[playerStates.length - 1];

  console.log(`\n--- TEST 1: LOBBY TIMER SAFETY ---`);
  console.log(`Admin state: ${currentAdminState.state}, timeRemaining: ${currentAdminState.timeRemaining}, isTimerRunning: ${currentAdminState.isTimerRunning}`);
  console.log(`Player state: ${currentPlayerState.state}, timeRemaining: ${currentPlayerState.timeRemaining}, isTimerRunning: ${currentPlayerState.isTimerRunning}`);

  if (currentAdminState.isTimerRunning === false && currentPlayerState.isTimerRunning === false &&
      currentAdminState.timeRemaining === 30 && currentPlayerState.timeRemaining === 30) {
    console.log('✓ PASS: Timer is NOT running in Lobby and is safely ready at 30s');
  } else {
    throw new Error('FAIL: Timer should not be running in Lobby');
  }

  // Admin clicks Start Game
  console.log('\n--- TEST 2: START COUNTDOWN & INTRO DO NOT RUN TIMER ---');
  adminTimerTicks = [];
  playerTimerTicks = [];
  adminSocket.emit('admin_start_game');

  // Wait 1.5s into START_COUNTDOWN
  await sleep(1500);
  const startingState = adminStates[adminStates.length - 1];
  console.log(`State during start countdown: ${startingState.state}, startCountdownRemaining: ${startingState.startCountdownRemaining}`);
  console.log(`isTimerRunning during countdown: ${startingState.isTimerRunning}`);
  if (startingState.isTimerRunning === false) {
    console.log('✓ PASS: Timer does NOT run during 3-2-1 START COUNTDOWN');
  } else {
    throw new Error('FAIL: Timer must NOT run during start countdown');
  }

  // Wait for countdown to finish (3s + 1s buffer) and enter ROUND_1_INTRO
  await sleep(2500);
  const introState = adminStates[adminStates.length - 1];
  console.log(`State during intro: ${introState.state}, isTimerRunning: ${introState.isTimerRunning}`);
  if (introState.state === 'ROUND_1_INTRO' && introState.isTimerRunning === false) {
    console.log('✓ PASS: Timer does NOT run during ROUND_1_INTRO');
  }

  // Wait for 2s INTRO animation to complete -> ROUND_1_CLUE_1
  console.log('\n--- TEST 3: CLUE 1 STARTS AT EXACTLY 30s ---');
  await sleep(2200);

  const liveAdminState = adminStates[adminStates.length - 1];
  const livePlayerState = playerStates[playerStates.length - 1];

  console.log(`Admin state: ${liveAdminState.state}, activeClueNumber: ${liveAdminState.activeClueNumber}`);
  console.log(`clueStartedAt: ${liveAdminState.clueStartedAt}, clueDuration: ${liveAdminState.clueDuration}`);
  console.log(`Admin timeRemaining: ${liveAdminState.timeRemaining}s, Player timeRemaining: ${livePlayerState.timeRemaining}s`);

  if (liveAdminState.state === 'ROUND_1_CLUE_1' && liveAdminState.isTimerRunning === true &&
      liveAdminState.timeRemaining >= 29 && liveAdminState.clueDuration === 30) {
    console.log('✓ PASS: Clue 1 starts at exactly 30s and timer begins counting down');
  } else {
    throw new Error(`FAIL: Clue 1 timer did not start correctly: state=${liveAdminState.state}, timeRemaining=${liveAdminState.timeRemaining}`);
  }

  // Test ticks synchronization
  console.log('\n--- TEST 4: SERVER-AUTHORITATIVE TICK SYNCHRONIZATION ---');
  adminTimerTicks = [];
  playerTimerTicks = [];
  await sleep(2500);

  console.log(`Admin ticks: ${adminTimerTicks.length}, Player ticks: ${playerTimerTicks.length}`);
  const latestAdmin = adminTimerTicks[adminTimerTicks.length - 1];
  const latestPlayer = playerTimerTicks[playerTimerTicks.length - 1];
  console.log(`Admin tick: ${latestAdmin.timeRemaining}s, Player tick: ${latestPlayer.timeRemaining}s`);
  if (latestAdmin.timeRemaining === latestPlayer.timeRemaining && latestAdmin.clueStartedAt === latestPlayer.clueStartedAt) {
    console.log('✓ PASS: Admin and Player receive identical synchronized timestamps and remaining seconds');
  } else {
    throw new Error('FAIL: Admin and Player timer ticks not synchronized');
  }

  // Test PAUSE
  console.log('\n--- TEST 5: PAUSE FREEZES EXACT SECOND ---');
  adminSocket.emit('admin_pause_game');
  await sleep(500);

  const pausedAdminState = adminStates[adminStates.length - 1];
  const pausedSec = pausedAdminState.timeRemaining;
  console.log(`Game paused at: ${pausedSec}s, isPaused: ${pausedAdminState.isPaused}, isTimerRunning: ${pausedAdminState.isTimerRunning}`);

  adminTimerTicks = [];
  playerTimerTicks = [];
  await sleep(1500);

  console.log(`Ticks received while paused: ${adminTimerTicks.length}`);
  if (adminTimerTicks.length === 0 || adminTimerTicks.every(t => t.timeRemaining === pausedSec)) {
    console.log(`✓ PASS: Timer is strictly frozen at ${pausedSec}s while paused`);
  } else {
    throw new Error('FAIL: Timer ticked down while paused');
  }

  // Test RESUME
  console.log('\n--- TEST 6: RESUME CONTINUES WITHOUT RESETTING TO 30s ---');
  adminSocket.emit('admin_resume_game');
  console.log('Waiting 3.5s for resume countdown...');
  await sleep(3600);

  const resumedAdminState = adminStates[adminStates.length - 1];
  console.log(`Resumed state: ${resumedAdminState.state}, timeRemaining: ${resumedAdminState.timeRemaining}s`);
  if (resumedAdminState.timeRemaining <= pausedSec && resumedAdminState.timeRemaining >= pausedSec - 2) {
    console.log(`✓ PASS: Resumed timer continues smoothly from ~${resumedAdminState.timeRemaining}s (did NOT reset to 30s)`);
  } else {
    throw new Error(`FAIL: Timer improperly reset on resume: was ${pausedSec}s, now ${resumedAdminState.timeRemaining}s`);
  }

  // Test SKIP QUESTION
  console.log('\n--- TEST 7: SKIP QUESTION RESETS TO FRESH 30s ON NEXT QUESTION ---');
  adminSocket.emit('admin_skip_question');
  await sleep(300);

  const q2IntroState = adminStates[adminStates.length - 1];
  console.log(`Skipped to Question ${q2IntroState.currentQuestionIndex + 1} Intro: ${q2IntroState.state}, isTimerRunning: ${q2IntroState.isTimerRunning}`);

  await sleep(2200); // wait for 2s intro to finish
  const q2Clue1 = adminStates[adminStates.length - 1];
  console.log(`Question 2 Clue 1 state: ${q2Clue1.state}, timeRemaining: ${q2Clue1.timeRemaining}s, clueDuration: ${q2Clue1.clueDuration}s`);
  if (q2Clue1.state === 'ROUND_1_CLUE_1' && q2Clue1.timeRemaining >= 29 && q2Clue1.clueDuration === 30) {
    console.log('✓ PASS: Next question clue starts with a fresh 30s timer!');
  } else {
    throw new Error(`FAIL: Question 2 Clue 1 did not start with 30s timer: got ${q2Clue1.timeRemaining}`);
  }

  // Test AUTOMATIC CLUE PROGRESSION (Clue 1 -> Clue 2 -> Clue 3 -> Answer Reveal)
  console.log('\n--- TEST 8: AUTOMATIC CLUE PROGRESSION ON TIMER EXPIRY ---');
  // Configure 2-second clue timer for rapid test of full automatic chain
  adminSocket.emit('admin_update_settings', { round1TimerDuration: 2 });
  // Skip to Question 3 with 2s clue duration
  adminSocket.emit('admin_skip_question');
  await sleep(2300); // Wait for Question 3 Intro -> Clue 1

  const testClue1 = adminStates[adminStates.length - 1];
  console.log(`Question 3 Clue 1 active: ${testClue1.activeClueNumber}, timeRemaining: ${testClue1.timeRemaining}s`);

  // Wait 2.5s for Clue 1 timer to expire
  console.log('Waiting for Clue 1 timer to expire (2s)...');
  await sleep(2500);

  const autoClue2 = adminStates[adminStates.length - 1];
  const clue2Num = autoClue2.activeClueNumber || autoClue2.currentChallenge?.activeClueNumber;
  console.log(`Auto advanced to: ${autoClue2.state}, activeClueNumber: ${clue2Num}`);
  if (autoClue2.state === 'ROUND_1_CLUE_2') {
    console.log('✓ PASS: Clue 1 expired -> automatically advanced to Clue 2 with fresh timer!');
  } else {
    throw new Error(`FAIL: Expected automatic advance to Clue 2, got ${autoClue2.state}`);
  }

  // Wait 2.5s for Clue 2 timer to expire
  console.log('Waiting for Clue 2 timer to expire (2s)...');
  await sleep(2500);

  const autoClue3 = adminStates[adminStates.length - 1];
  const clue3Num = autoClue3.activeClueNumber || autoClue3.currentChallenge?.activeClueNumber;
  console.log(`Auto advanced to: ${autoClue3.state}, activeClueNumber: ${clue3Num}`);
  if (autoClue3.state === 'ROUND_1_CLUE_3') {
    console.log('✓ PASS: Clue 2 expired -> automatically advanced to Clue 3 with fresh timer!');
  } else {
    throw new Error(`FAIL: Expected automatic advance to Clue 3, got ${autoClue3.state}`);
  }

  // Wait 2.5s for Clue 3 timer to expire
  console.log('Waiting for Clue 3 timer to expire (2s)...');
  await sleep(2500);

  const autoReveal = adminStates[adminStates.length - 1];
  console.log(`Auto advanced to: ${autoReveal.state}`);
  if (autoReveal.state === 'ROUND_1_ANSWER_REVEAL') {
    console.log('✓ PASS: Clue 3 expired -> automatically advanced to ANSWER REVEAL!');
  } else {
    throw new Error(`FAIL: Expected automatic advance to ANSWER_REVEAL, got ${autoReveal.state}`);
  }

  // Restore 30s setting
  adminSocket.emit('admin_update_settings', { round1TimerDuration: 30 });

  // Test SKIP ROUND
  console.log('\n--- TEST 9: SKIP ROUND IMMEDIATELY STOPS TIMER ---');
  adminSocket.emit('admin_skip_round');
  await sleep(500);

  const roundCompleteState = adminStates[adminStates.length - 1];
  console.log(`Round skipped state: ${roundCompleteState.state}, isTimerRunning: ${roundCompleteState.isTimerRunning}`);
  if (roundCompleteState.state === 'ROUND_1_COMPLETE' && roundCompleteState.isTimerRunning === false) {
    console.log('✓ PASS: Skip Round stops all timers immediately and enters waiting state');
  } else {
    throw new Error('FAIL: Timer should be stopped on skip round');
  }

  adminSocket.disconnect();
  playerSocket.disconnect();

  console.log('\n======================================================');
  console.log('🎉 ALL 9 ROUND TIMER TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================');
  process.exit(0);
}

runTimerTests().catch(err => {
  console.error('\n❌ Test execution error:', err.message);
  process.exit(1);
});
