/**
 * Particles.js — Pooled particle system v2 with color/size interpolation,
 * rotation, glow, multiple shapes, persistent emitters, and preset configs.
 *
 * Replaces client-shared/effects.js particle subsystem. Client-side only.
 *
 * Usage:
 *   const ps = new ParticleSystem(500);
 *   ps.burst(100, 200, 20, ParticleSystem.PRESETS.SPARKS);
 *   const emitter = ps.emit(50, 50, ParticleSystem.PRESETS.FIRE);
 *   // each frame:
 *   ps.update(dt);
 *   ps.draw(ctx);
 */
(function (root) {
  'use strict';

  var TAU = Math.PI * 2;

  /* ======================================================================
   *  Particle — single pooled particle
   * ====================================================================== */

  /**
   * @constructor
   * A single particle managed by the pool. Never construct directly — the
   * system pre-allocates these and recycles them via reset().
   */
  function Particle() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.life = 0;
    this.maxLife = 0;
    this.size = 0;
    this.sizeEnd = 0;
    this.colorR = 255;
    this.colorG = 255;
    this.colorB = 255;
    this.colorEndR = -1;
    this.colorEndG = -1;
    this.colorEndB = -1;
    this.rotation = 0;
    this.rotSpeed = 0;
    this.gravity = 0;
    this.friction = 1;
    this.glow = 0;
    this.shape = 'circle';
  }

  /**
   * Initialize a particle from a config object. Called by the system on spawn.
   * @param {number} x - World X.
   * @param {number} y - World Y.
   * @param {Object} cfg - Particle configuration (from preset or custom).
   */
  Particle.prototype.reset = function (x, y, cfg) {
    this.active = true;
    this.x = x;
    this.y = y;

    var speed = cfg.speed || 2;
    var angle = cfg.angle !== undefined ? cfg.angle : Math.random() * TAU;
    var spread = cfg.spread !== undefined ? cfg.spread : TAU;
    var dir = angle - spread * 0.5 + Math.random() * spread;
    var mag = speed * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(dir) * mag;
    this.vy = Math.sin(dir) * mag;

    var life = cfg.life || 0.6;
    this.life = life * (0.7 + Math.random() * 0.3);
    this.maxLife = this.life;

    var size = cfg.size || 3;
    this.size = size * (0.6 + Math.random() * 0.4);
    this.sizeEnd = cfg.sizeEnd !== undefined ? cfg.sizeEnd : -1;

    // Parse 'r,g,b' color strings
    var c = parseColor(cfg.color || '255,255,255');
    this.colorR = c[0];
    this.colorG = c[1];
    this.colorB = c[2];

    if (cfg.colorEnd) {
      var ce = parseColor(cfg.colorEnd);
      this.colorEndR = ce[0];
      this.colorEndG = ce[1];
      this.colorEndB = ce[2];
    } else {
      this.colorEndR = -1;
      this.colorEndG = -1;
      this.colorEndB = -1;
    }

    if (cfg.rotation === true) {
      this.rotation = Math.random() * TAU;
      this.rotSpeed = (Math.random() - 0.5) * 8;
    } else {
      this.rotation = 0;
      this.rotSpeed = 0;
    }

    this.gravity = cfg.gravity || 0;
    this.friction = cfg.friction !== undefined ? cfg.friction : 0.98;
    this.glow = cfg.glow || 0;
    this.shape = cfg.shape || 'circle';
  };

  /**
   * Advance particle physics by dt seconds.
   * @param {number} dt - Delta time in seconds.
   * @returns {boolean} true if still alive, false if expired.
   */
  Particle.prototype.update = function (dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return false;
    }
    this.vy += this.gravity * dt * 60;
    this.vx *= Math.pow(this.friction, dt * 60);
    this.vy *= Math.pow(this.friction, dt * 60);
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.rotation += this.rotSpeed * dt;
    return true;
  };

  /**
   * Render the particle onto a Canvas2D context.
   * @param {CanvasRenderingContext2D} ctx
   */
  Particle.prototype.draw = function (ctx) {
    var t = 1 - this.life / this.maxLife; // 0 at birth, 1 at death
    var alpha = Math.min(1, this.life / this.maxLife * 2); // fade in last half

    // Interpolate size
    var size;
    if (this.sizeEnd >= 0) {
      size = this.size + (this.sizeEnd - this.size) * t;
    } else {
      size = this.size * (this.life / this.maxLife); // default: shrink to zero
    }
    if (size < 0.3) return;

    // Interpolate color
    var r, g, b;
    if (this.colorEndR >= 0) {
      r = Math.round(this.colorR + (this.colorEndR - this.colorR) * t);
      g = Math.round(this.colorG + (this.colorEndG - this.colorG) * t);
      b = Math.round(this.colorB + (this.colorEndB - this.colorB) * t);
    } else {
      r = this.colorR;
      g = this.colorG;
      b = this.colorB;
    }

    ctx.globalAlpha = alpha * 0.85;

    if (this.glow > 0) {
      ctx.shadowBlur = this.glow;
      ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.8)';
    }

    var fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    ctx.fillStyle = fillStyle;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, size), 0, TAU);
      ctx.fill();
    } else if (this.shape === 'rect') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.fillRect(-size * 0.5, -size * 0.5, size, size * 0.6);
      ctx.restore();
    } else if (this.shape === 'triangle') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(-size * 0.866, size * 0.5);
      ctx.lineTo(size * 0.866, size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (this.glow > 0) {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }
  };

  /* ======================================================================
   *  ParticleEmitter — persistent particle source
   * ====================================================================== */

  /**
   * A persistent emitter that spawns particles at a steady rate.
   * @constructor
   * @param {Object} config - Particle config applied to each spawn.
   */
  function ParticleEmitter(config) {
    this.x = 0;
    this.y = 0;
    this.rate = config.rate || 10; // particles per second
    this.config = config;
    this.active = true;
    this._accumulator = 0;
  }

  /**
   * Tick the emitter, spawning particles into the given system.
   * @param {number} dt - Delta time in seconds.
   * @param {ParticleSystem} system - Target system to spawn into.
   */
  ParticleEmitter.prototype.update = function (dt, system) {
    if (!this.active) return;
    this._accumulator += dt * this.rate;
    while (this._accumulator >= 1) {
      this._accumulator -= 1;
      system._spawn(this.x, this.y, this.config);
    }
  };

  /** Pause emission. Existing particles continue their life. */
  ParticleEmitter.prototype.stop = function () {
    this.active = false;
  };

  /** Resume emission. */
  ParticleEmitter.prototype.start = function () {
    this.active = true;
  };

  /* ======================================================================
   *  ParticleSystem — pool manager, update/draw coordinator
   * ====================================================================== */

  /**
   * Manages a pre-allocated pool of particles and a list of emitters.
   * @constructor
   * @param {number} [maxParticles=500] - Pool capacity. No GC pressure at runtime.
   */
  function ParticleSystem(maxParticles) {
    this._max = maxParticles || 500;
    /** @type {Particle[]} */
    this._pool = new Array(this._max);
    for (var i = 0; i < this._max; i++) {
      this._pool[i] = new Particle();
    }
    /** @type {ParticleEmitter[]} */
    this._emitters = [];
  }

  /**
   * Internal: find and activate an inactive particle from the pool.
   * @param {number} x
   * @param {number} y
   * @param {Object} config
   * @returns {Particle|null}
   */
  ParticleSystem.prototype._spawn = function (x, y, config) {
    for (var i = 0; i < this._max; i++) {
      if (!this._pool[i].active) {
        this._pool[i].reset(x, y, config);
        return this._pool[i];
      }
    }
    // Pool full — steal the oldest (first active found with lowest life ratio)
    var oldest = null;
    var oldestRatio = 1;
    for (var j = 0; j < this._max; j++) {
      var ratio = this._pool[j].life / this._pool[j].maxLife;
      if (ratio < oldestRatio) {
        oldestRatio = ratio;
        oldest = this._pool[j];
      }
    }
    if (oldest) oldest.reset(x, y, config);
    return oldest;
  };

  /**
   * Create a persistent emitter attached to this system.
   * @param {number} x - Initial world X.
   * @param {number} y - Initial world Y.
   * @param {Object} config - Particle configuration (preset or custom). Includes `rate`.
   * @returns {ParticleEmitter}
   */
  ParticleSystem.prototype.emit = function (x, y, config) {
    var emitter = new ParticleEmitter(config);
    emitter.x = x;
    emitter.y = y;
    this._emitters.push(emitter);
    return emitter;
  };

  /**
   * One-shot burst of particles.
   * @param {number} x - World X center.
   * @param {number} y - World Y center.
   * @param {number} count - Number of particles to spawn.
   * @param {Object} config - Particle configuration.
   */
  ParticleSystem.prototype.burst = function (x, y, count, config) {
    for (var i = 0; i < count; i++) {
      this._spawn(x, y, config);
    }
  };

  /**
   * Advance all active particles and emitters.
   * @param {number} dt - Delta time in seconds.
   */
  ParticleSystem.prototype.update = function (dt) {
    // Update emitters (spawn new particles)
    for (var e = this._emitters.length - 1; e >= 0; e--) {
      this._emitters[e].update(dt, this);
      // Prune stopped emitters with no reason to keep
    }

    // Update particles
    for (var i = 0; i < this._max; i++) {
      if (this._pool[i].active) {
        this._pool[i].update(dt);
      }
    }
  };

  /**
   * Render all active particles.
   * @param {CanvasRenderingContext2D} ctx
   */
  ParticleSystem.prototype.draw = function (ctx) {
    for (var i = 0; i < this._max; i++) {
      if (this._pool[i].active) {
        this._pool[i].draw(ctx);
      }
    }
    ctx.globalAlpha = 1;
  };

  /**
   * Deactivate all particles and remove all emitters.
   */
  ParticleSystem.prototype.clear = function () {
    for (var i = 0; i < this._max; i++) {
      this._pool[i].active = false;
    }
    this._emitters.length = 0;
  };

  /**
   * Remove a specific emitter from this system.
   * @param {ParticleEmitter} emitter
   */
  ParticleSystem.prototype.removeEmitter = function (emitter) {
    var idx = this._emitters.indexOf(emitter);
    if (idx !== -1) this._emitters.splice(idx, 1);
  };

  /**
   * @returns {number} Number of currently active particles.
   */
  ParticleSystem.prototype.activeCount = function () {
    var n = 0;
    for (var i = 0; i < this._max; i++) {
      if (this._pool[i].active) n++;
    }
    return n;
  };

  /* ======================================================================
   *  Presets — ready-to-use particle configurations
   * ====================================================================== */

  /** @type {Object<string, Object>} */
  ParticleSystem.PRESETS = {
    DUST:     { speed: 1,   life: 0.4, size: 3,  gravity: 0,    color: '180,160,140', sizeEnd: 0, friction: 0.95 },
    SPARKS:   { speed: 5,   life: 0.3, size: 2,  gravity: 0.1,  color: '255,200,50',  glow: 6 },
    CONFETTI: { speed: 4,   life: 2,   size: 6,  gravity: 3,    shape: 'rect', rotation: true, friction: 0.99 },
    SMOKE:    { speed: 0.5, life: 1,   size: 8,  sizeEnd: 20,   gravity: -0.5, color: '200,200,200', colorEnd: '100,100,100', friction: 0.96 },
    FIRE:     { speed: 2,   life: 0.6, size: 5,  sizeEnd: 1,    gravity: -2,   color: '255,100,20',  colorEnd: '255,50,0',    glow: 8 },
    TRAIL:    { speed: 0.2, life: 0.3, size: 3,  sizeEnd: 0,    gravity: 0 },
    GLOW:     { speed: 0,   life: 0.5, size: 10, sizeEnd: 15,   gravity: 0,    glow: 12, color: '255,255,255' },
  };

  /* ======================================================================
   *  Helpers
   * ====================================================================== */

  /** @type {Object<string, number[]>} */
  var _colorCache = {};

  /**
   * Parse an 'r,g,b' string into a [r, g, b] array. Cached for hot paths.
   * @param {string} str
   * @returns {number[]}
   */
  function parseColor(str) {
    if (_colorCache[str]) return _colorCache[str];
    var parts = str.split(',');
    var result = [
      parseInt(parts[0], 10) || 0,
      parseInt(parts[1], 10) || 0,
      parseInt(parts[2], 10) || 0
    ];
    _colorCache[str] = result;
    return result;
  }

  /* ======================================================================
   *  Export — browser global
   * ====================================================================== */
  if (typeof window !== 'undefined') {
    root.Particle = Particle;
    root.ParticleEmitter = ParticleEmitter;
    root.ParticleSystem = ParticleSystem;
  }

})(typeof window !== 'undefined' ? window : this);
