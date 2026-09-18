/**
 * Structured Production Audit Logger for Realtime Connection & Game Events
 * Formats structured logs for Vercel, server runtimes, and log aggregation tools.
 * Explicitly excludes secrets, pins, passwords, and tokens.
 */

export function logRealtimeEvent(event, {
  gameId = null,
  teamId = null,
  socketId = null,
  state = null,
  details = {}
} = {}) {
  // Strip any accidental sensitive keys from details
  const cleanDetails = { ...details };
  delete cleanDetails.pin;
  delete cleanDetails.password;
  delete cleanDetails.sessionToken;
  delete cleanDetails.adminPin;

  const entry = {
    timestamp: new Date().toISOString(),
    event,
    gameId: gameId || null,
    teamId: teamId !== null && teamId !== undefined ? Number(teamId) : null,
    socketId: socketId || null,
    state: state || null,
    ...cleanDetails
  };

  console.log(`[REALTIME_AUDIT] ${JSON.stringify(entry)}`);
}
