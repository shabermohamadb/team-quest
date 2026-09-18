import { io } from 'socket.io-client';

const URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(name) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { reconnection: false, timeout: 5000 });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

async function runTests() {
  console.log('=== STARTING DYNAMIC TEAM COUNT UNIVERSAL SYNC VERIFICATION ===\n');
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
  const unjoinedPlayer = await createClient('unjoined-login-player');
  const lobbyPlayer1 = await createClient('lobby-player-1');

  try {
    // 1. Admin Authentication & Clean Slate
    const authRes = await new Promise((r) => admin.emit('admin_auth', { pin: 'admin123' }, r));
    assert(authRes?.success, 'Admin authenticated');

    admin.emit('admin_reset_game');
    admin.emit('admin_reset_teams');
    await wait(300);

    // 2. Verify REST endpoints return single source of truth
    console.log('\n--- Section 1: REST API Single Source of Truth ---');
    const resTeams = await fetch(`${URL}/api/teams`).then((r) => r.json());
    assert(resTeams?.teamCount === 4, `GET /api/teams returns teamCount = 4 (got: ${resTeams?.teamCount})`);
    assert(Object.keys(resTeams?.teams || {}).length === 4, 'GET /api/teams returns exactly 4 team statuses');

    const resGameState = await fetch(`${URL}/api/game-state`).then((r) => r.json());
    assert(resGameState?.teamCount === 4, `GET /api/game-state returns teamCount = 4 (got: ${resGameState?.teamCount})`);

    // 3. Verify Newly Connected Unjoined Socket Receives Immediate State on Connect
    console.log('\n--- Section 2: Immediate State on Socket Connection ---');
    let unjoinedState = null;
    unjoinedPlayer.on('game_state_update', (st) => {
      unjoinedState = st;
    });

    // Test explicit get_game_state call
    const explicitState = await new Promise((r) => unjoinedPlayer.emit('get_game_state', {}, r));
    assert(explicitState?.teamCount === 4, 'Unjoined player get_game_state callback returned teamCount = 4');

    // 4. TEST A: 4 TEAMS
    console.log('\n--- Section 3: TEST A — 4 TEAMS Dynamic Flow ---');
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 4 }, r));
    await wait(200);

    let lobby1State = null;
    lobbyPlayer1.on('game_state_update', (st) => {
      lobby1State = st;
    });

    // Join Player 1 to Team 1
    const join1 = await new Promise((r) => lobbyPlayer1.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, r));
    assert(join1?.success, 'Player 1 joined Team 1');
    await wait(200);

    assert(unjoinedState?.teamCount === 4, 'Unjoined Login screen has teamCount = 4');
    assert(Object.keys(unjoinedState?.teamsStatus || {}).length === 4, 'Unjoined Login screen has 4 teams in teamsStatus');
    assert(unjoinedState?.teamsStatus[1]?.claimed === true, 'Login screen sees Team 1 is ALREADY JOINED');
    assert(unjoinedState?.teamsStatus[2]?.available === true, 'Login screen sees Team 2 is AVAILABLE');
    assert(lobby1State?.teamCount === 4, 'Lobby player has teamCount = 4');
    assert(lobby1State?.teamsStatus[1]?.connected === true, 'Lobby player sees Team 1 CONNECTED');
    assert(lobby1State?.teamsStatus[2]?.connected === false, 'Lobby player sees Team 2 WAITING');

    // 5. TEST B: 5 TEAMS — Real-time update for both Login and Lobby
    console.log('\n--- Section 4: TEST B — 5 TEAMS Real-Time Update ---');
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 5 }, r));
    await wait(300);

    assert(unjoinedState?.teamCount === 5, 'Unjoined Login screen received real-time teamCount = 5');
    assert(Object.keys(unjoinedState?.teamsStatus || {}).length === 5, 'Unjoined Login screen has 5 teams in teamsStatus');
    assert(unjoinedState?.teamsStatus[5]?.available === true, 'Login screen sees Team 5 is AVAILABLE');
    assert(lobby1State?.teamCount === 5, 'Lobby player received real-time teamCount = 5');
    assert(lobby1State?.teamsStatus[5]?.connected === false, 'Lobby player sees Team 5 WAITING');

    // Connect Player 5 to Team 5
    const player5 = await createClient('player-5');
    const join5 = await new Promise((r) => player5.emit('player_join', { gameCode: 'QUEST-2026', team: 5 }, r));
    assert(join5?.success, 'Player 5 successfully claimed Team 5');
    await wait(300);

    assert(lobby1State?.teamsStatus[5]?.connected === true, 'Lobby player IMMEDIATELY sees TEAM 5 — CONNECTED in real time');
    assert(unjoinedState?.teamsStatus[5]?.claimed === true, 'Login screen IMMEDIATELY sees TEAM 5 — ALREADY JOINED');

    // Duplicate join for Team 5 rejected
    const dup5 = await createClient('dup-5');
    const dup5Res = await new Promise((r) => dup5.emit('player_join', { gameCode: 'QUEST-2026', team: 5 }, r));
    assert(!dup5Res?.success && (dup5Res?.alreadyJoined || dup5Res?.error?.includes('ALREADY JOINED')), 'Duplicate player attempting Team 5 rejected cleanly');
    dup5.disconnect();

    // 6. TEST C: 6 TEAMS — Real-time update for both Login and Lobby
    console.log('\n--- Section 5: TEST C — 6 TEAMS Real-Time Update ---');
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 6 }, r));
    await wait(300);

    assert(unjoinedState?.teamCount === 6, 'Unjoined Login screen received real-time teamCount = 6');
    assert(Object.keys(unjoinedState?.teamsStatus || {}).length === 6, 'Unjoined Login screen has 6 teams in teamsStatus');
    assert(unjoinedState?.teamsStatus[6]?.available === true, 'Login screen sees Team 6 is AVAILABLE');
    assert(lobby1State?.teamCount === 6, 'Lobby player received real-time teamCount = 6');
    assert(lobby1State?.teamsStatus[6]?.connected === false, 'Lobby player sees Team 6 WAITING');

    // Connect Player 6 to Team 6
    const player6 = await createClient('player-6');
    const join6 = await new Promise((r) => player6.emit('player_join', { gameCode: 'QUEST-2026', team: 6 }, r));
    assert(join6?.success, 'Player 6 successfully claimed Team 6');
    await wait(300);

    assert(lobby1State?.teamsStatus[6]?.connected === true, 'Lobby player IMMEDIATELY sees TEAM 6 — CONNECTED in real time');
    assert(unjoinedState?.teamsStatus[6]?.claimed === true, 'Login screen IMMEDIATELY sees TEAM 6 — ALREADY JOINED');

    // 7. Test Transitioning Back: 6 -> 5 -> 4
    console.log('\n--- Section 6: Dynamic Scaling 6 -> 5 -> 4 ---');
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 5 }, r));
    await wait(300);

    assert(unjoinedState?.teamCount === 5, 'Admin set 5 teams -> Login screen shrunk to 5 teams');
    assert(Object.keys(unjoinedState?.teamsStatus || {}).length === 5, 'Login screen teamsStatus has 5 teams');
    assert(lobby1State?.teamCount === 5, 'Lobby screen shrunk to 5 teams');

    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 4 }, r));
    await wait(300);

    assert(unjoinedState?.teamCount === 4, 'Admin set 4 teams -> Login screen shrunk to 4 teams');
    assert(Object.keys(unjoinedState?.teamsStatus || {}).length === 4, 'Login screen teamsStatus has 4 teams');
    assert(lobby1State?.teamCount === 4, 'Lobby screen shrunk to 4 teams');

    // 8. Test Admin Reset Keeps Sockets Connected & Broadcasts
    console.log('\n--- Section 7: Admin Reset Keeps All Sockets Synced ---');
    admin.emit('admin_reset_game');
    await wait(400);

    assert(unjoinedState?.teamCount === 4, 'Unjoined socket remains connected and updated with teamCount 4');
    assert(unjoinedState?.teamsStatus[1]?.available === true, 'All teams released back to AVAILABLE');

    player5.disconnect();
    player6.disconnect();
  } catch (err) {
    console.error('Fatal test error:', err);
    failures++;
  } finally {
    admin.disconnect();
    unjoinedPlayer.disconnect();
    lobbyPlayer1.disconnect();
  }

  console.log(`\n=== TEST SUMMARY: ${failures === 0 ? 'ALL UNIVERSAL SYNC TESTS PASSED ✓' : `${failures} FAILURES ✕`} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests();
