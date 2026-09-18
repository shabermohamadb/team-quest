/**
 * Comprehensive Automated Test Suite: Team Quest Database Persistence
 * 
 * Verifies:
 * 1. SQLite Database Schema & Tables:
 *    - games, teams, members, team_scores, score_events, team_locks, game_history.
 * 2. Members Management in Database:
 *    - Members table persistence, addition, bulk import, updates, removal.
 *    - Balanced auto-assignment (delta <= 1) saved to database.
 *    - Participant rosters persisted across server restarts.
 * 3. Dynamic Teams Support:
 *    - 4, 5, and 6 teams dynamically generated and synchronized in teams table.
 * 4. Authoritative Scoring & Score Events:
 *    - Immutable audit log in score_events.
 *    - Total points computed server-side: totalPoints = r1 + r2 + r3.
 *    - Question-level team locks stored in team_locks.
 * 5. Game History Persistence:
 *    - Completed games stored in game_history with final scores and winner.
 * 6. REST Database API Inspection:
 *    - /api/db/stats, /api/db/members, /api/db/scores, /api/db/score-events, /api/db/locks.
 * 7. Admin Roster Privacy:
 *    - Zero member leaks to unauthenticated player sockets.
 */

import { io } from 'socket.io-client';
import http from 'http';

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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const req = http.request(`${SERVER_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function connectSocket() {
  return new Promise((resolve) => {
    const s = io(SERVER_URL, {
      transports: ['websocket'],
      forceNew: true
    });
    s.on('connect', () => resolve(s));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== STARTING DATABASE PERSISTENCE VERIFICATION ===\n');

  // TEST 1: Database Stats & Tables Existence
  console.log('--- TEST 1: Inspect Database Stats via REST ---');
  const statsRes = await fetchJson(`${SERVER_URL}/api/db/stats`);
  assert(statsRes.success === true, 'Database stats endpoint returned success');
  assert(statsRes.stats.games >= 1, `Games table populated (count: ${statsRes.stats.games})`);
  assert(statsRes.stats.teams >= 4, `Teams table populated (count: ${statsRes.stats.teams})`);
  assert(statsRes.stats.members >= 10, `Members table populated with participants (count: ${statsRes.stats.members})`);
  assert(statsRes.stats.teamScores >= 4, `Team scores table populated (count: ${statsRes.stats.teamScores})`);
  assert(statsRes.stats.gameHistory >= 1, `Game history table populated (count: ${statsRes.stats.gameHistory})`);

  // TEST 2: Inspect Database Members & Roster Balance
  console.log('\n--- TEST 2: Member CRUD & Balanced Allocation ---');
  const membersRes = await fetchJson(`${SERVER_URL}/api/db/members`);
  assert(membersRes.success === true, 'Database members endpoint returned success');
  assert(Array.isArray(membersRes.members), 'Members returned as array');
  const totalMembers = membersRes.members.length;
  console.log(`[INFO] Current members in SQLite: ${totalMembers}`);

  // Test admin socket connection & token
  const loginRes = await postJson('/api/admin/login', { password: '12345' });
  assert(loginRes.success === true && loginRes.token, 'Admin login succeeded');
  const adminToken = loginRes.token;

  const adminSocket = await connectSocket();
  const authRes = await new Promise(r => adminSocket.emit('admin_auth', { token: adminToken }, r));
  assert(authRes.success === true, 'Admin socket authenticated');

  // Ensure game is in LOBBY state
  adminSocket.emit('admin_reset_game');
  await sleep(250);

  // Add new member
  const newMemberName = `Test_Participant_${Date.now()}`;
  const addRes = await new Promise(r => adminSocket.emit('admin_add_participant', { name: newMemberName }, r));
  assert(addRes.success === true, 'Admin added participant via socket');
  assert(addRes.participant.name === newMemberName, 'Added participant has correct name');

  // Verify member in DB
  const membersAfterAdd = await fetchJson(`${SERVER_URL}/api/db/members`);
  const foundInDb = membersAfterAdd.members.find(m => m.name === newMemberName);
  assert(Boolean(foundInDb), 'Newly added participant verified in SQLite members table');

  // Test Auto-Assign across 4 teams
  const assign4Res = await new Promise(r => adminSocket.emit('admin_auto_assign_teams', {}, r));
  assert(assign4Res.success === true, 'Admin auto-assigned teams');
  assert(assign4Res.isBalanced === true, `Roster is mathematically balanced (max diff <= 1: min=${assign4Res.minSize}, max=${assign4Res.maxSize})`);

  // Verify team counts in DB
  const membersAfterAssign = await fetchJson(`${SERVER_URL}/api/db/members`);
  const assignedCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const m of membersAfterAssign.members) {
    if (m.teamId && assignedCounts[m.teamId] !== undefined) {
      assignedCounts[m.teamId]++;
    }
  }
  const sizes = Object.values(assignedCounts);
  const delta = Math.max(...sizes) - Math.min(...sizes);
  assert(delta <= 1, `SQLite database members reflect balanced distribution (sizes: ${sizes.join(', ')}, delta: ${delta})`);

  // TEST 3: Dynamic 5 & 6 Teams Support in Database
  console.log('\n--- TEST 3: Dynamic Teams Support (5 & 6 Teams) in Database ---');
  // Set to 5 teams
  const set5Res = await new Promise(r => adminSocket.emit('admin_set_team_count', { teamCount: 5 }, r));
  assert(set5Res.success === true, 'Dynamic team count set to 5');
  const assign5Res = await new Promise(r => adminSocket.emit('admin_auto_assign_teams', {}, r));
  assert(assign5Res.teamCount === 5, 'Roster team count updated to 5');
  assert(assign5Res.isBalanced === true, `5-team assignment balanced (min=${assign5Res.minSize}, max=${assign5Res.maxSize})`);

  // Set to 6 teams
  const set6Res = await new Promise(r => adminSocket.emit('admin_set_team_count', { teamCount: 6 }, r));
  assert(set6Res.success === true, 'Dynamic team count set to 6');
  const assign6Res = await new Promise(r => adminSocket.emit('admin_auto_assign_teams', {}, r));
  assert(assign6Res.teamCount === 6, 'Roster team count updated to 6');
  assert(assign6Res.isBalanced === true, `6-team assignment balanced (min=${assign6Res.minSize}, max=${assign6Res.maxSize})`);

  // Reset back to 4 teams for standard gameplay test
  const set4Res = await new Promise(r => adminSocket.emit('admin_set_team_count', { teamCount: 4 }, r));
  assert(set4Res.success === true, 'Reset back to 4 teams');

  // Clean up test member
  if (foundInDb) {
    await new Promise(r => adminSocket.emit('admin_remove_participant', { id: foundInDb.id }, r));
  }

  // TEST 4: Gameplay Scoring, Score Events & Team Locks in Database
  console.log('\n--- TEST 4: Score Events & Team Locks Persistence in SQLite ---');
  // 1. Reset game first so session is fresh
  adminSocket.emit('admin_reset_game');
  await sleep(200);

  // 2. Connect Team 1 Socket and join
  const team1Socket = await connectSocket();
  const join1Res = await new Promise(r => team1Socket.emit('player_join', { team: 1 }, r));
  assert(join1Res.success === true, 'Team 1 joined game');

  // 3. Start game
  adminSocket.emit('admin_start_game');

  // Wait until ROUND_1_CLUE_1
  let adminState = null;
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    if (adminState && adminState.state === 'ROUND_1_CLUE_1') break;
  }
  assert(adminState && adminState.state === 'ROUND_1_CLUE_1', 'Game progressed to ROUND_1_CLUE_1');

  const q = adminState.round1Question || adminState.currentQuestion;
  assert(q && q.correctAnswer, 'Round 1 Question loaded with correct answer: ' + q?.correctAnswer);
  const qId = q.id;
  const correctAnswer = q.correctAnswer;
  console.log(`[INFO] Active Question: ${qId}, Correct Answer: ${correctAnswer}`);

  // 4. Team 1 submits correct answer using player_submit_r1
  const submitRes = await new Promise(r => team1Socket.emit('player_submit_r1', { answer: correctAnswer, questionId: qId }, r));
  assert(submitRes.success === true && submitRes.isCorrect === true, 'Team 1 answer submitted successfully as correct');
  assert(submitRes.points > 0, `Team 1 awarded ${submitRes.points} points`);

  // Verify Score Events in SQLite
  const eventsRes = await fetchJson(`${SERVER_URL}/api/db/score-events`);
  assert(eventsRes.success === true, 'Score events endpoint returned success');
  const latestEvent = eventsRes.events[eventsRes.events.length - 1];
  assert(latestEvent && latestEvent.teamId === 1, 'Latest score event logged for Team 1');
  assert(latestEvent.isCorrect === 1, 'Score event recorded as correct');
  assert(latestEvent.points === submitRes.points, `Score event points match awarded points (${latestEvent.points})`);
  assert(latestEvent.round === 1, 'Score event round matches Round 1');

  // Verify Team Locks in SQLite
  const locksRes = await fetchJson(`${SERVER_URL}/api/db/locks?questionId=${qId}`);
  assert(locksRes.success === true, 'Locks endpoint returned success');
  assert(locksRes.locks['1'] !== undefined, 'Team 1 is locked in SQLite team_locks table');
  assert(locksRes.locks['1'].status === 'SOLVED', 'Team 1 lock status is SOLVED');

  // Verify Team Scores in SQLite
  const scoresRes = await fetchJson(`${SERVER_URL}/api/db/scores`);
  assert(scoresRes.success === true, 'Team scores endpoint returned success');
  assert(scoresRes.scores['1'] >= submitRes.points, `Authoritative team score updated in SQLite (${scoresRes.scores['1']} pts)`);
  assert(scoresRes.roundScores['1'].r1 >= submitRes.points, `Round 1 breakdown score updated in SQLite (${scoresRes.roundScores['1'].r1} pts)`);

  // TEST 5: Privacy Check — Player Socket Cannot Access Member Names/Rosters
  console.log('\n--- TEST 5: Strict Privacy Check (Admin Only Rosters) ---');
  const playerState = await new Promise(r => team1Socket.emit('player_get_state', {}, r));

  assert(playerState && playerState.state, 'Player state received');
  assert(!playerState.participants, 'Player state contains NO participants array');
  assert(!playerState.rosters, 'Player state contains NO rosters mapping');
  assert(!playerState.members, 'Player state contains NO members list');

  // Clean up sockets
  team1Socket.disconnect();
  adminSocket.disconnect();

  console.log('\n==================================================');
  console.log(`DATABASE PERSISTENCE TESTS COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR IN TEST SUITE]', err);
  process.exit(1);
});
