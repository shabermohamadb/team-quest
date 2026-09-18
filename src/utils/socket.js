import { io } from 'socket.io-client';

/**
 * PRODUCTION REALTIME CONNECTION RESOLVER
 * Resolves the authoritative backend URL across local dev, external backend hosts,
 * and Vercel deployments without hardcoding localhost in production bundles.
 */

const rawEnvUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env && (
    import.meta.env.VITE_REALTIME_URL ||
    import.meta.env.NEXT_PUBLIC_REALTIME_URL ||
    import.meta.env.VITE_SERVER_URL ||
    import.meta.env.NEXT_PUBLIC_SERVER_URL
  )) || ''
).trim();

// Check if currently running in local development
const isLocalEnvironment = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0' ||
  window.location.port === '5173' ||
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true)
);

export function getBackendUrl() {
  // 1. If explicit environment variable is provided, always prioritize it
  if (rawEnvUrl) {
    let url = rawEnvUrl;
    // Normalize ws:// or wss:// to http:// or https:// for Socket.IO / REST compatibility
    if (url.startsWith('ws://')) {
      url = 'http://' + url.slice(5);
    } else if (url.startsWith('wss://')) {
      url = 'https://' + url.slice(6);
    }
    return url.replace(/\/+$/, '');
  }

  // 2. Local development fallback (strictly isolated to local hostname/ports)
  if (isLocalEnvironment && typeof window !== 'undefined') {
    // In Vite dev (5173), Express server runs on port 5000 on the same machine
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:5000`;
  }

  // 3. Production browser environment:
  // Connect to the deployed origin. Never fallback to localhost in production!
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }

  return '';
}

export function getApiUrl(endpoint) {
  const base = getBackendUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

const targetUrl = getBackendUrl();

export const socket = io(targetUrl || undefined, {
  path: '/socket.io',
  transports: ['websocket', 'polling'], // WebSocket first to avoid long-polling proxy buffers
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 16000,
  randomizationFactor: 0.3,
  timeout: 15000
});

export const isMissingBackendConfig = (
  typeof window !== 'undefined' &&
  !isLocalEnvironment &&
  !rawEnvUrl &&
  window.location.hostname.endsWith('.vercel.app')
);

export default socket;
