// Phase 38e — virtual joystick for King of the Hill controller.
//
// Installs a fullscreen touch-drag handler that emits analog `move`
// messages with (vx, vy) floats in [-1, 1]. Shows a soft ring at the
// initial touch point and a smaller knob following the thumb.
// Throttled to 50 ms (20 Hz). Idles when touch is released.
//
// Usage:
//   const joystick = new HillJoystick({
//     onMove: (vx, vy) => sendMoveAnalog(vx, vy),
//     excludeSelector: '.gp-action, .gp-go-btn',
//   });
//   joystick.install();
//   // ...later when leaving KotH:
//   joystick.destroy();
(function (global) {
  'use strict';

  const SEND_INTERVAL_MS = 50;       // 20 Hz
  const MAX_DRAG_PX = 90;             // thumb reaches max vector at 90px from origin
  const DEADZONE_PX = 8;

  function HillJoystick(opts) {
    this.opts = opts || {};
    this._onStart = this._onStart.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onEnd = this._onEnd.bind(this);
    this._installed = false;
    this._touchId = null;
    this._origin = null;     // { x, y }
    this._last = null;       // latest thumb pos
    this._lastSendAt = 0;
    this._lastVx = 0; this._lastVy = 0;
    this._ring = null;
    this._knob = null;
  }

  HillJoystick.prototype.install = function () {
    if (this._installed) return;
    this._installed = true;
    document.addEventListener('touchstart', this._onStart, { passive: false });
    document.addEventListener('touchmove',  this._onMove,  { passive: false });
    document.addEventListener('touchend',   this._onEnd,   { passive: false });
    document.addEventListener('touchcancel',this._onEnd,   { passive: false });
  };

  HillJoystick.prototype.destroy = function () {
    if (!this._installed) return;
    this._installed = false;
    document.removeEventListener('touchstart', this._onStart);
    document.removeEventListener('touchmove',  this._onMove);
    document.removeEventListener('touchend',   this._onEnd);
    document.removeEventListener('touchcancel',this._onEnd);
    this._removeVisual();
  };

  HillJoystick.prototype._shouldIgnore = function (ev) {
    const excl = this.opts.excludeSelector;
    if (!excl) return false;
    const t = ev.target;
    if (!t || !t.closest) return false;
    return !!t.closest(excl);
  };

  HillJoystick.prototype._onStart = function (ev) {
    if (this._touchId !== null) return;
    if (this._shouldIgnore(ev)) return;
    const touch = ev.changedTouches && ev.changedTouches[0];
    if (!touch) return;
    ev.preventDefault();
    this._touchId = touch.identifier;
    this._origin = { x: touch.clientX, y: touch.clientY };
    this._last = { x: touch.clientX, y: touch.clientY };
    this._showVisual(touch.clientX, touch.clientY);
  };

  HillJoystick.prototype._onMove = function (ev) {
    if (this._touchId === null) return;
    const touch = this._findTouch(ev);
    if (!touch) return;
    ev.preventDefault();
    this._last = { x: touch.clientX, y: touch.clientY };
    this._updateKnob();
    this._maybeSend();
  };

  HillJoystick.prototype._onEnd = function (ev) {
    if (this._touchId === null) return;
    const touch = this._findTouch(ev);
    if (!touch) return;
    this._touchId = null;
    this._origin = null;
    this._last = null;
    this._lastVx = 0; this._lastVy = 0;
    this._removeVisual();
    // Tell caller the stick is released. Sending a zero-vector lets
    // the server friction damp the player back to standstill.
    if (this.opts.onMove) this.opts.onMove(0, 0);
  };

  HillJoystick.prototype._findTouch = function (ev) {
    const list = ev.changedTouches || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === this._touchId) return list[i];
    }
    return null;
  };

  HillJoystick.prototype._maybeSend = function () {
    const now = Date.now();
    if (now - this._lastSendAt < SEND_INTERVAL_MS) return;
    this._lastSendAt = now;
    if (!this._origin || !this._last) return;

    let dx = this._last.x - this._origin.x;
    let dy = this._last.y - this._origin.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < DEADZONE_PX) { dx = 0; dy = 0; }
    else {
      const clamp = Math.min(d, MAX_DRAG_PX) / MAX_DRAG_PX;
      dx = (dx / d) * clamp;
      dy = (dy / d) * clamp;
    }

    if (Math.abs(dx - this._lastVx) < 0.02 && Math.abs(dy - this._lastVy) < 0.02) return;
    this._lastVx = dx; this._lastVy = dy;
    if (this.opts.onMove) this.opts.onMove(dx, dy);
  };

  HillJoystick.prototype._showVisual = function (x, y) {
    if (typeof document === 'undefined') return;
    this._removeVisual();
    const ring = document.createElement('div');
    ring.style.cssText = [
      'position:fixed',
      'left:' + (x - 60) + 'px',
      'top:' + (y - 60) + 'px',
      'width:120px','height:120px',
      'border-radius:50%',
      'border:2px solid rgba(255,221,107,0.55)',
      'background:radial-gradient(circle at 50% 50%, rgba(255,230,140,0.15), rgba(0,0,0,0.25))',
      'box-shadow:0 0 20px rgba(255,200,100,0.3), inset 0 0 16px rgba(0,0,0,0.35)',
      'pointer-events:none',
      'z-index:99999',
      'transform:translateZ(0)',
    ].join(';');
    document.body.appendChild(ring);
    this._ring = ring;

    const knob = document.createElement('div');
    knob.style.cssText = [
      'position:fixed',
      'left:' + (x - 24) + 'px',
      'top:' + (y - 24) + 'px',
      'width:48px','height:48px',
      'border-radius:50%',
      'background:radial-gradient(circle at 35% 35%, #ffe08a, #a9761f)',
      'box-shadow:0 2px 8px rgba(0,0,0,0.5), inset 0 -3px 6px rgba(0,0,0,0.35)',
      'pointer-events:none',
      'z-index:100000',
      'transform:translateZ(0)',
    ].join(';');
    document.body.appendChild(knob);
    this._knob = knob;
  };

  HillJoystick.prototype._updateKnob = function () {
    if (!this._knob || !this._origin || !this._last) return;
    let dx = this._last.x - this._origin.x;
    let dy = this._last.y - this._origin.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > MAX_DRAG_PX) { dx = (dx / d) * MAX_DRAG_PX; dy = (dy / d) * MAX_DRAG_PX; }
    const kx = this._origin.x + dx;
    const ky = this._origin.y + dy;
    this._knob.style.left = (kx - 24) + 'px';
    this._knob.style.top  = (ky - 24) + 'px';
  };

  HillJoystick.prototype._removeVisual = function () {
    if (this._ring) { this._ring.remove(); this._ring = null; }
    if (this._knob) { this._knob.remove(); this._knob = null; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HillJoystick;
  } else {
    global.HillJoystick = HillJoystick;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
