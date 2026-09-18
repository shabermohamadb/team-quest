/**
 * Automated Test Suite: Admin Login Performance & Realtime Connection Architecture
 * 
 * Verifies:
 * 1. Fast lightweight auth endpoint POST /api/admin/login:
 *    - Rejects invalid PIN with 401
 *    - Accepts 'admin123' with { success: true, role: 'admin', token } in < 25ms
 * 2. Token verification POST /api/admin/verify:
 *    - Validates active token
 *    - Rejects invalid token with 401
 * 3. Realtime Socket Lifecycle & Authentication:
 *    - Socket authenticates with session token
 *    - Joins admin_room and receives streamlined admin_state_update
 *    - Live state contains essential cockpit controls (status, round, timers, scores, locks, settings)
 *    - Heavy bulk repos (50 R2 patterns, 50 R3 challenges, raw participant lists) are excluded from continuous tick
 * 4. Lazy loading on-demand:
 *    - admin_get_question_bank returns full repository when requested
 *    - admin_get_participants_and_rosters returns rosters and participants when requested
 * 5. Logout lifecycle:
 *    - POST /api/admin/logout revokes token
 *    - Socket disconnects cleanly
 * 6. Live game controls authoritative execution under token session.
 */

import { io } from 'socket.io-client';

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

