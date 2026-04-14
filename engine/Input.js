/**
 * Input.js — Unified gesture input manager for phone controller.
 *
 * Handles tap, swipe (with velocity), hold, and hold-release via pointer events.
 * Supports excludeSelector to avoid intercepting onboarding inputs/buttons.
 *
 * Usage:
 *   const input = new InputManager(document.body, { excludeSelector: '#onboarding' });
 *   input.onTap(e => send('jump'));
 *   input.onSwipe(({ direction, dx, dy, velocity }) => send('steer', direction));
 *   input.onHold(() => send('shield'));
 *   input.onHoldRelease(() => send('shieldEnd'));
 *   // cleanup:
 *   input.destroy();
 */
(function (root) {
  'use strict';

  /**
   * Gesture input manager bound to a DOM element.
   * @constructor
   * @param {HTMLElement} element - Element to listen on (typically document.body).
   * @param {Object} [options]
   * @param {number}  [options.swipeThreshold=35]  - Minimum distance in px to register as swipe.
   * @param {number}  [options.tapMaxDist=25]       - Maximum move distance for a tap.
   * @param {number}  [options.tapMaxTime=280]      - Maximum pointer-down duration (ms) for a tap.
   * @param {number}  [options.holdTime=450]        - Duration (ms) before hold triggers.
   * @param {string}  [options.excludeSelector]     - CSS selector — skip events originating from matching elements.
   */
  function InputManager(element, options) {
    var opts = options || {};
    this._el = element;
    this._swipeThreshold = opts.swipeThreshold || 35;
    this._tapMaxDist = opts.tapMaxDist || 25;
    this._tapMaxTime = opts.tapMaxTime || 280;
    this._holdTime = opts.holdTime || 450;
    this._excludeSelector = opts.excludeSelector || null;

    this._enabled = true;
    this._tapCb = null;
    this._swipeCb = null;
    this._holdCb = null;
    this._holdReleaseCb = null;
    this._pressStartCb = null;
    this._pressEndCb = null;

    this._ptrStart = null;
    this._ptrStartTime = 0;
    this._holdTimer = null;
    this._isHolding = false;

    // Bind handlers so we can remove them later
    this._onDown = this._handleDown.bind(this);
    this._onMove = this._handleMove.bind(this);
    this._onUp = this._handleUp.bind(this);
    this._onCancel = this._handleCancel.bind(this);

    this._el.addEventListener('pointerdown', this._onDown);
    this._el.addEventListener('pointermove', this._onMove);
    this._el.addEventListener('pointerup', this._onUp);
    this._el.addEventListener('pointercancel', this._onCancel);
  }

  /* ---- Public callback registration ---- */

  /** @param {function(PointerEvent): void} cb */
  InputManager.prototype.onTap = function (cb) { this._tapCb = cb; return this; };

  /** @param {function({direction: string, dx: number, dy: number, velocity: number}): void} cb */
  InputManager.prototype.onSwipe = function (cb) { this._swipeCb = cb; return this; };

  /** @param {function(): void} cb */
  InputManager.prototype.onHold = function (cb) { this._holdCb = cb; return this; };

  /** @param {function(): void} cb */
  InputManager.prototype.onHoldRelease = function (cb) { this._holdReleaseCb = cb; return this; };

  /** @param {function(): void} cb — fires immediately on pointerdown */
  InputManager.prototype.onPressStart = function (cb) { this._pressStartCb = cb; return this; };

  /** @param {function(): void} cb — fires on pointerup/cancel regardless of gesture type */
  InputManager.prototype.onPressEnd = function (cb) { this._pressEndCb = cb; return this; };

  /* ---- Enable / disable ---- */

  InputManager.prototype.enable = function () { this._enabled = true; };
  InputManager.prototype.disable = function () {
    this._enabled = false;
    this._reset();
  };

  /** Remove all listeners and null out callbacks. */
  InputManager.prototype.destroy = function () {
    this._el.removeEventListener('pointerdown', this._onDown);
    this._el.removeEventListener('pointermove', this._onMove);
    this._el.removeEventListener('pointerup', this._onUp);
    this._el.removeEventListener('pointercancel', this._onCancel);
    this._reset();
    this._tapCb = null;
    this._swipeCb = null;
    this._holdCb = null;
    this._holdReleaseCb = null;
  };

  /* ---- Internal event handlers ---- */

  /** @param {PointerEvent} e */
  InputManager.prototype._handleDown = function (e) {
    if (!this._enabled) return;
    if (this._shouldExclude(e)) return;
    e.preventDefault();

    this._ptrStart = { x: e.clientX, y: e.clientY };
    this._ptrStartTime = Date.now();
    this._isHolding = false;

    if (this._pressStartCb) this._pressStartCb();

    var self = this;
    this._holdTimer = setTimeout(function () {
      self._isHolding = true;
      if (self._holdCb) self._holdCb();
    }, this._holdTime);
  };

  /** @param {PointerEvent} e */
  InputManager.prototype._handleMove = function (e) {
    if (!this._ptrStart) return;
    var dx = e.clientX - this._ptrStart.x;
    var dy = e.clientY - this._ptrStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > this._swipeThreshold) {
      clearTimeout(this._holdTimer);
    }
  };

  /** @param {PointerEvent} e */
  InputManager.prototype._handleUp = function (e) {
    clearTimeout(this._holdTimer);
    if (!this._ptrStart) return;

    if (this._isHolding) {
      if (this._holdReleaseCb) this._holdReleaseCb();
      this._ptrStart = null;
      this._isHolding = false;
      if (this._pressEndCb) this._pressEndCb();
      return;
    }

    var dx = e.clientX - this._ptrStart.x;
    var dy = e.clientY - this._ptrStart.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var elapsed = Date.now() - this._ptrStartTime;

    if (dist < this._tapMaxDist && elapsed < this._tapMaxTime) {
      // Tap
      if (this._tapCb) this._tapCb(e);
    } else if (dist >= this._swipeThreshold) {
      // Swipe
      var direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }
      var velocity = elapsed > 0 ? dist / elapsed : 0; // px/ms
      if (this._swipeCb) {
        this._swipeCb({ direction: direction, dx: dx, dy: dy, velocity: velocity });
      }
    }

    this._ptrStart = null;
    this._isHolding = false;
    if (this._pressEndCb) this._pressEndCb();
  };

  InputManager.prototype._handleCancel = function () {
    if (this._ptrStart && this._pressEndCb) this._pressEndCb();
    this._reset();
  };

  /* ---- Helpers ---- */

  /**
   * Check if the event target matches the exclude selector.
   * @param {PointerEvent} e
   * @returns {boolean}
   */
  InputManager.prototype._shouldExclude = function (e) {
    if (!this._excludeSelector) return false;
    var tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (e.target.closest && e.target.closest(this._excludeSelector)) return true;
    return false;
  };

  /** Clear in-progress gesture state. */
  InputManager.prototype._reset = function () {
    clearTimeout(this._holdTimer);
    this._ptrStart = null;
    this._isHolding = false;
  };

  /* ---- Export ---- */
  if (typeof window !== 'undefined') {
    root.InputManager = InputManager;
  }

})(typeof window !== 'undefined' ? window : this);
