import { io } from 'socket.io-client';

const URL = typeof window !== 'undefined'
  ? (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin)
  : 'http://localhost:5000';

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

export default socket;
