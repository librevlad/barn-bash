// ============================================================
// King of the Hill — 2D Renderer (Engine-powered)
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
  let targetPlatR = 5, renderPlatR = 5;
  let kingZoneR = 1.5;
  let lastStateTime = 0;

  // Stars (pre-generated, same count & distribution as original)
  const stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.5, b: Math.random() });
  }

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

    // Setup scene layers
    // 'ui' layer name is special in Scene — it skips camera transform (screen-space).
    // Background stars/nebula use screen-space coords, so we draw them before scene.render().
    scene.createLayer('arena', 5);
    scene.createLayer('kingzone', 8);
    scene.createLayer('players', 20);
    scene.createLayer('ui', 40);

    // Register render functions per layer
    scene.getLayer('arena').addFn(drawArena);
    scene.getLayer('kingzone').addFn(drawKingZone);
    scene.getLayer('players').addFn(drawPlayers);

    if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);

    // Start render loop
    renderLoop = new RenderLoop(canvas);
    renderLoop.start(
      (dt) => {
        TweenManager.update(dt);
        particles.update(dt);
        if (typeof FX !== 'undefined') FX.update(dt);
        if (typeof Visual !== 'undefined') Visual.update(dt);
        camera.update(dt);
      },
      (ctx, dt) => {
        render(ctx, dt);
      }
    );
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.resize(W, H);
    if (typeof FX !== 'undefined') FX.resize(W, H);
  }

  // ============================================================
  // RENDER (called by RenderLoop)
  // ============================================================
  function render(ctx, dt) {
    // Smoothly interpolate platform radius
    renderPlatR += (targetPlatR - renderPlatR) * 0.04;

    // Clear
    ctx.fillStyle = '#06060f';
    ctx.fillRect(0, 0, W, H);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    // Draw background (screen-space stars + nebula) before scene
    drawStars(ctx);

    // Render scene layers — all draw functions use camera.worldToScreen()
    // for coordinate conversion (which includes shake offset), so we
    // render without passing the camera to avoid double-transform.
    scene.render(ctx);

    // Particles (screen-space — spawned at screen coords from worldToScreen)
    particles.draw(ctx);

    // Post-processing (screen space)
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
    if (typeof Visual !== 'undefined') Visual.drawPost(ctx, { vignette: 0.25, grain: 0.015 });
  }

  // ============================================================
  // BACKGROUND (stars + nebula) — drawn in screen space before
  // the scene layers, so it is unaffected by camera transform.
  // ============================================================
  function drawStars(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;

    // Nebula clouds (slow-moving colored gradients)
    const nebulas = [
      { x: 0.3, y: 0.25, r: 0.2, color: '80,40,140', speed: 0.02 },
      { x: 0.7, y: 0.6, r: 0.15, color: '40,60,120', speed: 0.015 },
      { x: 0.5, y: 0.8, r: 0.18, color: '100,30,80', speed: 0.01 },
    ];
    for (const n of nebulas) {
      const nx = (n.x + Math.sin(clock * n.speed) * 0.05) * W;
      const ny = (n.y + Math.cos(clock * n.speed * 1.3) * 0.03) * H;
      const nr = n.r * Math.min(W, H);
      const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
      grad.addColorStop(0, `rgba(${n.color},0.06)`);
      grad.addColorStop(0.5, `rgba(${n.color},0.02)`);
      grad.addColorStop(1, `rgba(${n.color},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2); ctx.fill();
    }

    // Stars with twinkle
    for (const s of stars) {
      const twinkle = 0.25 + Math.sin(clock * 1.5 + s.b * 10) * 0.3;
      ctx.fillStyle = `rgba(200,180,255,${twinkle})`;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ============================================================
  // LAYER: ARENA — disc with gradient, glow, concentric rings
  // ============================================================
  function drawArena(ctx) {
    const radius = renderPlatR;
    const SCALE = camera.getZoom();
    const r = radius * SCALE;
    const center = camera.worldToScreen(0, 0);
    const ax = center.x;
    const ay = center.y;

    // Outer glow
    const glow = ctx.createRadialGradient(ax, ay, r * 0.85, ax, ay, r * 1.4);
    glow.addColorStop(0, 'rgba(140,90,240,0.18)');
    glow.addColorStop(0.6, 'rgba(140,90,240,0.05)');
    glow.addColorStop(1, 'rgba(140,90,240,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ax, ay, r * 1.5, 0, Math.PI * 2); ctx.fill();

    // Arena disc (richer gradient)
    const grad = ctx.createRadialGradient(ax - r * 0.15, ay - r * 0.15, 0, ax, ay, r);
    grad.addColorStop(0, '#352868');
    grad.addColorStop(0.5, '#221a50');
    grad.addColorStop(0.8, '#161040');
    grad.addColorStop(1, '#120C30');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill();

    // Concentric rings
    ctx.strokeStyle = 'rgba(120,80,220,0.08)';
    ctx.lineWidth = 1;
    for (let f = 0.25; f < 1; f += 0.25) {
      ctx.beginPath(); ctx.arc(ax, ay, r * f, 0, Math.PI * 2); ctx.stroke();
    }

    // Pulsing edge ring (danger mode)
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const danger = renderPlatR < 3.5;
    const pulse = 0.4 + Math.sin(clock * (danger ? 6 : 3)) * 0.2;
    ctx.strokeStyle = danger ? `rgba(255,60,60,${pulse})` : `rgba(120,80,220,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ============================================================
  // LAYER: KING ZONE — golden center scoring area
  // ============================================================
  function drawKingZone(ctx) {
    const SCALE = camera.getZoom();
    const center = camera.worldToScreen(0, 0);
    const ax = center.x;
    const ay = center.y;
    const kingR = (kingZoneR || 1.5) * SCALE;

    // King zone glow
    const kingGlow = ctx.createRadialGradient(ax, ay, 0, ax, ay, kingR);
    kingGlow.addColorStop(0, 'rgba(255,200,50,0.12)');
    kingGlow.addColorStop(0.7, 'rgba(255,200,50,0.04)');
    kingGlow.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = kingGlow;
    ctx.beginPath(); ctx.arc(ax, ay, kingR, 0, Math.PI * 2); ctx.fill();

    // King zone ring (dashed)
    ctx.strokeStyle = 'rgba(255,200,50,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(ax, ay, kingR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Crown icon in center
    ctx.fillStyle = 'rgba(255,200,50,0.08)';
    ctx.font = `${Math.round(kingR * 0.4)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('\uD83D\uDC51', ax, ay);
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
      const prevAngle = e.data._prevAngle !== undefined ? e.data._prevAngle : e.data.rAngle;
      const prevRadius = e.data._prevRadius !== undefined ? e.data._prevRadius : e.data.rRadius;
      const tgtAngle = e.data.tAngle !== undefined ? e.data.tAngle : prevAngle;
      const tgtRadius = e.data.tRadius !== undefined ? e.data.tRadius : prevRadius;
      // Angle: shortest path
      let da = tgtAngle - prevAngle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      e.data.rAngle = prevAngle + da * t;
      e.data.rRadius = prevRadius + (tgtRadius - prevRadius) * t;

      // Convert polar (angle, radius) stored in entity to screen coords
      const gx = Math.cos(e.data.rAngle) * e.data.rRadius;
      const gz = Math.sin(e.data.rAngle) * e.data.rRadius;
      const s = camera.worldToScreen(gx, gz);

      // Dash trail particles
      if (e.data.dashing) {
        particles.burst(s.x, s.y, 1, {
          ...ParticleSystem.PRESETS.TRAIL,
          color: e.data.colorRgb || '255,255,255',
          speed: 0.3,
          life: 0.35,
          size: 4,
        });
      }

      // Draw character blob
      const expr = e.data.dashing ? 'determined' : 'happy';
      CharDraw.blob(ctx, s.x, s.y, 22, e.color, {
        idx: e.data.idx || 0,
        clock,
        expression: expr,
        dashing: e.data.dashing,
        running: false,
        character: e.character,
      });
    }
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function updateState(state) {
    lastStateTime = performance.now();
    targetPlatR = state.platR;
    if (state.kingZoneR) kingZoneR = state.kingZoneR;

    // Set camera zoom to match original SCALE = Math.min(W,H) / 13
    const SCALE = Math.min(W || 1280, H || 720) / 13;
    camera.setZoom(SCALE);
    camera.setPosition(0, 0);

    const ids = Object.keys(state.players);
    ids.forEach((id, i) => {
      const pd = state.players[id];
      let e = entities.get(id);
      if (!e) {
        e = entities.create(id, 'player');
        e.data.rAngle = pd.angle;
        e.data.rRadius = pd.radius;
        e.data._prevAngle = pd.angle;
        e.data._prevRadius = pd.radius;
        e.data.tAngle = pd.angle;
        e.data.tRadius = pd.radius;
        e.data.wasAlive = true;
        e.data.idx = i;
        e.color = pd.color;
        e.character = pd.character || null;
        // Pre-compute RGB string from hex color for particles
        e.data.colorRgb = hexToRgb(pd.color);
      }

      // Store previous as current before updating target
      e.data._prevAngle = e.data.rAngle;
      e.data._prevRadius = e.data.rRadius;
      e.data.tAngle = pd.angle;
      e.data.tRadius = pd.radius;

      e.data.dashing = pd.dashing;
      e.visible = pd.alive;
      e.color = pd.color;
      e.character = pd.character || null;
      e.data.colorRgb = hexToRgb(pd.color);

      // Poof on elimination
      if (e.data.wasAlive && !pd.alive) {
        e.data.wasAlive = false;
        const gx = Math.cos(pd.angle) * pd.radius;
        const gz = Math.sin(pd.angle) * pd.radius;
        const s = camera.worldToScreen(gx, gz);
        spawnPoof(s.x, s.y, pd.color);
      }
      if (pd.alive) e.data.wasAlive = true;
    });
  }

  // ============================================================
  // POOF — elimination particle burst
  // ============================================================
  function spawnPoof(sx, sy, color) {
    const rgb = hexToRgb(color);
    particles.burst(sx, sy, 12, {
      speed: 3,
      life: 0.8,
      size: 5,
      sizeEnd: 0,
      gravity: 1.5,
      color: rgb,
      friction: 0.96,
    });
    camera.shake(8, 0.3);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function shortAngleDiff(from, to) {
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function hexToRgb(hex) {
    if (!hex || hex.charAt(0) !== '#') return '255,255,255';
    const h = hex.slice(1);
    const r = parseInt(h.slice(0, 2), 16) || 255;
    const g = parseInt(h.slice(2, 4), 16) || 255;
    const b = parseInt(h.slice(4, 6), 16) || 255;
    return `${r},${g},${b}`;
  }

  function triggerWin() {}

  return { init, updateState, triggerWin };
})();
