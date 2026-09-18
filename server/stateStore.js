import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_STORAGE_PATH = path.join(__dirname, '..', 'data', 'active_game_session.json');

export class StateStore {
  constructor(customPath = null) {
    this.filePath = customPath || process.env.STORAGE_FILE || DEFAULT_STORAGE_PATH;
    this.ensureDirectory();
    this.stateVersion = 0;
  }

  ensureDirectory() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error('[StateStore] Failed to create storage directory:', e.message);
      }
    }
  }

  /**
   * Atomically save active game state to disk.
   * Uses write-to-temp + rename to guarantee atomic durability without corrupt partial reads.
   */
  saveState(stateData) {
    if (!stateData || typeof stateData !== 'object') return false;

    this.stateVersion += 1;
    const payload = {
      ...stateData,
      stateVersion: this.stateVersion,
      updatedAt: new Date().toISOString()
    };

    const tempPath = `${this.filePath}.tmp.${Date.now()}`;
    try {
      this.ensureDirectory();
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tempPath, this.filePath);
      return true;
    } catch (err) {
      console.error('[StateStore] Error persisting game state:', err.message);
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (_) {}
      return false;
    }
  }

  /**
   * Load authoritative game state on server startup or recovery.
   */
  loadState() {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (typeof data.stateVersion === 'number') {
          this.stateVersion = data.stateVersion;
        }
        return data;
      }
      return null;
    } catch (err) {
      console.warn('[StateStore] Could not read active state file (starting fresh):', err.message);
      return null;
    }
  }

  /**
   * Clear active game session file (e.g. on full hard reset).
   */
  clearState() {
    try {
      if (fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
      this.stateVersion = 0;
      return true;
    } catch (err) {
      console.error('[StateStore] Error clearing state file:', err.message);
      return false;
    }
  }
}

export const defaultStateStore = new StateStore();
