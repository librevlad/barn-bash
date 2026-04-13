/**
 * GameLoop.js — Fixed-timestep server loop + client render loop with interpolation.
 *
 * Server: const loop = new GameLoop(20); loop.start(tick => { updatePhysics(); });
 * Client: const render = new RenderLoop(canvas); render.start(dt => {}, (ctx, alpha) => {});
 */
(function (root) {
  'use strict';

  /* ======================================================================
   *  GameLoop — server-side fixed-timestep loop
   * ====================================================================== */

  /**
   * Fixed-timestep game loop driven by setInterval.
   * @param {number} [tickRate=20] Ticks per second (default 20 = 50 ms per tick).
   */
  function GameLoop(tickRate) {
    this._tickRate = tickRate || 20;
    this._tickMs = 1000 / this._tickRate;
    this._tick = 0;
    this._timerId = null;
  }

  /**
   * Start the loop. Calls `updateFn(tick)` every tick interval.
   * @param {function(number): void} updateFn Called with the current tick number.
   */
  GameLoop.prototype.start = function (updateFn) {
    if (this._timerId !== null) return;
    var self = this;
    this._tick = 0;
    this._timerId = setInterval(function () {
      self._tick++;
      updateFn(self._tick);
    }, this._tickMs);
  };

  /** Stop the loop. Safe to call multiple times. */
  GameLoop.prototype.stop = function () {
    if (this._timerId !== null) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
  };

  /** @returns {number} Current tick count. */
  GameLoop.prototype.getTick = function () { return this._tick; };

  /** @returns {number} Milliseconds per tick. */
  GameLoop.prototype.getTickMs = function () { return this._tickMs; };

  /* ======================================================================
   *  RenderLoop — client-side requestAnimationFrame loop
   * ====================================================================== */

  /**
   * Client render loop with DPR-aware canvas and frame-time tracking.
   * @param {HTMLCanvasElement} canvas Target canvas element.
   */
  function RenderLoop(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._rafId = null;
    this._delta = 0;
    this._clock = 0;
    this._fps = 60;
    this._fpsFrames = 0;
    this._fpsTime = 0;
    this._lastTime = 0;
    this._setupDPR();
  }

  /** @private Configure canvas for device pixel ratio. */
  RenderLoop.prototype._setupDPR = function () {
    var dpr = window.devicePixelRatio || 1;
    var rect = this._canvas.getBoundingClientRect();
    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);
    this._canvas.style.width = rect.width + 'px';
    this._canvas.style.height = rect.height + 'px';
  };

  /**
   * Start the render loop.
   * @param {function(number): void} updateFn Called with delta (seconds) for logic.
   * @param {function(CanvasRenderingContext2D, number): void} renderFn Called with ctx and interpolation alpha.
   */
  RenderLoop.prototype.start = function (updateFn, renderFn) {
    if (this._rafId !== null) return;
    var self = this;
    this._lastTime = performance.now();
    this._fpsTime = this._lastTime;
    this._fpsFrames = 0;

    function frame(now) {
      self._rafId = requestAnimationFrame(frame);

      var rawDelta = (now - self._lastTime) / 1000;
      self._delta = Math.min(rawDelta, 0.05); // cap to avoid spiral of death
      self._lastTime = now;
      self._clock += self._delta;

      // FPS rolling average — recalculate every 500 ms
      self._fpsFrames++;
      if (now - self._fpsTime >= 500) {
        self._fps = (self._fpsFrames / ((now - self._fpsTime) / 1000));
        self._fpsFrames = 0;
        self._fpsTime = now;
      }

      updateFn(self._delta);
      renderFn(self._ctx, self._delta);
    }

    this._rafId = requestAnimationFrame(frame);
  };

  /** Stop the render loop. */
  RenderLoop.prototype.stop = function () {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  };

  /** @returns {number} Frame delta in seconds, capped at 0.05. */
  RenderLoop.prototype.getDelta = function () { return this._delta; };

  /** @returns {number} Monotonic clock in seconds since start. */
  RenderLoop.prototype.getClock = function () { return this._clock; };

  /** @returns {number} Rolling average FPS. */
  RenderLoop.prototype.getFPS = function () { return Math.round(this._fps); };

  /* ======================================================================
   *  Export — Node.js module or browser global
   * ====================================================================== */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameLoop: GameLoop };
  }
  if (typeof window !== 'undefined') {
    root.GameLoop = GameLoop;
    root.RenderLoop = RenderLoop;
  }

})(typeof window !== 'undefined' ? window : this);
