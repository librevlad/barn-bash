/**
 * Net.js — Network optimization for WebSocket communication.
 *
 * Server: delta-compressed state broadcasts at a capped rate.
 * Client: state reconstruction, interpolation buffer, latency tracking.
 *
 * Both sides: IIFE with Node.js/browser dual export.
 *
 * Server usage:
 *   const { NetServer } = require('./engine/Net');
 *   const net = new NetServer(wss, { broadcastRate: 20 });
 *   // in game loop:
 *   net.broadcast(gameState);        // delta-compressed, rate-limited
 *   net.broadcastEvent({ type: 'eliminated', playerId: 3 }); // immediate
 *
 * Client usage:
 *   const client = new NetClient('ws://192.168.1.5:3000');
 *   client.onState(state => render(state));
 *   client.onEvent(evt => handleEvent(evt));
 *   client.connect().then(() => client.send({ type: 'join', name: 'Ace' }));
 */
(function (root) {
  'use strict';

  /* ======================================================================
   *  Shared: delta compression utilities
   * ====================================================================== */

  /**
   * Compute a delta between two state snapshots. Only changed/added keys
   * are included. Nested objects (one level, e.g. players map) are recursed.
   * Deleted keys are represented as null.
   * @param {Object|null} prev - Previous state (null on first broadcast).
   * @param {Object} next      - Current state.
   * @returns {Object} Delta object with only changed fields.
   */
  function computeDelta(prev, next) {
    if (!prev) return deepCopy(next);
    var delta = {};
    var hasChange = false;
    var key;

    // Detect changed or added keys
    for (key in next) {
      if (!Object.prototype.hasOwnProperty.call(next, key)) continue;
      var nv = next[key];
      var pv = prev[key];

      if (nv !== null && typeof nv === 'object' && !Array.isArray(nv)) {
        // Recurse one level (e.g. players object containing per-player objects)
        if (pv !== null && typeof pv === 'object' && !Array.isArray(pv)) {
          var sub = computeDelta(pv, nv);
          if (sub !== null) {
            delta[key] = sub;
            hasChange = true;
          }
        } else {
          delta[key] = deepCopy(nv);
          hasChange = true;
        }
      } else if (Array.isArray(nv)) {
        // Arrays: compare via JSON (cheap for small game arrays)
        if (!arraysEqual(pv, nv)) {
          delta[key] = nv;
          hasChange = true;
        }
      } else {
        if (pv !== nv) {
          delta[key] = nv;
          hasChange = true;
        }
      }
    }

    // Detect deleted keys
    for (key in prev) {
      if (!Object.prototype.hasOwnProperty.call(prev, key)) continue;
      if (!Object.prototype.hasOwnProperty.call(next, key)) {
        delta[key] = null;
        hasChange = true;
      }
    }

    return hasChange ? delta : null;
  }

  /**
   * Apply a delta to a base state, producing the updated state in-place.
   * @param {Object} base  - State to mutate.
   * @param {Object} delta - Delta from computeDelta.
   * @returns {Object} The mutated base (same reference).
   */
  function applyDelta(base, delta) {
    for (var key in delta) {
      if (!Object.prototype.hasOwnProperty.call(delta, key)) continue;
      var dv = delta[key];

      if (dv === null) {
        delete base[key];
      } else if (typeof dv === 'object' && !Array.isArray(dv)) {
        if (typeof base[key] !== 'object' || base[key] === null || Array.isArray(base[key])) {
          base[key] = {};
        }
        applyDelta(base[key], dv);
      } else {
        base[key] = dv;
      }
    }
    return base;
  }

  /** Shallow-ish copy (handles nested plain objects and arrays). */
  function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.slice();
    var out = {};
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        out[k] = deepCopy(obj[k]);
      }
    }
    return out;
  }

  /** Fast array equality for small arrays (numbers, strings). */
  function arraysEqual(a, b) {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /* ======================================================================
   *  NetServer — server-side broadcast optimizer
   * ====================================================================== */

  /**
   * Wraps a WebSocketServer with delta compression and rate-limited broadcasts.
   * @constructor
   * @param {WebSocket.Server} wss - The ws WebSocketServer instance.
   * @param {Object} [options]
   * @param {boolean} [options.deltaCompression=true] - Enable delta compression.
   * @param {number}  [options.broadcastRate=10]      - Max state broadcasts per second.
   */
  function NetServer(wss, options) {
    var opts = options || {};
    this._wss = wss;
    this._deltaEnabled = opts.deltaCompression !== false;
    this._broadcastRate = opts.broadcastRate || 10;
    this._minInterval = 1000 / this._broadcastRate;
    this._previousState = null;
    this._lastBroadcastTime = 0;
  }

  /**
   * Broadcast game state to all connected clients. Delta-compresses against
   * the previous state and respects the rate limit.
   * @param {Object} state - Full game state snapshot.
   */
  NetServer.prototype.broadcast = function (state) {
    var now = Date.now();
    if (now - this._lastBroadcastTime < this._minInterval) return;
    this._lastBroadcastTime = now;

    var payload;
    if (this._deltaEnabled && this._previousState) {
      var delta = computeDelta(this._previousState, state);
      if (delta === null) return; // no changes
      payload = JSON.stringify({ type: 'delta', d: delta, t: now });
    } else {
      payload = JSON.stringify({ type: 'state', s: state, t: now });
    }

    this._previousState = deepCopy(state);
    this._sendAll(payload);
  };

  /**
   * Broadcast an event immediately to all clients (no compression, no rate limit).
   * Events are discrete messages (eliminations, power-ups, etc.).
   * @param {Object} event - Event object (must include a `type` field).
   */
  NetServer.prototype.broadcastEvent = function (event) {
    var payload = JSON.stringify(event);
    this._sendAll(payload);
  };

  /**
   * Reset compression state. Call when switching games or resetting.
   */
  NetServer.prototype.reset = function () {
    this._previousState = null;
  };

  /** Internal: send payload to all open clients. */
  NetServer.prototype._sendAll = function (payload) {
    var clients = this._wss.clients;
    clients.forEach(function (client) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(payload);
      }
    });
  };

  /* ======================================================================
   *  NetClient — client-side state reconstruction + interpolation
   * ====================================================================== */

  /**
   * Client network layer with state reconstruction, interpolation, and stats.
   * @constructor
   * @param {string} url - WebSocket URL (e.g. 'ws://192.168.1.5:3000').
   */
  function NetClient(url) {
    this._url = url;
    /** @type {WebSocket|null} */
    this._ws = null;

    // State buffer for interpolation (stores last two full states)
    this._statePrev = null;
    this._stateNext = null;
    this._stateTime = 0;      // timestamp of stateNext arrival
    this._statePrevTime = 0;   // timestamp of statePrev arrival

    // Callbacks
    this._onStateCb = null;
    this._onEventCb = null;
    this._onConnectCb = null;
    this._onDisconnectCb = null;

    // Latency tracking (ping/pong)
    this._latency = 0;
    this._pingInterval = null;
    this._lastPingTime = 0;

    // Message rate
    this._msgCount = 0;
    this._msgRate = 0;
    this._msgRateTimer = 0;
    this._msgRateInterval = null;
  }

  /**
   * Open the WebSocket connection.
   * @returns {Promise<void>} Resolves when connected, rejects on error.
   */
  NetClient.prototype.connect = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
      try {
        self._ws = new WebSocket(self._url);
      } catch (e) {
        reject(e);
        return;
      }

      self._ws.onopen = function () {
        self._startStats();
        if (self._onConnectCb) self._onConnectCb();
        resolve();
      };

      self._ws.onerror = function (err) {
        reject(err);
      };

      self._ws.onmessage = function (evt) {
        self._msgCount++;
        self._handleMessage(evt.data);
      };

      self._ws.onclose = function () {
        self._stopStats();
        if (self._onDisconnectCb) self._onDisconnectCb();
      };
    });
  };

  /**
   * Send a message to the server.
   * @param {Object} msg - Message object (will be JSON-stringified).
   */
  NetClient.prototype.send = function (msg) {
    if (this._ws && this._ws.readyState === 1) {
      this._ws.send(JSON.stringify(msg));
    }
  };

  /** @param {function(Object): void} handler */
  NetClient.prototype.onState = function (handler) { this._onStateCb = handler; return this; };

  /** @param {function(Object): void} handler */
  NetClient.prototype.onEvent = function (handler) { this._onEventCb = handler; return this; };

  /** @param {function(): void} handler */
  NetClient.prototype.onConnect = function (handler) { this._onConnectCb = handler; return this; };

  /** @param {function(): void} handler */
  NetClient.prototype.onDisconnect = function (handler) { this._onDisconnectCb = handler; return this; };

  /**
   * Get interpolation data for smooth rendering between server ticks.
   * @returns {{ prev: Object|null, next: Object|null, alpha: number }}
   *   prev/next are the two most recent full states; alpha is 0-1 progress
   *   between them based on elapsed time vs. tick interval.
   */
  NetClient.prototype.getInterpolation = function () {
    if (!this._stateNext) {
      return { prev: null, next: null, alpha: 0 };
    }
    if (!this._statePrev) {
      return { prev: this._stateNext, next: this._stateNext, alpha: 1 };
    }
    var tickInterval = this._stateTime - this._statePrevTime;
    if (tickInterval <= 0) {
      return { prev: this._statePrev, next: this._stateNext, alpha: 1 };
    }
    var elapsed = Date.now() - this._stateTime;
    var alpha = Math.min(1, Math.max(0, elapsed / tickInterval));
    return { prev: this._statePrev, next: this._stateNext, alpha: alpha };
  };

  /**
   * @returns {number} Estimated round-trip latency in milliseconds.
   */
  NetClient.prototype.getLatency = function () {
    return this._latency;
  };

  /**
   * @returns {number} Messages received per second (rolling average).
   */
  NetClient.prototype.getMessageRate = function () {
    return this._msgRate;
  };

  /**
   * Close the connection and clean up.
   */
  NetClient.prototype.close = function () {
    this._stopStats();
    if (this._ws) {
      this._ws.onclose = null; // prevent double-fire of disconnect callback
      this._ws.close();
      this._ws = null;
    }
  };

  /* ---- Internal message handling ---- */

  /** @param {string} raw */
  NetClient.prototype._handleMessage = function (raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'state') {
      // Full state snapshot
      this._pushState(msg.s, msg.t);
      if (this._onStateCb) this._onStateCb(this._stateNext);
    } else if (msg.type === 'delta') {
      // Delta update — apply to current state
      if (this._stateNext) {
        var updated = deepCopy(this._stateNext);
        applyDelta(updated, msg.d);
        this._pushState(updated, msg.t);
      } else {
        // No base state yet — treat delta as full state (best effort)
        this._pushState(msg.d, msg.t);
      }
      if (this._onStateCb) this._onStateCb(this._stateNext);
    } else if (msg.type === 'pong') {
      // Latency measurement response
      if (this._lastPingTime > 0) {
        this._latency = Date.now() - this._lastPingTime;
      }
    } else {
      // All other messages are events
      if (this._onEventCb) this._onEventCb(msg);
    }
  };

  /**
   * Push a new full state into the interpolation buffer.
   * @param {Object} state
   * @param {number} serverTime
   */
  NetClient.prototype._pushState = function (state, serverTime) {
    this._statePrev = this._stateNext;
    this._statePrevTime = this._stateTime;
    this._stateNext = state;
    this._stateTime = Date.now();
  };

  /* ---- Stats ---- */

  NetClient.prototype._startStats = function () {
    var self = this;

    // Message rate counter — measure every second
    this._msgRateInterval = setInterval(function () {
      self._msgRate = self._msgCount;
      self._msgCount = 0;
    }, 1000);

    // Ping for latency — every 2 seconds
    this._pingInterval = setInterval(function () {
      if (self._ws && self._ws.readyState === 1) {
        self._lastPingTime = Date.now();
        self._ws.send(JSON.stringify({ type: 'ping', t: self._lastPingTime }));
      }
    }, 2000);
  };

  NetClient.prototype._stopStats = function () {
    if (this._msgRateInterval) {
      clearInterval(this._msgRateInterval);
      this._msgRateInterval = null;
    }
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
  };

  /* ======================================================================
   *  Export — Node.js module + browser globals
   * ====================================================================== */
  var exports = {
    NetServer: NetServer,
    NetClient: NetClient,
    computeDelta: computeDelta,
    applyDelta: applyDelta,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exports;
  }
  if (typeof window !== 'undefined') {
    root.NetServer = NetServer;
    root.NetClient = NetClient;
    root.NetUtils = { computeDelta: computeDelta, applyDelta: applyDelta };
  }

})(typeof window !== 'undefined' ? window : this);
