// Phase 42 — KotH dash-charge button. A fixed circular touch target
// that the player holds to charge a dash, releases to unleash. The
// longer the hold (up to ~600 ms), the stronger the dash — server
// scales impulse and dash-phase length by the `power` field.
//
// Usage:
//   const dash = new HillDashButton({
//     onRelease: (power) => send({action:'dash', power}),
//   });
//   dash.install();   // mounts the button in document.body
//   dash.destroy();   // removes on game-end / leave
//
// Short tap (~80 ms): power 0.45 (baseline). Held for 600 ms: power 1.0.
(function (global) {
  'use strict';

  const CHARGE_MIN_MS = 80;
  const CHARGE_MAX_MS = 580;
  const POWER_MIN = 0.45;
  const POWER_MAX = 1.0;

  function HillDashButton(opts) {
    this.opts = opts || {};
    this._el = null;
    this._fill = null;
    this._label = null;
    this._touchId = null;
    this._startAt = 0;
    this._anim = null;

    this._onStart = this._onStart.bind(this);
    this._onEnd   = this._onEnd.bind(this);
    this._onCancel = this._onCancel.bind(this);
  }

  HillDashButton.prototype.install = function () {
    if (this._el) return;
    this._el = this._buildDom();
    document.body.appendChild(this._el);
    this._el.addEventListener('touchstart', this._onStart, { passive: false });
    this._el.addEventListener('touchend',   this._onEnd,   { passive: false });
    this._el.addEventListener('touchcancel',this._onCancel,{ passive: false });
  };

  HillDashButton.prototype.destroy = function () {
    if (!this._el) return;
    this._el.removeEventListener('touchstart', this._onStart);
    this._el.removeEventListener('touchend',   this._onEnd);
    this._el.removeEventListener('touchcancel',this._onCancel);
    if (this._anim) cancelAnimationFrame(this._anim);
    this._el.remove();
    this._el = null;
  };

  HillDashButton.prototype._buildDom = function () {
    // Phase 46 — cooldown + shielded styles injected once via <style>
    // tag on the first install (idempotent).
    if (!document.getElementById('hill-dash-styles')) {
      const style = document.createElement('style');
      style.id = 'hill-dash-styles';
      style.textContent =
        '.hill-dash-btn.cooling { filter: brightness(0.55) saturate(0.35); transition: filter 0.15s; }' +
        '.hill-dash-btn.cooling::after {' +
          'content: ""; position: absolute; inset: 0; border-radius: 50%;' +
          'background: conic-gradient(from -90deg, rgba(10,6,3,0.65) calc(var(--cd-pct, 0) * 1%), transparent 0);' +
          'pointer-events: none; z-index: 2;' +
        '}' +
        '.hill-dash-btn.shielded { filter: brightness(0.85) hue-rotate(180deg) saturate(0.7); }' +
        '.hill-dash-btn.shielded::before {' +
          'content: ""; position: absolute; inset: -6px; border-radius: 50%;' +
          'border: 2px dashed rgba(93,194,232,0.75);' +
          'animation: hillDashShield 3s linear infinite; pointer-events:none;' +
        '}' +
        '@keyframes hillDashShield { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    const wrap = document.createElement('div');
    wrap.className = 'hill-dash-btn';
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('aria-label', 'Dash (hold to charge)');
    wrap.style.cssText = [
      'position:fixed',
      'right:22px','bottom:28px',
      'width:106px','height:106px',
      'border-radius:50%',
      'background:radial-gradient(circle at 35% 28%, #ffe290 0%, #d5972b 55%, #8a5918 100%)',
      'box-shadow:inset 0 1px 0 rgba(255,250,220,0.75), inset 0 -3px 6px rgba(40,20,8,0.55), 0 0 0 3px #5a3512, 0 0 0 6px #2a1608, 0 6px 18px rgba(0,0,0,0.65)',
      'display:flex','align-items:center','justify-content:center',
      'color:#3b1a0a',
      'font-family:var(--font-display, sans-serif)',
      'font-size:19px','letter-spacing:2px',
      'text-shadow:0 1px 0 rgba(255,250,220,0.55)',
      'z-index:99998',
      'overflow:hidden',
      'transform:translateZ(0)',
      'user-select:none','-webkit-user-select:none',
      'touch-action:manipulation',
    ].join(';');

    const fill = document.createElement('div');
    fill.className = 'hill-dash-fill';
    fill.style.cssText = [
      'position:absolute','left:0','bottom:0','width:100%','height:0%',
      'background:linear-gradient(180deg, rgba(255,235,150,0.55) 0%, rgba(217,83,79,0.7) 100%)',
      'transition:none','pointer-events:none',
    ].join(';');
    wrap.appendChild(fill);
    this._fill = fill;

    const label = document.createElement('div');
    label.textContent = 'DASH';
    label.style.cssText = 'position:relative;z-index:1;pointer-events:none;';
    wrap.appendChild(label);
    this._label = label;

    return wrap;
  };

  HillDashButton.prototype._onStart = function (ev) {
    if (this._touchId !== null) return;
    const touch = ev.changedTouches && ev.changedTouches[0];
    if (!touch) return;
    ev.preventDefault();
    ev.stopPropagation();
    this._touchId = touch.identifier;
    this._startAt = Date.now();
    this._animate();
    if (navigator.vibrate) navigator.vibrate(20);
  };

  HillDashButton.prototype._onEnd = function (ev) {
    if (this._touchId === null) return;
    const touch = this._findTouch(ev);
    if (!touch) return;
    ev.preventDefault();
    ev.stopPropagation();
    const elapsed = Date.now() - this._startAt;
    this._touchId = null;
    if (this._anim) { cancelAnimationFrame(this._anim); this._anim = null; }

    // Compute power: linear ramp between CHARGE_MIN_MS and CHARGE_MAX_MS.
    const t = Math.max(0, Math.min(1, (elapsed - CHARGE_MIN_MS) / (CHARGE_MAX_MS - CHARGE_MIN_MS)));
    const power = POWER_MIN + t * (POWER_MAX - POWER_MIN);

    // Release flash.
    this._fill.style.transition = 'height 0.22s ease-out, opacity 0.22s ease-out';
    this._fill.style.height = '100%';
    this._fill.style.opacity = '0';
    setTimeout(() => {
      if (!this._fill) return;
      this._fill.style.transition = 'none';
      this._fill.style.height = '0%';
      this._fill.style.opacity = '1';
    }, 240);

    if (navigator.vibrate) navigator.vibrate(Math.round(40 + power * 80));
    if (this.opts.onRelease) this.opts.onRelease(power);
  };

  HillDashButton.prototype._onCancel = function () {
    this._touchId = null;
    if (this._anim) { cancelAnimationFrame(this._anim); this._anim = null; }
    if (this._fill) this._fill.style.height = '0%';
  };

  HillDashButton.prototype._findTouch = function (ev) {
    const list = ev.changedTouches || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].identifier === this._touchId) return list[i];
    }
    return null;
  };

  HillDashButton.prototype._animate = function () {
    const tick = () => {
      if (this._touchId === null) return;
      const elapsed = Date.now() - this._startAt;
      const t = Math.max(0, Math.min(1, (elapsed - CHARGE_MIN_MS) / (CHARGE_MAX_MS - CHARGE_MIN_MS)));
      if (this._fill) this._fill.style.height = (t * 100).toFixed(1) + '%';
      this._anim = requestAnimationFrame(tick);
    };
    tick();
  };

  // Phase 46 — cooldown indicator. Fraction ∈ [0, 1] where 1 means
  // "just dashed, full cooldown" and 0 means "ready". Draws a dark
  // clockwise sweep overlay over the face (conic gradient).
  HillDashButton.prototype.setCooldown = function (fraction) {
    if (!this._el) return;
    const pct = Math.max(0, Math.min(1, fraction)) * 100;
    if (pct <= 0) {
      this._el.style.setProperty('--cd-pct', '0');
      this._el.classList.remove('cooling');
    } else {
      this._el.style.setProperty('--cd-pct', pct.toFixed(1));
      this._el.classList.add('cooling');
    }
  };

  // Phase 46 — shield state visual. true = light-blue tint + scale
  // dimmer so the player sees they're shielded and the tap would
  // do nothing right now.
  HillDashButton.prototype.setShielded = function (on) {
    if (!this._el) return;
    this._el.classList.toggle('shielded', !!on);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HillDashButton;
  } else {
    global.HillDashButton = HillDashButton;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
