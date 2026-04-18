// @ts-nocheck
/* =========================================================================
   Frantics — WebSocket protocol schema (Phase 28)
   -------------------------------------------------------------------------
   Single source of truth for every JSON message shape sent between the
   Node server (server/index.js) and browser clients (host + controller).
   Dual-mode: works as a classic browser script AND a Node CommonJS
   module.

   Pattern:
     - `MessageType`  — enum of all valid `type` field values.
     - `is<Name>(msg)` — predicate / type guard. Used at WS boundary
                         to reject malformed payloads before handling.
     - `make<Name>(...)` — pure constructor. Use in place of ad-hoc
                           `JSON.stringify({ type: '...', ... })`.
     - `validate(msg)` — generic gate: returns `null` if msg matches ANY
                         known type, otherwise returns the string reason.

   This is the contract. If a new message type is added, it goes HERE
   first. Server + client both fail loudly if a message doesn't match.
   ========================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Protocol = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---- Client → Server ----

  /** @typedef {'host' | 'join' | 'start' | 'restart' | 'selectGame' |
   *           'input' | 'ping' | 'leave' | 'pong'} ClientMessageType */

  /** @typedef {{ type: 'host' }} HostMessage */
  /** @typedef {{ type: 'join'; name?: string; character?: string;
   *              color?: string }} JoinMessage */
  /** @typedef {{ type: 'start' }} StartMessage */
  /** @typedef {{ type: 'restart' }} RestartMessage */
  /** @typedef {{ type: 'selectGame'; gameId: string }} SelectGameMessage */
  /** @typedef {{ type: 'input'; action: string; [key: string]: unknown
   *            }} InputMessage */
  /** @typedef {{ type: 'ping'; t?: number }} PingMessage */
  /** @typedef {{ type: 'leave' }} LeaveMessage */

  /** @typedef {HostMessage | JoinMessage | StartMessage | RestartMessage |
   *           SelectGameMessage | InputMessage | PingMessage | LeaveMessage
   *          } ClientMessage */

  // ---- Server → Client ----

  /** @typedef {'init' | 'state' | 'delta' | 'player_joined' |
   *           'player_left' | 'gameSelected' | 'game_over' |
   *           'eliminated' | 'powerup_collected' | 'shield_break' |
   *           'stumble' | 'near_miss' | 'fox_growl' | 'fox_sprint' |
   *           'fox_leap' | 'dramatic_finish' | 'sudden_death' |
   *           'teetering' | 'ground_pound' | 'gravity_bomb' | 'singed' |
   *           'push' | 'bump' | 'shieldBlock' | 'item_pickup' |
   *           'item_used' | 'lap_complete' | 'race_finish' |
   *           'drift_boost' | 'player_stunned' | 'tournamentStarted' |
   *           'tournamentRound' | 'tournamentStandings' | 'tournamentEnd' |
   *           'tournamentInfo' | 'pong'
   *          } ServerMessageType */

  /** @typedef {{ type: string; [key: string]: unknown }} ServerMessage */

  // ---- All known types ----

  var CLIENT_TYPES = [
    'host', 'join', 'start', 'restart', 'selectGame',
    'startTournament', 'input', 'ping', 'leave', 'pong',
  ];

  var SERVER_TYPES = [
    'init', 'state', 'delta', 'player_joined', 'player_left',
    'gameSelected', 'game_over', 'eliminated', 'powerup_collected',
    'shield_break', 'stumble', 'near_miss', 'fox_growl', 'fox_sprint',
    'fox_leap', 'dramatic_finish', 'sudden_death', 'teetering',
    'ground_pound', 'gravity_bomb', 'singed', 'push', 'bump',
    'shieldBlock', 'item_pickup', 'item_used', 'lap_complete',
    'race_finish', 'drift_boost', 'player_stunned',
    'tournamentStarted', 'tournamentRound', 'tournamentStandings',
    'tournamentEnd', 'tournamentInfo', 'pong',
  ];

  var ALL_TYPES = CLIENT_TYPES.concat(SERVER_TYPES);

  /** @type {Set<string>} */
  var KNOWN = new Set(ALL_TYPES);

  // ---- Predicates (type guards) ----

  function isObj(msg) { return msg !== null && typeof msg === 'object'; }
  function hasType(msg, t) { return isObj(msg) && msg.type === t; }

  /** @param {any} msg @returns {msg is HostMessage} */
  function isHost(msg) { return hasType(msg, 'host'); }
  /** @param {any} msg @returns {msg is JoinMessage} */
  function isJoin(msg) {
    return hasType(msg, 'join') &&
      (msg.name === undefined || typeof msg.name === 'string') &&
      (msg.character === undefined || typeof msg.character === 'string') &&
      (msg.color === undefined || typeof msg.color === 'string');
  }
  /** @param {any} msg @returns {msg is StartMessage} */
  function isStart(msg) { return hasType(msg, 'start'); }
  /** @param {any} msg @returns {msg is RestartMessage} */
  function isRestart(msg) { return hasType(msg, 'restart'); }
  /** @param {any} msg @returns {msg is SelectGameMessage} */
  function isSelectGame(msg) {
    return hasType(msg, 'selectGame') && typeof msg.gameId === 'string';
  }
  /** @param {any} msg @returns {msg is InputMessage} */
  function isInput(msg) {
    return hasType(msg, 'input') && typeof msg.action === 'string';
  }
  /** @param {any} msg @returns {msg is PingMessage} */
  function isPing(msg) { return hasType(msg, 'ping'); }
  /** @param {any} msg @returns {msg is LeaveMessage} */
  function isLeave(msg) { return hasType(msg, 'leave'); }

  /**
   * Generic validator. Returns null if the message matches ANY known
   * message shape, otherwise returns a string describing why it was
   * rejected. Use at WebSocket boundaries before dispatching.
   *
   * @param {any} msg
   * @returns {string | null}
   */
  function validate(msg) {
    if (!isObj(msg)) return 'not an object';
    if (typeof msg.type !== 'string') return 'missing type field';
    if (!KNOWN.has(msg.type)) return 'unknown type: ' + msg.type;
    // Per-shape validation for client-side messages that server
    // unconditionally dispatches on. Server-broadcast messages are
    // trusted and skipped (server is authoritative).
    if (msg.type === 'join' && !isJoin(msg))           return 'join: bad payload';
    if (msg.type === 'selectGame' && !isSelectGame(msg)) return 'selectGame: missing gameId';
    if (msg.type === 'input' && !isInput(msg))         return 'input: missing action';
    return null;
  }

  // ---- Constructors (client → server) ----

  /** @returns {HostMessage} */
  function makeHost() { return { type: 'host' }; }

  /**
   * @param {{ name?: string; character?: string; color?: string }} opts
   * @returns {JoinMessage}
   */
  function makeJoin(opts) {
    var msg = /** @type {JoinMessage} */ ({ type: 'join' });
    if (opts) {
      if (opts.name)      msg.name = opts.name;
      if (opts.character) msg.character = opts.character;
      if (opts.color)     msg.color = opts.color;
    }
    return msg;
  }

  /** @returns {StartMessage} */
  function makeStart() { return { type: 'start' }; }

  /** @returns {RestartMessage} */
  function makeRestart() { return { type: 'restart' }; }

  /** @typedef {{ type: 'startTournament' }} StartTournamentMessage */
  /** @returns {StartTournamentMessage} */
  function makeStartTournament() { return { type: 'startTournament' }; }

  /**
   * @param {string} gameId
   * @returns {SelectGameMessage}
   */
  function makeSelectGame(gameId) {
    return { type: 'selectGame', gameId: gameId };
  }

  /**
   * @param {string} action
   * @param {Record<string, unknown>} [extras]
   * @returns {InputMessage}
   */
  function makeInput(action, extras) {
    var msg = /** @type {InputMessage} */ ({ type: 'input', action: action });
    if (extras) {
      for (var k in extras) {
        if (Object.prototype.hasOwnProperty.call(extras, k)) {
          msg[k] = extras[k];
        }
      }
    }
    return msg;
  }

  /**
   * @param {number} [t]
   * @returns {PingMessage}
   */
  function makePing(t) {
    var msg = /** @type {PingMessage} */ ({ type: 'ping' });
    if (typeof t === 'number') msg.t = t;
    return msg;
  }

  /** @returns {LeaveMessage} */
  function makeLeave() { return { type: 'leave' }; }

  /**
   * Convenience: send a protocol-typed message over a WebSocket-like.
   * Accepts anything with a `.send()` method that takes a string.
   *
   * @param {{ send(data: string): void; readyState?: number }} ws
   * @param {ClientMessage | ServerMessage} msg
   */
  function send(ws, msg) {
    if (ws && ws.readyState !== 1 /* OPEN */ && ws.readyState !== undefined) return;
    ws.send(JSON.stringify(msg));
  }

  // ---- Public API ----

  return {
    // enums
    CLIENT_TYPES: CLIENT_TYPES.slice(),
    SERVER_TYPES: SERVER_TYPES.slice(),
    // predicates
    isHost: isHost,
    isJoin: isJoin,
    isStart: isStart,
    isRestart: isRestart,
    isSelectGame: isSelectGame,
    isInput: isInput,
    isPing: isPing,
    isLeave: isLeave,
    validate: validate,
    // constructors
    makeHost: makeHost,
    makeJoin: makeJoin,
    makeStart: makeStart,
    makeRestart: makeRestart,
    makeSelectGame: makeSelectGame,
    makeStartTournament: makeStartTournament,
    makeInput: makeInput,
    makePing: makePing,
    makeLeave: makeLeave,
    send: send,
  };
});
