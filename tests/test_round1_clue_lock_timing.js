/**
 * Automated Test Suite: Round 1 Clue Lock & Admin Timing Control
 * 
 * Verifies:
 * 1. Round 1 Solved Team Lock on Clue 1:
 *    - Team 1 solves during Clue 1 -> Team 1 is marked solved, locked, solvedAtClue = 1, awarded points.
 *    - Team 1 subsequent submissions for that question are rejected with 'ALREADY SOLVED · LOCKED'.
 * 2. Progression to Clue 2:
 *    - Team 1 remains locked (solvedAtClue = 1).
 *    - Teams 2, 3, 4 remain active and unlocked.
 *    - Teams 2, 3 solve during Clue 2 -> awarded points, marked solvedAtClue = 2.
 * 3. Progression to Question 02:
 *    - All teams unlock (teamLocks reset, teamSolvedAtClue reset).
 * 4. All Teams Solved Early:
 *    - When all active teams solve before timer expires, immediately triggers revealRound1Answer().
 * 5. Admin Round Timing Controls:
 *    - Independent settings for Round 1, Round 2, Round 3.
 *    - Allowed durations [15, 20, 30, 45, 60], defaults to 30.
 *    - Mid-question changes do not interrupt current countdown.
 *    - Next question/clue inherits new configured timing.
 * 6. Admin and Player State Verification:
 *    - Admin state displays teamQuestionStatuses with solvedAtClue, points, and labels.
 *    - Player sanitized state receives solvedAtClue and status SOLVED without leaks.
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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('=== STARTING ROUND 1 CLUE LOCK & ADMIN TIMING TESTS ===\n');

  const adminSocket = await connectSocket();
  const player1 = await connectSocket();
  const player2 = await connectSocket();
  const player3 = await connectSocket();
  const player4 = await connectSocket();

  try {
    // 1. Authenticate Admin
    await new Promise((resolve) => {
      adminSocket.emit('admin_auth', { pin: '12345' }, (res) => {
        assert(res?.success, 'Admin authenticated');
        resolve();
      });
    });

    // Reset game to fresh Lobby state
    await new Promise((resolve) => {
      adminSocket.emit('admin_reset_game', {}, () => resolve());
    });
    await sleep(400);

    // Set 4 Teams
    await new Promise((resolve) => {
      adminSocket.emit('admin_set_team_count', { teamCount: 4 }, (res) => {
        assert(res?.success, 'Team count set to 4');
        resolve();
      });
    });

    // Verify initial timing defaults (30s across Round 1, 2, 3)
    let adminState = await new Promise((resolve) => {
      adminSocket.emit('admin_get_state', {}, (res) => resolve(res));
    });
    assert(adminState?.settings?.round1TimerDuration === 30, 'Round 1 timer defaults to 30s');
    assert(adminState?.settings?.round2TimerDuration === 30, 'Round 2 timer defaults to 30s');
    assert(adminState?.settings?.round3TimerDuration === 30, 'Round 3 timer defaults to 30s');

    // Test Admin Round Timing Controls (15s, 20s, 30s, 45s, 60s)
    await new Promise((resolve) => {
      adminSocket.emit('admin_set_round_timing', { round: 1, duration: 20 }, (res) => {
        assert(res?.success && res.duration === 20, 'Admin can set Round 1 timing to 20s');
        resolve();
      });
    });

    await new Promise((resolve) => {
      adminSocket.emit('admin_set_round_timing', { round: 2, duration: 45 }, (res) => {
        assert(res?.success && res.duration === 45, 'Admin can set Round 2 timing to 45s');
        resolve();
      });
    });

    await new Promise((resolve) => {
      adminSocket.emit('admin_set_round_timing', { round: 3, duration: 15 }, (res) => {
        assert(res?.success && res.duration === 15, 'Admin can set Round 3 timing to 15s');
        resolve();
      });
    });

    // Test invalid timing rejection
    await new Promise((resolve) => {
      adminSocket.emit('admin_set_round_timing', { round: 1, duration: 75 }, (res) => {
        assert(!res?.success, 'Invalid duration (75s) rejected');
        resolve();
      });
    });

    // Reset Round 1 back to 30s
    await new Promise((resolve) => {
      adminSocket.emit('admin_set_round_timing', { round: 1, duration: 30 }, (res) => {
        assert(res?.success, 'Round 1 timing reset to 30s');
        resolve();
      });
    });

    // 2. Join 4 Players
    await new Promise((resolve) => {
      player1.emit('player_join', { teamId: 1 }, (res) => {
        assert(res?.success, 'Player 1 joined Team 1');
        resolve();
      });
    });
    await new Promise((resolve) => {
      player2.emit('player_join', { teamId: 2 }, (res) => {
        assert(res?.success, 'Player 2 joined Team 2');
        resolve();
      });
    });
    await new Promise((resolve) => {
      player3.emit('player_join', { teamId: 3 }, (res) => {
        assert(res?.success, 'Player 3 joined Team 3');
        resolve();
      });
    });
    await new Promise((resolve) => {
      player4.emit('player_join', { teamId: 4 }, (res) => {
        assert(res?.success, 'Player 4 joined Team 4');
        resolve();
      });
    });

    // 3. Start Game
    adminSocket.emit('admin_start_game');
    console.log('Waiting for Round 1 Clue 1 to become active...');
    
    // Wait until ROUND_1_CLUE_1
    let p1State = null;
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
      if (adminState.state === 'ROUND_1_CLUE_1') break;
    }
    assert(adminState.state === 'ROUND_1_CLUE_1', 'Game progressed to ROUND_1_CLUE_1');
    assert(adminState.activeClueNumber === 1, 'Active clue is Clue 1');

    // Fetch active question answer
    const currentQ = adminState.round1Question;
    assert(currentQ && currentQ.correctAnswer, 'Round 1 Question loaded with correct answer: ' + currentQ.correctAnswer);

    // 4. Team 1 Submits Correct Answer during Clue 1
    const submitRes1 = await new Promise((resolve) => {
      player1.emit('player_submit_round_1', { answer: currentQ.correctAnswer, questionId: currentQ.id }, resolve);
    });
    assert(submitRes1.success && submitRes1.isCorrect, 'Team 1 correctly answered on Clue 1');
    assert(submitRes1.points > 0, `Team 1 awarded ${submitRes1.points} points`);

    // Check player 1 sanitized state
    p1State = await new Promise((resolve) => {
      player1.emit('player_get_state', {}, resolve);
    });
    assert(p1State.myTeam.isLocked === true, 'Team 1 isLocked is TRUE');
    assert(p1State.myTeam.status === 'SOLVED', 'Team 1 status is SOLVED');
    assert(p1State.myTeam.solvedAtClue === 1, 'Team 1 solvedAtClue is 1');
    assert(p1State.myTeam.mySubmission.isCorrect === true, 'Team 1 mySubmission is recorded');

    // Check admin question team statuses
    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    const t1Status = adminState.teamQuestionStatuses[1];
    assert(t1Status && t1Status.state === 'SOLVED', 'Admin view shows Team 1 as SOLVED');
    assert(t1Status.solvedAtClue === 1, 'Admin view shows Team 1 solved on Clue 1');
    assert(t1Status.label.includes('CLUE 1'), `Admin status label includes CLUE 1 (${t1Status.label})`);

    // Ensure Team 2, 3, 4 are still ACTIVE
    assert(adminState.teamQuestionStatuses[2].state === 'ACTIVE', 'Team 2 is ACTIVE');
    assert(adminState.teamQuestionStatuses[3].state === 'ACTIVE', 'Team 3 is ACTIVE');
    assert(adminState.teamQuestionStatuses[4].state === 'ACTIVE', 'Team 4 is ACTIVE');

    // Verify Team 1 cannot submit again during this question
    const duplicateSubmit = await new Promise((resolve) => {
      player1.emit('player_submit_round_1', { answer: currentQ.correctAnswer }, resolve);
    });
    assert(!duplicateSubmit.success && duplicateSubmit.error.includes('ALREADY SOLVED'), 'Team 1 duplicate submit blocked');

    // 5. Admin advances to Clue 2
    console.log('Advancing to Clue 2...');
    await new Promise((resolve) => {
      adminSocket.emit('admin_reveal_clue_2', {}, () => resolve());
    });
    await sleep(300);

    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    assert(adminState.state === 'ROUND_1_CLUE_2', 'Game is in ROUND_1_CLUE_2');
    assert(adminState.activeClueNumber === 2, 'Active clue is now 2');

    // Check Player 1 state remains locked on Clue 2
    p1State = await new Promise((resolve) => {
      player1.emit('player_get_state', {}, resolve);
    });
    assert(p1State.myTeam.isLocked === true, 'Team 1 REMAINS LOCKED on Clue 2');
    assert(p1State.myTeam.solvedAtClue === 1, 'Team 1 preserved solvedAtClue = 1');

    // Check Player 2 is UNLOCKED and can submit on Clue 2
    const p2State = await new Promise((resolve) => {
      player2.emit('player_get_state', {}, resolve);
    });
    assert(p2State.myTeam.isLocked === false, 'Team 2 is NOT locked on Clue 2');
    assert(p2State.myTeam.status === 'WAITING', 'Team 2 status is waiting/active');

    // Team 2 submits correct answer on Clue 2
    const submitRes2 = await new Promise((resolve) => {
      player2.emit('player_submit_round_1', { answer: currentQ.correctAnswer, questionId: currentQ.id }, resolve);
    });
    assert(submitRes2.success && submitRes2.isCorrect, 'Team 2 answered correctly on Clue 2');
    
    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    const t2Status = adminState.teamQuestionStatuses[2];
    assert(t2Status.state === 'SOLVED', 'Team 2 marked SOLVED in admin');
    assert(t2Status.solvedAtClue === 2, 'Team 2 marked solvedAtClue = 2 in admin');

    // 6. Test All Teams Solved Early
    // Team 3 and Team 4 solve on Clue 2
    const submitRes3 = await new Promise((resolve) => {
      player3.emit('player_submit_round_1', { answer: currentQ.correctAnswer, questionId: currentQ.id }, resolve);
    });
    assert(submitRes3.success && submitRes3.isCorrect, 'Team 3 answered correctly on Clue 2');

    // Submitting for Team 4 should immediately trigger revealRound1Answer() because all 4 teams solved!
    const submitRes4 = await new Promise((resolve) => {
      player4.emit('player_submit_round_1', { answer: currentQ.correctAnswer, questionId: currentQ.id }, resolve);
    });
    assert(submitRes4.success && submitRes4.isCorrect, 'Team 4 answered correctly on Clue 2');

    await sleep(200);
    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    assert(
      adminState.state === 'ROUND_1_ANSWER_REVEAL' || adminState.state === 'ROUND_1_RESULT',
      'All teams solved early -> immediately advanced to ANSWER_REVEAL or RESULT without waiting for timer!'
    );

    // 7. Advance to Question 02 and verify ALL teams UNLOCK
    console.log('Advancing to Question 02...');
    await new Promise((resolve) => {
      adminSocket.emit('admin_next_question', {}, () => resolve());
    });

    // Wait for Question 02 Clue 1
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
      if (adminState.state === 'ROUND_1_CLUE_1' && adminState.currentQuestionIndex === 1) break;
    }
    assert(adminState.currentQuestionIndex === 1, 'Game is on Question 02 (index 1)');

    // Verify all teams unlocked for Question 02
    p1State = await new Promise((resolve) => player1.emit('player_get_state', {}, resolve));
    assert(p1State.myTeam.isLocked === false, 'Team 1 UNLOCKED for Question 02');
    assert(p1State.myTeam.solvedAtClue === null, 'Team 1 solvedAtClue RESET for Question 02');

    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    assert(adminState.teamLocks[1] === false, 'teamLocks[1] is false in admin');
    assert(adminState.teamLocks[2] === false, 'teamLocks[2] is false in admin');
    assert(adminState.teamLocks[3] === false, 'teamLocks[3] is false in admin');
    assert(adminState.teamLocks[4] === false, 'teamLocks[4] is false in admin');
    assert(adminState.teamQuestionStatuses[1].state === 'ACTIVE', 'Team 1 status is ACTIVE for Question 02');

    // 8. Test Mid-Question Timing Change
    // Change Round 1 duration to 45s while question 2 is active
    const activeTimeBefore = adminState.timeRemaining;
    await new Promise((resolve) => {
      adminSocket.emit('admin_set_round_timing', { round: 1, duration: 45 }, (res) => {
        assert(res?.success, 'Admin changed Round 1 timing to 45s mid-question');
        resolve();
      });
    });

    // Verify current running countdown is NOT interrupted / jumped
    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    assert(
      adminState.timeRemaining <= activeTimeBefore && adminState.timeRemaining > 0,
      'Active timer continued decrementing naturally and was NOT broken mid-question'
    );
    assert(adminState.settings.round1TimerDuration === 45, 'Settings reflect 45s for Round 1');

    // Advance to Clue 2 of Question 02, verify it starts with new 45s duration
    await new Promise((resolve) => {
      adminSocket.emit('admin_reveal_clue_2', {}, () => resolve());
    });
    await sleep(200);

    adminState = await new Promise((res) => adminSocket.emit('admin_get_state', {}, res));
    assert(adminState.clueDuration === 45, 'Next clue (Clue 2) initialized with the newly configured 45s duration');
    assert(adminState.timeRemaining >= 44, 'Timer started at configured 45s');

    console.log(`\n=== ALL TESTS PASSED! (${passCount} assertions, 0 failures) ===`);
  } finally {
    adminSocket.disconnect();
    player1.disconnect();
    player2.disconnect();
    player3.disconnect();
    player4.disconnect();
  }
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
