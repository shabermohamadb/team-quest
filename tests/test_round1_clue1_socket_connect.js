import assert from 'assert';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

async function runTest() {
  console.log('=== VERIFYING SOCKET.IO CONNECTION IN ROUND_1_CLUE_1 ===\n');

  // Step 1: Connect Admin Socket to authenticate and transition game to ROUND_1_CLUE_1
  const adminSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });

  await new Promise((resolve) => adminSocket.on('connect', resolve));
  console.log('[PASS] Admin socket connected');

  // Authenticate Admin
  const authRes = await new Promise((resolve) => {
    adminSocket.emit('admin_auth', { pin: '12345' }, resolve);
  });
  assert(authRes?.success === true, 'Admin authentication must succeed');
  console.log('[PASS] Admin authenticated');

  // Advance game to Round 1 Clue 1
  console.log('Setting game state to ROUND_1_CLUE_1...');
  const startRes = await new Promise((resolve) => {
    adminSocket.emit('admin_start_round_1', {}, resolve);
  });
  console.log('[PASS] admin_start_round_1 event emitted');

  // Wait a moment for transition to Clue 1
  await new Promise((r) => setTimeout(r, 2200));

  // Step 2: Connect Player Socket while in ROUND_1_CLUE_1
  console.log('\nConnecting Player Socket in ROUND_1_CLUE_1...');
  const playerSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });

  const connectPromise = new Promise((resolve, reject) => {
    playerSocket.on('connect', resolve);
    playerSocket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Player socket connection timed out')), 5000);
  });

  await connectPromise;
  assert(playerSocket.connected, 'Player socket must connect successfully');
  console.log('[PASS] Player socket connected successfully in ROUND_1_CLUE_1');

  // Step 3: Request game state and verify active challenge
  const gameState = await new Promise((resolve, reject) => {
    playerSocket.emit('get_game_state', {}, (state) => {
      resolve(state);
    });
    setTimeout(() => reject(new Error('get_game_state timed out')), 4000);
  });

  console.log('\nReceived Game State in ROUND_1_CLUE_1:');
  console.log('State:', gameState?.state);
  console.log('Current Challenge:', gameState?.currentChallenge);

  assert(gameState !== null && typeof gameState === 'object', 'Game state must be an object');
  assert.strictEqual(gameState.state, 'ROUND_1_CLUE_1', `Expected ROUND_1_CLUE_1, got ${gameState.state}`);
  assert(gameState.currentChallenge !== null, 'currentChallenge must NOT be null');
  assert.strictEqual(gameState.currentChallenge.roundNumber, 1, 'Challenge roundNumber must be 1');
  assert(Array.isArray(gameState.currentChallenge.activeClues), 'activeClues must be an array');
  assert(gameState.currentChallenge.activeClues.length >= 1, 'activeClues must contain at least 1 clue');

  const clue1 = gameState.currentChallenge.activeClues[0];
  assert.strictEqual(clue1.number, 1, 'First clue number must be 1');
  assert(typeof clue1.text === 'string' && clue1.text.length > 0, 'Clue 1 text must be a non-empty string');
  console.log(`[PASS] Verified Clue 1 Text: "${clue1.text}"`);

  // Step 4: Player joins Team 1 and receives sanitized state update
  const joinRes = await new Promise((resolve) => {
    playerSocket.emit('player_join', { team: 1, gameCode: 'QUEST-2026' }, resolve);
  });
  assert(joinRes?.success === true, 'Player join team 1 must succeed');
  console.log('[PASS] Player joined Team 1 successfully');

  // Clean up
  playerSocket.disconnect();
  adminSocket.disconnect();

  console.log('\n======================================================');
  console.log('SOCKET.IO IN ROUND_1_CLUE_1 VERIFICATION PASSED (100%)');
  console.log('======================================================\n');
}

runTest().catch((err) => {
  console.error('[FAIL] Test failed:', err);
  process.exit(1);
});
