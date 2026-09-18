import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

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
      if (fs.existsSync(PARTICIPANTS_FILE)) {
        const raw = fs.readFileSync(PARTICIPANTS_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          this.participants = data.map(p => this._normalizeParticipant(p));
          console.log(`[ParticipantManager] Loaded ${this.participants.length} participants from storage.`);
          return;
        }
      }
    } catch (e) {
      console.warn('[ParticipantManager] Error reading participants.json:', e.message);
    }

    // Default sample roster if empty
    this.participants = this._getDefaultParticipants();
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
      createdAt: Date.now()
    }));
  }

  _normalizeParticipant(p) {
    return {
      id: p.id || `p_${crypto.randomBytes(6).toString('hex')}`,
      name: (p.name || '').trim(),
      teamId: p.teamId ? Number(p.teamId) : null,
      createdAt: p.createdAt || Date.now()
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
    return [...this.participants];
  }

  getParticipantById(id) {
    return this.participants.find(p => p.id === id) || null;
  }

  addParticipant(name) {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      throw new Error('Participant name cannot be empty');
    }
    const newParticipant = {
      id: `p_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: cleanName,
      teamId: null,
      createdAt: Date.now()
    };
    this.participants.push(newParticipant);
    this.saveToFile();
    return newParticipant;
  }

  addParticipantsBulk(names) {
    if (!Array.isArray(names)) {
      throw new Error('Names must be an array of strings');
    }
    const added = [];
    for (const rawName of names) {
      const clean = (rawName || '').trim();
      if (clean) {
        const p = {
          id: `p_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          name: clean,
          teamId: null,
          createdAt: Date.now()
        };
        this.participants.push(p);
        added.push(p);
      }
    }
    if (added.length > 0) {
      this.saveToFile();
    }
    return added;
  }

  updateParticipant(id, updates = {}) {
    const idx = this.participants.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error(`Participant with id ${id} not found`);
    }
    if (updates.name !== undefined) {
      const cleanName = (updates.name || '').trim();
      if (!cleanName) throw new Error('Participant name cannot be empty');
      this.participants[idx].name = cleanName;
    }
    if (updates.teamId !== undefined) {
      this.participants[idx].teamId = updates.teamId ? Number(updates.teamId) : null;
    }
    this.saveToFile();
    return this.participants[idx];
  }

  removeParticipant(id) {
    const idx = this.participants.findIndex(p => p.id === id);
    if (idx === -1) {
      return { success: false, error: 'Participant not found' };
    }
    const [removed] = this.participants.splice(idx, 1);
    this.saveToFile();
    return { success: true, removed };
  }

  clearParticipants() {
    this.participants = [];
    this.saveToFile();
    return { success: true, count: 0 };
  }

  /**
   * Automatically assigns all participants across teamCount (4, 5, or 6)
   * Randomizes order using Fisher-Yates shuffle.
   * Guarantees maximum team-size difference <= 1.
   */
  autoAssignTeams(teamCount = 4) {
    const count = Number(teamCount) || 4;
    if (count < 4 || count > 6) {
      throw new Error('Team count must be 4, 5, or 6');
    }

    if (this.participants.length === 0) {
      return this.getRosters(count);
    }

    // Clone and shuffle participants (Fisher-Yates)
    const shuffled = [...this.participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Mathematical balanced distribution:
    // With N participants and K teams:
    // Base size B = Math.floor(N / K), Remainder R = N % K.
    // The first R teams receive B + 1 participants, the remaining K - R receive B.
    // This strictly ensures that max difference between any two teams is at most 1.
    const N = shuffled.length;
    const base = Math.floor(N / count);
    const remainder = N % count;

    let currentIndex = 0;
    for (let t = 1; t <= count; t++) {
      const teamSize = t <= remainder ? base + 1 : base;
      for (let s = 0; s < teamSize; s++) {
        const participant = shuffled[currentIndex++];
        if (participant) {
          const original = this.participants.find(p => p.id === participant.id);
          if (original) {
            original.teamId = t;
          }
        }
      }
    }

    this.saveToFile();
    return this.getRosters(count);
  }

  shuffleTeams(teamCount = 4) {
    return this.autoAssignTeams(teamCount);
  }

  moveParticipant(participantId, targetTeamId) {
    const p = this.participants.find(item => item.id === participantId);
    if (!p) {
      throw new Error(`Participant ${participantId} not found`);
    }
    const target = targetTeamId ? Number(targetTeamId) : null;
    p.teamId = target;
    this.saveToFile();
    return p;
  }

  getRosters(teamCount = 4) {
    const count = Number(teamCount) || 4;
    const rosters = {};
    for (let t = 1; t <= count; t++) {
      rosters[t] = [];
    }
    const unassigned = [];

    for (const p of this.participants) {
      if (p.teamId && p.teamId >= 1 && p.teamId <= count) {
        rosters[p.teamId].push(p);
      } else {
        unassigned.push(p);
      }
    }

    return {
      rosters,
      unassigned,
      teamCount: count,
      totalParticipants: this.participants.length
    };
  }

  resetAssignments() {
    for (const p of this.participants) {
      p.teamId = null;
    }
    this.saveToFile();
  }
}

export const participantManager = new ParticipantManager();