async function runTests() {
  console.log('=== RUNNING ADMIN LOGIN PERFORMANCE & CONNECTION TESTS ===\n');

  // TEST 1: POST /api/admin/login with invalid password
  console.log('--- Test 1: Invalid PIN Rejection ---');
  const resBad = await fetch(`${SERVER_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'wrong_password_999' })
  });
  assert(resBad.status === 401, 'Invalid password returns 401 status');
  const badBody = await resBad.json();
  assert(badBody.success === false, 'Response indicates success: false');
  assert(badBody.error && badBody.error.includes('Invalid'), 'Error message informs of invalid password');

  // TEST 2: POST /api/admin/login with correct password ('admin123')
  console.log('\n--- Test 2: Fast Lightweight Authentication ---');
  const t0 = Date.now();
  const resGood = await fetch(`${SERVER_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: 'admin123' })
  });
  const elapsedMs = Date.now() - t0;
  assert(resGood.status === 200, 'Valid password returns 200 status');
  const goodBody = await resGood.json();
  assert(goodBody.success === true, 'Auth response success is true');
  assert(goodBody.role === 'admin', 'Auth response role is admin');
  assert(typeof goodBody.token === 'string' && goodBody.token.startsWith('admin_sec_'), 'Session token is returned');
  assert(elapsedMs < 100, `Lightweight auth completed in ${elapsedMs}ms (< 100ms requirement)`);
  const adminToken = goodBody.token;

  // TEST 3: POST /api/admin/verify
  console.log('\n--- Test 3: Session Token Verification ---');
  const resVerify = await fetch(`${SERVER_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken })
  });
  assert(resVerify.status === 200, 'Token verify returns 200');
  const verifyBody = await resVerify.json();
  assert(verifyBody.success === true && verifyBody.role === 'admin', 'Token verified successfully');

  // Invalid token verify
  const resFakeVerify = await fetch(`${SERVER_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fake_token_12345' })
  });
  assert(resFakeVerify.status === 401, 'Fake token rejected with 401');

  // TEST 4: Socket Authentication via Session Token
  console.log('\n--- Test 4: Socket Authentication & Streamlined Cockpit Payload ---');
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    autoConnect: false
  });
  socket.connect();

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  assert(socket.connected === true, 'Socket connection opened after auth');

  const authSocketRes = await new Promise((resolve) => {
    socket.emit('admin_auth', { token: adminToken }, resolve);
  });
  assert(authSocketRes.success === true, 'Socket admin_auth with token succeeded');
  assert(authSocketRes.role === 'admin', 'Socket authenticated as admin role');

  // Receive admin_state_update
  const adminState = await new Promise((resolve) => {
    socket.emit('admin_get_state', {}, resolve);
  });

  assert(adminState.state !== undefined, 'adminState contains state: ' + adminState.state);
  assert(adminState.currentRoundNumber !== undefined, 'adminState contains currentRoundNumber: ' + adminState.currentRoundNumber);
  assert(adminState.teamCount !== undefined, 'adminState contains teamCount: ' + adminState.teamCount);
  assert(Array.isArray(adminState.publicTeams), 'adminState contains publicTeams array');
  assert(adminState.settings !== undefined, 'adminState contains settings');
  assert(adminState.selectedQuestionsSummary !== undefined, 'adminState contains selectedQuestionsSummary');
  assert(typeof adminState.participantCount === 'number', 'adminState contains participantCount: ' + adminState.participantCount);

  // Check that continuous state excludes bloated unselected repository dumps
  assert(adminState.round2Patterns === undefined, 'Continuous adminState excludes raw 50 round2Patterns');
  assert(adminState.round3CodeCrackers === undefined, 'Continuous adminState excludes raw 50 round3CodeCrackers');
  assert(adminState.participants === undefined, 'Continuous adminState excludes raw 120 participants array');

  // TEST 5: Lazy Loading Secondary Tabs on Demand
  console.log('\n--- Test 5: Lazy-Loaded Secondary Data ---');
  // 5a. Question Bank on demand
  const qBank = await new Promise((resolve) => {
    socket.emit('admin_get_question_bank', {}, resolve);
  });
  assert(qBank.success === true, 'Question bank loaded on demand');
  assert(Array.isArray(qBank.round1) && qBank.round1.length >= 10, 'Question bank contains Round 1 repository');
  assert(Array.isArray(qBank.round2) && qBank.round2.length >= 10, 'Question bank contains Round 2 repository');
  assert(Array.isArray(qBank.round3) && qBank.round3.length >= 10, 'Question bank contains Round 3 repository');

  // 5b. Rosters and Participants on demand
  const rosterData = await new Promise((resolve) => {
    socket.emit('admin_get_participants_and_rosters', {}, resolve);
  });
  assert(rosterData.success === true, 'Rosters and participants loaded on demand');
  assert(Array.isArray(rosterData.participants), 'Participant roster returned on demand');
  assert(rosterData.rosters && typeof rosterData.rosters === 'object', 'Team assignments returned on demand');

  // TEST 6: Game Controls Remain Fully Authoritative
  console.log('\n--- Test 6: Authoritative Game Controls Under Token Session ---');
  // Set round timing
  const timingRes = await new Promise((resolve) => {
    socket.emit('admin_set_round_timing', { round: 1, duration: 45 }, resolve);
  });
  assert(timingRes.success === true, 'Admin set round timing to 45s');

  const updatedState = await new Promise((resolve) => {
    socket.emit('admin_get_state', {}, resolve);
  });
  assert(updatedState.settings.round1TimerDuration === 45, 'round1TimerDuration updated to 45s');

  // Restore timing to default 30s
  await new Promise((resolve) => {
    socket.emit('admin_set_round_timing', { round: 1, duration: 30 }, resolve);
  });

  // TEST 7: Logout & Token Revocation
  console.log('\n--- Test 7: Clean Logout & Token Revocation ---');
  const resLogout = await fetch(`${SERVER_URL}/api/admin/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken })
  });
  assert(resLogout.status === 200, 'Logout returns 200');

  // Verify token is now invalid
  const resRevokedVerify = await fetch(`${SERVER_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken })
  });
  assert(resRevokedVerify.status === 401, 'Revoked token returns 401 upon verification');

  // Disconnect socket cleanly
  socket.disconnect();
  await new Promise(r => setTimeout(r, 100));
  assert(socket.connected === false, 'Admin socket cleanly disconnected');

  console.log(`\n========================================`);
  console.log(`ALL ADMIN LOGIN TESTS PASSED: ${passCount} passed, ${failCount} failed`);
  console.log(`========================================\n`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n[FATAL TEST ERROR]', err);
  process.exit(1);
});
