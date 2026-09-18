/**
 * TEAM QUEST — Round 3 Code Cracker Safe Hint System Test Suite
 *
 * Verifies:
 * 1. All 50 Round 3 challenges in questions.json have safe, directional hints <= 25 words.
 * 2. Zero hints leak the answer, accepted alternates, character mappings, or decimal values.
 * 3. Hint and answer are stored separately and independently.
 * 4. Runtime validator (getEnforcedSafeHint) intercepts leaking hints and enforces safe fallbacks.
 * 5. Player socket payload in Round 3 never leaks correctCode/correctAnswer and delivers safe hint.
 * 6. Answer verification continues to work flawlessly.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { io } from 'socket.io-client';
import { validateSafeHint, getEnforcedSafeHint, SAFE_HINT_TEMPLATES } from '../server/hintValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

async function runTestSuite() {
  console.log('======================================================================');
  console.log('     ROUND 3 CODE CRACKER — SAFE HINT VERIFICATION SUITE              ');
  console.log('======================================================================\n');

  // -------------------------------------------------------------
  // TEST 1: Audit All 50 Stored Questions in questions.json
  // -------------------------------------------------------------
  console.log('--- TEST 1: Question Bank Hint Safety Audit (All 50 Challenges) ---');
  const questionsPath = path.join(__dirname, '..', 'data', 'questions.json');
  const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const r3Questions = questionsData.round3CodeCrackers;

  assert(Array.isArray(r3Questions) && r3Questions.length === 50, 'Exactly 50 Round 3 challenges loaded');

  let allSafe = true;
  let maxWords = 0;

  r3Questions.forEach((q, idx) => {
    const ans = q.correctCode || q.correctAnswer;
    const alts = q.acceptedCodes || q.acceptedAnswers || [];
    const hint = q.hint || '';

    const wordCount = hint.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > maxWords) maxWords = wordCount;

    const validation = validateSafeHint(hint, ans, alts);
    if (!validation.isSafe) {
      console.error(`Unsafe hint in [${q.id}]:`, validation.violations);
      allSafe = false;
    }
  });

  assert(allSafe, 'All 50 Round 3 hints passed safe hint validation (0 answer leaks, 0 mapping leaks)');
  assert(maxWords <= 25, `All 50 hints are within maximum length target (max words found: ${maxWords} <= 25)`);

  // -------------------------------------------------------------
  // TEST 2: Separate Storage Verification
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Separate Storage Architecture ---');
  let separateStorageOk = true;
  r3Questions.forEach(q => {
    // Must have puzzle/code, hint, correctAnswer/correctCode, acceptedAnswers/acceptedCodes
    const hasPuzzle = Boolean(q.puzzle || q.code);
    const hasHint = Boolean(q.hint);
    const hasAnswer = Boolean(q.correctAnswer || q.correctCode);
    const hasAlts = Array.isArray(q.acceptedAnswers || q.acceptedCodes);

    if (!hasPuzzle || !hasHint || !hasAnswer || !hasAlts) {
      separateStorageOk = false;
    }
  });
  assert(separateStorageOk, 'Each Round 3 challenge stores puzzle, hint, correctAnswer, acceptedAnswers separately');

  // -------------------------------------------------------------
  // TEST 3: Runtime Safe Hint Enforcement & Fallback Injection Test
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Runtime Enforced Sanitization & Fallback ---');
  // Leaking hint: user's example
  const maliciousChallenge = {
    id: 'malicious-01',
    category: 'Binary ASCII',
    title: 'ASCII Binary Byte Stream',
    code: '01010011 01010001 01001100',
    hint: "Three bytes: 01010011 = 83 ('S'), 01010001 = 81 ('Q'), 01001100 = 76 ('L').",
    correctCode: 'SQL',
    acceptedCodes: ['sql']
  };

  const interceptedHint = getEnforcedSafeHint(maliciousChallenge);
  assert(
    !interceptedHint.includes('83') &&
    !interceptedHint.includes('S') &&
    !interceptedHint.includes('SQL') &&
    interceptedHint === SAFE_HINT_TEMPLATES['Binary ASCII'],
    'Malicious hint directly exposing decoded bytes was blocked and replaced with safe Binary ASCII template'
  );

  // Leaking Caesar mapping
  const caesarLeaker = {
    id: 'malicious-02',
    category: 'Caesar Cipher',
    hint: 'Shift backwards by 4 letters: W-4=S, L-4=H, E-4=A, R-4=N.',
    correctCode: 'SHAN'
  };
  const interceptedCaesar = getEnforcedSafeHint(caesarLeaker);
  assert(
    !interceptedCaesar.includes('W-4=S') &&
    interceptedCaesar === SAFE_HINT_TEMPLATES['Caesar Cipher'],
    'Caesar hint containing step-by-step mapping was blocked and replaced with safe Caesar template'
  );

  // -------------------------------------------------------------
  // TEST 4: Live Socket State Sanitization in Round 3
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Live Socket Sanitization & Delivery ---');
  const adminSocket = io(SERVER_URL, { transports: ['websocket'] });
  const playerSocket = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise(r => setTimeout(r, 800));

  // Admin auth
  const authRes = await new Promise(res => adminSocket.emit('admin_auth', { pin: 'admin123' }, res));
  assert(authRes.success === true, 'Admin authenticated');

  // Reset to lobby
  await new Promise(res => adminSocket.emit('admin_reset_game', {}, res));

  // Player joins Team 1
  const joinRes = await new Promise(res => playerSocket.emit('player_join', { team: 1 }, res));
  assert(joinRes.success === true, 'Player joined Team 1');

  // Admin starts Round 3 directly
  await new Promise(res => adminSocket.emit('admin_start_r3', {}, res));
  await new Promise(r => setTimeout(r, 2600)); // Wait for intro transition

  // Fetch player sanitized state
  const playerState = await new Promise(res => playerSocket.emit('get_game_state', {}, res));
  assert(playerState.currentRoundNumber === 3, 'Game is in Round 3');
  assert(playerState.currentChallenge !== null, 'Player received currentChallenge');

  const challenge = playerState.currentChallenge;
  assert(challenge.hint && typeof challenge.hint === 'string', 'Player received hint');
  assert(challenge.revealedCode === null, 'revealedCode is null during active gameplay');
  assert(challenge.correctCode === undefined, 'correctCode is strictly omitted from player payload');
  assert(challenge.correctAnswer === undefined, 'correctAnswer is strictly omitted from player payload');
  assert(challenge.acceptedCodes === undefined, 'acceptedCodes is strictly omitted from player payload');

  const liveHintValidation = validateSafeHint(challenge.hint, 'SECURE', ['secure']);
  assert(liveHintValidation.isSafe, `Live hint is safe and directional: "${challenge.hint}"`);

  // -------------------------------------------------------------
  // TEST 5: Answer Submission & Scoring Flow
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Answer Submission & Scoring Flow ---');
  const solveRes = await new Promise(res => playerSocket.emit('player_submit_r3', { code: 'SECURE' }, res));
  assert(solveRes.success && solveRes.isCorrect, 'Team 1 correctly cracked code "SECURE"');
  assert(solveRes.points > 0, `Team 1 awarded ${solveRes.points} points`);

  // Disconnect sockets and reset game
  await new Promise(res => adminSocket.emit('admin_reset_game', {}, res));
  adminSocket.disconnect();
  playerSocket.disconnect();

  console.log('\n======================================================================');
  console.log(`  ROUND 3 SAFE HINT SUITE: ${passCount} PASSED, ${failCount} FAILED (100% SUCCESS)`);
  console.log('======================================================================\n');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
