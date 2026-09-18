import crypto from 'crypto';

export class TeamManager {
  constructor(onStateChanged = () => {}, teamCount = 4) {
    this.onStateChanged = onStateChanged;
    this.disconnectGraceMs = 30000; // 30-second reconnect grace period
    this.disconnectTimeouts = new Map(); // tid -> timeout handle (kept separate to keep teams pure JSON)
    this.teamCount = Math.min(Math.max(Number(teamCount) || 4, 4), 6);
    this.teams = this._initTeams(this.teamCount);
  }

  _initTeams(count) {
    const teams = {};
    for (let i = 1; i <= count; i++) {
      teams[i] = this._createEmptyTeam(i, `TEAM ${i}`);
    }
    return teams;
  }

  setTeamCount(count) {
    const validCount = Math.min(Math.max(Number(count) || 4, 4), 6);
    if (this.teamCount === validCount && Object.keys(this.teams).length === validCount) {
      return this.teamCount;
    }

    // Clear all pending timeouts
    for (const timeout of this.disconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.disconnectTimeouts.clear();

    this.teamCount = validCount;
    this.teams = this._initTeams(validCount);
    console.log(`[TeamManager] Team count set to ${validCount}`);
    return this.teamCount;
  }

  restoreTeams(savedTeams, teamCount) {
    if (teamCount) {
      this.teamCount = Math.min(Math.max(Number(teamCount) || 4, 4), 6);
    }
    this.teams = this._initTeams(this.teamCount);
    if (savedTeams && typeof savedTeams === 'object') {
      for (const [idStr, tData] of Object.entries(savedTeams)) {
        const id = Number(idStr);
        if (this.teams[id] && tData) {
          this.teams[id].sessionToken = tData.sessionToken || null;
          this.teams[id].gameSessionId = tData.gameSessionId || null;
          this.teams[id].joinedAt = tData.joinedAt || null;
          this.teams[id].connected = false;
          this.teams[id].activeSocketId = null;
        }
      }
    }
  }

  _createEmptyTeam(id, name) {
    return {
      id,
      name,
      activeSocketId: null,
      sessionToken: null,
      gameSessionId: null,
      connected: false,
      joinedAt: null
    };
  }

  // Explicit Fresh Join: Player chooses a team and clicks [ JOIN GAME ]
  joinTeam(teamId, socketId, currentGameSessionId) {
    const tid = Number(teamId);
    const team = this.teams[tid];

    if (!team) {
      return { success: false, error: 'Invalid team selection' };
    }

    // If team is already claimed by an active session in the current game
    if (team.sessionToken) {
      return {
        success: false,
        error: `TEAM ${tid} ALREADY JOINED`,
        alreadyJoined: true
      };
    }

    // Clear any pending disconnect timeout
    if (this.disconnectTimeouts.has(tid)) {
      clearTimeout(this.disconnectTimeouts.get(tid));
      this.disconnectTimeouts.delete(tid);
    }

    // Fresh join for an available team
    const newSessionToken = crypto.randomBytes(16).toString('hex');
    team.activeSocketId = socketId;
    team.sessionToken = newSessionToken;
    team.gameSessionId = currentGameSessionId;
    team.connected = true;
    team.joinedAt = Date.now();

    return {
      success: true,
      teamId: tid,
      sessionToken: newSessionToken,
      gameSessionId: currentGameSessionId,
      reconnected: false
    };
  }

  // Reconnect: Player refreshes or reconnects with existing sessionToken & gameSessionId
  reconnectTeam(teamId, sessionToken, gameSessionId, socketId, currentGameSessionId) {
    const tid = Number(teamId);
    const team = this.teams[tid];

    if (!team) {
      return { success: false, error: 'Invalid team selection' };
    }

    // Must match current game session
    if (!gameSessionId || gameSessionId !== currentGameSessionId) {
      return { success: false, error: 'Game session expired. Please choose a team.', staleSession: true };
    }

    // Must match the team's claimed session token
    if (!team.sessionToken || team.sessionToken !== sessionToken) {
      return { success: false, error: 'Session invalid or seat was released.', staleSession: true };
    }

    // Valid reconnect within grace period! Cancel grace timer
    if (this.disconnectTimeouts.has(tid)) {
      clearTimeout(this.disconnectTimeouts.get(tid));
      this.disconnectTimeouts.delete(tid);
    }

    const previousSocketId = team.activeSocketId;
    team.activeSocketId = socketId;
    team.connected = true;

    return {
      success: true,
      teamId: tid,
      sessionToken: team.sessionToken,
      gameSessionId: currentGameSessionId,
      previousSocketId,
      reconnected: true
    };
  }

  handleDisconnect(socketId) {
    for (const team of Object.values(this.teams)) {
      if (team.activeSocketId === socketId) {
        team.connected = false;
        team.activeSocketId = null;

        if (this.disconnectTimeouts.has(team.id)) {
          clearTimeout(this.disconnectTimeouts.get(team.id));
          this.disconnectTimeouts.delete(team.id);
        }

        // Start 30-second reconnect grace period
        const timeout = setTimeout(() => {
          this.disconnectTimeouts.delete(team.id);
          this.releaseTeam(team.id);
          this.onStateChanged();
        }, this.disconnectGraceMs);

        this.disconnectTimeouts.set(team.id, timeout);

        return team.id;
      }
    }
    return null;
  }

  getTeamBySocket(socketId) {
    for (const team of Object.values(this.teams)) {
      if (team.activeSocketId === socketId) {
        return team;
      }
    }
    return null;
  }

  // Admin control: force release/reset a team seat
  releaseTeam(teamId) {
    const tid = Number(teamId);
    const team = this.teams[tid];
    if (team) {
      if (this.disconnectTimeouts.has(tid)) {
        clearTimeout(this.disconnectTimeouts.get(tid));
        this.disconnectTimeouts.delete(tid);
      }
      team.activeSocketId = null;
      team.sessionToken = null;
      team.gameSessionId = null;
      team.connected = false;
      team.joinedAt = null;
      return true;
    }
    return false;
  }

  resetAllTeams() {
    for (const tid of Object.keys(this.teams)) {
      this.releaseTeam(tid);
    }
  }

  // Public status for login page & lobby
  getPublicTeamStatus() {
    const res = {};
    for (const [tid, team] of Object.entries(this.teams)) {
      const isClaimed = Boolean(team.sessionToken);
      res[tid] = {
        id: team.id,
        name: team.name,
        connected: Boolean(team.connected),
        claimed: isClaimed,
        available: !isClaimed
      };
    }
    return res;
  }
}

