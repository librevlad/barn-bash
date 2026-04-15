// ============================================================
// Meteor Shower — 2D Renderer (Engine-powered)
// Uses: Camera2D, Scene, ParticleSystem, TweenManager, EntityManager
// ============================================================

const Render2D = (() => {
  let canvas, ctx;
  let W, H;

  // Engine instances
  const camera = new Camera2D(1280, 720);
  const scene = new Scene();
  const particles = new ParticleSystem(400);
  const entities = new EntityManager();
  let renderLoop;

  // Game state
  let targetPlatR = 4.5, renderPlatR = 4.5;
  let impactFlash = 0;
  let lastStateTime = 0;
  let safeZone = { x: 0, z: 0, r: 1.2 };
  let nextSafeZone = null; // radar preview
  let subPhase = 'idle';
  let showSafe = false;
  let warnProgress = 0;

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if (typeof FX !== 'undefined') FX.init(W, H);
    if (typeof Visual !== 'undefined') Visual.init(W, H);
    if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);

    // Camera: fixed at origin, zoom = SCALE
    camera.setPosition(0, 0);
    camera.setZoom(Math.min(W, H) / 12);

    // Setup scene layers
    scene.createLayer('background', 0);
    scene.createLayer('arena', 5);
    scene.createLayer('danger_overlay', 10);
    scene.createLayer('safezone', 15);
    scene.createLayer('players', 20);
    scene.createLayer('effects', 30);
    scene.createLayer('ui', 40);

    // Register render functions per layer
    scene.getLayer('background').addFn(drawEmbers);
    scene.getLayer('arena').addFn(drawArena);
    scene.getLayer('danger_overlay').addFn(drawDangerOverlay);
    scene.getLayer('safezone').addFn(drawSafeZone);
    scene.getLayer('players').addFn(drawPlayers);
    scene.getLayer('effects').addFn(drawImpactFlash);
    scene.getLayer('ui').addFn(drawTimerBar);

    // Start render loop
    renderLoop = new RenderLoop(canvas);
    renderLoop.start(
      (dt) => {
        // Apply time scale from FX if available
        const rawDt = dt;
        const scaledDt = rawDt * (typeof FX !== 'undefined' ? FX.getTimeScale() : 1);

        TweenManager.update(scaledDt);
        particles.update(scaledDt);
        if (typeof FX !== 'undefined') FX.update(rawDt);
        if (typeof Visual !== 'undefined') Visual.update(rawDt);
        camera.update(scaledDt);

        // Smooth arena radius
        renderPlatR += (targetPlatR - renderPlatR) * 0.04;

        // Decay impact flash
        if (impactFlash > 0) impactFlash -= scaledDt * 3;
      },
      (ctx, dt) => {
        render(ctx, dt);
      }
    );
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    W = window.innerWidth; H = window.innerHeight;
    if (typeof FX !== 'undefined') FX.resize(W, H);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.resize(W, H);
    camera.setZoom(Math.min(W, H) / 12);
  }

  // ============================================================
  // RENDER (called by RenderLoop)
  // ============================================================
  function render(ctx, dt) {
    // Clear with dark background
    ctx.fillStyle = '#0C0608';
    ctx.fillRect(0, 0, W, H);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    // Render scene layers in order. All draw functions convert world coords
    // to screen coords via camera.worldToScreen(), so we do not pass the
    // camera to scene.render() (that would double-apply the transform).
    // Camera is still used for worldToScreen(), getZoom(), and shake().
    scene.render(ctx);

    // Post-processing (screen space)
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
    if (typeof Visual !== 'undefined') Visual.drawPost(ctx, {
      vignette: subPhase === 'warning' ? 0.5 : 0.2,
      vignetteColor: subPhase === 'warning' ? '180,30,0' : '0,0,0',
      grain: 0.02,
    });
  }

  // ============================================================
  // LAYER: BACKGROUND (embers — screen space)
  // ============================================================
  function drawEmbers(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;

    // Rising embers with trails
    for (let i = 0; i < 30; i++) {
      const phase = clock * 0.2 + i * 31;
      const x = ((Math.sin(clock * 0.3 + i * 47) * 0.5 + 0.5) * W);
      const y = ((Math.cos(phase) * 0.5 + 0.5) * H);
      const s = 1 + Math.sin(clock * 1.5 + i) * 0.5;
      const bright = 0.15 + Math.sin(clock * 3 + i * 7) * 0.1;

      // Ember trail
      ctx.strokeStyle = `rgba(255,60,10,${bright * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(phase * 2) * 3, y + 8 + s * 3);
      ctx.stroke();

      // Ember dot with glow
      ctx.shadowBlur = 4;
      ctx.shadowColor = `rgba(255,90,25,${bright})`;
      ctx.fillStyle = `rgba(255,${120 + i * 4},25,${bright})`;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Occasional large floating ember
    for (let i = 0; i < 5; i++) {
      const lx = ((Math.sin(clock * 0.15 + i * 23) * 0.5 + 0.5) * W);
      const ly = H - ((clock * 15 + i * 150) % (H + 50));
      const ls = 2 + Math.sin(clock * 2 + i) * 1;
      ctx.fillStyle = `rgba(255,150,50,${0.08 + Math.sin(clock * 4 + i * 3) * 0.04})`;
      ctx.beginPath(); ctx.arc(lx, ly, ls, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ============================================================
  // LAYER: ARENA
  // ============================================================
  function drawArena(ctx) {
    const radius = renderPlatR;
    const SCALE = camera.getZoom();
    const r = radius * SCALE;
    const a = camera.worldToScreen(0, 0);
    const ax = a.x, ay = a.y;

    // Outer glow (stronger, wider)
    const glow = ctx.createRadialGradient(ax, ay, r * 0.85, ax, ay, r * 1.4);
    glow.addColorStop(0, 'rgba(255,80,10,0.18)');
    glow.addColorStop(0.6, 'rgba(255,60,0,0.06)');
    glow.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ax, ay, r * 1.4, 0, Math.PI * 2); ctx.fill();

    // Arena disc
    const grad = ctx.createRadialGradient(ax - r * 0.15, ay - r * 0.15, 0, ax, ay, r);
    grad.addColorStop(0, '#3A2525'); grad.addColorStop(0.7, '#2A1818'); grad.addColorStop(1, '#1A0A0A');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill();

    // Subtle cracks
    ctx.strokeStyle = 'rgba(255,50,0,0.06)';
    ctx.lineWidth = 1;
    for (let f = 0.25; f < 1; f += 0.25) {
      ctx.beginPath(); ctx.arc(ax, ay, r * f, 0, Math.PI * 2); ctx.stroke();
    }

    // Edge — brass rim with pulsing amber-to-red (carnival meteor threat)
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const pulse = 0.5 + Math.sin(clock * 3.5) * 0.15;
    // Base brass ring (gold-edge)
    ctx.strokeStyle = (typeof Palette !== 'undefined' ? Palette.accentGoldEdge : 'rgba(138,103,24,0.7)');
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
    // Amber/danger pulse on top — matches the controller's meteor warn token
    ctx.strokeStyle = (typeof Palette !== 'undefined'
      ? `rgba(217,83,79,${pulse})`
      : `rgba(255,68,0,${pulse})`);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ============================================================
  // LAYER: DANGER OVERLAY
  // ============================================================
  function drawDangerOverlay(ctx) {
    if (!showSafe) return;
    const SCALE = camera.getZoom();
    const radius = renderPlatR;
    const r = radius * SCALE;
    const a = camera.worldToScreen(0, 0);
    const ax = a.x, ay = a.y;
    const s = camera.worldToScreen(safeZone.x, safeZone.z);
    const sx = s.x, sy = s.y;
    const sr = safeZone.r * SCALE;

    // Red tint over entire arena EXCEPT safe zone
    ctx.save();
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.clip();

    // Danger overlay — two-phase telegraph: amber wash → deep-red flash
    // Matches the controller's meteor warn tokens so host & phone agree.
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const dangerOpacity = 0.18 + Math.sin(clock * 6) * 0.06;
    ctx.fillStyle = (typeof Palette !== 'undefined'
      ? `rgba(232,163,60,${dangerOpacity * 0.55})` // warning amber wash
      : `rgba(255,20,0,${dangerOpacity})`);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = (typeof Palette !== 'undefined'
      ? `rgba(217,83,79,${dangerOpacity})` // danger-red pulse layer
      : `rgba(255,20,0,0)`);
    ctx.fillRect(0, 0, W, H);

    // Cut out safe zone (clear it)
    ctx.globalCompositeOperation = 'destination-out';
    const safeGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    safeGrad.addColorStop(0, 'rgba(0,0,0,1)');
    safeGrad.addColorStop(0.8, 'rgba(0,0,0,1)');
    safeGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = safeGrad;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 1.2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  // ============================================================
  // LAYER: SAFE ZONE
  // ============================================================
  function drawSafeZone(ctx) {
    // Radar preview: ghost of next safe zone (blue, subtle)
    if (nextSafeZone && !showSafe) {
      const SCALE = camera.getZoom();
      const ns = camera.worldToScreen(nextSafeZone.x, nextSafeZone.z);
      const nr = (nextSafeZone.r || 1.2) * SCALE;
      const clock = renderLoop ? renderLoop.getClock() : 0;
      const pulse = 0.15 + Math.sin(clock * 3) * 0.05;
      ctx.strokeStyle = `rgba(100,180,255,${pulse})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(ns.x, ns.y, nr, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(100,180,255,${pulse * 0.3})`;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RADAR', ns.x, ns.y - nr - 4);
    }
    if (!showSafe) return;
    const SCALE = camera.getZoom();
    const s = camera.worldToScreen(safeZone.x, safeZone.z);
    const sx = s.x, sy = s.y;
    const sr = safeZone.r * SCALE;

    // Green glow — carnival success halo on top of a gold-bulb core
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 1.5);
    glow.addColorStop(0, 'rgba(123,201,80,0.18)');
    glow.addColorStop(0.55, 'rgba(244,197,66,0.1)');
    glow.addColorStop(1, 'rgba(123,201,80,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 1.5, 0, Math.PI * 2); ctx.fill();

    // Safe disc — warm wood with gold undertone so it reads as
    // "stand here" rather than a generic green spot
    const safeDisc = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    safeDisc.addColorStop(0, 'rgba(255,248,200,0.18)');     // bulb highlight
    safeDisc.addColorStop(0.65, 'rgba(244,197,66,0.08)');  // gold wash
    safeDisc.addColorStop(1, 'rgba(123,201,80,0.14)');     // green edge
    ctx.fillStyle = safeDisc;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // Pulsing ring — success-green with gold accent dot
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const pulse = 0.45 + Math.sin(clock * 5) * 0.2;
    ctx.strokeStyle = (typeof Palette !== 'undefined'
      ? `rgba(123,201,80,${pulse})`
      : `rgba(80,255,120,${pulse})`);
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.stroke();

    // "SAFE" label — Alfa Slab gold with red letterpress (carnival voice)
    ctx.save();
    if (typeof Palette !== 'undefined') Palette.applyLetterpress(ctx);
    ctx.fillStyle = (typeof Palette !== 'undefined' ? Palette.accentGold : '#f4c542');
    ctx.font = '700 12px "Alfa Slab One", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE', sx, sy - sr - 8);
    if (typeof Palette !== 'undefined') Palette.clearShadow(ctx);
    ctx.restore();
  }

  // ============================================================
  // LAYER: PLAYERS (using EntityManager)
  // ============================================================
  function drawPlayers(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;

    for (const e of entities.all()) {
      if (!e.visible) continue;
      // Time-based interpolation between prev and target server states
      // Server sends every 100ms. We interpolate from prev→target over that window.
      const elapsed = performance.now() - lastStateTime;
      const t = Math.min(1, elapsed / 100);
      const prevX = e._prevX !== undefined ? e._prevX : e.x;
      const prevY = e._prevY !== undefined ? e._prevY : e.y;
      const tgt = e._target || {};
      e.x = prevX + ((tgt.x !== undefined ? tgt.x : prevX) - prevX) * t;
      e.y = prevY + ((tgt.y !== undefined ? tgt.y : prevY) - prevY) * t;

      const s = camera.worldToScreen(e.x, e.y);
      const alive = e.data.alive;
      if (!alive) continue;

      const safe = e.data.safe;
      const expr = (subPhase === 'warning' && !safe) ? 'scared' : (safe && showSafe) ? 'happy' : 'determined';

      // Safe indicator ring
      if (safe && showSafe) {
        ctx.strokeStyle = 'rgba(80,255,120,0.5)'; ctx.lineWidth = 3;
        ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(80,255,120,0.4)';
        ctx.beginPath(); ctx.arc(s.x, s.y, 28, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;
      }

      CharDraw.blob(ctx, s.x, s.y, 22, e.color, { idx: e.data.idx, clock, expression: expr, running: false, character: e.character });

      // Name label above player
      if (e.data.name) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(e.data.name, s.x, s.y - 28);
      }
    }
  }

  // ============================================================
  // LAYER: IMPACT FLASH (effects)
  // ============================================================
  function drawImpactFlash(ctx) {
    if (impactFlash > 0) {
      ctx.fillStyle = `rgba(255,50,0,${impactFlash * 0.2})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ============================================================
  // LAYER: TIMER BAR (UI)
  // ============================================================
  function drawTimerBar(ctx) {
    if (!showSafe || warnProgress <= 0) return;
    const barW = W * 0.3, barH = 6;
    const bx = (W - barW) / 2, by = H - 40;
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bx, by, barW, barH);
    // Fill — green to red
    const pct = Math.min(1, warnProgress);
    const r = Math.floor(pct * 255), g = Math.floor((1 - pct) * 200);
    ctx.fillStyle = `rgb(${r},${g},40)`;
    ctx.fillRect(bx, by, barW * pct, barH);
    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function updateState(state) {
    lastStateTime = performance.now();
    targetPlatR = state.platR;
    subPhase = state.subPhase;
    showSafe = state.subPhase === 'warning';
    if (state.safeZone) safeZone = state.safeZone;
    nextSafeZone = state.nextSafeZone || null;
    // Timer progress: subTick counts down, higher = more time left
    if (state.subPhase === 'warning' && state.subTick !== undefined) {
      const maxTicks = Math.max(30, 50 - (state.wave || 1) * 2);
      warnProgress = 1 - (state.subTick / maxTicks);
    } else {
      warnProgress = 0;
    }

    // Update entities from server state
    const ids = Object.keys(state.players);
    ids.forEach((id, i) => {
      const pd = state.players[id];
      let e = entities.get(id);
      if (!e) {
        e = entities.create(id, 'player');
        e.x = pd.x; e.y = pd.z;
        e.color = pd.color;
        e._prevX = pd.x; e._prevY = pd.z;
      }
      // Store previous as current before updating target
      e._prevX = e.x;
      e._prevY = e.y;
      e.setTarget({ x: pd.x, y: pd.z });
      e.color = pd.color;
      e.character = pd.character || null;
      e.visible = pd.connected;
      e.data.alive = pd.alive;
      e.data.safe = pd.safe;
      e.data.name = pd.name || null;
      e.data.idx = i;
    });
  }

  function onWarning(data) {
    if (data.safeZone) safeZone = data.safeZone;
    showSafe = true;
  }

  function onImpact() {
    camera.shake(15, 0.5);
    impactFlash = 1;
    showSafe = false;

    // Impact burst particles at arena center
    const center = camera.worldToScreen(0, 0);
    particles.burst(center.x, center.y, 12, {
      ...ParticleSystem.PRESETS.FIRE,
      speed: 3,
      life: 0.4,
      color: '255,80,20',
      colorEnd: '255,30,0',
    });
  }

  function triggerWin() {}

  return { init, updateState, onWarning, onImpact, triggerWin };
})();
