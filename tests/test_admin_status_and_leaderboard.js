/**
 * Automated Test Suite: Admin Authentication (12345), Live Team Status & Dedicated Fullscreen Leaderboard
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== RUNNING ADMIN AUTH, TEAM STATUS & LEADERBOARD TESTS ===\n');

  // ==========================================
  // SECTION 1: ADMIN PASSWORD & AUTHENTICATION (12345)
  // ==========================================
  console.log('--- Section 1: Admin Authentication with Password 12345 ---');

  // Test 1.1: Reject invalid password
  const resBad = await fetch(`${SERVER_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong_password_999' })
  });
  assert(resBad.status === 401, 'Invalid password is rejected with 401 Unauthorized');
  const badBody = await resBad.json();
  assert(badBody.success === false, 'Invalid login response indicates success: false');

  // Test 1.2: Accept correct password '12345'
  const resGood = await fetch(`${SERVER_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '12345' })
  });
  assert(resGood.status === 200, 'Password "12345" returns 200 OK');
  const goodBody = await resGood.json();
  assert(goodBody.success === true, 'Admin login returns success: true');
  assert(Boolean(goodBody.token), 'Admin login generates secure session token');
  const adminToken = goodBody.token;

  // Test 1.3: Verify active admin token
  const resVerify = await fetch(`${SERVER_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: adminToken })
  });
  assert(resVerify.status === 200, 'Session token verified successfully');
  const verifyBody = await resVerify.json();
  assert(verifyBody.success === true && verifyBody.role === 'admin', 'Verified role is admin');

  // Test 1.4: Reject invalid token verification
  const resVerifyBad = await fetch(`${SERVER_URL}/api/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'fabricated_fake_token' })
  });
  assert(resVerifyBad.status === 401, 'Fabricated token returns 401');

  // ==========================================
  // SECTION 2: ADMIN SOCKET AUTHENTICATION & ZERO PASSWORD LEAK
  // ==========================================
  console.log('\n--- Section 2: Admin Socket Auth & Zero Password Leak ---');

  const adminSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });

  await new Promise((resolve) => adminSocket.on('connect', resolve));
  assert(adminSocket.connected, 'Admin socket connected to server');

  const adminStatePromise = new Promise((resolve) => {
    adminSocket.once('admin_state_update', (state) => {
      resolve(state);
    });
  });

  const authPromise = new Promise((resolve) => {
    adminSocket.emit('admin_auth', { token: adminToken, pin: '12345' }, (res) => {
      resolve(res);
    });
  });
  const authRes = await authPromise;
  assert(authRes?.success === true, 'Admin socket authenticated with session token');

  const adminState = await adminStatePromise;
  assert(adminState !== null, 'Admin socket received admin_state_update');
  assert(adminState.adminPin === undefined, 'Admin password is NEVER leaked in admin_state_update socket event');
  assert(Boolean(adminState.publicTeams), 'admin_state_update contains publicTeams');
  assert(Boolean(adminState.teamsStatus), 'admin_state_update contains teamsStatus dictionary');

  // ==========================================
  // SECTION 3: LIVE TEAM STATUS & DYNAMIC TEAMS
  // ==========================================
  console.log('\n--- Section 3: Live Team Join Status & Dynamic Configuration ---');

  // Reset game to fresh LOBBY state
  const resetPromise = new Promise((resolve) => {
    adminSocket.emit('admin_reset_game', {}, resolve);
  });
  await resetPromise;
  await sleep(150);

  // Test dynamic 5 and 6 teams configuration
  const setTeamCountPromise = (count) => new Promise((resolve) => {
    adminSocket.emit('admin_set_team_count', { teamCount: count }, (res) => {
      resolve(res);
    });
  });

  const setRes6 = await setTeamCountPromise(6);
  assert(setRes6?.success === true, 'admin_set_team_count returned success for 6 teams');
  await sleep(100);

  const teamStatusRes = await fetch(`${SERVER_URL}/api/teams`).then(r => r.json());
  assert(teamStatusRes.teamCount === 6, 'Dynamic team count successfully updated to 6 teams');
  assert(Object.keys(teamStatusRes.teams).length === 6, '6 team status records returned');

  // Reset back to 4 teams for gameplay tests
  await setTeamCountPromise(4);
  await sleep(100);

  // Player connects to Team 1
  const player1Socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });
  await new Promise((resolve) => player1Socket.on('connect', resolve));

  const joinPromise = new Promise((resolve) => {
    player1Socket.emit('player_join', { team: 1, gameCode: 'QUEST-2026' }, resolve);
  });
  const joinRes = await joinPromise;
  assert(joinRes.success === true, 'Player 1 joined Team 1 successfully');

  // Check public team status
  const teamsAfterJoin = await fetch(`${SERVER_URL}/api/teams`).then(r => r.json());
  assert(teamsAfterJoin.teams['1'].connected === true, 'Team 1 status is CONNECTED');
  assert(teamsAfterJoin.teams['1'].claimed === true, 'Team 1 status is CLAIMED / ALREADY JOINED');
  assert(teamsAfterJoin.teams['2'].connected === false, 'Team 2 status is WAITING (unconnected)');
  assert(teamsAfterJoin.teams['2'].available === true, 'Team 2 status is AVAILABLE');

  // Disconnect player 1 -> checks RECONNECTING status
  player1Socket.disconnect();
  await sleep(150);

  const teamsAfterDisconnect = await fetch(`${SERVER_URL}/api/teams`).then(r => r.json());
  assert(teamsAfterDisconnect.teams['1'].connected === false, 'Team 1 disconnected');
  assert(teamsAfterDisconnect.teams['1'].claimed === true, 'Team 1 is still claimed (grace period)');
  assert(teamsAfterDisconnect.teams['1'].reconnecting === true, 'Team 1 status reports reconnecting: true');

  // Admin releases team seat
  const releasePromise = new Promise((resolve) => {
    adminSocket.emit('admin_release_team', { teamId: 1 }, resolve);
  });
  await releasePromise;
  await sleep(100);

  const teamsAfterRelease = await fetch(`${SERVER_URL}/api/teams`).then(r => r.json());
  assert(teamsAfterRelease.teams['1'].claimed === false, 'Team 1 seat successfully released by Admin');
  assert(teamsAfterRelease.teams['1'].available === true, 'Team 1 is now available for new players');

  // ==========================================
  // SECTION 4: FULLSCREEN LEADERBOARD ROUTE (/leaderboard)
  // ==========================================
  console.log('\n--- Section 4: Standalone Fullscreen Leaderboard Route ---');

  // Test 4.1: HTTP GET /leaderboard returns SPA index.html
  const resLeaderboardPage = await fetch(`${SERVER_URL}/leaderboard`);
  assert(resLeaderboardPage.status === 200, 'GET /leaderboard returns 200 OK');
  const htmlContent = await resLeaderboardPage.text();
  assert(htmlContent.includes('<div id="root"></div>'), 'GET /leaderboard correctly serves index.html with SPA root container');

  // Test 4.2: Display Socket Joins display_room and receives display_state_update
  const displaySocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });
  await new Promise((resolve) => displaySocket.on('connect', resolve));

  const displayStatePromise = new Promise((resolve) => {
    displaySocket.on('display_state_update', (dState) => {
      resolve(dState);
    });
  });
  displaySocket.emit('display_join');

  const displayState = await displayStatePromise;
  assert(displayState !== null, 'Display socket received display_state_update upon display_join');
  assert(Boolean(displayState.scores), 'display_state_update contains authoritative totalScores');
  assert(Boolean(displayState.roundScores), 'display_state_update contains roundScores');
  assert(Boolean(displayState.round1Scores), 'display_state_update contains round1Scores breakdown');
  assert(Boolean(displayState.round2Scores), 'display_state_update contains round2Scores breakdown');
  assert(Boolean(displayState.round3Scores), 'display_state_update contains round3Scores breakdown');
  assert(typeof displayState.teamCount === 'number', 'display_state_update contains teamCount');
  assert(Boolean(displayState.state), 'display_state_update contains current game state');

  // ==========================================
  // SECTION 5: STRICT PLAYER PRIVACY & ISOLATION
  // ==========================================
  console.log('\n--- Section 5: Strict Isolation & Score Privacy for Players ---');

  const playerSocket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });
  await new Promise((resolve) => playerSocket.on('connect', resolve));

  const playerJoinRes = await new Promise((resolve) => {
    playerSocket.emit('player_join', { team: 2, gameCode: 'QUEST-2026' }, resolve);
  });
  assert(playerJoinRes.success === true, 'Player 2 joined Team 2');

  const playerState = await new Promise((resolve) => {
    playerSocket.emit('player_get_state', {}, resolve);
  });

  // Verify strict score isolation: player state must NEVER include opponent scores or totalScores
  assert(playerState.scores === undefined, 'Player state strictly EXCLUDES overall scores');
  assert(playerState.roundScores === undefined, 'Player state strictly EXCLUDES roundScores');
  assert(playerState.round1Scores === undefined, 'Player state strictly EXCLUDES round1Scores');
  assert(playerState.round2Scores === undefined, 'Player state strictly EXCLUDES round2Scores');
  assert(playerState.round3Scores === undefined, 'Player state strictly EXCLUDES round3Scores');
  assert(playerState.adminPin === undefined, 'Player state strictly EXCLUDES adminPin');

  // Clean up sockets
  adminSocket.disconnect();
  displaySocket.disconnect();
  playerSocket.disconnect();

  console.log(`\n======================================================`);
  console.log(`ALL TESTS PASSED: ${passCount} passed, ${failCount} failed`);
  console.log(`======================================================\n`);
}

runTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
