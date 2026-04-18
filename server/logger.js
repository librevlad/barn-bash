// Phase 32 — structured logger for server-side.
// Emits JSON-per-line to stdout. Level filter via LOG_LEVEL env
// (debug | info | warn | error). Default: info.
//
// Usage:
//   const logger = require('./logger');
//   logger.info('player.joined', { playerId: 3, name: 'Alice' });
//   logger.warn('protocol.dropped', { reason: 'unknown type' });

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const threshold = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] || LEVELS.info;

/**
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} event
 * @param {Record<string, unknown>} [data]
 */
function emit(level, event, data) {
  if (LEVELS[level] < threshold) return;
  const line = {
    ts: new Date().toISOString(),
    level: level,
    event: event,
  };
  if (data && typeof data === 'object') {
    for (const k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        line[k] = data[k];
      }
    }
  }
  try {
    process.stdout.write(JSON.stringify(line) + '\n');
  } catch (e) {
    // Fall back to console if stdout write fails (should never happen
    // in Node, but CI environments sometimes wrap stdout).
    try { console.log(JSON.stringify(line)); } catch (_) { /* give up */ }
  }
}

module.exports = {
  debug: (event, data) => emit('debug', event, data),
  info:  (event, data) => emit('info',  event, data),
  warn:  (event, data) => emit('warn',  event, data),
  error: (event, data) => emit('error', event, data),
  LEVELS: LEVELS,
};
