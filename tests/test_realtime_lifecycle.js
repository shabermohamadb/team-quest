import assert from 'assert';
import { io } from 'socket.io-client';

console.log('======================================================================');
console.log('       TEAM QUEST — REALTIME CONNECTION LIFECYCLE & HEARTBEAT         ');
console.log('======================================================================\n');

async function run() {
  const socket1 = io('http://localhost:5000', { reconnection: true });

  try {
    await new Promise((res, rej) => {
      socket1.on('connect', res);
      socket1.on('connect_error', rej);
    });
    console.log('[PASS] Socket 1 connected');

    // 1. Application-level heartbeat test
    const pingStart = Date.now();
    const pongData = await new Promise(res => {
      socket1.on('app_pong', res);
      socket1.emit('app_ping', { timestamp: pingStart });
    });

    assert(pongData, 'Received app_pong from server');
    assert.strictEqual(pongData.clientTimestamp, pingStart, 'Client timestamp reflected in pong');
    assert(pongData.serverTime > 0, 'Server time provided in pong');
    assert(typeof pongData.stateVersion === 'number', 'State version included in heartbeat');
    console.log('[PASS] Application heartbeat (app_ping -> app_pong) verified');

    // 2. Join Team 2
    const joinRes = await new Promise(res => socket1.emit('player_join', { team: 2 }, res));
    assert(joinRes.success, 'Socket 1 claimed Team 2');
    const { sessionToken, gameSessionId } = joinRes;
    assert(sessionToken, 'Received valid sessionToken');

    // 3. Reconnection with state recovery
    const reconnRes = await new Promise(res => {
      socket1.emit('player_reconnect', {
        team: 2,
        sessionToken,
        gameSessionId
      }, res);
    });

    assert(reconnRes.success, 'Reconnected successfully');
    assert.strictEqual(reconnRes.reconnected, true, 'Server marked reconnected: true');
    assert(reconnRes.gameState, 'Server returned authoritative gameState in callback');
    assert.strictEqual(reconnRes.gameState.teamCount, 4, 'Authoritative state has teamCount: 4');
    console.log('[PASS] Reconnection with state recovery verified');

    // 4. Single-socket enforcement: Connect Socket 2 using the same session token (superseding Socket 1)
    const socket2 = io('http://localhost:5000');
    await new Promise(res => socket2.on('connect', res));

    let socket1ReceivedSuperseded = false;
    socket1.on('superseded_session', () => {
      socket1ReceivedSuperseded = true;
    });

    const reconn2 = await new Promise(res => {
      socket2.emit('player_reconnect', {
        team: 2,
        sessionToken,
        gameSessionId
      }, res);
    });

    assert(reconn2.success, 'Socket 2 successfully claimed session');
    // Wait briefly for Socket 1 disconnect event
    await new Promise(r => setTimeout(r, 200));

    assert(socket1ReceivedSuperseded, 'Socket 1 received superseded_session notification');
    assert(!socket1.connected, 'Socket 1 was cleanly disconnected by server to avoid duplicate connections');
    console.log('[PASS] Single-socket enforcement: previous socket was cleanly superseded and disconnected');

    socket2.disconnect();

    // Reset game
    const admin = io('http://localhost:5000');
    await new Promise(res => admin.on('connect', res));
    await new Promise(res => admin.emit('admin_auth', { pin: 'admin123' }, res));
    await new Promise(res => admin.emit('admin_reset_game', {}, res));
    admin.disconnect();

    console.log('\n======================================================================');
    console.log('  LIFECYCLE & HEARTBEAT SUITE: ALL TESTS PASSED ✓');
    console.log('======================================================================\n');
  } finally {
    if (socket1.connected) socket1.disconnect();
  }
}

run().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n[TEST FAILURE]:', err);
  process.exit(1);
});
