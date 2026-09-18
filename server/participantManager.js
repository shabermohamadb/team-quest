import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dbManager } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

export class ParticipantManager {
  constructor() {
    this.participants = [];
    this.ensureDataDir();
    this.loadData();
  }

  ensureDataDir() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('[ParticipantManager] Error creating data directory:', e);
    }
  }

  loadData() {
    try {
      // 1. Primary Source of Truth: SQLite Database members table
      const dbMembers = dbManager.getMembers();
      if (Array.isArray(dbMembers) && dbMembers.length > 0) {
        this.participants = dbMembers.map(m => this._normalizeParticipant(m));
        console.log(`[ParticipantManager] Loaded ${this.participants.length} members from SQLite database.`);
        this.saveToFile();
        return;
      }
    } catch (e) {
      console.warn('[ParticipantManager] Error querying SQLite members table:', e.message);
    }

    try {
      if (fs.existsSync(PARTICIPANTS_FILE)) {
        const raw = fs.readFileSync(PARTICIPANTS_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data) && data.length > 0) {
          this.participants = data.map(p => this._normalizeParticipant(p));
          for (const p of this.participants) {
            try {
              dbManager.addMember({ id: p.id, name: p.name, teamId: p.teamId });
            } catch (_) {}
          }
          console.log(`[ParticipantManager] Migrated ${this.participants.length} participants into SQLite database.`);
          return;
        }
      }
    } catch (e) {
      console.warn('[ParticipantManager] Error reading participants.json:', e.message);
    }

    // Default sample roster if completely empty
    this.participants = this._getDefaultParticipants();
    for (const p of this.participants) {
      try {
        dbManager.addMember({ id: p.id, name: p.name, teamId: p.teamId });
      } catch (_) {}
    }
    this.saveToFile();
  }

  _getDefaultParticipants() {
    const defaultNames = [
      'Shaber', 'Arun', 'Rahul', 'Kavin',
      'Priya', 'Manoj', 'Sanjay', 'Vignesh',
      'Ananya', 'Deepak', 'Karthik', 'Naveen',
      'Divya', 'Harish', 'Pooja', 'Rohan'
    ];
    return defaultNames.map((name, idx) => ({
      id: `p_${idx + 1}_${crypto.randomBytes(4).toString('hex')}`,
      name,
      teamId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
  }

  _normalizeParticipant(p) {
    return {
      id: p.id || `p_${crypto.randomBytes(6).toString('hex')}`,
      gameId: p.gameId || 'QUEST_DEFAULT_GAME',
      name: (p.name || '').trim(),
      teamId: p.teamId ? Number(p.teamId) : null,
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  }

  saveToFile() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(this.participants, null, 2), 'utf8');
    } catch (e) {
      console.error('[ParticipantManager] Error writing participants.json:', e);
    }
  }

  getParticipants() {
    try {
      const dbMembers = dbManager.getMembers();
      if (Array.isArray(dbMembers) && dbMembers.length > 0) {
        this.participants = dbMembers.map(m => this._normalizeParticipant(m));
      }
    } catch (_) {}
    return [...this.participants];
  }

  getParticipantById(id) {
    try {
      const dbMember = dbManager.getMemberById(id);
      if (dbMember) return this._normalizeParticipant(dbMember);
    } catch (_) {}
    return this.participants.find(p => p.id === id) || null;
  }

  addParticipant(name) {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Participant name cannot be empty');
    }

    const created = dbManager.addMember({ name: cleanName });
    const normalized = this._normalizeParticipant(created);

    this.participants.push(normalized);
    this.saveToFile();
    return normalized;
  }

  addParticipantsBulk(names) {
    if (!Array.isArray(names)) {
      throw new Error('Names must be an array of strings');
    }
    const addedDb = dbManager.addMembersBulk(null, names);
    const normalized = addedDb.map(m => this._normalizeParticipant(m));

    this.participants.push(...normalized);
    this.saveToFile();
    return normalized;
  }

  updateParticipant(id, updates = {}) {
    const updatedDb = dbManager.updateMember(id, updates);
    const normalized = this._normalizeParticipant(updatedDb);

    const idx = this.participants.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.participants[idx] = normalized;
    } else {
      this.participants.push(normalized);
    }
    this.saveToFile();
    return normalized;
  }

  removeParticipant(id) {
    const res = dbManager.removeMember(id);
    const idx = this.participants.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.participants.splice(idx, 1);
    }
    this.saveToFile();
    return res;
  }

  clearParticipants() {
    dbManager.clearMembers();
    this.participants = [];
    this.saveToFile();
    return { success: true, count: 0 };
  }

  /**
   * Automatically assigns all participants across teamCount (4, 5, or 6)
   * Randomizes order using Fisher-Yates shuffle in SQLite.
   * Guarantees maximum team-size difference <= 1.
   */
  autoAssignTeams(teamCount = 4) {
    const count = Number(teamCount) || 4;
    if (count < 4 || count > 6) {
      throw new Error('Team count must be 4, 5, or 6');
    }

    const rosterResult = dbManager.autoAssignMembers(null, count);
    this.participants = dbManager.getMembers().map(m => this._normalizeParticipant(m));
    this.saveToFile();
    return rosterResult;
  }

  shuffleTeams(teamCount = 4) {
    return this.autoAssignTeams(teamCount);
  }

  moveParticipant(participantId, targetTeamId) {
    const updated = dbManager.moveMember(participantId, targetTeamId);
    const normalized = this._normalizeParticipant(updated);

    const idx = this.participants.findIndex(p => p.id === participantId);
    if (idx !== -1) {
      this.participants[idx] = normalized;
    }
    this.saveToFile();
    return normalized;
  }

  getRosters(teamCount = 4) {
    const count = Number(teamCount) || 4;
    return dbManager.getRosters(null, count);
  }

  resetAssignments() {
    for (const p of this.participants) {
      dbManager.updateMember(p.id, { teamId: null });
    }
    this.participants = dbManager.getMembers().map(m => this._normalizeParticipant(m));
    this.saveToFile();
  }
}

export const participantManager = new ParticipantManager();
