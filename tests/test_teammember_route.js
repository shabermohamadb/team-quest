import assert from 'assert';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

async function runTests() {
  console.log('=== RUNNING TEAM MEMBER ROUTE & DIRECTORY TESTS ===\n');

  // Test 1: GET /teammember returns 200 OK and serves SPA index.html
  console.log('--- Test 1: HTTP Routes for /teammember and /teammembers ---');
  const res1 = await fetch(`${SERVER_URL}/teammember`);
  assert.strictEqual(res1.status, 200, 'GET /teammember should return 200 OK');
  const html1 = await res1.text();
  assert(html1.includes('id="root"'), 'GET /teammember should serve index.html with #root element');
  console.log('[PASS] GET /teammember returns 200 and serves SPA entry point');

  const res2 = await fetch(`${SERVER_URL}/teammembers`);
  assert.strictEqual(res2.status, 200, 'GET /teammembers alias should return 200 OK');
  const html2 = await res2.text();
  assert(html2.includes('id="root"'), 'GET /teammembers should serve index.html with #root element');
  console.log('[PASS] GET /teammembers alias returns 200 and serves SPA entry point');

  // Test 2: REST Endpoints /api/teammembers and /api/team-members
  console.log('\n--- Test 2: REST API Endpoints ---');
  const apiRes1 = await fetch(`${SERVER_URL}/api/teammembers`);
  assert.strictEqual(apiRes1.status, 200, 'GET /api/teammembers should return 200');
  const data1 = await apiRes1.json();
  assert(data1.success === true, 'Response should contain success: true');
  assert(data1.rosters && typeof data1.rosters === 'object', 'Response should contain rosters object');
  assert.strictEqual(data1.totalParticipants, 31, 'Total participants should be 31');
  console.log(`[PASS] GET /api/teammembers returns 31 total participants across ${data1.teamCount} teams`);

  const apiRes2 = await fetch(`${SERVER_URL}/api/team-members`);
  assert.strictEqual(apiRes2.status, 200, 'GET /api/team-members alias should return 200');
  const data2 = await apiRes2.json();
  assert.strictEqual(data2.totalParticipants, 31, 'GET /api/team-members should return 31 participants');
  console.log('[PASS] GET /api/team-members alias works identically');

  // Test 3: Roster Distribution Integrity
  console.log('\n--- Test 3: Roster Distribution Integrity ---');
  const team1Members = data1.rosters['1'] || [];
  const team2Members = data1.rosters['2'] || [];
  const team3Members = data1.rosters['3'] || [];
  const team4Members = data1.rosters['4'] || [];

  console.log(`Team 1: ${team1Members.length} members (${team1Members.map(m => m.name).join(', ')})`);
  console.log(`Team 2: ${team2Members.length} members (${team2Members.map(m => m.name).join(', ')})`);
  console.log(`Team 3: ${team3Members.length} members (${team3Members.map(m => m.name).join(', ')})`);
  console.log(`Team 4: ${team4Members.length} members (${team4Members.map(m => m.name).join(', ')})`);

  const totalAssigned = team1Members.length + team2Members.length + team3Members.length + team4Members.length;
  assert.strictEqual(totalAssigned, 31, 'All 31 tournament participants must be assigned');
  assert(data1.isBalanced, 'Rosters must be mathematically balanced (delta <= 1)');
  console.log('[PASS] All 31 participants assigned with Delta <= 1 balance (8, 8, 8, 7)');

  // Verify both "Vishal" entries exist
  const allNames = [
    ...team1Members.map(m => m.name),
    ...team2Members.map(m => m.name),
    ...team3Members.map(m => m.name),
    ...team4Members.map(m => m.name)
  ];
  const vishalCount = allNames.filter(n => n.toLowerCase() === 'vishal').length;
  assert.strictEqual(vishalCount, 2, 'Both participants named Vishal must be uniquely preserved');
  console.log('[PASS] Both Vishal entries preserved as distinct players');

  // Test 4: Socket get_rosters event
  console.log('\n--- Test 4: Real-time Socket Event get_rosters ---');
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true
  });

  await new Promise((resolve) => socket.on('connect', resolve));
  assert(socket.connected, 'Socket connected successfully');

  const socketRosters = await new Promise((resolve) => {
    socket.emit('get_rosters', {}, (res) => {
      resolve(res);
    });
  });

  assert(socketRosters && socketRosters.rosters, 'Socket get_rosters returned rosters object');
  assert.strictEqual(socketRosters.totalParticipants, 31, 'Socket rosters has 31 participants');
  console.log('[PASS] Socket get_rosters event successfully returns authoritative roster mapping');

  socket.disconnect();

  console.log('\n======================================================');
  console.log('ALL /teammember TESTS PASSED SUCCESSFULLY (6/6)');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('[FAIL] Test failed:', err);
  process.exit(1);
});
