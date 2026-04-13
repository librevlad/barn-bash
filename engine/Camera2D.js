/**
 * Camera2D.js - Universal 2D camera for Canvas2D rendering.
 * Provides smooth follow, group tracking, screen shake, and coordinate conversion.
 * @module Camera2D
 */
(function () {
  'use strict';

  /**
   * A 2D camera that manages viewport translation, zoom, and effects.
   * @param {number} width  - Viewport width in pixels.
   * @param {number} height - Viewport height in pixels.
   */
  function Camera2D(width, height) {
    /** Current camera center in world coordinates. */
    this.x = 0;
    this.y = 0;

    /** Target position for smooth follow. */
    this._targetX = 0;
    this._targetY = 0;
    this._smoothing = 0;

    /** Zoom level (1 = default). */
    this._zoom = 1;

    /** Viewport dimensions. */
    this._viewW = width;
    this._viewH = height;

    /** Shake state. */
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;
    this._shakeOffsetX = 0;
    this._shakeOffsetY = 0;
  }

  // ---------- Following ----------

  /**
   * Smoothly follow a world-space point.
   * @param {number} x          - World X to follow.
   * @param {number} y          - World Y to follow.
   * @param {number} [smoothing=0.1] - Lerp factor per frame (0.05 = sluggish, 0.2 = snappy).
   */
  Camera2D.prototype.follow = function (x, y, smoothing) {
    this._targetX = x;
    this._targetY = y;
    this._smoothing = (smoothing !== undefined) ? smoothing : 0.1;
  };

  /**
   * Auto-zoom and center to fit all entities with padding.
   * Each entity must expose numeric `x` and `y` properties.
   * @param {Array<{x: number, y: number}>} entities - Objects to frame.
   * @param {number} [padding=100] - Extra world-unit margin around the group.
   */
  Camera2D.prototype.followGroup = function (entities, padding) {
    if (!entities || entities.length === 0) return;
    padding = (padding !== undefined) ? padding : 100;

    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < entities.length; i++) {
      var e = entities[i];
      if (e.x < minX) minX = e.x;
      if (e.y < minY) minY = e.y;
      if (e.x > maxX) maxX = e.x;
      if (e.y > maxY) maxY = e.y;
    }

    var cx = (minX + maxX) * 0.5;
    var cy = (minY + maxY) * 0.5;
    var spanX = (maxX - minX) + padding * 2;
    var spanY = (maxY - minY) + padding * 2;

    var zoomX = this._viewW / Math.max(spanX, 1);
    var zoomY = this._viewH / Math.max(spanY, 1);
    var desiredZoom = Math.min(zoomX, zoomY);

    this._targetX = cx;
    this._targetY = cy;
    this._zoom += (desiredZoom - this._zoom) * 0.1;
  };

  // ---------- Transform ----------

  /** @param {number} x @param {number} y */
  Camera2D.prototype.setPosition = function (x, y) {
    this.x = x;
    this.y = y;
    this._targetX = x;
    this._targetY = y;
    this._smoothing = 0;
  };

  /** @param {number} zoom */
  Camera2D.prototype.setZoom = function (zoom) {
    this._zoom = Math.max(zoom, 0.001);
  };

  /** @returns {number} */
  Camera2D.prototype.getZoom = function () {
    return this._zoom;
  };

  // ---------- Effects ----------

  /**
   * Start a screen shake effect.
   * @param {number} intensity - Max pixel offset.
   * @param {number} duration  - Duration in seconds.
   */
  Camera2D.prototype.shake = function (intensity, duration) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeElapsed = 0;
  };

  // ---------- Coordinate conversion ----------

  /**
   * Convert world coordinates to screen (canvas pixel) coordinates.
   * @param {number} wx @param {number} wy
   * @returns {{x: number, y: number}}
   */
  Camera2D.prototype.worldToScreen = function (wx, wy) {
    return {
      x: (wx - this.x) * this._zoom + this._viewW * 0.5 + this._shakeOffsetX,
      y: (wy - this.y) * this._zoom + this._viewH * 0.5 + this._shakeOffsetY
    };
  };

  /**
   * Convert screen (canvas pixel) coordinates to world coordinates.
   * @param {number} sx @param {number} sy
   * @returns {{x: number, y: number}}
   */
  Camera2D.prototype.screenToWorld = function (sx, sy) {
    return {
      x: (sx - this._shakeOffsetX - this._viewW * 0.5) / this._zoom + this.x,
      y: (sy - this._shakeOffsetY - this._viewH * 0.5) / this._zoom + this.y
    };
  };

  /**
   * Get the visible world-space bounding rectangle.
   * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
   */
  Camera2D.prototype.getBounds = function () {
    var hw = (this._viewW * 0.5) / this._zoom;
    var hh = (this._viewH * 0.5) / this._zoom;
    return {
      left:   this.x - hw,
      top:    this.y - hh,
      right:  this.x + hw,
      bottom: this.y + hh,
      width:  hw * 2,
      height: hh * 2
    };
  };

  // ---------- Canvas integration ----------

  /**
   * Apply camera transform to a Canvas2D context.
   * Call before drawing world-space objects. Pushes context state.
   * @param {CanvasRenderingContext2D} ctx
   */
  Camera2D.prototype.applyTransform = function (ctx) {
    ctx.save();
    ctx.translate(
      this._viewW * 0.5 + this._shakeOffsetX,
      this._viewH * 0.5 + this._shakeOffsetY
    );
    ctx.scale(this._zoom, this._zoom);
    ctx.translate(-this.x, -this.y);
  };

  /**
   * Restore the canvas context state pushed by applyTransform.
   * @param {CanvasRenderingContext2D} ctx
   */
  Camera2D.prototype.resetTransform = function (ctx) {
    ctx.restore();
  };

  /**
   * Update viewport dimensions (e.g. on window resize).
   * @param {number} w @param {number} h
   */
  Camera2D.prototype.resize = function (w, h) {
    this._viewW = w;
    this._viewH = h;
  };

  // ---------- Per-frame update ----------

  /**
   * Advance camera state. Call once per frame.
   * @param {number} dt - Delta time in seconds.
   */
  Camera2D.prototype.update = function (dt) {
    // Smooth follow
    if (this._smoothing > 0) {
      var factor = 1 - Math.pow(1 - this._smoothing, dt * 60);
      this.x += (this._targetX - this.x) * factor;
      this.y += (this._targetY - this.y) * factor;
    }

    // Shake decay
    if (this._shakeElapsed < this._shakeDuration) {
      this._shakeElapsed += dt;
      var remaining = 1 - (this._shakeElapsed / this._shakeDuration);
      if (remaining <= 0) {
        this._shakeOffsetX = 0;
        this._shakeOffsetY = 0;
      } else {
        var magnitude = this._shakeIntensity * remaining * remaining;
        this._shakeOffsetX = (Math.random() * 2 - 1) * magnitude;
        this._shakeOffsetY = (Math.random() * 2 - 1) * magnitude;
      }
    } else {
      this._shakeOffsetX = 0;
      this._shakeOffsetY = 0;
    }
  };

  // ---------- Export ----------
  window.Camera2D = Camera2D;
})();
