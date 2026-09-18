import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { io } from 'socket.io-client';
import { defaultStateStore } from '../server/stateStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.join(__dirname, '..', 'data', 'active_game_session.json');

console.log('======================================================================');
console.log('       TEAM QUEST — DURABLE STATE PERSISTENCE VERIFICATION           ');
console.log('======================================================================\n');

async function run() {
  const admin = io('http://localhost:5000');

  try {
    await new Promise((res, rej) => {
      admin.on('connect', res);
      admin.on('connect_error', rej);
    });

    console.log('[PASS] Admin socket connected to server');

    // Authenticate
    const auth = await new Promise(res => admin.emit('admin_auth', { pin: 'admin123' }, res));
    assert(auth.success, 'Admin authenticated');

    // 1. Configure 5 teams
    const teamCountRes = await new Promise(res => admin.emit('admin_set_team_count', { teamCount: 5 }, res));
    assert(teamCountRes.success, 'Set team count to 5');

    // Give stateStore a moment to persist
    await new Promise(r => setTimeout(r, 200));

    // Verify storage file exists on disk
    assert(fs.existsSync(STORAGE_FILE), 'active_game_session.json exists on disk');
    const persisted = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));

    assert.strictEqual(persisted.teamCount, 5, 'Persisted teamCount is 5');
    assert(persisted.stateVersion > 0, 'Persisted stateVersion incremented');
    assert(persisted.gameSessionId, 'Persisted gameSessionId exists');
    assert(persisted.teams && persisted.teams[5], 'Team 5 exists in persisted state');
    console.log(`[PASS] Verified state persistence: teamCount=5, version=${persisted.stateVersion}`);

    // 2. Player joins Team 1
    const player = io('http://localhost:5000');
    await new Promise(res => player.on('connect', res));
    const joinRes = await new Promise(res => player.emit('player_join', { team: 1 }, res));
    assert(joinRes.success, 'Player joined Team 1');

    await new Promise(r => setTimeout(r, 200));
    const persisted2 = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    assert(persisted2.teams[1].sessionToken, 'Player sessionToken is persisted in durable store');
    console.log('[PASS] Player sessionToken successfully persisted to disk');

    // 3. Test StateStore direct reload
    const loaded = defaultStateStore.loadState();
    assert.strictEqual(loaded.gameSessionId, persisted2.gameSessionId, 'StateStore.loadState restores exact gameSessionId');
    assert.strictEqual(loaded.teamCount, 5, 'StateStore.loadState restores teamCount 5');
    assert(loaded.teams[1].sessionToken, 'StateStore.loadState restores claimed team session');
    console.log('[PASS] StateStore loads authoritative state correctly from disk');

    // Reset game back to clean state
    await new Promise(res => admin.emit('admin_reset_game', {}, res));
    await new Promise(res => admin.emit('admin_set_team_count', { teamCount: 4 }, res));
    player.disconnect();

    console.log('\n======================================================================');
    console.log('  DURABLE STATE PERSISTENCE SUITE: ALL TESTS PASSED ✓');
    console.log('======================================================================\n');
  } finally {
    admin.disconnect();
  }
}

run().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n[TEST FAILURE]:', err);
  process.exit(1);
});
