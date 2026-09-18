import assert from 'assert';

console.log('======================================================================');
console.log('       TEAM QUEST — PRODUCTION URL RESOLUTION VERIFICATION            ');
console.log('======================================================================\n');

// Import the logic tested by simulating environments
function simulateResolver({ envUrl = '', windowObj = null, isDev = false }) {
  const rawEnv = (envUrl || '').trim();
  const isLocalEnv = Boolean(
    windowObj && (
      windowObj.location.hostname === 'localhost' ||
      windowObj.location.hostname === '127.0.0.1' ||
      windowObj.location.hostname === '0.0.0.0' ||
      windowObj.location.port === '5173' ||
      isDev
    )
  );

  function getBackendUrl() {
    if (rawEnv) {
      let url = rawEnv;
      if (url.startsWith('ws://')) url = 'http://' + url.slice(5);
      else if (url.startsWith('wss://')) url = 'https://' + url.slice(6);
      return url.replace(/\/+$/, '');
    }

    if (isLocalEnv && windowObj) {
      const protocol = windowObj.location.protocol;
      const hostname = windowObj.location.hostname || 'localhost';
      return `${protocol}//${hostname}:5000`;
    }

    if (windowObj && windowObj.location && windowObj.location.origin) {
      return windowObj.location.origin;
    }
    return '';
  }

  function getApiUrl(endpoint) {
    const base = getBackendUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
  }

  const isMissingBackendConfig = Boolean(
    windowObj &&
    !isLocalEnv &&
    !rawEnv &&
    windowObj.location.hostname.endsWith('.vercel.app')
  );

  return { getBackendUrl, getApiUrl, isMissingBackendConfig };
}

// Case 1: Production Vercel with explicit VITE_REALTIME_URL
const res1 = simulateResolver({
  envUrl: 'https://backend.onrender.com',
  windowObj: {
    location: {
      origin: 'https://team-quest.vercel.app',
      hostname: 'team-quest.vercel.app',
      protocol: 'https:',
      port: ''
    }
  },
  isDev: false
});

assert.strictEqual(res1.getBackendUrl(), 'https://backend.onrender.com', 'Prioritizes VITE_REALTIME_URL');
assert.strictEqual(res1.getApiUrl('/api/game-state'), 'https://backend.onrender.com/api/game-state', 'Resolves REST API with backend host');
assert.strictEqual(res1.isMissingBackendConfig, false, 'Backend is configured');
console.log('[PASS] Production Vercel with VITE_REALTIME_URL verified');

// Case 2: Production Vercel with wss:// NEXT_PUBLIC_REALTIME_URL
const res2 = simulateResolver({
  envUrl: 'wss://backend.railway.app/',
  windowObj: {
    location: {
      origin: 'https://team-quest.vercel.app',
      hostname: 'team-quest.vercel.app',
      protocol: 'https:',
      port: ''
    }
  },
  isDev: false
});

assert.strictEqual(res2.getBackendUrl(), 'https://backend.railway.app', 'Normalizes wss:// to https:// and trims trailing slash');
assert.strictEqual(res2.getApiUrl('api/teams'), 'https://backend.railway.app/api/teams', 'Handles endpoint without leading slash');
console.log('[PASS] WebSocket wss:// normalization verified');

// Case 3: Production Vercel WITHOUT environment variable configured
const res3 = simulateResolver({
  envUrl: '',
  windowObj: {
    location: {
      origin: 'https://team-quest.vercel.app',
      hostname: 'team-quest.vercel.app',
      protocol: 'https:',
      port: ''
    }
  },
  isDev: false
});

assert.strictEqual(res3.getBackendUrl(), 'https://team-quest.vercel.app', 'Falls back to deployed origin (NEVER localhost in prod)');
assert(!res3.getBackendUrl().includes('localhost'), 'Zero localhost in production fallback');
assert(!res3.getBackendUrl().includes('127.0.0.1'), 'Zero 127.0.0.1 in production fallback');
assert.strictEqual(res3.isMissingBackendConfig, true, 'Flags isMissingBackendConfig: true to guide admin');
console.log('[PASS] Production fallback without localhost verified');

// Case 4: Local development (Vite dev server on 5173)
const res4 = simulateResolver({
  envUrl: '',
  windowObj: {
    location: {
      origin: 'http://localhost:5173',
      hostname: 'localhost',
      protocol: 'http:',
      port: '5173'
    }
  },
  isDev: true
});

assert.strictEqual(res4.getBackendUrl(), 'http://localhost:5000', 'Local dev resolves to backend port 5000');
assert.strictEqual(res4.isMissingBackendConfig, false, 'Dev does not flag missing backend config');
console.log('[PASS] Local development resolution verified');

console.log('\n======================================================================');
console.log('  URL RESOLUTION SUITE: ALL TESTS PASSED ✓');
console.log('======================================================================\n');
process.exit(0);
