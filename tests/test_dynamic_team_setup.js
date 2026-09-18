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
  console.log('=== STARTING DYNAMIC TEAM SETUP & SCORING VERIFICATION ===\n');
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
  const players = [];
  let latestAdminState = null;
  admin.on('admin_state_update', (st) => {
    latestAdminState = st;
  });

  try {
    // 1. Admin Authentication & Reset
    const authRes = await new Promise((r) => admin.emit('admin_auth', { pin: 'admin123' }, r));
    assert(authRes?.success, 'Admin authenticated successfully');

    admin.emit('admin_reset_game');
    admin.emit('admin_reset_teams');
    await wait(200);
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 4 }, r));
    admin.emit('admin_refresh_state');
    await wait(300);

    assert(latestAdminState?.teamCount === 4, 'Initial default team count is 4');

    // 2. Test Dynamic Number of Teams Selection (4, 5, 6)
    console.log('\n--- Section 1: Dynamic Team Count Selection ---');
    const set5Res = await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 5 }, r));
    assert(set5Res?.success && set5Res?.teamCount === 5, 'Admin set team count to 5');
    await wait(150);
    assert(latestAdminState?.teamCount === 5, 'Admin state broadcast reflected 5 teams');

    const set6Res = await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 6 }, r));
    assert(set6Res?.success && set6Res?.teamCount === 6, 'Admin set team count to 6');
    await wait(150);
    assert(latestAdminState?.teamCount === 6, 'Admin state broadcast reflected 6 teams');

    const setInvalidRes = await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 7 }, r));
    assert(!setInvalidRes?.success, 'Invalid team count (7) rejected');

    // 3. Test Participant CRUD (Single, Bulk, Update, Remove, Clear)
    console.log('\n--- Section 2: Participant CRUD ---');
    // Clear any leftover participants first
    await new Promise((r) => admin.emit('admin_clear_participants', {}, r));

    // Add single participant
    const add1Res = await new Promise((r) => admin.emit('admin_add_participant', { name: 'Shaber' }, r));
    assert(add1Res?.success && add1Res?.participant?.name === 'Shaber', 'Added single participant: Shaber');
    const shaberId = add1Res.participant.id;

    // Bulk add 44 participants
    const bulkNames = [
      'Arun', 'Rahul', 'Kavin', 'Priya', 'Manoj', 'Sanjay', 'Vignesh', 'Karthik',
      'Divya', 'Ananya', 'Harish', 'Sneha', 'Pooja', 'Varun', 'Rohit', 'Deepa',
      'Swetha', 'Naveen', 'Keerthi', 'Vikram', 'Meera', 'Dinesh', 'Balaji', 'Nithya',
      'Aravind', 'Preethi', 'Gowtham', 'Sandhya', 'Akash', 'Pavithra', 'Rithika', 'Charan',
      'Abinaya', 'Tejas', 'Roshni', 'Vishnu', 'Ishwarya', 'Tharun', 'Janani', 'Praveen',
      'Madhavan', 'Gayathri', 'Koushik', 'Archana'
    ];
    const bulkRes = await new Promise((r) => admin.emit('admin_add_participants_bulk', { names: bulkNames }, r));
    assert(bulkRes?.success && bulkRes?.count === 44, `Bulk added ${bulkRes?.count} participants (Total: 45)`);

    // Update participant
    const updateRes = await new Promise((r) =>
      admin.emit('admin_update_participant', { id: shaberId, name: 'Shaber (Captain)' }, r)
    );
    assert(updateRes?.success && updateRes?.participant?.name === 'Shaber (Captain)', 'Participant name updated to Shaber (Captain)');

    // Remove participant
    const removeRes = await new Promise((r) => admin.emit('admin_remove_participant', { id: shaberId }, r));
    assert(removeRes?.success, 'Removed participant Shaber (Captain) (Remaining: 44)');

    // 4. Test Automatic Team Splitting & Balance Guarantee (Delta <= 1)
    console.log('\n--- Section 3: Automatic Team Splitting & Balance Guarantee ---');
    // Currently 44 participants, 6 teams: 44 = 6*7 + 2 -> four 7s, two 8s
    const assign6Res = await new Promise((r) => admin.emit('admin_auto_assign_teams', {}, r));
    assert(assign6Res?.success, 'Auto-assigned 44 participants across 6 teams');
    const rosters6 = assign6Res.rosters;
    const sizes6 = [1, 2, 3, 4, 5, 6].map((tid) => rosters6[tid]?.length || 0);
    const min6 = Math.min(...sizes6);
    const max6 = Math.max(...sizes6);
    console.log(`    Team sizes for 6 teams: ${sizes6.join(', ')} (Min: ${min6}, Max: ${max6})`);
    assert(max6 - min6 <= 1, `Balance guarantee met for 6 teams: max(${max6}) - min(${min6}) <= 1`);
    assert(sizes6.reduce((a, b) => a + b, 0) === 44, 'All 44 participants assigned to teams');

    // Switch to 5 teams and auto-assign: 44 = 5*8 + 4 -> four 9s, one 8
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 5 }, r));
    const assign5Res = await new Promise((r) => admin.emit('admin_auto_assign_teams', {}, r));
    const rosters5 = assign5Res.rosters;
    const sizes5 = [1, 2, 3, 4, 5].map((tid) => rosters5[tid]?.length || 0);
    const min5 = Math.min(...sizes5);
    const max5 = Math.max(...sizes5);
    console.log(`    Team sizes for 5 teams: ${sizes5.join(', ')} (Min: ${min5}, Max: ${max5})`);
    assert(max5 - min5 <= 1, `Balance guarantee met for 5 teams: max(${max5}) - min(${min5}) <= 1`);

    // Switch to 4 teams and auto-assign: 44 = 4*11 -> all 11
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 4 }, r));
    const assign4Res = await new Promise((r) => admin.emit('admin_auto_assign_teams', {}, r));
    const rosters4 = assign4Res.rosters;
    const sizes4 = [1, 2, 3, 4].map((tid) => rosters4[tid]?.length || 0);
    console.log(`    Team sizes for 4 teams: ${sizes4.join(', ')}`);
    assert(sizes4.every((s) => s === 11), 'Exact balance for 4 teams: each team has exactly 11 participants');

    // 5. Test Manual Move and Reshuffle
    console.log('\n--- Section 4: Manual Participant Move & Reshuffle ---');
    const participantToMove = rosters4[1][0];
    const moveRes = await new Promise((r) =>
      admin.emit('admin_move_participant', { participantId: participantToMove.id, targetTeamId: 2 }, r)
    );
    assert(moveRes?.success, `Moved participant ${participantToMove.name} from Team 1 to Team 2`);
    const moveSizes = [1, 2, 3, 4].map((tid) => moveRes.rosters[tid]?.length || 0);
    console.log(`    After move sizes: T1=${moveSizes[0]}, T2=${moveSizes[1]}, T3=${moveSizes[2]}, T4=${moveSizes[3]}`);
    assert(moveSizes[0] === 10 && moveSizes[1] === 12, 'Rosters reflect manual move (T1=10, T2=12)');

    // Reshuffle
    const shuffleRes = await new Promise((r) => admin.emit('admin_shuffle_teams', {}, r));
    assert(shuffleRes?.success, 'Reshuffled all teams successfully');
    const shuffleSizes = [1, 2, 3, 4].map((tid) => shuffleRes.rosters[tid]?.length || 0);
    assert(shuffleSizes.every((s) => s === 11), 'Reshuffle rebalanced all 4 teams to 11 members each');

    // 6. Test Zero-Leak Player Privacy
    console.log('\n--- Section 5: Zero-Leak Player Privacy ---');
    const pClient = await createClient('privacy-tester');
    let receivedPlayerState = null;
    pClient.on('game_state_update', (st) => {
      receivedPlayerState = st;
    });

    const pJoin = await new Promise((r) => pClient.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, r));
    assert(pJoin?.success, 'Player joined Team 1');
    await wait(200);

    assert(receivedPlayerState !== null, 'Player received sanitized game state update');
    assert(receivedPlayerState?.teamCount !== undefined, 'Player received public teamCount');
    assert(receivedPlayerState?.participants === undefined, 'Zero-Leak: participants NOT leaked to player');
    assert(receivedPlayerState?.rosters === undefined, 'Zero-Leak: rosters NOT leaked to player');
    assert(receivedPlayerState?.participantList === undefined, 'Zero-Leak: participantList NOT leaked to player');
    pClient.disconnect();

    // 7. Test Representative Device Login for 6 Teams & Single Device Enforcement
    console.log('\n--- Section 6: Dynamic Team Device Login & Enforcement ---');
    // Set to 6 teams
    await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 6 }, r));
    admin.emit('admin_reset_teams');
    await wait(400);

    // Create 6 player devices
    for (let i = 1; i <= 6; i++) {
      const client = await createClient(`team-${i}`);
      players.push(client);
      const joinRes = await new Promise((r) => client.emit('player_join', { gameCode: 'QUEST-2026', team: i }, r));
      assert(joinRes?.success, `Player device successfully claimed Team ${i}`);
    }

    // Try claiming Team 5 on a duplicate device
    const duplicateClient = await createClient('team-5-dup');
    const dupRes = await new Promise((r) => duplicateClient.emit('player_join', { gameCode: 'QUEST-2026', team: 5 }, r));
    assert(!dupRes?.success && (dupRes?.alreadyJoined || dupRes?.error?.includes('ALREADY JOINED')), 'Duplicate device for Team 5 rejected cleanly');
    duplicateClient.disconnect();

    // 8. Test Team Setup Lock on Match Start
    console.log('\n--- Section 7: Team Membership Lock on Match Start ---');
    admin.emit('admin_start_game');
    await wait(6000); // 3s countdown + 2s intro
    admin.emit('admin_refresh_state');
    await wait(300);

    assert(latestAdminState?.teamSetupFrozen === true, 'teamSetupFrozen is TRUE after match start');

    // Attempt modifications while match is live
    const lockedSetCount = await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 4 }, r));
    assert(!lockedSetCount?.success, 'admin_set_team_count blocked while match is live');

    const lockedAdd = await new Promise((r) => admin.emit('admin_add_participant', { name: 'Intruder' }, r));
    assert(!lockedAdd?.success, 'admin_add_participant blocked while match is live');

    const lockedAuto = await new Promise((r) => admin.emit('admin_auto_assign_teams', {}, r));
    assert(!lockedAuto?.success, 'admin_auto_assign_teams blocked while match is live');

    const lockedMove = await new Promise((r) =>
      admin.emit('admin_move_participant', { participantId: 'some-id', targetTeamId: 1 }, r)
    );
    assert(!lockedMove?.success, 'admin_move_participant blocked while match is live');

    // 9. Test Dynamic Scoring in Round 1 for 6 Teams (1st through 6th Place)
    console.log('\n--- Section 8: Dynamic 6-Team Scoring in Match ---');
    const curQ = latestAdminState?.round1Question;
    assert(curQ !== null, `Round 1 Question 1 is active (${curQ?.id})`);

    const rawCorrectAnswer = curQ?.correctAnswer || 'GitHub';
    console.log(`    Submitting correct answer "${rawCorrectAnswer}" from all 6 teams in order...`);

    // Submit answers from Team 1, 2, 3, 4, 5, 6 sequentially
    const s1 = await new Promise((r) => players[0].emit('player_submit_r1', {
      answer: rawCorrectAnswer,
      questionId: curQ.id,
      clueIndex: 0,
      teamId: 1
    }, r));
    await wait(100);

    const s2 = await new Promise((r) => players[1].emit('player_submit_r1', {
      answer: rawCorrectAnswer,
      questionId: curQ.id,
      clueIndex: 0,
      teamId: 2
    }, r));
    await wait(100);

    const s3 = await new Promise((r) => players[2].emit('player_submit_r1', {
      answer: rawCorrectAnswer,
      questionId: curQ.id,
      clueIndex: 0,
      teamId: 3
    }, r));
    await wait(100);

    const s4 = await new Promise((r) => players[3].emit('player_submit_r1', {
      answer: rawCorrectAnswer,
      questionId: curQ.id,
      clueIndex: 0,
      teamId: 4
    }, r));
    await wait(100);

    const s5 = await new Promise((r) => players[4].emit('player_submit_r1', {
      answer: rawCorrectAnswer,
      questionId: curQ.id,
      clueIndex: 0,
      teamId: 5
    }, r));
    await wait(100);

    const s6 = await new Promise((r) => players[5].emit('player_submit_r1', {
      answer: rawCorrectAnswer,
      questionId: curQ.id,
      clueIndex: 0,
      teamId: 6
    }, r));

    assert(s1?.isCorrect && s1?.rank === 1, `Team 1 scored 1st place (+${s1?.points} PTS)`);
    assert(s2?.isCorrect && s2?.rank === 2, `Team 2 scored 2nd place (+${s2?.points} PTS)`);
    assert(s3?.isCorrect && s3?.rank === 3, `Team 3 scored 3rd place (+${s3?.points} PTS)`);
    assert(s4?.isCorrect && s4?.rank === 4, `Team 4 scored 4th place (+${s4?.points} PTS)`);
    assert(s5?.isCorrect && s5?.rank === 5, `Team 5 scored 5th place (+${s5?.points} PTS)`);
    assert(s6?.isCorrect && s6?.rank === 6, `Team 6 scored 6th place (+${s6?.points} PTS)`);

    assert(s5?.points === 5, 'Team 5 awarded configured 5th place points (5 PTS)');
    assert(s6?.points === 3, 'Team 6 awarded configured 6th place points (3 PTS)');

    // 10. Test Dynamic Settings Update (e.g. 5th place points to 8, 6th place to 4)
    console.log('\n--- Section 9: Dynamic Settings Configuration ---');
    admin.emit('admin_update_settings', { fifthPlacePoints: 8, sixthPlacePoints: 4 });
    await wait(200);
    admin.emit('admin_refresh_state');
    await wait(200);
    assert(latestAdminState?.settings?.fifthPlacePoints === 8, 'Settings updated: fifthPlacePoints = 8');
    assert(latestAdminState?.settings?.sixthPlacePoints === 4, 'Settings updated: sixthPlacePoints = 4');

    // 11. End Match & Reset
    console.log('\n--- Section 10: Match Completion & Unlock ---');
    admin.emit('admin_reset_game');
    await wait(400);
    admin.emit('admin_refresh_state');
    await wait(200);

    assert(latestAdminState?.state === 'LOBBY', 'Game state returned to LOBBY');
    assert(latestAdminState?.teamSetupFrozen === false, 'teamSetupFrozen unlocked in LOBBY');

    // Verify unlocked modifications work again in LOBBY
    const unlockSetCount = await new Promise((r) => admin.emit('admin_set_team_count', { teamCount: 5 }, r));
    assert(unlockSetCount?.success && unlockSetCount?.teamCount === 5, 'admin_set_team_count works once unlocked in LOBBY');

  } catch (err) {
    console.error('Fatal test error:', err);
    failures++;
  } finally {
    admin.disconnect();
    players.forEach((p) => p.disconnect());
  }

  console.log(`\n=== TEST SUMMARY: ${failures === 0 ? 'ALL TESTS PASSED ✓' : `${failures} FAILURES ✕`} ===`);
  process.exit(failures === 0 ? 0 : 1);
}

runTests();
