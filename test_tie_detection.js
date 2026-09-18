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

async function runTieTest() {
  console.log('=== TESTING TIE DETECTION & TIEBREAKER FLOW ===\n');

  const adminSocket = createSocket();
  const team1Socket = createSocket();
  const team2Socket = createSocket();

  await wait(400);

  // Authenticate Admin & Reset
  await new Promise(resolve => adminSocket.emit('admin_auth', { pin: 'admin123' }, resolve));
  adminSocket.emit('admin_reset_game');
  await wait(400);

  // Join Team 1 and Team 2
  await new Promise(resolve => team1Socket.emit('player_join', { team: 1 }, resolve));
  await new Promise(resolve => team2Socket.emit('player_join', { team: 2 }, resolve));

  // Start game & wait for Round 1
  const r1Wait = waitForState(team1Socket, ['ROUND_1_CLUE_1', 'ROUND_1_CLUE_2', 'ROUND_1_CLUE_3']);
  adminSocket.emit('admin_start_game');
  const r1 = await r1Wait;

  // Both teams stay at 0 points to test 1st place tie
  console.log('No answers submitted: All teams remain at 0 points to test tie detection.');

  // Now go directly to Round 3
  const r3Wait = waitForState(team1Socket, 'ROUND_3_ACTIVE');
  adminSocket.emit('admin_start_r3');
  const r3 = await r3Wait;

  // Let's check admin authoritative code
  let adminState = null;
  adminSocket.on('admin_state_update', (d) => { adminState = d; });
  adminSocket.emit('admin_refresh_state');
  await wait(400);
  const code = adminState?.round3Challenge?.correctCode;

  // Directly conclude game with both teams at 0 points to test tie detection
  const finalWait = waitForState(team1Socket, 'FINAL_RESULT');
  adminSocket.emit('admin_show_final_results');
  const finalState = await finalWait;
  console.log('Final results received:');
  console.log('isTie:', finalState.finalResults?.isTie);
  console.log('Tied teams:', finalState.finalResults?.tiedTeams);
  console.log('Standings:', finalState.finalResults?.standings);

  if (finalState.finalResults?.isTie) {
    console.log('✓ TIE DETECTED as expected!');
    console.log('Admin clicking [ START TIEBREAKER ]...');
    const tiebreakerWait = waitForState(team1Socket, 'ROUND_3_ACTIVE');
    adminSocket.emit('admin_start_tiebreaker');
    const tbState = await tiebreakerWait;
    console.log('✓ Successfully entered tiebreaker state:', tbState.state);
  } else {
    throw new Error('Expected tie when teams have identical score!');
  }

  // Cleanup
  adminSocket.emit('admin_reset_game');
  await wait(400);
  adminSocket.disconnect();
  team1Socket.disconnect();
  team2Socket.disconnect();
  console.log('✓ Tie test complete.');
  process.exit(0);
}

runTieTest().catch(err => {
  console.error('Tie test error:', err);
  process.exit(1);
});
