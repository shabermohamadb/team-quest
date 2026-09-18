import assert from 'assert';

console.log('======================================================================');
console.log('       AURA 7F WEEKLY BASH — CINEMATIC INTRO FLOW TEST SUITE          ');
console.log('======================================================================\n');

// Simulates the shouldShowIntro gate from App.jsx
function evaluateShouldShowIntro({
  pathname = '/',
  hash = '',
  sessionStorageItems = {},
  localStorageItems = {}
}) {
  const path = pathname.toLowerCase();
  const h = hash.toLowerCase();

  // 1. Admin route NEVER gets player intro
  if (path.startsWith('/admin') || h.startsWith('#admin')) return false;

  // 2. Active saved team session (reconnecting/refreshing player) NEVER gets intro
  try {
    const saved = localStorageItems['team_quest_session'];
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.team && parsed?.sessionToken) return false;
    }
  } catch (_) {}

  // 3. Already seen in current browser session?
  try {
    if (sessionStorageItems['aura7f_intro_seen'] === 'true') {
      return false;
    }
  } catch (_) {}

  return true;
}

// TEST 1: Fresh user opening website for the first time
const case1 = evaluateShouldShowIntro({ pathname: '/' });
assert.strictEqual(case1, true, 'First-time visitor to / MUST see the cinematic intro');
console.log('[PASS] Test 1: First-time visitor triggers cinematic intro');

// TEST 2: User refreshes after having seen intro
const case2 = evaluateShouldShowIntro({
  pathname: '/',
  sessionStorageItems: { aura7f_intro_seen: 'true' }
});
assert.strictEqual(case2, false, 'User who has already completed intro in session MUST NOT see it again');
console.log('[PASS] Test 2: Seen intro in sessionStorage bypasses intro on re-render/refresh');

// TEST 3: Admin navigates to /admin
const case3 = evaluateShouldShowIntro({ pathname: '/admin' });
assert.strictEqual(case3, false, 'Admin route /admin MUST bypass intro completely');
console.log('[PASS] Test 3: Admin URL /admin bypasses intro directly to Admin Login');

// TEST 4: Admin navigates to #admin hash route
const case4 = evaluateShouldShowIntro({ pathname: '/', hash: '#admin' });
assert.strictEqual(case4, false, 'Admin hash route #admin MUST bypass intro completely');
console.log('[PASS] Test 4: Admin hash #admin bypasses intro');

// TEST 5: Active player refreshes during live game
const case5 = evaluateShouldShowIntro({
  pathname: '/',
  localStorageItems: {
    team_quest_session: JSON.stringify({
      team: 2,
      sessionToken: 'token_12345',
      gameSessionId: 'session_active'
    })
  }
});
assert.strictEqual(case5, false, 'Active team player refreshing MUST restore gameplay without intro');
console.log('[PASS] Test 5: Reconnecting live player bypasses intro to preserve gameplay flow');

console.log('\n======================================================================');
console.log('  CINEMATIC INTRO FLOW SUITE: ALL 5 TESTS PASSED ✓');
console.log('======================================================================\n');
process.exit(0);
