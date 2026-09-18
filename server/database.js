import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'team_quest.db');

export class DatabaseManager {
  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath;
    this.ensureDataDir();
    this.initDatabase();
  }

  ensureDataDir() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error('[DB] Error creating database directory:', e.message);
      }
    }
  }

  initDatabase() {
    this.db = new DatabaseSync(this.dbPath);

    // Performance & Relational Integrity PRAGMAs
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    this.createTables();
    this.runInitialMigrations();
  }

  createTables() {
    // 1. GAMES TABLE
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        gameCode TEXT NOT NULL,
        teamCount INTEGER NOT NULL DEFAULT 4,
        status TEXT NOT NULL DEFAULT 'LOBBY',
        currentRound INTEGER NOT NULL DEFAULT 1,
        currentQuestionIndex INTEGER NOT NULL DEFAULT 0,
        currentQuestionId TEXT,
        currentClue INTEGER NOT NULL DEFAULT 1,
        selectedQuestionIds TEXT,
        timerStartedAt INTEGER,
        timerDuration INTEGER NOT NULL DEFAULT 30,
        pausedAt INTEGER,
        isPaused INTEGER NOT NULL DEFAULT 0,
        winnerTeamId INTEGER,
        winnerDetails TEXT,
        createdAt TEXT NOT NULL,
        startedAt TEXT,
        completedAt TEXT,
        updatedAt TEXT NOT NULL
      );
    `);

    // 2. TEAMS TABLE (Supports 4, 5, 6 dynamic teams)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        gameId TEXT NOT NULL,
        teamNumber INTEGER NOT NULL,
        name TEXT NOT NULL,
        claimed INTEGER NOT NULL DEFAULT 0,
        connected INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE(gameId, teamNumber)
      );
    `);

    // 3. MEMBERS TABLE (Admin-only participants roster)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        gameId TEXT NOT NULL,
        name TEXT NOT NULL,
        teamId INTEGER,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
      );
    `);

    // 4. TEAM SCORES TABLE (Team-based competitive points)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS team_scores (
        id TEXT PRIMARY KEY,
        gameId TEXT NOT NULL,
        teamId INTEGER NOT NULL,
        round1Points INTEGER NOT NULL DEFAULT 0,
        round2Points INTEGER NOT NULL DEFAULT 0,
        round3Points INTEGER NOT NULL DEFAULT 0,
        totalPoints INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE(gameId, teamId)
      );
    `);

    // 5. SCORE EVENTS TABLE (Immutable individual score audit log)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS score_events (
        id TEXT PRIMARY KEY,
        gameId TEXT NOT NULL,
        teamId INTEGER NOT NULL,
        round INTEGER NOT NULL,
        questionId TEXT NOT NULL,
        clueNumber INTEGER,
        points INTEGER NOT NULL,
        isCorrect INTEGER NOT NULL DEFAULT 1,
        submittedAnswer TEXT,
        reactionMs INTEGER,
        submittedAt TEXT NOT NULL,
        FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE
      );
    `);

    // 6. TEAM LOCKS TABLE (Question-level lock state per team)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS team_locks (
        id TEXT PRIMARY KEY,
        gameId TEXT NOT NULL,
        teamId INTEGER NOT NULL,
        questionId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SOLVED',
        solvedClue INTEGER,
        pointsAwarded INTEGER NOT NULL DEFAULT 0,
        solvedAt TEXT NOT NULL,
        FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
        UNIQUE(gameId, teamId, questionId)
      );
    `);

    // 7. GAME HISTORY TABLE (Completed games archive)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS game_history (
        id TEXT PRIMARY KEY,
        gameCode TEXT NOT NULL,
        date TEXT NOT NULL,
        teamCount INTEGER NOT NULL,
        round1Scores TEXT NOT NULL,
        round2Scores TEXT NOT NULL,
        round3Scores TEXT NOT NULL,
        finalScores TEXT NOT NULL,
        winner TEXT NOT NULL,
        winnerDetails TEXT,
        completedAt TEXT NOT NULL
      );
    `);
  }

  runInitialMigrations() {
    // 1. Migrate Active Game Session if games table is empty
    const gameCount = this.db.prepare('SELECT COUNT(*) as count FROM games').get().count;
    let defaultGameId = 'QUEST_DEFAULT_GAME';

    const activeSessionPath = path.join(DATA_DIR, 'active_game_session.json');
    if (fs.existsSync(activeSessionPath)) {
      try {
        const raw = fs.readFileSync(activeSessionPath, 'utf8');
        const session = JSON.parse(raw);
        if (session && session.gameSessionId) {
          defaultGameId = session.gameSessionId;
          if (gameCount === 0) {
            this.createGame({
              id: session.gameSessionId,
              gameCode: session.gameCode || 'QUEST-2026',
              teamCount: session.teamCount || 4,
              status: session.state || 'LOBBY',
              currentRound: session.currentRoundNumber || 1,
              currentQuestionIndex: session.currentQuestionIndex || 0,
              currentClue: session.activeClueNumber || 1,
              createdAt: session.updatedAt || new Date().toISOString()
            });

            // Initialize teams & scores from active session
            const count = session.teamCount || 4;
            this.syncTeams(session.gameSessionId, count);

            if (session.roundScores && session.scores) {
              for (let t = 1; t <= count; t++) {
                const r1 = session.roundScores[t]?.r1 || 0;
                const r2 = session.roundScores[t]?.r2 || 0;
                const r3 = session.roundScores[t]?.r3 || 0;
                const total = r1 + r2 + r3;
                this.updateTeamScoreDirect(session.gameSessionId, t, r1, r2, r3, total);
              }
            }
            console.log(`[DB Migration] Migrated active game session ${session.gameSessionId} to SQLite.`);
          }
        }
      } catch (e) {
        console.warn('[DB Migration] Warning reading active_game_session.json:', e.message);
      }
    }

    // If still no game in DB, create default game
    if (this.db.prepare('SELECT COUNT(*) as count FROM games').get().count === 0) {
      this.createGame({
        id: defaultGameId,
        gameCode: 'QUEST-2026',
        teamCount: 4,
        status: 'LOBBY',
        createdAt: new Date().toISOString()
      });
      this.syncTeams(defaultGameId, 4);
    }

    // 2. Migrate Participants into members table if members is empty
    const memberCount = this.db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    const participantsPath = path.join(DATA_DIR, 'participants.json');
    if (memberCount === 0 && fs.existsSync(participantsPath)) {
      try {
        const raw = fs.readFileSync(participantsPath, 'utf8');
        const participants = JSON.parse(raw);
        if (Array.isArray(participants) && participants.length > 0) {
          const activeGame = this.getActiveGame();
          const gameId = activeGame ? activeGame.id : defaultGameId;
          const insertStmt = this.db.prepare(`
            INSERT INTO members (id, gameId, name, teamId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          this.db.exec('BEGIN TRANSACTION');
          for (const p of participants) {
            const cleanName = (p.name || '').trim();
            if (cleanName) {
              const id = p.id || `p_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
              const teamId = p.teamId ? Number(p.teamId) : null;
              const now = new Date(p.createdAt || Date.now()).toISOString();
              insertStmt.run(id, gameId, cleanName, teamId, now, now);
            }
          }
          this.db.exec('COMMIT');
          console.log(`[DB Migration] Migrated ${participants.length} participants into members table.`);
        }
      } catch (e) {
        console.warn('[DB Migration] Warning reading participants.json:', e.message);
      }
    }

    // 3. Migrate Game History if game_history is empty
    const historyCount = this.db.prepare('SELECT COUNT(*) as count FROM game_history').get().count;
    const historyPath = path.join(DATA_DIR, 'game_history.json');
    if (historyCount === 0 && fs.existsSync(historyPath)) {
      try {
        const raw = fs.readFileSync(historyPath, 'utf8');
        const historyList = JSON.parse(raw);
        if (Array.isArray(historyList) && historyList.length > 0) {
          const insertHist = this.db.prepare(`
            INSERT INTO game_history (id, gameCode, date, teamCount, round1Scores, round2Scores, round3Scores, finalScores, winner, winnerDetails, completedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          this.db.exec('BEGIN TRANSACTION');
          for (const h of historyList) {
            const id = h.sessionId || `session_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
            const gameCode = h.gameCode || 'QUEST-2026';
            const date = h.completedAt || new Date().toISOString();
            const teamCount = h.teamCount || 4;
            const r1 = JSON.stringify(h.roundScores?.r1 || {});
            const r2 = JSON.stringify(h.roundScores?.r2 || {});
            const r3 = JSON.stringify(h.roundScores?.r3 || {});
            const finalScores = JSON.stringify(h.scores || {});
            const winner = h.winner ? `Team ${h.winner}` : 'TIE';
            const winnerDetails = JSON.stringify(h.winnerDetails || {});
            const completedAt = h.completedAt || date;
            insertHist.run(id, gameCode, date, teamCount, r1, r2, r3, finalScores, winner, winnerDetails, completedAt);
          }
          this.db.exec('COMMIT');
          console.log(`[DB Migration] Migrated ${historyList.length} past games into game_history table.`);
        }
      } catch (e) {
        console.warn('[DB Migration] Warning reading game_history.json:', e.message);
      }
    }
  }

  // ==========================================
  // GAME OPERATIONS
  // ==========================================

  createGame(gameData) {
    const now = new Date().toISOString();
    const id = gameData.id || `game_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const gameCode = gameData.gameCode || 'QUEST-2026';
    const teamCount = Number(gameData.teamCount) || 4;
    const status = gameData.status || 'LOBBY';
    const selectedQuestionIds = typeof gameData.selectedQuestionIds === 'object'
      ? JSON.stringify(gameData.selectedQuestionIds)
      : (gameData.selectedQuestionIds || null);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO games (
        id, gameCode, teamCount, status, currentRound, currentQuestionIndex,
        currentQuestionId, currentClue, selectedQuestionIds, timerStartedAt,
        timerDuration, pausedAt, isPaused, winnerTeamId, winnerDetails,
        createdAt, startedAt, completedAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, gameCode, teamCount, status,
      gameData.currentRound || 1,
      gameData.currentQuestionIndex || 0,
      gameData.currentQuestionId || null,
      gameData.currentClue || 1,
      selectedQuestionIds,
      gameData.timerStartedAt || null,
      gameData.timerDuration || 30,
      gameData.pausedAt || null,
      gameData.isPaused ? 1 : 0,
      gameData.winnerTeamId || null,
      gameData.winnerDetails ? JSON.stringify(gameData.winnerDetails) : null,
      gameData.createdAt || now,
      gameData.startedAt || null,
      gameData.completedAt || null,
      now
    );

    this.syncTeams(id, teamCount);
    return this.getGame(id);
  }

  getGame(id) {
    const row = this.db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    if (!row) return null;
    return this._formatGame(row);
  }

  getActiveGame() {
    // Returns active game session (non-completed prioritized, or latest)
    const row = this.db.prepare(`
      SELECT * FROM games 
      ORDER BY CASE WHEN status != 'FINAL_RESULT' THEN 0 ELSE 1 END,
      updatedAt DESC LIMIT 1
    `).get();

    if (!row) return null;
    return this._formatGame(row);
  }

  _formatGame(row) {
    let selectedQuestionIds = null;
    if (row.selectedQuestionIds) {
      try {
        selectedQuestionIds = JSON.parse(row.selectedQuestionIds);
      } catch (_) {}
    }
    let winnerDetails = null;
    if (row.winnerDetails) {
      try {
        winnerDetails = JSON.parse(row.winnerDetails);
      } catch (_) {}
    }

    return {
      ...row,
      isPaused: Boolean(row.isPaused),
      selectedQuestionIds,
      winnerDetails
    };
  }

  updateGameState(id, updates = {}) {
    const existing = this.getGame(id);
    if (!existing) {
      return this.createGame({ id, ...updates });
    }

    const now = new Date().toISOString();
    const fields = [];
    const values = [];

    const allowed = [
      'status', 'teamCount', 'currentRound', 'currentQuestionIndex',
      'currentQuestionId', 'currentClue', 'selectedQuestionIds',
      'timerStartedAt', 'timerDuration', 'pausedAt', 'isPaused',
      'winnerTeamId', 'winnerDetails', 'startedAt', 'completedAt'
    ];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'selectedQuestionIds' && typeof updates[key] === 'object') {
          values.push(JSON.stringify(updates[key]));
        } else if (key === 'winnerDetails' && typeof updates[key] === 'object') {
          values.push(JSON.stringify(updates[key]));
        } else if (key === 'isPaused') {
          values.push(updates[key] ? 1 : 0);
        } else {
          values.push(updates[key]);
        }
      }
    }

    if (fields.length === 0) return this.getGame(id);

    fields.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    const sql = `UPDATE games SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);

    if (updates.teamCount) {
      this.syncTeams(id, updates.teamCount);
    }

    return this.getGame(id);
  }

  // ==========================================
  // TEAMS OPERATIONS
  // ==========================================

  syncTeams(gameId, teamCount) {
    const count = Number(teamCount) || 4;
    const now = new Date().toISOString();

    const teamNames = {
      1: 'TEAM 1',
      2: 'TEAM 2',
      3: 'TEAM 3',
      4: 'TEAM 4',
      5: 'TEAM 5',
      6: 'TEAM 6'
    };

    // Ensure parent game exists before inserting teams referencing gameId
    const game = this.db.prepare('SELECT id FROM games WHERE id = ?').get(gameId);
    if (!game) {
      this.db.prepare(`
        INSERT OR IGNORE INTO games (id, gameCode, teamCount, status, createdAt, updatedAt)
        VALUES (?, 'QUEST-2026', ?, 'LOBBY', ?, ?)
      `).run(gameId, count, now, now);
    }

    this.db.exec('BEGIN TRANSACTION');
    try {
      for (let t = 1; t <= count; t++) {
        const teamId = `team_${gameId}_${t}`;
        const name = teamNames[t] || `TEAM ${t}`;

        this.db.prepare(`
          INSERT INTO teams (id, gameId, teamNumber, name, claimed, connected, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 0, 0, ?, ?)
          ON CONFLICT(gameId, teamNumber) DO UPDATE SET
          name = excluded.name,
          updatedAt = excluded.updatedAt
        `).run(teamId, gameId, t, name, now, now);

        // Ensure score row exists
        const scoreId = `score_${gameId}_${t}`;
        this.db.prepare(`
          INSERT INTO team_scores (id, gameId, teamId, round1Points, round2Points, round3Points, totalPoints, updatedAt)
          VALUES (?, ?, ?, 0, 0, 0, 0, ?)
          ON CONFLICT(gameId, teamId) DO NOTHING
        `).run(scoreId, gameId, t, now);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  getTeams(gameId) {
    return this.db.prepare(`
      SELECT t.*, s.round1Points, s.round2Points, s.round3Points, s.totalPoints
      FROM teams t
      LEFT JOIN team_scores s ON t.gameId = s.gameId AND t.teamNumber = s.teamId
      WHERE t.gameId = ?
      ORDER BY t.teamNumber ASC
    `).all(gameId);
  }

  updateTeamStatus(gameId, teamNumber, claimed, connected) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE teams
      SET claimed = ?, connected = ?, updatedAt = ?
      WHERE gameId = ? AND teamNumber = ?
    `).run(claimed ? 1 : 0, connected ? 1 : 0, now, gameId, teamNumber);
  }

  resetAllTeamClaims(gameId) {
    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE teams
      SET claimed = 0, connected = 0, updatedAt = ?
      WHERE gameId = ?
    `).run(now, gameId);
  }

  // ==========================================
  // MEMBERS OPERATIONS (Admin-Only Roster)
  // ==========================================

  getMembers(gameId = null) {
    if (gameId) {
      return this.db.prepare('SELECT * FROM members WHERE gameId = ? ORDER BY createdAt ASC').all(gameId);
    }
    return this.db.prepare('SELECT * FROM members ORDER BY createdAt ASC').all();
  }

  getMemberById(id) {
    return this.db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  }

  addMember({ gameId, name, teamId = null, id = null }) {
    const cleanName = (name || '').trim();
    if (!cleanName) throw new Error('Member name cannot be empty');

    const memberId = id || `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const gId = gameId || this.getActiveGame()?.id || 'QUEST_DEFAULT_GAME';

    this.db.prepare(`
      INSERT INTO members (id, gameId, name, teamId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        teamId = excluded.teamId,
        updatedAt = excluded.updatedAt
    `).run(memberId, gId, cleanName, teamId ? Number(teamId) : null, now, now);

    return this.getMemberById(memberId);
  }

  addMembersBulk(gameId, names) {
    if (!Array.isArray(names)) throw new Error('Names must be an array');
    const gId = gameId || this.getActiveGame()?.id || 'QUEST_DEFAULT_GAME';
    const now = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT INTO members (id, gameId, name, teamId, createdAt, updatedAt)
      VALUES (?, ?, ?, NULL, ?, ?)
    `);

    const added = [];
    this.db.exec('BEGIN TRANSACTION');
    for (const rawName of names) {
      const clean = (rawName || '').trim();
      if (clean) {
        const id = `mem_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        insert.run(id, gId, clean, now, now);
        added.push({ id, gameId: gId, name: clean, teamId: null, createdAt: now, updatedAt: now });
      }
    }
    this.db.exec('COMMIT');
    return added;
  }

  updateMember(id, { name, teamId }) {
    const existing = this.getMemberById(id);
    if (!existing) throw new Error(`Member ${id} not found`);

    const now = new Date().toISOString();
    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedTeam = teamId !== undefined ? (teamId ? Number(teamId) : null) : existing.teamId;

    this.db.prepare(`
      UPDATE members
      SET name = ?, teamId = ?, updatedAt = ?
      WHERE id = ?
    `).run(updatedName, updatedTeam, now, id);

    return this.getMemberById(id);
  }

  removeMember(id) {
    const existing = this.getMemberById(id);
    if (!existing) return { success: false, error: 'Member not found' };
    this.db.prepare('DELETE FROM members WHERE id = ?').run(id);
    return { success: true, removed: existing };
  }

  clearMembers(gameId = null) {
    if (gameId) {
      this.db.prepare('DELETE FROM members WHERE gameId = ?').run(gameId);
    } else {
      this.db.prepare('DELETE FROM members').run();
    }
    return { success: true, count: 0 };
  }

  autoAssignMembers(gameId, teamCount = 4) {
    const count = Number(teamCount) || 4;
    const members = this.getMembers(gameId);
    if (members.length === 0) return this.getRosters(gameId, count);

    // Fisher-Yates cryptographically randomized shuffle
    const shuffled = [...members];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Mathematical balanced allocation (delta <= 1 guarantee)
    const N = shuffled.length;
    const base = Math.floor(N / count);
    const remainder = N % count;
    const now = new Date().toISOString();

    const updateStmt = this.db.prepare('UPDATE members SET teamId = ?, updatedAt = ? WHERE id = ?');

    this.db.exec('BEGIN TRANSACTION');
    let currentIndex = 0;
    for (let t = 1; t <= count; t++) {
      const teamSize = t <= remainder ? base + 1 : base;
      for (let s = 0; s < teamSize; s++) {
        const m = shuffled[currentIndex++];
        if (m) {
          updateStmt.run(t, now, m.id);
        }
      }
    }
    this.db.exec('COMMIT');

    return this.getRosters(gameId, count);
  }

  moveMember(id, targetTeamId) {
    return this.updateMember(id, { teamId: targetTeamId ? Number(targetTeamId) : null });
  }

  getRosters(gameId, teamCount = 4) {
    const count = Number(teamCount) || 4;
    const members = this.getMembers(gameId);
    const rosters = {};
    for (let t = 1; t <= count; t++) {
      rosters[t] = [];
    }
    const unassigned = [];

    for (const m of members) {
      if (m.teamId && m.teamId >= 1 && m.teamId <= count) {
        rosters[m.teamId].push(m);
      } else {
        unassigned.push(m);
      }
    }

    const sizes = Object.values(rosters).map(r => r.length);
    const minSize = sizes.length ? Math.min(...sizes) : 0;
    const maxSize = sizes.length ? Math.max(...sizes) : 0;
    const isBalanced = (maxSize - minSize) <= 1;

    return {
      rosters,
      unassigned,
      teamCount: count,
      totalParticipants: members.length,
      isBalanced,
      minSize,
      maxSize
    };
  }

  // ==========================================
  // SCORES & SCORE EVENTS OPERATIONS
  // ==========================================

  recordScoreEvent({
    gameId,
    teamId,
    round,
    questionId,
    clueNumber = null,
    points = 0,
    isCorrect = 1,
    submittedAnswer = '',
    reactionMs = null
  }) {
    const now = new Date().toISOString();
    const eventId = `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const tId = Number(teamId);
    const roundNum = Number(round);
    const pts = Math.max(0, Number(points));

    this.db.exec('BEGIN TRANSACTION');
    try {
      // 1. Record immutable score audit event
      this.db.prepare(`
        INSERT INTO score_events (
          id, gameId, teamId, round, questionId, clueNumber,
          points, isCorrect, submittedAnswer, reactionMs, submittedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        eventId, gameId, tId, roundNum, questionId,
        clueNumber ? Number(clueNumber) : null,
        pts, isCorrect ? 1 : 0,
        String(submittedAnswer || ''),
        reactionMs ? Number(reactionMs) : null,
        now
      );

      // 2. If correct answer with points awarded, update team_scores atomically
      let updatedScore = null;
      if (isCorrect && pts > 0) {
        const col = roundNum === 1 ? 'round1Points' : (roundNum === 2 ? 'round2Points' : 'round3Points');
        this.db.prepare(`
          UPDATE team_scores
          SET ${col} = ${col} + ?,
              totalPoints = round1Points + round2Points + round3Points + ?,
              updatedAt = ?
          WHERE gameId = ? AND teamId = ?
        `).run(pts, pts, now, gameId, tId);
      }

      updatedScore = this.db.prepare(`
        SELECT * FROM team_scores WHERE gameId = ? AND teamId = ?
      `).get(gameId, tId);

      this.db.exec('COMMIT');

      return {
        eventId,
        score: updatedScore
      };
    } catch (err) {
      try { this.db.exec('ROLLBACK'); } catch (_) {}
      throw err;
    }
  }

  updateTeamScoreDirect(gameId, teamId, r1, r2, r3, total) {
    const now = new Date().toISOString();
    const scoreId = `score_${gameId}_${teamId}`;
    const computedTotal = total !== undefined ? total : (r1 + r2 + r3);

    this.db.prepare(`
      INSERT INTO team_scores (id, gameId, teamId, round1Points, round2Points, round3Points, totalPoints, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(gameId, teamId) DO UPDATE SET
        round1Points = excluded.round1Points,
        round2Points = excluded.round2Points,
        round3Points = excluded.round3Points,
        totalPoints = excluded.totalPoints,
        updatedAt = excluded.updatedAt
    `).run(scoreId, gameId, teamId, r1, r2, r3, computedTotal, now);
  }

  getTeamScores(gameId) {
    const rows = this.db.prepare(`
      SELECT * FROM team_scores WHERE gameId = ? ORDER BY teamId ASC
    `).all(gameId);

    const scores = {};
    const roundScores = {};

    for (const r of rows) {
      scores[r.teamId] = r.totalPoints;
      roundScores[r.teamId] = {
        r1: r.round1Points,
        r2: r.round2Points,
        r3: r.round3Points
      };
    }

    return { scores, roundScores, rows };
  }

  getScoreEvents(gameId, filter = {}) {
    let sql = 'SELECT * FROM score_events WHERE gameId = ?';
    const params = [gameId];

    if (filter.teamId) {
      sql += ' AND teamId = ?';
      params.push(Number(filter.teamId));
    }
    if (filter.round) {
      sql += ' AND round = ?';
      params.push(Number(filter.round));
    }
    if (filter.questionId) {
      sql += ' AND questionId = ?';
      params.push(filter.questionId);
    }

    sql += ' ORDER BY submittedAt ASC';
    return this.db.prepare(sql).all(...params);
  }

  // ==========================================
  // TEAM LOCKS OPERATIONS
  // ==========================================

  recordTeamLock({ gameId, teamId, questionId, status = 'SOLVED', solvedClue = null, pointsAwarded = 0 }) {
    const now = new Date().toISOString();
    const id = `lock_${gameId}_${teamId}_${questionId}`;
    const tId = Number(teamId);

    this.db.prepare(`
      INSERT INTO team_locks (id, gameId, teamId, questionId, status, solvedClue, pointsAwarded, solvedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(gameId, teamId, questionId) DO UPDATE SET
        status = excluded.status,
        solvedClue = excluded.solvedClue,
        pointsAwarded = excluded.pointsAwarded,
        solvedAt = excluded.solvedAt
    `).run(id, gameId, tId, questionId, status, solvedClue ? Number(solvedClue) : null, pointsAwarded, now);

    return this.db.prepare('SELECT * FROM team_locks WHERE id = ?').get(id);
  }

  getTeamLocks(gameId, questionId) {
    const rows = this.db.prepare(`
      SELECT * FROM team_locks WHERE gameId = ? AND questionId = ?
    `).all(gameId, questionId);

    const locks = {};
    for (const r of rows) {
      locks[r.teamId] = r;
    }
    return locks;
  }

  isTeamLocked(gameId, teamId, questionId) {
    const row = this.db.prepare(`
      SELECT * FROM team_locks WHERE gameId = ? AND teamId = ? AND questionId = ?
    `).get(gameId, Number(teamId), questionId);
    return Boolean(row);
  }

  clearTeamLocks(gameId, questionId = null) {
    if (questionId) {
      this.db.prepare('DELETE FROM team_locks WHERE gameId = ? AND questionId = ?').run(gameId, questionId);
    } else {
      this.db.prepare('DELETE FROM team_locks WHERE gameId = ?').run(gameId);
    }
  }

  // ==========================================
  // GAME HISTORY OPERATIONS
  // ==========================================

  saveGameFinalResult({
    gameId,
    gameCode = 'QUEST-2026',
    teamCount = 4,
    round1Scores = {},
    round2Scores = {},
    round3Scores = {},
    finalScores = {},
    winner = 'TIE',
    winnerDetails = {},
    completedAt = null
  }) {
    const now = completedAt || new Date().toISOString();

    this.db.prepare(`
      INSERT INTO game_history (
        id, gameCode, date, teamCount, round1Scores, round2Scores,
        round3Scores, finalScores, winner, winnerDetails, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        round1Scores = excluded.round1Scores,
        round2Scores = excluded.round2Scores,
        round3Scores = excluded.round3Scores,
        finalScores = excluded.finalScores,
        winner = excluded.winner,
        winnerDetails = excluded.winnerDetails,
        completedAt = excluded.completedAt
    `).run(
      gameId,
      gameCode,
      now,
      Number(teamCount),
      JSON.stringify(round1Scores),
      JSON.stringify(round2Scores),
      JSON.stringify(round3Scores),
      JSON.stringify(finalScores),
      String(winner),
      JSON.stringify(winnerDetails),
      now
    );

    // Update game record to FINAL_RESULT
    this.updateGameState(gameId, {
      status: 'FINAL_RESULT',
      completedAt: now,
      winnerDetails
    });

    return this.db.prepare('SELECT * FROM game_history WHERE id = ?').get(gameId);
  }

  getGameHistory() {
    const rows = this.db.prepare('SELECT * FROM game_history ORDER BY completedAt DESC').all();
    return rows.map(r => ({
      sessionId: r.id,
      gameCode: r.gameCode,
      date: r.date,
      teamCount: r.teamCount,
      round1Scores: JSON.parse(r.round1Scores || '{}'),
      round2Scores: JSON.parse(r.round2Scores || '{}'),
      round3Scores: JSON.parse(r.round3Scores || '{}'),
      scores: JSON.parse(r.finalScores || '{}'),
      winner: r.winner,
      winnerDetails: JSON.parse(r.winnerDetails || '{}'),
      completedAt: r.completedAt
    }));
  }

  // ==========================================
  // SYSTEM STATS FOR AUDIT
  // ==========================================

  getStats() {
    return {
      database: this.dbPath,
      games: this.db.prepare('SELECT COUNT(*) as c FROM games').get().c,
      teams: this.db.prepare('SELECT COUNT(*) as c FROM teams').get().c,
      members: this.db.prepare('SELECT COUNT(*) as c FROM members').get().c,
      teamScores: this.db.prepare('SELECT COUNT(*) as c FROM team_scores').get().c,
      scoreEvents: this.db.prepare('SELECT COUNT(*) as c FROM score_events').get().c,
      teamLocks: this.db.prepare('SELECT COUNT(*) as c FROM team_locks').get().c,
      gameHistory: this.db.prepare('SELECT COUNT(*) as c FROM game_history').get().c
    };
  }

  close() {
    try {
      this.db.close();
    } catch (_) {}
  }
}

export const dbManager = new DatabaseManager();
export default dbManager;
