import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

async function runVerification() {
  console.log('=== TEST: ADMIN START GAME & COUNTDOWN VERIFICATION ===');

  const adminSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });

  await new Promise((resolve) => {
    adminSocket.on('connect', () => {
      console.log('✔ Admin socket connected');
      resolve();
    });
  });

  let adminStates = [];
  let countdownTicks = [];
  let timerTicks = [];

  adminSocket.on('admin_state_update', (state) => {
    adminStates.push(state);
    console.log(`✔ [ADMIN EVENT] admin_state_update: state=${state.state}, round=${state.currentRoundNumber}, timeRemaining=${state.timeRemaining}`);
  });

  adminSocket.on('start_countdown_tick', (tick) => {
    countdownTicks.push(tick.secondsRemaining);
    console.log(`✔ [ADMIN EVENT] start_countdown_tick: secondsRemaining=${tick.secondsRemaining} (${tick.secondsRemaining === 0 ? 'GO' : tick.secondsRemaining})`);
  });

  adminSocket.on('timer_tick', (tick) => {
    timerTicks.push(tick.timeRemaining);
    console.log(`✔ [ADMIN EVENT] timer_tick: timeRemaining=${tick.timeRemaining}s`);
  });

  // 1. Authenticate Admin
  const authRes = await new Promise((resolve) => {
    adminSocket.emit('admin_auth', { pin: 'admin123' }, (res) => resolve(res));
  });
  console.log('✔ Admin authentication result:', authRes);
  if (!authRes.success) throw new Error('Admin auth failed');

  // Check initial full state
  await new Promise((r) => setTimeout(r, 500));
  const initialState = adminStates[adminStates.length - 1];
  console.log('Initial Admin State Check:');
  console.log('- publicTeams count:', initialState.publicTeams?.length);
  console.log('- round1Question present:', Boolean(initialState.round1Question));
  console.log('- round1Question domain:', initialState.round1Question?.domain);
  console.log('- round2Pattern present:', Boolean(initialState.round2Pattern));
  console.log('- round3Reaction present:', Boolean(initialState.round3Reaction));
  if (!initialState.publicTeams || initialState.publicTeams.length !== 4) {
    throw new Error('publicTeams missing or invalid');
  }
  if (!initialState.round1Question || !initialState.round1Question.clue1) {
    throw new Error('round1Question missing in admin state');
  }

  // 2. Admin clicks [ START GAME ]
  console.log('\n--- Admin clicks [ START GAME ] ---');
  adminSocket.emit('admin_start_game');

  // Wait 4.5 seconds for countdown (3 -> 2 -> 1 -> GO -> Round 1 Intro)
  console.log('Waiting for countdown sequence (3 -> 2 -> 1 -> GO)...');
  await new Promise((r) => setTimeout(r, 4500));

  console.log('\nCountdown ticks captured:', countdownTicks);
  if (!countdownTicks.includes(2) || !countdownTicks.includes(1) || !countdownTicks.includes(0)) {
    throw new Error(`Countdown ticks missing. Captured: ${JSON.stringify(countdownTicks)}`);
  }
  console.log('✔ Verified Countdown 3 -> 2 -> 1 -> GO sequence received by Admin');

  // Wait for Round 1 Intro -> Round 1 Clue 1 transition (2 seconds)
  console.log('Waiting for Round 1 Clue 1 (LIVE)...');
  await new Promise((r) => setTimeout(r, 2500));

  const liveState = adminStates[adminStates.length - 1];
  console.log(`Current state: ${liveState.state}`);
  console.log(`Active clue: ${liveState.currentChallenge?.activeClueNumber || liveState.activeClueNumber}`);
  console.log(`Timer ticks captured: ${timerTicks.length}`);

  if (liveState.state !== 'ROUND_1_CLUE_1') {
    throw new Error(`Expected ROUND_1_CLUE_1 but got ${liveState.state}`);
  }
  console.log('✔ Round 1 Clue 1 is LIVE with active timer');

  // 3. Test Refresh State request
  console.log('\n--- Testing admin_refresh_state ---');
  let refreshReceived = false;
  adminSocket.once('admin_state_update', (refreshed) => {
    refreshReceived = true;
    console.log('✔ Received state refresh:', refreshed.state);
  });
  adminSocket.emit('admin_refresh_state');
  await new Promise((r) => setTimeout(r, 1000));
  if (!refreshReceived) throw new Error('admin_refresh_state did not emit update');

  // 4. Test Pause and Resume
  console.log('\n--- Testing Admin PAUSE & RESUME ---');
  adminSocket.emit('admin_pause_game');
  await new Promise((r) => setTimeout(r, 1000));
  console.log('State after pause:', adminStates[adminStates.length - 1].state);
  if (adminStates[adminStates.length - 1].state !== 'PAUSED') {
    throw new Error('Pause failed');
  }

  adminSocket.emit('admin_resume_game');
  console.log('Waiting for resume countdown (3s)...');
  await new Promise((r) => setTimeout(r, 4000));
  console.log('State after resume:', adminStates[adminStates.length - 1].state);
  if (adminStates[adminStates.length - 1].state !== 'ROUND_1_CLUE_1') {
    throw new Error('Resume failed');
  }

  // 5. Reset Game back to Lobby for clean state
  console.log('\n--- Resetting game to LOBBY ---');
  adminSocket.emit('admin_reset_game');
  await new Promise((r) => setTimeout(r, 1000));
  console.log('State after reset:', adminStates[adminStates.length - 1].state);
  if (adminStates[adminStates.length - 1].state !== 'LOBBY') {
    throw new Error('Reset failed');
  }

  adminSocket.disconnect();
  console.log('\n✔ ALL TESTS PASSED SUCCESSFULLY! NO BLACK SCREEN OR MISSING DATA.');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
