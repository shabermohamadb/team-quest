import assert from 'assert';
import { GameManager } from './gameManager.js';
import { QuestionManager } from './questionManager.js';
import { TeamManager } from './teamManager.js';

console.log('--- RUNNING PLAYER ZERO-LEAK PRIVACY VERIFICATION ---');

// Mock socket.io
const mockIo = {
  to: () => ({ emit: () => {} }),
  sockets: { sockets: new Map() }
};

const qm = new QuestionManager();
const tm = new TeamManager();
const gm = new GameManager(mockIo, qm, tm);

// Setup scores
gm.totalScores = { 1: 150, 2: 90, 3: 110, 4: 40 };
gm.roundScores = {
  1: { r1: 50, r2: 50, r3: 50 },
  2: { r1: 30, r2: 30, r3: 30 },
  3: { r1: 40, r2: 40, r3: 30 },
  4: { r1: 10, r2: 15, r3: 15 }
};

gm.teamLocks = { 1: true, 2: false, 3: true, 4: false };

// Simulate Team 1 and Team 3 submitting answers
gm.roundSubmissions = [
  { team: 1, isCorrect: true, rank: 1, points: 50, reactionMs: 3200 },
  { team: 3, isCorrect: true, rank: 2, points: 30, reactionMs: 5100 }
];

// Test 1: Player sanitized state for Team 1
const player1State = gm.getPlayerSanitizedState(1);

console.log('Verifying Player Sanitized Payload...');

// 1. MUST NOT have scores object
assert.strictEqual(player1State.scores, undefined, 'Player state MUST NOT leak total scores object');
assert.strictEqual(player1State.roundScores, undefined, 'Player state MUST NOT leak roundScores object');

// 2. MUST NOT have other teams rankings or points
assert.strictEqual(player1State.leaderboard, undefined, 'Player state MUST NOT contain leaderboard');
assert.strictEqual(player1State.rankings, undefined, 'Player state MUST NOT contain rankings');

// 3. MUST NOT leak other teams' answers or submission records
assert.strictEqual(player1State.roundSubmissions, undefined, 'Player state MUST NOT leak roundSubmissions array');

// 4. MUST NOT leak other teams' locks
assert.strictEqual(player1State.teamLocks, undefined, 'Player state MUST NOT leak other teams lock status');

// 5. Must ONLY contain own team status
assert.ok(player1State.myTeam, 'Player state must contain myTeam info');
assert.strictEqual(player1State.myTeam.id, 1, 'myTeam id must match');
assert.strictEqual(player1State.myTeam.isLocked, true, 'myTeam lock must reflect own status');

console.log('✅ Player Payload is completely sanitized! Zero score/ranking/leakage detected.');

// Test 2: Display / Projector State DOES contain leaderboard
const displayState = gm.getDisplayState();
assert.ok(displayState.scores, 'Display state must contain scores');
assert.strictEqual(displayState.scores[1], 150, 'Display state has correct score for Team 1');
assert.ok(displayState.roundScores, 'Display state must contain roundScores');
assert.ok(displayState.teamLocks, 'Display state must contain teamLocks');
assert.ok(Array.isArray(displayState.roundSubmissions), 'Display state must contain roundSubmissions');

console.log('✅ Display / Admin Payload correctly includes full live leaderboard and team status.');

console.log('--- ALL PRIVACY AUDIT CHECKS PASSED ---');
