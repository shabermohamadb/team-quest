import { io } from 'socket.io-client';
import fs from 'fs';

const URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createClient(name) {
  return new Promise((resolve, reject) => {
    const s = io(URL, { reconnection: false, timeout: 5000 });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

async function runTest() {
  console.log('=== STARTING TEST: RANDOM SELECTION ENGINE & QUESTION BANK ===\n');
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
  const t1 = await createClient('team1');

  try {
    // 1. Authenticate Admin
    await new Promise(r => admin.emit('admin_auth', { pin: 'admin123' }, r));
    admin.emit('admin_reset_game');
    await wait(300);

    // 2. Test Question Bank via Socket API
    console.log('\n--- 1. Question Bank 150-Challenge Verification ---');
    const bankRes = await new Promise(r => admin.emit('admin_get_question_bank', {}, r));
    assert(bankRes?.success === true, 'admin_get_question_bank returned success');
    assert(bankRes?.stats?.totalChallenges === 150, `Total bank contains 150 challenges (got: ${bankRes?.stats?.totalChallenges})`);
    assert(bankRes?.round1?.length === 50, `Round 1 contains exactly 50 stored questions (got: ${bankRes?.round1?.length})`);
    assert(bankRes?.round2?.length === 50, `Round 2 contains exactly 50 stored patterns (got: ${bankRes?.round2?.length})`);
    assert(bankRes?.round3?.length === 50, `Round 3 contains exactly 50 stored code crackers (got: ${bankRes?.round3?.length})`);

    // 3. Verify Selection Count (10 per round, 30 total played)
    console.log('\n--- 2. Selected Challenges Verification (10 per round) ---');
    assert(bankRes?.selectedIds?.round1?.length === 10, `Round 1 selected count is 10 (got: ${bankRes?.selectedIds?.round1?.length})`);
    assert(bankRes?.selectedIds?.round2?.length === 10, `Round 2 selected count is 10 (got: ${bankRes?.selectedIds?.round2?.length})`);
    assert(bankRes?.selectedIds?.round3?.length === 10, `Round 3 selected count is 10 (got: ${bankRes?.selectedIds?.round3?.length})`);

    // 4. Verify Zero Duplicates within each round selection
    console.log('\n--- 3. Uniqueness Check (Zero Duplicates) ---');
    const r1Unique = new Set(bankRes?.selectedIds?.round1);
    const r2Unique = new Set(bankRes?.selectedIds?.round2);
    const r3Unique = new Set(bankRes?.selectedIds?.round3);
    assert(r1Unique.size === 10, `Round 1 has 10 unique questions with 0 duplicates (set size: ${r1Unique.size})`);
    assert(r2Unique.size === 10, `Round 2 has 10 unique challenges with 0 duplicates (set size: ${r2Unique.size})`);
    assert(r3Unique.size === 10, `Round 3 has 10 unique challenges with 0 duplicates (set size: ${r3Unique.size})`);

    // 5. Verify Difficulty Balance
    console.log('\n--- 4. Balanced Difficulty Distribution ---');
    let latestAdminState = null;
    admin.on('admin_state_update', st => { latestAdminState = st; });
    admin.emit('admin_refresh_state');
    await wait(300);

    const r1SelectedSummaries = latestAdminState?.selectedQuestionsSummary?.round1 || [];
    const r1Difficulties = r1SelectedSummaries.map(q => q.difficulty);
    const easyCount = r1Difficulties.filter(d => d?.toLowerCase() === 'easy').length;
    const medCount = r1Difficulties.filter(d => d?.toLowerCase() === 'medium').length;
    const hardCount = r1Difficulties.filter(d => d?.toLowerCase() === 'hard').length;
    console.log(`  R1 Selected difficulty breakdown: Easy=${easyCount}, Med=${medCount}, Hard=${hardCount}`);
    assert(easyCount >= 2 && hardCount >= 2 && medCount >= 3, 'Round 1 difficulty is balanced (e.g. 3 Easy, 4 Med, 3 Hard)');

    // 6. Test Pre-Game Regeneration
    console.log('\n--- 5. Pre-Game Regeneration (New randomized set) ---');
    const prevR1Ids = [...bankRes.selectedIds.round1];
    const regenRes = await new Promise(r => admin.emit('admin_regenerate_selection', {}, r));
    assert(regenRes?.success === true, 'admin_regenerate_selection succeeded');
    assert(regenRes?.counts?.round1 === 10, 'Regenerated Round 1 count is 10');

    await wait(300);
    const bankAfterRegen = await new Promise(r => admin.emit('admin_get_question_bank', {}, r));
    const newR1Ids = bankAfterRegen.selectedIds.round1;
    console.log('  Previous R1 IDs:', prevR1Ids.slice(0, 4), '...');
    console.log('  New R1 IDs:     ', newR1Ids.slice(0, 4), '...');
    const matchCount = prevR1Ids.filter((id, i) => newR1Ids[i] === id).length;
    assert(matchCount < 10, 'Regeneration selected a fresh, randomized question sequence');

    // 7. Test Question Freezing Upon Match Start
    console.log('\n--- 6. Question Freezing on Game Start ---');
    assert(latestAdminState?.questionsFrozen === false, 'Questions are NOT frozen in Lobby');

    // Start game
    admin.emit('admin_start_game');
    await wait(500);
    admin.emit('admin_refresh_state');
    await wait(300);

    assert(latestAdminState?.questionsFrozen === true, 'questionsFrozen is TRUE once match starts');

    // Attempt regeneration while frozen
    const blockedRegen = await new Promise(r => admin.emit('admin_regenerate_selection', {}, r));
    assert(blockedRegen?.success === false, 'Regeneration is rejected when game is live/frozen');
    assert(blockedRegen?.reason?.includes('frozen'), `Reason indicates frozen: "${blockedRegen?.reason}"`);

    // 8. Player Privacy (Zero-Leak Guarantee)
    console.log('\n--- 7. Player Socket Zero-Leak Privacy ---');
    await new Promise(r => t1.emit('player_join', { gameCode: 'QUEST-2026', team: 1 }, r));

    let playerState = null;
    t1.on('game_state_update', st => { playerState = st; });
    await wait(4000); // let countdown finish and enter Round 1 Clue 1

    assert(playerState !== null, 'Player received game_state_update');
    assert(playerState?.round1Questions === undefined, 'Player socket DOES NOT receive round1Questions array');
    assert(playerState?.round2Patterns === undefined, 'Player socket DOES NOT receive round2Patterns array');
    assert(playerState?.round3CodeCrackers === undefined, 'Player socket DOES NOT receive round3CodeCrackers array');
    assert(playerState?.selectedQuestionsSummary === undefined, 'Player socket DOES NOT receive selectedQuestionsSummary');
    assert(playerState?.currentChallenge !== null, 'Player receives only the single active currentChallenge');

    // 9. Admin Question CRUD Operations
    console.log('\n--- 8. Admin Question CRUD ---');
    admin.emit('admin_reset_game');
    await wait(300);

    // Add a custom question
    const newQData = {
      round: 1,
      domain: 'Testing',
      difficulty: 'Easy',
      website: 'Jest Test Runner',
      correctAnswer: 'Jest',
      acceptedAnswers: ['jest', 'jestjs'],
      clue1: 'A delightful JavaScript testing framework with a focus on simplicity.',
      clue2: 'Widely used with React and maintained by Meta.',
      clue3: 'Its mascot features a smiling shoe / jester motif.'
    };
    const addRes = await new Promise(r => admin.emit('admin_save_question', newQData, r));
    assert(addRes?.success === true, 'admin_save_question added new question');
    const createdId = addRes?.question?.id;
    assert(createdId && createdId.startsWith('r1-'), `Generated valid question ID: ${createdId}`);

    // Toggle active status
    const toggleRes = await new Promise(r => admin.emit('admin_toggle_question', { round: 1, id: createdId, isActive: false }, r));
    assert(toggleRes?.success === true && toggleRes?.isActive === false, 'admin_toggle_question toggled to disabled');

    // Duplicate question
    const dupRes = await new Promise(r => admin.emit('admin_duplicate_question', { round: 1, id: createdId }, r));
    assert(dupRes?.success === true, 'admin_duplicate_question succeeded');
    const dupId = dupRes?.question?.id;

    // Delete duplicated and created questions to restore clean state
    const delDup = await new Promise(r => admin.emit('admin_delete_question', { round: 1, id: dupId }, r));
    const delOrig = await new Promise(r => admin.emit('admin_delete_question', { round: 1, id: createdId }, r));
    assert(delDup?.success && delOrig?.success, 'admin_delete_question cleaned up test items');

    // Reset game and teams for next runs
    admin.emit('admin_reset_game');
    admin.emit('admin_reset_teams');
    await wait(400);

    console.log(`\n=== TEST COMPLETE: ${failures === 0 ? 'ALL CHECKS PASSED ✓' : `${failures} CHECKS FAILED ✕`} ===`);
  } catch (err) {
    console.error('Test Error:', err);
    failures++;
  } finally {
    admin.disconnect();
    t1.disconnect();
  }

  process.exit(failures === 0 ? 0 : 1);
}

runTest();
