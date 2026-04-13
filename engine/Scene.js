/**
 * Scene.js - Simple scene graph with render layers for Canvas2D.
 * Client-side only. Organizes drawing into ordered, togglable layers.
 * @module Scene
 */
(function () {
  'use strict';

  // ========== Renderable ==========

  /**
   * A single drawable unit within a layer.
   * @param {Function} renderFn - Function receiving (ctx) to draw content.
   * @param {number}   [zIndex=0] - Sort order within the parent layer.
   * @constructor
   */
  function Renderable(renderFn, zIndex) {
    /** @type {Function} */
    this.renderFn = renderFn;
    /** @type {number} */
    this.zIndex = (zIndex !== undefined) ? zIndex : 0;
    /** @type {boolean} */
    this.visible = true;
  }

  /**
   * Execute the render function if visible.
   * @param {CanvasRenderingContext2D} ctx
   */
  Renderable.prototype.render = function (ctx) {
    if (this.visible) this.renderFn(ctx);
  };

  // ========== Layer ==========

  /**
   * A named collection of renderables drawn at a specific depth.
   * @param {string} name   - Layer identifier (e.g. 'entities').
   * @param {number} zIndex - Layer draw order relative to other layers.
   * @constructor
   */
  function Layer(name, zIndex) {
    /** @type {string} */
    this.name = name;
    /** @type {number} */
    this.zIndex = zIndex;
    /** @type {boolean} */
    this.visible = true;
    /** @type {Renderable[]} */
    this._items = [];
    /** @type {boolean} */
    this._dirty = false;
  }

  /**
   * Add an existing Renderable to this layer.
   * @param {Renderable} renderable
   * @returns {Renderable} The same renderable, for chaining.
   */
  Layer.prototype.add = function (renderable) {
    this._items.push(renderable);
    this._dirty = true;
    return renderable;
  };

  /**
   * Convenience: wrap a render function into a Renderable and add it.
   * @param {Function} renderFn - Drawing function receiving (ctx).
   * @param {number}   [zIndex=0]
   * @returns {Renderable}
   */
  Layer.prototype.addFn = function (renderFn, zIndex) {
    return this.add(new Renderable(renderFn, zIndex));
  };

  /**
   * Remove a renderable from this layer.
   * @param {Renderable} renderable
   */
  Layer.prototype.remove = function (renderable) {
    var idx = this._items.indexOf(renderable);
    if (idx !== -1) this._items.splice(idx, 1);
  };

  /** Remove all renderables from this layer. */
  Layer.prototype.clear = function () {
    this._items.length = 0;
    this._dirty = false;
  };

  /**
   * Draw all visible renderables, sorted by zIndex.
   * @param {CanvasRenderingContext2D} ctx
   */
  Layer.prototype.render = function (ctx) {
    if (!this.visible) return;

    if (this._dirty) {
      this._items.sort(function (a, b) { return a.zIndex - b.zIndex; });
      this._dirty = false;
    }

    for (var i = 0; i < this._items.length; i++) {
      this._items[i].render(ctx);
    }
  };

  // ========== Scene ==========

  /** Default layer name for UI content that ignores camera transforms. */
  var UI_LAYER = 'ui';

  /**
   * Top-level scene managing multiple ordered layers.
   * @constructor
   */
  function Scene() {
    /** @type {Object.<string, Layer>} */
    this._layers = {};
    /** @type {Layer[]} Sorted cache of layers for rendering. */
    this._sorted = [];
    /** @type {boolean} */
    this._dirty = false;
  }

  /**
   * Create a new layer. Typical zIndex convention:
   *   background=0, world=10, entities=20, effects=30, ui=40
   * @param {string} name
   * @param {number} zIndex
   * @returns {Layer}
   */
  Scene.prototype.createLayer = function (name, zIndex) {
    var layer = new Layer(name, zIndex);
    this._layers[name] = layer;
    this._sorted.push(layer);
    this._dirty = true;
    return layer;
  };

  /**
   * Retrieve a layer by name.
   * @param {string} name
   * @returns {Layer|undefined}
   */
  Scene.prototype.getLayer = function (name) {
    return this._layers[name];
  };

  /**
   * Remove a layer and all its renderables.
   * @param {string} name
   */
  Scene.prototype.removeLayer = function (name) {
    var layer = this._layers[name];
    if (!layer) return;
    layer.clear();
    delete this._layers[name];
    var idx = this._sorted.indexOf(layer);
    if (idx !== -1) this._sorted.splice(idx, 1);
  };

  /**
   * Render all layers in zIndex order.
   * World layers are drawn inside the camera transform; the 'ui' layer
   * is drawn in raw screen space so HUD elements stay fixed.
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera2D} [camera] - If provided, world layers use camera transform.
   */
  Scene.prototype.render = function (ctx, camera) {
    if (this._dirty) {
      this._sorted.sort(function (a, b) { return a.zIndex - b.zIndex; });
      this._dirty = false;
    }

    for (var i = 0; i < this._sorted.length; i++) {
      var layer = this._sorted[i];
      if (!layer.visible) continue;

      var isUI = (layer.name === UI_LAYER);

      if (camera && !isUI) {
        camera.applyTransform(ctx);
        layer.render(ctx);
        camera.resetTransform(ctx);
      } else {
        layer.render(ctx);
      }
    }
  };

  /** Remove all layers and renderables. */
  Scene.prototype.clear = function () {
    for (var name in this._layers) {
      if (this._layers.hasOwnProperty(name)) {
        this._layers[name].clear();
      }
    }
    this._layers = {};
    this._sorted.length = 0;
    this._dirty = false;
  };

  // ========== Export ==========
  window.Renderable = Renderable;
  window.Layer = Layer;
  window.Scene = Scene;
})();
