/**
 * Audio.js — Dynamic music engine with layered themes and synthesis passthrough.
 *
 * Wraps the existing Sound system with multi-layer music (base, tension, action)
 * and crossfade control driven by game intensity.
 *
 * Usage:
 *   const audio = new AudioEngine();
 *   audio.playTheme('escapeFox');
 *   audio.setTension(0.7);    // danger close — tension layer louder
 *   audio.setIntensity(1.0);  // action layer full volume
 *   audio.play('jump', { volume: 0.8, pitch: 1.2 });
 *   audio.stopTheme(2.0);     // 2s fade out
 */
(function (root) {
  'use strict';

  /* ======================================================================
   *  Note frequency table
   * ====================================================================== */
  var N = {
    C3: 131, D3: 147, E3: 165, F3: 175, G3: 196, A3: 220, B3: 247,
    C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494,
    C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880
  };

  /* ======================================================================
   *  Theme definitions — base + tension + action layers
   * ====================================================================== */

  /**
   * Each layer is an array of { notes, type, vol } objects defining a voice.
   * notes: frequency array (0 = rest), type: oscillator type, vol: base gain.
   */
  AudioEngine.THEMES = {
    escapeFox: {
      bpm: 140,
      filterFreq: 800,
      layers: {
        base: [
          { notes: [N.E3, N.E3, N.G3, N.A3, N.E3, N.E3, N.B3, N.A3], type: 'triangle', vol: 0.10 },
          { notes: [N.E4, N.G4, N.A4, N.G4, N.E4, N.D4, N.E4, 0],    type: 'square',   vol: 0.06 },
          { notes: [N.E4, N.G4, N.B4, N.E5],                          type: 'sine',     vol: 0.03 },
        ],
        tension: [
          { notes: [N.B3, N.B3, N.E4, N.B3, N.A3, N.A3, N.E4, N.A3], type: 'sawtooth', vol: 0.05 },
          { notes: [N.E5, N.D5, N.E5, N.B4],                          type: 'square',   vol: 0.04 },
        ],
        action: [
          { notes: [N.E3, N.G3, N.E3, N.G3, N.A3, N.B3, N.A3, N.G3], type: 'sawtooth', vol: 0.07 },
          { notes: [N.E5, N.G5, N.E5, N.G5],                          type: 'sine',     vol: 0.05 },
        ],
      },
    },

    hillKing: {
      bpm: 120,
      filterFreq: 600,
      layers: {
        base: [
          { notes: [N.A3, N.A3, N.C4, N.D4, N.F3, N.F3, N.A3, N.G3], type: 'sawtooth', vol: 0.09 },
          { notes: [N.A4, N.C5, N.D5, N.C5, N.A4, 0, N.G4, N.A4],    type: 'sine',     vol: 0.06 },
          { notes: [N.A3, N.C4, N.E4, N.A4],                          type: 'triangle', vol: 0.03 },
        ],
        tension: [
          { notes: [N.D4, N.F4, N.A4, N.F4, N.D4, N.C4, N.D4, N.F4], type: 'square',   vol: 0.05 },
          { notes: [N.A4, N.D5, N.A4, N.C5],                          type: 'sine',     vol: 0.04 },
        ],
        action: [
          { notes: [N.A3, N.C4, N.A3, N.C4, N.D4, N.E4, N.D4, N.C4], type: 'sawtooth', vol: 0.07 },
          { notes: [N.A5, N.E5, N.A5, N.C5],                          type: 'sine',     vol: 0.04 },
        ],
      },
    },

    meteor: {
      bpm: 100,
      filterFreq: 500,
      layers: {
        base: [
          { notes: [N.D3, N.D3, N.F3, N.A3, N.D3, N.D3, N.C3, N.D3], type: 'sawtooth', vol: 0.08 },
          { notes: [N.D4, N.F4, N.A4, 0, N.D4, N.E4, N.F4, N.D4],    type: 'triangle', vol: 0.06 },
          { notes: [N.D3, N.F3, N.A3, N.D4],                          type: 'sine',     vol: 0.03 },
        ],
        tension: [
          { notes: [N.A3, N.D4, N.F4, N.A3, N.G3, N.D4, N.F4, N.G3], type: 'square',   vol: 0.05 },
          { notes: [N.D5, N.A4, N.D5, N.F5],                          type: 'sine',     vol: 0.04 },
        ],
        action: [
          { notes: [N.D3, N.F3, N.D3, N.A3, N.D3, N.F3, N.D3, N.A3], type: 'sawtooth', vol: 0.08 },
          { notes: [N.D5, N.F5, N.A5, N.D5],                          type: 'sine',     vol: 0.05 },
        ],
      },
    },

    race: {
      bpm: 160,
      filterFreq: 900,
      layers: {
        base: [
          { notes: [N.C3, N.C3, N.E3, N.G3, N.A3, N.A3, N.G3, N.E3], type: 'square',   vol: 0.09 },
          { notes: [N.C5, N.E5, N.G5, N.E5, N.C5, N.D5, N.E5, N.C5], type: 'sine',     vol: 0.06 },
          { notes: [N.C4, N.E4, N.G4, N.C5],                          type: 'triangle', vol: 0.03 },
        ],
        tension: [
          { notes: [N.G3, N.C4, N.E4, N.G3, N.A3, N.C4, N.E4, N.A3], type: 'square',   vol: 0.05 },
          { notes: [N.C5, N.G5, N.E5, N.C5],                          type: 'sine',     vol: 0.04 },
        ],
        action: [
          { notes: [N.C3, N.E3, N.C3, N.E3, N.G3, N.A3, N.G3, N.E3], type: 'sawtooth', vol: 0.08 },
          { notes: [N.C5, N.E5, N.G5, N.A5],                          type: 'sine',     vol: 0.05 },
        ],
      },
    },

    lobby: {
      bpm: 80,
      filterFreq: 400,
      layers: {
        base: [
          { notes: [N.C3, 0, N.G3, 0, N.A3, 0, N.F3, 0],             type: 'triangle', vol: 0.06 },
          { notes: [N.E4, N.G4, N.C5, 0, N.A4, N.G4, N.E4, 0],       type: 'sine',     vol: 0.05 },
          { notes: [N.C4, N.E4, N.G4, N.C5],                          type: 'sine',     vol: 0.02 },
        ],
        tension: [
          { notes: [N.F3, N.A3, N.C4, N.F3, N.G3, N.B3, N.D4, N.G3], type: 'triangle', vol: 0.03 },
        ],
        action: [
          { notes: [N.C3, N.G3, N.C3, N.G3],                          type: 'triangle', vol: 0.04 },
        ],
      },
    },
  };

  /* ======================================================================
   *  AudioEngine
   * ====================================================================== */

  /**
   * Dynamic music engine with layered themes and synthesis primitives.
   * @constructor
   */
  function AudioEngine() {
    /** @type {AudioContext|null} */
    this._ctx = null;
    /** @type {GainNode|null} */
    this._masterGain = null;

    // Layer gain nodes (created on first playTheme)
    /** @type {GainNode|null} */
    this._baseGain = null;
    /** @type {GainNode|null} */
    this._tensionGain = null;
    /** @type {GainNode|null} */
    this._actionGain = null;
    /** @type {BiquadFilterNode|null} */
    this._filter = null;

    this._tension = 0;   // 0-1
    this._intensity = 0;  // 0-1

    this._currentTheme = null;
    this._musicInterval = null;
    this._step = 0;
    this._unlocked = false;
    this._fadeTimer = null;

    // Auto-unlock on first user interaction
    var self = this;
    var unlockEvents = ['click', 'touchstart', 'pointerdown'];
    function autoUnlock() {
      self.ensure();
      self._unlocked = true;
      for (var i = 0; i < unlockEvents.length; i++) {
        document.removeEventListener(unlockEvents[i], autoUnlock);
      }
    }
    if (typeof document !== 'undefined') {
      for (var i = 0; i < unlockEvents.length; i++) {
        document.addEventListener(unlockEvents[i], autoUnlock, { once: false, passive: true });
      }
    }
  }

  /* ---- AudioContext management ---- */

  /**
   * Ensure AudioContext is created and resumed. Safe to call repeatedly.
   */
  AudioEngine.prototype.ensure = function () {
    if (!this._ctx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      this._ctx = new Ctor();
      this._masterGain = this._ctx.createGain();
      this._masterGain.gain.value = 1.0;
      this._masterGain.connect(this._ctx.destination);
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  };

  /**
   * @returns {boolean} Whether the AudioContext is running.
   */
  AudioEngine.prototype.isReady = function () {
    return this._ctx !== null && this._ctx.state === 'running';
  };

  /* ---- Music layer control ---- */

  /**
   * Start a theme with all three layers. Base plays at full volume;
   * tension and action start silent and respond to setTension/setIntensity.
   * @param {string} name - Theme key from AudioEngine.THEMES.
   */
  AudioEngine.prototype.playTheme = function (name) {
    this.stopTheme(0);
    this.ensure();

    var theme = AudioEngine.THEMES[name];
    if (!theme) return;

    this._currentTheme = theme;
    this._step = 0;
    this._tension = 0;
    this._intensity = 0;

    var ctx = this._ctx;

    // Filter shared by all music voices
    this._filter = ctx.createBiquadFilter();
    this._filter.type = 'lowpass';
    this._filter.frequency.value = theme.filterFreq || 600;
    this._filter.connect(this._masterGain);

    // Per-layer gain nodes
    this._baseGain = ctx.createGain();
    this._baseGain.gain.setValueAtTime(0, ctx.currentTime);
    this._baseGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 2);
    this._baseGain.connect(this._filter);

    this._tensionGain = ctx.createGain();
    this._tensionGain.gain.value = 0;
    this._tensionGain.connect(this._filter);

    this._actionGain = ctx.createGain();
    this._actionGain.gain.value = 0;
    this._actionGain.connect(this._filter);

    // Start sequencer
    var self = this;
    var beatMs = 60000 / theme.bpm;

    this._musicInterval = setInterval(function () {
      if (!self._ctx || self._ctx.state === 'suspended') return;
      self._playBeat(theme);
      self._step++;
    }, beatMs);
  };

  /**
   * Internal: play one beat across all layers.
   * @param {Object} theme
   */
  AudioEngine.prototype._playBeat = function (theme) {
    var ctx = this._ctx;
    var now = ctx.currentTime;
    var beatSec = 60 / theme.bpm;
    var layers = theme.layers;

    this._playLayerBeat(layers.base, this._baseGain, now, beatSec);
    this._playLayerBeat(layers.tension, this._tensionGain, now, beatSec);
    this._playLayerBeat(layers.action, this._actionGain, now, beatSec);
  };

  /**
   * Internal: play one beat for a single layer's voices.
   * @param {Array} voices - Array of voice definitions.
   * @param {GainNode} layerGain - Gain node for this layer.
   * @param {number} now - AudioContext.currentTime.
   * @param {number} beatSec - Beat duration in seconds.
   */
  AudioEngine.prototype._playLayerBeat = function (voices, layerGain, now, beatSec) {
    if (!voices || !layerGain) return;
    var ctx = this._ctx;
    var step = this._step;

    for (var v = 0; v < voices.length; v++) {
      var voice = voices[v];
      var noteIdx = step % voice.notes.length;
      var freq = voice.notes[noteIdx];
      if (!freq) continue;

      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = voice.type || 'sine';
      osc.frequency.value = freq;

      var dur = beatSec * 0.85;
      gain.gain.setValueAtTime(voice.vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(layerGain);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    }
  };

  /**
   * Stop current theme with optional fade-out.
   * @param {number} [fadeOut=0.5] - Fade duration in seconds.
   */
  AudioEngine.prototype.stopTheme = function (fadeOut) {
    if (this._fadeTimer) {
      clearTimeout(this._fadeTimer);
      this._fadeTimer = null;
    }
    if (this._musicInterval) {
      clearInterval(this._musicInterval);
      this._musicInterval = null;
    }

    if (!this._ctx || !this._baseGain) {
      this._currentTheme = null;
      return;
    }

    var fadeDur = fadeOut !== undefined ? fadeOut : 0.5;
    var now = this._ctx.currentTime;

    // Ramp all layer gains to zero
    if (this._baseGain) {
      this._baseGain.gain.setValueAtTime(this._baseGain.gain.value, now);
      this._baseGain.gain.linearRampToValueAtTime(0, now + fadeDur);
    }
    if (this._tensionGain) {
      this._tensionGain.gain.setValueAtTime(this._tensionGain.gain.value, now);
      this._tensionGain.gain.linearRampToValueAtTime(0, now + fadeDur);
    }
    if (this._actionGain) {
      this._actionGain.gain.setValueAtTime(this._actionGain.gain.value, now);
      this._actionGain.gain.linearRampToValueAtTime(0, now + fadeDur);
    }

    // Disconnect after fade completes
    var self = this;
    var cleanupMs = Math.max(50, fadeDur * 1000 + 100);
    this._fadeTimer = setTimeout(function () {
      self._disconnectLayers();
      self._fadeTimer = null;
    }, cleanupMs);

    this._currentTheme = null;
  };

  /** Internal: disconnect and null layer nodes. */
  AudioEngine.prototype._disconnectLayers = function () {
    try { if (this._baseGain) this._baseGain.disconnect(); } catch (e) { /* already disconnected */ }
    try { if (this._tensionGain) this._tensionGain.disconnect(); } catch (e) { /* already disconnected */ }
    try { if (this._actionGain) this._actionGain.disconnect(); } catch (e) { /* already disconnected */ }
    try { if (this._filter) this._filter.disconnect(); } catch (e) { /* already disconnected */ }
    this._baseGain = null;
    this._tensionGain = null;
    this._actionGain = null;
    this._filter = null;
  };

  /**
   * Set the tension level. Crossfades the tension layer.
   * @param {number} value - 0 (calm) to 1 (max tension).
   */
  AudioEngine.prototype.setTension = function (value) {
    this._tension = Math.max(0, Math.min(1, value));
    if (this._tensionGain && this._ctx) {
      var now = this._ctx.currentTime;
      this._tensionGain.gain.setValueAtTime(this._tensionGain.gain.value, now);
      this._tensionGain.gain.linearRampToValueAtTime(this._tension, now + 0.15);
    }
  };

  /**
   * Set the action intensity. Crossfades the action layer.
   * @param {number} value - 0 (quiet) to 1 (full action).
   */
  AudioEngine.prototype.setIntensity = function (value) {
    this._intensity = Math.max(0, Math.min(1, value));
    if (this._actionGain && this._ctx) {
      var now = this._ctx.currentTime;
      this._actionGain.gain.setValueAtTime(this._actionGain.gain.value, now);
      this._actionGain.gain.linearRampToValueAtTime(this._intensity, now + 0.15);
    }
  };

  /* ---- Sound effects ---- */

  /**
   * Play a one-shot synthesized sound effect.
   * @param {string} name - Effect name (matches existing Sound.effects keys).
   * @param {Object} [options]
   * @param {number} [options.volume=0.25]  - Gain multiplier.
   * @param {number} [options.pitch=1]      - Playback rate / frequency multiplier.
   * @param {number} [options.pan=0]        - Stereo pan (-1 left, 0 center, 1 right).
   */
  AudioEngine.prototype.play = function (name, options) {
    // Delegate to the existing Sound singleton if available
    if (typeof Sound !== 'undefined' && Sound.play) {
      Sound.play(name);
      return;
    }
    // Fallback: no-op if Sound system not loaded
  };

  /* ---- Synthesis passthrough ---- */

  /**
   * Play a single tone. Direct passthrough to Web Audio.
   * @param {number} freq    - Frequency in Hz.
   * @param {number} dur     - Duration in seconds.
   * @param {string} [type]  - Oscillator type ('sine', 'square', 'sawtooth', 'triangle').
   * @param {number} [vol]   - Volume (0-1).
   */
  AudioEngine.prototype.tone = function (freq, dur, type, vol) {
    this.ensure();
    var ctx = this._ctx;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol || 0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this._masterGain);
    osc.start(t);
    osc.stop(t + dur);
  };

  /**
   * Play filtered white noise. Useful for percussive / impact effects.
   * @param {number} dur         - Duration in seconds.
   * @param {number} [vol]       - Volume (0-1).
   * @param {number} [filterFreq] - Low-pass cutoff in Hz.
   */
  AudioEngine.prototype.noise = function (dur, vol, filterFreq) {
    this.ensure();
    var ctx = this._ctx;
    var t = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 2000;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    src.start(t);
  };

  /* ---- Export ---- */
  if (typeof window !== 'undefined') {
    root.AudioEngine = AudioEngine;
  }

})(typeof window !== 'undefined' ? window : this);
