/**
 * Tween.js - Tween/animation system with easing functions.
 * Client-side only. Animates any numeric property on any object.
 * @module Tween
 */
(function () {
  'use strict';

  // ========== Easing Functions ==========

  /** @namespace Ease */
  var Ease = {
    /** @param {number} t - Progress [0,1]. @returns {number} */
    linear: function (t) { return t; },

    inQuad: function (t) { return t * t; },

    outQuad: function (t) { return t * (2 - t); },

    inOutQuad: function (t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },

    inCubic: function (t) { return t * t * t; },

    outCubic: function (t) {
      var u = t - 1;
      return u * u * u + 1;
    },

    inOutCubic: function (t) {
      return t < 0.5
        ? 4 * t * t * t
        : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },

    inExpo: function (t) {
      return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
    },

    outExpo: function (t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    },

    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    },

    outBounce: function (t) {
      var n1 = 7.5625;
      var d1 = 2.75;
      if (t < 1 / d1) {
        return n1 * t * t;
      } else if (t < 2 / d1) {
        t -= 1.5 / d1;
        return n1 * t * t + 0.75;
      } else if (t < 2.5 / d1) {
        t -= 2.25 / d1;
        return n1 * t * t + 0.9375;
      } else {
        t -= 2.625 / d1;
        return n1 * t * t + 0.984375;
      }
    },

    outBack: function (t) {
      var c1 = 1.70158;
      var c3 = c1 + 1;
      var u = t - 1;
      return 1 + c3 * u * u * u + c1 * u * u;
    }
  };

  // ========== Tween ==========

  /**
   * Animates numeric properties on a target object over time.
   * @param {Object}   target     - Object whose properties are animated.
   * @param {Object}   properties - Map of property names to target values.
   * @param {number}   duration   - Duration in seconds.
   * @param {Function} [easing=Ease.linear] - Easing function.
   * @param {Function} [onComplete]         - Called when the tween finishes.
   * @constructor
   */
  function Tween(target, properties, duration, easing, onComplete) {
    this._target = target;
    this._duration = Math.max(duration, 0.001);
    this._easing = easing || Ease.linear;
    this._onComplete = onComplete || null;
    this._elapsed = 0;
    this._active = true;

    // Snapshot start values
    this._props = [];
    for (var key in properties) {
      if (properties.hasOwnProperty(key)) {
        this._props.push({
          key: key,
          start: (typeof target[key] === 'number') ? target[key] : 0,
          end: properties[key]
        });
      }
    }
  }

  /**
   * Advance the tween. Returns false when the tween has completed.
   * @param {number} dt - Delta time in seconds.
   * @returns {boolean} true if still active, false if finished.
   */
  Tween.prototype.update = function (dt) {
    if (!this._active) return false;

    this._elapsed += dt;
    var raw = Math.min(this._elapsed / this._duration, 1);
    var t = this._easing(raw);

    for (var i = 0; i < this._props.length; i++) {
      var p = this._props[i];
      this._target[p.key] = p.start + (p.end - p.start) * t;
    }

    if (raw >= 1) {
      this._active = false;
      if (this._onComplete) this._onComplete();
      return false;
    }
    return true;
  };

  /** Cancel the tween without calling onComplete. */
  Tween.prototype.cancel = function () {
    this._active = false;
    this._onComplete = null;
  };

  /** @returns {boolean} */
  Tween.prototype.isActive = function () {
    return this._active;
  };

  // ========== TweenManager ==========

  /** @type {Tween[]} */
  var _tweens = [];

  /** @namespace TweenManager */
  var TweenManager = {};

  /**
   * Create and register a new tween.
   * @param {Object}   target   - Object to animate.
   * @param {Object}   props    - Property targets, e.g. `{ x: 100, alpha: 0 }`.
   * @param {number}   duration - Duration in seconds.
   * @param {Function} [easing=Ease.linear] - Easing function from Ease.
   * @param {Function} [onComplete]         - Callback on finish.
   * @returns {Tween}
   */
  TweenManager.tween = function (target, props, duration, easing, onComplete) {
    var tw = new Tween(target, props, duration, easing, onComplete);
    _tweens.push(tw);
    return tw;
  };

  /**
   * Schedule a callback after a delay (pure timer, no property animation).
   * @param {number}   duration - Delay in seconds.
   * @param {Function} callback - Called when the delay elapses.
   * @returns {Tween}
   */
  TweenManager.delay = function (duration, callback) {
    var dummy = {};
    return TweenManager.tween(dummy, {}, duration, Ease.linear, callback);
  };

  /**
   * Advance all active tweens. Call once per frame.
   * @param {number} dt - Delta time in seconds.
   */
  TweenManager.update = function (dt) {
    for (var i = _tweens.length - 1; i >= 0; i--) {
      if (!_tweens[i].update(dt)) {
        _tweens.splice(i, 1);
      }
    }
  };

  /**
   * Cancel and remove all tweens targeting a specific object.
   * @param {Object} target
   */
  TweenManager.killAll = function (target) {
    for (var i = _tweens.length - 1; i >= 0; i--) {
      if (_tweens[i]._target === target) {
        _tweens[i].cancel();
        _tweens.splice(i, 1);
      }
    }
  };

  /**
   * Number of currently active tweens.
   * @returns {number}
   */
  TweenManager.count = function () {
    return _tweens.length;
  };

  // ========== Export ==========
  window.Ease = Ease;
  window.Tween = Tween;
  window.TweenManager = TweenManager;
})();
