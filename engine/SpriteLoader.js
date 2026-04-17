// ============================================================
// FRANTICS — Sprite Loader & Atlas Manager
// ============================================================
// Loads sprite sheets, cuts into individual sprites, caches them.
// Include via <script src="/engine/SpriteLoader.js"></script>

(function () {
  'use strict';

  /**
   * Load an image and return a Promise
   * @param {string} src - URL of the image
   * @returns {Promise<HTMLImageElement>}
   */
  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load: ' + src)); };
      img.src = src;
    });
  }

  /**
   * Cut a region from a source image into an offscreen canvas (cached sprite)
   * @param {HTMLImageElement} img
   * @param {number} x - source x
   * @param {number} y - source y
   * @param {number} w - source width
   * @param {number} h - source height
   * @returns {HTMLCanvasElement}
   */
  function cutSprite(img, x, y, w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    return canvas;
  }

  // Sprite cache
  var sprites = {};
  var sheets = {};

  var SpriteLoader = {
    /**
     * Load a spritesheet image
     * @param {string} name - identifier
     * @param {string} url - image URL
     * @returns {Promise}
     */
    loadSheet: function (name, url) {
      return loadImage(url).then(function (img) {
        sheets[name] = img;
        return img;
      });
    },

    /**
     * Define a named sprite from a loaded sheet
     * @param {string} spriteName - unique sprite name
     * @param {string} sheetName - loaded sheet name
     * @param {number} x @param {number} y @param {number} w @param {number} h
     */
    define: function (spriteName, sheetName, x, y, w, h) {
      var sheet = sheets[sheetName];
      if (!sheet) { console.warn('Sheet not loaded: ' + sheetName); return; }
      sprites[spriteName] = cutSprite(sheet, x, y, w, h);
    },

    /**
     * Define multiple sprites from a grid layout
     * @param {string} sheetName
     * @param {Object[]} defs - [{name, x, y, w, h}]
     */
    defineAll: function (sheetName, defs) {
      for (var i = 0; i < defs.length; i++) {
        var d = defs[i];
        this.define(d.name, sheetName, d.x, d.y, d.w, d.h);
      }
    },

    /**
     * Get a cached sprite canvas
     * @param {string} name
     * @returns {HTMLCanvasElement|null}
     */
    get: function (name) {
      return sprites[name] || null;
    },

    /**
     * Draw a sprite centered at (x, y) with optional rotation and scale
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} name - sprite name
     * @param {number} x - center x
     * @param {number} y - center y
     * @param {Object} [opts] - { rotation, scaleX, scaleY, alpha, width, height }
     */
    draw: function (ctx, name, x, y, opts) {
      var sprite = sprites[name];
      if (!sprite) return false;
      opts = opts || {};
      var w = opts.width || sprite.width;
      var h = opts.height || sprite.height;
      var rot = opts.rotation || 0;
      var sx = opts.scaleX || 1;
      var sy = opts.scaleY || 1;

      ctx.save();
      ctx.translate(x, y);
      if (rot) ctx.rotate(rot);
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
      if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
      ctx.restore();
      return true;
    },

    /**
     * Draw a sprite tiled across an area
     * @param {CanvasRenderingContext2D} ctx
     * @param {string} name
     * @param {number} x @param {number} y @param {number} areaW @param {number} areaH
     * @param {number} [offsetX] @param {number} [offsetY] - scroll offset for parallax
     */
    drawTiled: function (ctx, name, x, y, areaW, areaH, offsetX, offsetY) {
      var sprite = sprites[name];
      if (!sprite) return;
      offsetX = (offsetX || 0) % sprite.width;
      offsetY = (offsetY || 0) % sprite.height;
      if (offsetX > 0) offsetX -= sprite.width;
      if (offsetY > 0) offsetY -= sprite.height;

      for (var tx = offsetX; tx < areaW; tx += sprite.width) {
        for (var ty = offsetY; ty < areaH; ty += sprite.height) {
          ctx.drawImage(sprite, x + tx, y + ty);
        }
      }
    },

    /**
     * Check if a sprite exists
     * @param {string} name
     * @returns {boolean}
     */
    has: function (name) {
      return !!sprites[name];
    },

    /**
     * Load a standalone image as a sprite (not from sheet)
     * @param {string} name
     * @param {string} url
     * @returns {Promise}
     */
    loadSprite: function (name, url) {
      return loadImage(url).then(function (img) {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        sprites[name] = canvas;
        return canvas;
      });
    },

    /**
     * Load a painterly PNG and strip a baked checker-preview background.
     * Image-gen tools often export "transparent" assets by rendering a
     * neutral-grey + white checkerboard into the image instead of a true
     * alpha channel.
     *
     * Edge-seeded flood fill only — NO unconditional strict pass. Seeds
     * from image-boundary pixels that match a strict neutral threshold
     * (either bright-checker, e.g. the checker-preview background, OR
     * dark-solid, e.g. a solid-black baked background). BFS inward
     * through neighbors matching a looser threshold. Interior
     * neutral pixels disconnected from the edge boundary by saturated-
     * color ink outlines (e.g. white checker squares INSIDE a checker-
     * flag painting, or snow caps in the canopy of a snow tree, or
     * dark ink outlines inside a throne painting) stay opaque.
     *
     * A prior version ran an unconditional pass that cleared every
     * near-neutral-bright pixel — that ate pure-white interior
     * pixels in a checker racing flag. Edge-seeded approach preserves
     * disconnected interiors by construction.
     * @param {string} name
     * @param {string} url
     * @param {Object} [opts] - { seedChroma = 12, seedBright = 185,
     *                            seedDark = 15, expandChroma = 40,
     *                            expandBright = 165, expandDark = 30 }
     * @returns {Promise}
     */
    loadPainterly: function (name, url, opts) {
      opts = opts || {};
      var seedChroma = opts.seedChroma !== undefined ? opts.seedChroma : 12;
      var seedBright = opts.seedBright !== undefined ? opts.seedBright : 185;
      var seedDark = opts.seedDark !== undefined ? opts.seedDark : 15;
      var expandChroma = opts.expandChroma !== undefined ? opts.expandChroma : 40;
      var expandBright = opts.expandBright !== undefined ? opts.expandBright : 165;
      var expandDark = opts.expandDark !== undefined ? opts.expandDark : 30;
      return loadImage(url).then(function (img) {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var cx = canvas.getContext('2d');
        cx.drawImage(img, 0, 0);
        var data = cx.getImageData(0, 0, canvas.width, canvas.height);
        var px = data.data;
        var W = canvas.width, H = canvas.height;
        var visited = new Uint8Array(W * H);
        var stack = [];
        // Seed: every edge pixel matching EITHER a neutral-bright
        // threshold (checker-preview white/grey) OR a neutral-dark
        // threshold (solid-black baked background). Image-gen tools
        // emit both styles; both are "outside" pixels here.
        function trySeed(idx) {
          var p = idx * 4;
          var r = px[p], g = px[p + 1], b = px[p + 2];
          var minC = r < g ? (r < b ? r : b) : (g < b ? g : b);
          var maxC = r > g ? (r > b ? r : b) : (g > b ? g : b);
          if ((maxC - minC) < seedChroma && (minC > seedBright || maxC < seedDark)) {
            px[p + 3] = 0;
            stack.push(idx);
            visited[idx] = 1;
          }
        }
        for (var x = 0; x < W; x++) { trySeed(x); trySeed((H - 1) * W + x); }
        for (var y = 1; y < H - 1; y++) { trySeed(y * W); trySeed(y * W + W - 1); }
        // BFS expand with loose threshold
        while (stack.length) {
          var idx = stack.pop();
          var ix = idx % W, iy = (idx / W) | 0;
          var ns = [];
          if (ix > 0) ns.push(idx - 1);
          if (ix < W - 1) ns.push(idx + 1);
          if (iy > 0) ns.push(idx - W);
          if (iy < H - 1) ns.push(idx + W);
          for (var k = 0; k < ns.length; k++) {
            var n = ns[k];
            if (visited[n]) continue;
            visited[n] = 1;
            var p = n * 4;
            if (px[p + 3] === 0) { stack.push(n); continue; }
            var nr = px[p], ng = px[p + 1], nb = px[p + 2];
            var nMin = nr < ng ? (nr < nb ? nr : nb) : (ng < nb ? ng : nb);
            var nMax = nr > ng ? (nr > nb ? nr : nb) : (ng > nb ? ng : nb);
            if ((nMax - nMin) < expandChroma && (nMin > expandBright || nMax < expandDark)) {
              px[p + 3] = 0;
              stack.push(n);
            }
          }
        }
        cx.putImageData(data, 0, 0);
        sprites[name] = canvas;
        return canvas;
      });
    },

    /**
     * Get load progress
     * @returns {{loaded: number, total: number}}
     */
    getProgress: function () {
      return { loaded: Object.keys(sprites).length, sheets: Object.keys(sheets).length };
    },

    // Expose internals for debugging
    _sprites: sprites,
    _sheets: sheets,
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteLoader: SpriteLoader };
  }
  if (typeof window !== 'undefined') {
    window.SpriteLoader = SpriteLoader;
  }
})();
