/* =========================================================================
   Frantics — Ambient FX layer (Phase 21)
   -------------------------------------------------------------------------
   Paints sparkles / embers / dust motes behind painted-backdrop overlays
   so the product reads as ambient-alive rather than painted-still.

   Usage:
     AmbientFx.attach(overlayEl, 'sparkles');       // wire up
     AmbientFx.detach(overlayEl);                   // remove

   Presets:
     'sparkles'  — small gold/white specks with additive glow, rising
     'embers'    — warm amber specks, larger, rising with wind drift
     'dustmotes' — slow cream specks, near-horizontal drift, low opacity

   The module runs one shared RAF loop across every attached canvas.
   It auto-pauses when a parent's getBoundingClientRect is zero-area
   (display:none, hidden overlay) to avoid wasted CPU. Pool-allocated
   particles (120 per layer) avoid GC pressure.

   Honors prefers-reduced-motion: when set, attach() is a no-op and
   running layers stop emitting.
   ========================================================================= */
(function (root) {
  'use strict';

  var POOL_SIZE = 120;
  var reducedMotion = false;
  try {
    reducedMotion = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (window.matchMedia) {
      window.matchMedia('(prefers-reduced-motion: reduce)')
        .addEventListener('change', function (e) { reducedMotion = e.matches; });
    }
  } catch (e) { /* no-op */ }

  /* ---- Presets ---- */
  /* spawnRate is "target alive" — the loop emits until count reaches it. */
  var PRESETS = {
    sparkles: {
      spawnRate: 18,
      sizeMin: 1.4, sizeMax: 3.2,
      lifeMin: 2800, lifeMax: 4200,
      vxMin: -8,  vxMax: 8,
      vyMin: -24, vyMax: -10,
      colorR: 255, colorG: 230, colorB: 140,
      glow: true,
    },
    embers: {
      spawnRate: 12,
      sizeMin: 1.6, sizeMax: 3.4,
      lifeMin: 3000, lifeMax: 5000,
      vxMin: -18, vxMax: 22,
      vyMin: -30, vyMax: -14,
      colorR: 255, colorG: 170, colorB: 80,
      glow: true,
    },
    dustmotes: {
      spawnRate: 22,
      sizeMin: 1.0, sizeMax: 2.4,
      lifeMin: 5000, lifeMax: 9000,
      vxMin: -16, vxMax: 16,
      vyMin: -6,  vyMax: -2,
      colorR: 245, colorG: 234, colorB: 210,
      glow: false,
    },
  };

  /* ---- Particle pool ---- */
  function makePool(size) {
    var pool = new Array(size);
    for (var i = 0; i < size; i++) {
      pool[i] = {
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        size: 0, baseSize: 0,
        life: 0, maxLife: 0,
        alpha: 0,
      };
    }
    return pool;
  }

  function rand(min, max) { return min + Math.random() * (max - min); }

  /* ---- Per-layer state ---- */
  function createLayer(parentEl, presetName) {
    var preset = PRESETS[presetName] || PRESETS.sparkles;
    var canvas = document.createElement('canvas');
    canvas.className = 'ambient-fx-layer';
    canvas.style.cssText =
      'position:absolute;inset:0;z-index:0;pointer-events:none;' +
      'width:100%;height:100%;';
    parentEl.insertBefore(canvas, parentEl.firstChild);
    return {
      parentEl: parentEl,
      canvas: canvas,
      ctx: canvas.getContext('2d'),
      preset: preset,
      presetName: presetName,
      pool: makePool(POOL_SIZE),
      lastSpawn: 0,
      lastTick: performance.now(),
      w: 0, h: 0,
      dpr: 1,
    };
  }

  function resize(layer) {
    var r = layer.parentEl.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false; // hidden / detached
    var dpr = window.devicePixelRatio || 1;
    if (layer.w === r.width && layer.h === r.height && layer.dpr === dpr) return true;
    layer.w = r.width;
    layer.h = r.height;
    layer.dpr = dpr;
    layer.canvas.width = Math.round(r.width * dpr);
    layer.canvas.height = Math.round(r.height * dpr);
    layer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function spawnOne(layer) {
    var p = null;
    var pool = layer.pool;
    for (var i = 0; i < pool.length; i++) {
      if (!pool[i].active) { p = pool[i]; break; }
    }
    if (!p) return;
    var pr = layer.preset;
    p.active = true;
    // Spawn across full width, near bottom so the particle drifts UP through
    // the overlay. Dustmotes spawn evenly vertically so they populate the
    // frame uniformly from first paint.
    if (layer.presetName === 'dustmotes') {
      p.x = rand(0, layer.w);
      p.y = rand(0, layer.h);
    } else {
      p.x = rand(0, layer.w);
      p.y = layer.h + rand(0, 40);
    }
    p.baseSize = rand(pr.sizeMin, pr.sizeMax);
    p.size = p.baseSize;
    p.vx = rand(pr.vxMin, pr.vxMax);
    p.vy = rand(pr.vyMin, pr.vyMax);
    p.maxLife = rand(pr.lifeMin, pr.lifeMax);
    p.life = p.maxLife;
    p.alpha = 0;
  }

  function update(layer, dt) {
    var pool = layer.pool;
    var pr = layer.preset;
    var alive = 0;
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.active) continue;
      alive++;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      var t = 1 - (p.life / p.maxLife);
      // Fade in for first 20%, fade out over last 30%.
      if (t < 0.2) p.alpha = t / 0.2;
      else if (t > 0.7) p.alpha = (1 - t) / 0.3;
      else p.alpha = 1;
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      // Sparkles twinkle — subtle size pulse.
      if (layer.presetName === 'sparkles') {
        p.size = p.baseSize * (0.8 + 0.25 * Math.sin(t * Math.PI * 3));
      }
    }
    // Spawn up to target alive count.
    while (alive < pr.spawnRate) {
      spawnOne(layer);
      alive++;
    }
  }

  function draw(layer) {
    var ctx = layer.ctx;
    ctx.clearRect(0, 0, layer.w, layer.h);
    var pool = layer.pool;
    var pr = layer.preset;
    var colorStr = 'rgba(' + pr.colorR + ',' + pr.colorG + ',' + pr.colorB + ',';
    for (var i = 0; i < pool.length; i++) {
      var p = pool[i];
      if (!p.active) continue;
      ctx.globalAlpha = p.alpha;
      if (pr.glow) {
        ctx.shadowColor = colorStr + '0.8)';
        ctx.shadowBlur = p.size * 3;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = colorStr + '1)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  /* ---- Shared RAF loop ---- */
  var layers = [];
  var rafId = 0;

  function tick(now) {
    rafId = 0;
    var anyActive = false;
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var dt = Math.min(now - layer.lastTick, 100);
      layer.lastTick = now;
      if (reducedMotion) continue;
      if (!resize(layer)) continue; // hidden / zero-area
      update(layer, dt);
      draw(layer);
      anyActive = true;
    }
    if (layers.length) rafId = requestAnimationFrame(tick);
    void anyActive; // kept for potential future skip-when-all-hidden optimization
  }

  /* ---- Public API ---- */
  function attach(parentEl, presetName) {
    if (!parentEl || reducedMotion) return null;
    if (parentEl.querySelector(':scope > .ambient-fx-layer')) return null; // idempotent
    var layer = createLayer(parentEl, presetName || 'sparkles');
    layers.push(layer);
    if (!rafId) rafId = requestAnimationFrame(tick);
    return layer;
  }

  function detach(parentEl) {
    if (!parentEl) return;
    for (var i = layers.length - 1; i >= 0; i--) {
      if (layers[i].parentEl === parentEl) {
        if (layers[i].canvas.parentNode) {
          layers[i].canvas.parentNode.removeChild(layers[i].canvas);
        }
        layers.splice(i, 1);
      }
    }
  }

  root.AmbientFx = { attach: attach, detach: detach, PRESETS: PRESETS };
})(typeof window !== 'undefined' ? window : this);
