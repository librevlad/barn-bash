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

  // Phase 7a — painterly crown overlay. SpriteLoader.loadPainterly strips
  // the image-gen checker-preview background; drawKingZone falls back to
  // the original emoji text when the sprite isn't loaded.
  if (typeof SpriteLoader !== 'undefined') {
    SpriteLoader.loadPainterly('hill-crown', '/assets/hill-crown.png')
      .catch(() => { /* fallback path renders emoji */ });
    SpriteLoader.loadPainterly('hill-crest', '/assets/hill-crest.png')
      .catch(() => { /* silent — crest is purely decorative */ });
  }

  // Phase 8a — heraldic crest fades in when arena enters danger state.
  // Monotonic ramp (never falls back to 0 mid-round) so micro-oscillations
  // around the threshold don't flicker.
  let crestFade = 0;

  // Phase 38b — painted arena backdrop. Procedural wood-grain rings +
  // carnival-red vignette to match the rest of the Frantics aesthetic.
  // When hill-floor.png / hill-bumper.png etc. ship, SpriteLoader swaps
  // the procedural draws for the painterly PNGs (Phase 38c hook).
  const woodRings = [];
  for (let i = 0; i < 18; i++) {
    woodRings.push({
      t: 0.08 + i * 0.045,           // 0..1 radius fraction
      thick: 0.6 + Math.random() * 1.8, // variable stroke
      warp: (Math.random() - 0.5) * 0.06, // slight non-concentric
      tone: 0.85 + Math.random() * 0.15, // brightness jitter
    });
  }
  // Dust motes that drift over the arena to sell the "stage" feel.
  const motes = [];
  for (let i = 0; i < 22; i++) {
    motes.push({
      x: Math.random(), y: Math.random(),
      s: 0.6 + Math.random() * 1.4,
      drift: 0.0006 + Math.random() * 0.0012,
      phase: Math.random() * Math.PI * 2,
    });
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

    // Scene layers. 'ui' skips camera transform (screen-space). Phase 38b
    // inserts a `hazards` layer between kingzone and players so cracks /
    // ice zone / bumper render ON the arena but UNDER the characters.
    scene.createLayer('arena', 5);
    scene.createLayer('kingzone', 8);
    scene.createLayer('hazards', 12);
    scene.createLayer('players', 20);
    scene.createLayer('crest', 22);
    scene.createLayer('ui', 40);

    scene.getLayer('arena').addFn(drawArena);
    scene.getLayer('kingzone').addFn(drawKingZone);
    scene.getLayer('hazards').addFn(drawHazards);
    scene.getLayer('players').addFn(drawPlayers);
    scene.getLayer('crest').addFn(drawHillCrest);

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

    // Phase 38b — painted carnival backdrop (wood-plank gradient +
    // red proscenium vignette). Replaces the prior space-stars look.
    drawCarnivalBackdrop(ctx);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    // Render scene layers — all draw functions use camera.worldToScreen()
    // for coordinate conversion (which includes shake offset), so we
    // render without passing the camera to avoid double-transform.
    scene.render(ctx);

    // Phase 38d — shockwave rings, drawn below particles so dust/sparks
    // sit on top of the ring for depth.
    _drawShockwaves(ctx, dt);

    // Particles (screen-space — spawned at screen coords from worldToScreen)
    particles.draw(ctx);

    // Post-processing (screen space)
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
    if (typeof Visual !== 'undefined') Visual.drawPost(ctx, { vignette: 0.25, grain: 0.015 });
  }

  // ============================================================
  // PHASE 38b — CARNIVAL BACKDROP (screen-space, behind scene)
  // Deep wood-plank gradient with red-curtain vignette + drifting
  // dust motes. Matches the painted-carnival aesthetic of the rest
  // of the product (lobby backdrops, tournament scoreboard, etc.).
  // ============================================================
  function drawCarnivalBackdrop(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;

    // Wood-plank radial gradient — brown core, darker at edges.
    const cx = W / 2, cy = H / 2;
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, Math.max(W, H));
    bgGrad.addColorStop(0,    '#3a2416');
    bgGrad.addColorStop(0.55, '#241510');
    bgGrad.addColorStop(1,    '#110806');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Vertical plank seams — thin dark lines every ~120px to suggest
    // a wooden stage floor even outside the arena disc.
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#0c0705';
    ctx.lineWidth = 1;
    const seam = 140;
    for (let x = (cx % seam) - seam; x < W; x += seam) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.restore();

    // Red-curtain proscenium vignette — warm red glow in the top
    // corners, fading to the centre. Reads as "spotlit stage".
    const curtainL = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(W, H) * 0.8);
    curtainL.addColorStop(0,   'rgba(140, 40, 30, 0.22)');
    curtainL.addColorStop(0.6, 'rgba(80, 15, 10, 0.08)');
    curtainL.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = curtainL;
    ctx.fillRect(0, 0, W, H);
    const curtainR = ctx.createRadialGradient(W, 0, 0, W, 0, Math.max(W, H) * 0.8);
    curtainR.addColorStop(0,   'rgba(140, 40, 30, 0.22)');
    curtainR.addColorStop(0.6, 'rgba(80, 15, 10, 0.08)');
    curtainR.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = curtainR;
    ctx.fillRect(0, 0, W, H);

    // Drifting dust motes — warm gold, sparse, small.
    for (const m of motes) {
      const mx = ((m.x + clock * m.drift) % 1) * W;
      const my = (m.y + Math.sin(clock * 0.4 + m.phase) * 0.02) * H;
      const alpha = 0.12 + Math.sin(clock * 1.2 + m.phase) * 0.08;
      ctx.fillStyle = `rgba(255, 210, 140, ${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(mx, my, m.s, 0, Math.PI * 2); ctx.fill();
    }

    // Bottom shadow — heavy grade at the floor-line to seat the arena.
    const floor = ctx.createLinearGradient(0, H * 0.6, 0, H);
    floor.addColorStop(0, 'rgba(0, 0, 0, 0)');
    floor.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = floor;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }

  // ============================================================
  // LAYER: ARENA — painted wood disc (Phase 38b)
  //
  // Placeholder for a commissioned hill-floor.png. Procedural build:
  //   1. Soft ambient glow (warm amber).
  //   2. Wood-plank disc — radial gradient from warm honey centre
  //      to dark walnut edge.
  //   3. Concentric wood rings (variable thickness + slight warp)
  //      suggest hand-planed grain.
  //   4. Radial "scuff" streaks cross a few rings for painted
  //      looseness.
  //   5. Brass rim + danger pulse (kept from legacy render).
  // ============================================================
  function drawArena(ctx) {
    const SCALE = camera.getZoom();
    const r = renderPlatR * SCALE;
    const c = camera.worldToScreen(0, 0);
    const ax = c.x, ay = c.y;
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const danger = renderPlatR < 3.5;

    // Ambient warm glow (spotlight-on-stage)
    const glow = ctx.createRadialGradient(ax, ay, r * 0.85, ax, ay, r * 1.55);
    glow.addColorStop(0, 'rgba(255, 195, 120, 0.20)');
    glow.addColorStop(0.6, 'rgba(190, 120, 60, 0.06)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ax, ay, r * 1.55, 0, Math.PI * 2); ctx.fill();

    // Wood disc — warm honey-to-walnut gradient
    const wood = ctx.createRadialGradient(ax - r * 0.18, ay - r * 0.18, 0, ax, ay, r);
    wood.addColorStop(0,    '#a6733d');
    wood.addColorStop(0.45, '#7a4e24');
    wood.addColorStop(0.82, '#4e2f17');
    wood.addColorStop(1,    '#3a200f');
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill();

    // Clip further rendering to the disc so grain + cracks never
    // escape the arena outline.
    ctx.save();
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.clip();

    // Wood-grain rings — variable thickness, slightly warped
    ctx.strokeStyle = 'rgba(30, 18, 10, 0.38)';
    for (const ring of woodRings) {
      ctx.lineWidth = ring.thick;
      ctx.strokeStyle = `rgba(${Math.floor(40 * ring.tone)}, ${Math.floor(24 * ring.tone)}, ${Math.floor(12 * ring.tone)}, 0.38)`;
      ctx.beginPath();
      ctx.arc(ax + ring.warp * r, ay + ring.warp * r * 0.7, r * ring.t, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Radial scuff streaks — hand-painted look
    ctx.strokeStyle = 'rgba(30, 18, 10, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r1 = r * (0.3 + Math.sin(i * 12.9) * 0.2);
      const r2 = r * (0.7 + Math.cos(i * 7.3) * 0.15);
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(a) * r1, ay + Math.sin(a) * r1);
      ctx.lineTo(ax + Math.cos(a) * r2, ay + Math.sin(a) * r2);
      ctx.stroke();
    }

    // Soft vignette inside the disc — recessed-stage feel
    const inner = ctx.createRadialGradient(ax, ay, r * 0.6, ax, ay, r);
    inner.addColorStop(0, 'rgba(0, 0, 0, 0)');
    inner.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = inner;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill();

    ctx.restore(); // unclip

    // Brass rim — double-ring carnival signature
    ctx.strokeStyle = (typeof Palette !== 'undefined' ? Palette.accentGoldEdge : 'rgba(138,103,24,0.85)');
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(ax, ay, r + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = (typeof Palette !== 'undefined' ? Palette.accentGoldDim : 'rgba(176,133,28,0.8)');
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, r + 1, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 221, 107, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(ax, ay, r - 2, 0, Math.PI * 2); ctx.stroke();

    // Brass rivets — 12 studs around the rim
    ctx.fillStyle = 'rgba(255, 221, 107, 0.85)';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rx = ax + Math.cos(a) * (r + 1);
      const ry = ay + Math.sin(a) * (r + 1);
      ctx.beginPath(); ctx.arc(rx, ry, 2.4, 0, Math.PI * 2); ctx.fill();
    }

    // Pulsing danger edge
    const pulse = 0.5 + Math.sin(clock * (danger ? 6 : 2.5)) * 0.25;
    ctx.strokeStyle = danger
      ? `rgba(217, 83, 79, ${pulse})`
      : `rgba(255, 200, 120, ${pulse * 0.35})`;
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

    // King zone glow — deeper gold-bulb spotlight so the center reads
    // as the prize, not just a marker
    const clock2 = renderLoop ? renderLoop.getClock() : 0;
    const breath = 0.9 + Math.sin(clock2 * 1.8) * 0.12;
    const kingGlow = (typeof Palette !== 'undefined'
      ? Palette.spotlight(ctx, ax, ay, kingR * 1.4 * breath)
      : null);
    if (kingGlow) {
      ctx.fillStyle = kingGlow;
    } else {
      const fallback = ctx.createRadialGradient(ax, ay, 0, ax, ay, kingR);
      fallback.addColorStop(0, 'rgba(255,200,50,0.18)');
      fallback.addColorStop(0.7, 'rgba(255,200,50,0.06)');
      fallback.addColorStop(1, 'rgba(255,200,50,0)');
      ctx.fillStyle = fallback;
    }
    ctx.beginPath(); ctx.arc(ax, ay, kingR * 1.4, 0, Math.PI * 2); ctx.fill();

    // King zone ring (dashed gold)
    ctx.strokeStyle = (typeof Palette !== 'undefined'
      ? 'rgba(244,197,66,0.35)'
      : 'rgba(255,200,50,0.2)');
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(ax, ay, kingR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    // Crown icon in center — Phase 7a painterly PNG overlay when loaded;
    // falls back to emoji text at the original styling. Sprite drawn at
    // 0.9x king-zone radius so it sits inside the dashed ring.
    const crownSprite = typeof SpriteLoader !== 'undefined'
      ? SpriteLoader.get('hill-crown') : null;
    if (crownSprite) {
      const cw = kingR * 1.8, ch = kingR * 1.8;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.drawImage(crownSprite, ax - cw / 2, ay - ch / 2, cw, ch);
      ctx.restore();
    } else {
      ctx.fillStyle = (typeof Palette !== 'undefined'
        ? 'rgba(255,221,107,0.22)'
        : 'rgba(255,200,50,0.1)');
      ctx.font = `${Math.round(kingR * 0.44)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\uD83D\uDC51', ax, ay);
    }
  }

  // ============================================================
  // LAYER: HAZARDS (Phase 38b) — cracks + ice zone + bumper
  //
  // Reads state set by updateState(). Each hazard has a procedural
  // placeholder that carries the carnival aesthetic; when a
  // commissioned PNG ships (hill-crack.png / hill-ice.png /
  // hill-bumper.png), SpriteLoader.loadPainterly swaps it in.
  // ============================================================
  let hazardState = { cracks: [], iceZone: null, bumperActive: false, bumperAngle: 0 };
  function drawHazards(ctx) {
    const SCALE = camera.getZoom();
    const c = camera.worldToScreen(0, 0);
    const ax = c.x, ay = c.y;
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const r = renderPlatR * SCALE;

    // Clip hazards to arena disc so they don't bleed onto backdrop.
    ctx.save();
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.clip();

    // Ice zone — light-blue pie slice with shimmer
    if (hazardState.iceZone) {
      const iz = hazardState.iceZone;
      ctx.save();
      const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, r);
      grad.addColorStop(0, 'rgba(180, 230, 255, 0)');
      grad.addColorStop(0.5, 'rgba(180, 230, 255, 0.28)');
      grad.addColorStop(1, 'rgba(220, 240, 255, 0.45)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.arc(ax, ay, r, iz.angle - iz.spread, iz.angle + iz.spread);
      ctx.closePath();
      ctx.fill();

      // Shimmer highlights — short bright strokes drifting
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) {
        const ta = iz.angle + (Math.sin(clock * 1.3 + i) * iz.spread * 0.7);
        const tr = r * (0.35 + ((i * 0.13 + clock * 0.05) % 0.55));
        const x = ax + Math.cos(ta) * tr;
        const y = ay + Math.sin(ta) * tr;
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x + 4, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Cracks — dark jagged scars on the floor
    for (const crack of hazardState.cracks) {
      const cx = ax + Math.cos(crack.angle) * crack.radius * SCALE;
      const cy = ay + Math.sin(crack.angle) * crack.radius * SCALE;
      const rad = 0.8 * SCALE;

      // Shadow base
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.beginPath(); ctx.arc(cx, cy, rad * 1.05, 0, Math.PI * 2); ctx.fill();

      // Jagged crack lines radiating from centre — painted splat feel
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 2;
      const seed = (crack.angle * 17.3 + crack.radius * 4.1);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + (seed % 1) * 0.5;
        const r1 = rad * 0.15;
        const r2 = rad * (0.65 + ((seed * (k + 1)) % 1) * 0.35);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        // One bend so crack reads as jagged rather than a line
        const ma = a + 0.25 - ((seed + k) % 1) * 0.5;
        const mr = (r1 + r2) * 0.55;
        ctx.lineTo(cx + Math.cos(ma) * mr, cy + Math.sin(ma) * mr);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }
      // Highlight rim — thin gold rim reading "danger marker"
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    }

    // Bumper — rotating gold-red stud at 0.8 world units from centre
    if (hazardState.bumperActive) {
      const bx = ax + Math.cos(hazardState.bumperAngle) * 0.8 * SCALE;
      const by = ay + Math.sin(hazardState.bumperAngle) * 0.8 * SCALE;
      const br = 0.8 * SCALE;

      // Rubber rim (red)
      const rimGrad = ctx.createRadialGradient(bx, by, br * 0.5, bx, by, br);
      rimGrad.addColorStop(0, 'rgba(200, 60, 50, 0.9)');
      rimGrad.addColorStop(1, 'rgba(120, 20, 15, 1)');
      ctx.fillStyle = rimGrad;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();

      // Gold centre disc with bright highlight
      const coreGrad = ctx.createRadialGradient(bx - br * 0.2, by - br * 0.2, 0, bx, by, br * 0.6);
      coreGrad.addColorStop(0, '#ffe08a');
      coreGrad.addColorStop(0.7, '#d4952d');
      coreGrad.addColorStop(1, '#8a5918');
      ctx.fillStyle = coreGrad;
      ctx.beginPath(); ctx.arc(bx, by, br * 0.6, 0, Math.PI * 2); ctx.fill();

      // Pulsing halo
      const halo = 0.35 + Math.sin(clock * 5) * 0.2;
      ctx.strokeStyle = `rgba(255, 180, 80, ${halo})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, br + 3, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.restore(); // unclip
  }

  // ============================================================
  // LAYER: HILL CREST (Phase 8a — arena-shrink heraldic crest)
  // ============================================================
  function drawHillCrest(ctx) {
    // Monotonic fade in: crosses 3.5 threshold once, crest stays.
    // 400ms ramp ≈ 0.025 per frame at 60fps.
    if (renderPlatR < 3.5 && crestFade < 1) {
      crestFade = Math.min(1, crestFade + 0.025);
    }
    if (crestFade <= 0) return;
    const sprite = typeof SpriteLoader !== 'undefined'
      ? SpriteLoader.get('hill-crest') : null;
    if (!sprite) return;
    const SCALE = camera.getZoom();
    // Anchor above the king zone, below the HUD strip — visible even
    // at the wider viewports where world y=-6 would clip off-screen.
    const anchor = camera.worldToScreen(0, -4);
    const size = 2.5 * SCALE;
    ctx.save();
    ctx.globalAlpha = crestFade * 0.85;
    ctx.drawImage(sprite, anchor.x - size / 2, anchor.y - size / 2, size, size);
    ctx.restore();
  }

  // ============================================================
  // LAYER: PLAYERS (using EntityManager)
  // ============================================================
  function drawPlayers(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;

    for (const e of entities.all()) {
      if (!e.visible) continue;

      // Cartesian interpolation (Phase 38a). Server sends every 100ms;
      // we ease prev → target over that window.
      const elapsed = performance.now() - lastStateTime;
      const t = Math.min(1, elapsed / 100);
      const prevX = e.data._prevX !== undefined ? e.data._prevX : e.data.rX;
      const prevY = e.data._prevY !== undefined ? e.data._prevY : e.data.rY;
      const tgtX = e.data.tX !== undefined ? e.data.tX : prevX;
      const tgtY = e.data.tY !== undefined ? e.data.tY : prevY;
      e.data.rX = prevX + (tgtX - prevX) * t;
      e.data.rY = prevY + (tgtY - prevY) * t;

      const s = camera.worldToScreen(e.data.rX, e.data.rY);

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

      // Tick down per-entity hit flash (set by triggerHit)
      if (e.data.hitFlash > 0) {
        e.data.hitFlash = Math.max(0, e.data.hitFlash - (dt || 0.016) * 3);
      }

      // Pose selection — server state drives which frame to render.
      let pose = 'idle';
      if (e.data.teetering) pose = 'teeter';
      else if (e.data.dashing) pose = 'dash';
      else if (e.data.hitFlash > 0.4) pose = 'hit';
      else {
        // Moving if rendered position changed perceptibly frame-to-frame.
        const moving = Math.abs(e.data.rX - (e.data._prevDrawX || 0)) > 0.01
                    || Math.abs(e.data.rY - (e.data._prevDrawY || 0)) > 0.01;
        if (moving) pose = 'move';
      }
      e.data._prevDrawX = e.data.rX;
      e.data._prevDrawY = e.data.rY;

      CharSprite.draw(ctx, s.x, s.y, 22, {
        character: e.character,
        colorRgb: e.data.colorRgb,
        color: e.color,
        pose: pose,
        clock: clock,
        hitFlash: e.data.hitFlash || 0,
        idx: e.data.idx || 0,
      });

      if (e.data.score > 0) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = 'rgba(255,200,50,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(e.data.score, s.x, s.y + 28);
      }
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
  // PUBLIC API
  // ============================================================
  function updateState(state) {
    lastStateTime = performance.now();
    targetPlatR = state.platR;
    if (state.kingZoneR) kingZoneR = state.kingZoneR;

    // Phase 38b — hazard state for the hazards layer.
    hazardState.cracks = state.cracks || [];
    hazardState.iceZone = state.iceZone || null;
    hazardState.bumperActive = !!state.bumperActive;
    hazardState.bumperAngle = state.bumperAngle || 0;

    const SCALE = Math.min(W || 1280, H || 720) / 13;
    camera.setZoom(SCALE);
    camera.setPosition(0, 0);

    const ids = Object.keys(state.players);
    ids.forEach((id, i) => {
      const pd = state.players[id];
      let e = entities.get(id);
      if (!e) {
        e = entities.create(id, 'player');
        // Phase 38a — cartesian x/y. Back-compat with polar (angle/radius)
        // payload from an older server build is not needed — the server
        // always emits x/y after Phase 38a.
        e.data.rX = pd.x || 0;
        e.data.rY = pd.y || 0;
        e.data._prevX = e.data.rX;
        e.data._prevY = e.data.rY;
        e.data.tX = e.data.rX;
        e.data.tY = e.data.rY;
        e.data.wasAlive = true;
        e.data.idx = i;
        e.color = pd.color;
        e.character = pd.character || null;
        e.data.colorRgb = hexToRgb(pd.color);
      }

      e.data._prevX = e.data.rX;
      e.data._prevY = e.data.rY;
      e.data.tX = pd.x || 0;
      e.data.tY = pd.y || 0;

      // Phase 38d — dust puff on dash-start (false→true transition).
      if (!e.data.dashing && pd.dashing) {
        const ss = camera.worldToScreen(e.data.rX || 0, e.data.rY || 0);
        particles.burst(ss.x, ss.y + 18, 9, {
          speed: 2.2,
          life: 0.55,
          size: 4,
          sizeEnd: 0,
          gravity: 0.6,
          color: '220,200,170',
          friction: 0.92,
        });
        camera.shake(2, 0.1);
      }
      e.data.dashing = pd.dashing;
      e.data.teetering = pd.teetering;
      e.data.facing = pd.facing || 0;
      e.data.score = pd.score || 0;
      e.data.name = pd.name || null;
      e.visible = pd.alive;
      e.color = pd.color;
      e.character = pd.character || null;
      e.data.colorRgb = hexToRgb(pd.color);

      if (e.data.wasAlive && !pd.alive) {
        e.data.wasAlive = false;
        const s = camera.worldToScreen(pd.x || 0, pd.y || 0);
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
  // PHASE 38d — IMPACT JUICE
  //
  // Shockwave rings + dust puffs + impact sparks driven from
  // main.js bump / ground_pound / dash handlers via public API.
  // Rings kept in a local array, drawn above arena but below the
  // characters so they read as ground-level effects.
  // ============================================================
  const shockwaves = [];

  function _addShockwave(worldX, worldY, opts) {
    shockwaves.push({
      wx: worldX, wy: worldY,
      r0: opts.r0 || 0,
      r1: opts.r1 || 3.2,
      age: 0,
      ttl: opts.ttl || 0.5,
      color: opts.color || '255,200,120',
      width: opts.width || 6,
    });
  }

  function _drawShockwaves(ctx, dt) {
    const SCALE = camera.getZoom();
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const w = shockwaves[i];
      w.age += (dt || 0.016);
      const t = w.age / w.ttl;
      if (t >= 1) { shockwaves.splice(i, 1); continue; }
      const s = camera.worldToScreen(w.wx, w.wy);
      const r = (w.r0 + (w.r1 - w.r0) * t) * SCALE;
      const alpha = 1 - t;
      ctx.save();
      ctx.strokeStyle = `rgba(${w.color},${(alpha * 0.85).toFixed(3)})`;
      ctx.lineWidth = w.width * (1 - t * 0.6);
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke();
      // Inner faint fill to sell the shockwave
      ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.35).toFixed(3)})`;
      ctx.lineWidth = Math.max(1, w.width * 0.35 * (1 - t));
      ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // Public trigger API — called from main.js message handlers.

  function triggerDashStart(playerId) {
    const e = entities.get(playerId);
    if (!e) return;
    const s = camera.worldToScreen(e.data.rX || 0, e.data.rY || 0);
    // Dust puff — warm neutral so it reads on the wood floor
    particles.burst(s.x, s.y + 18, 9, {
      speed: 2.2,
      life: 0.55,
      size: 4,
      sizeEnd: 0,
      gravity: 0.6,
      color: '220,200,170',
      friction: 0.92,
    });
    camera.shake(3, 0.12);
  }

  function triggerBump(playerId, fromPlayerId) {
    const a = entities.get(playerId);
    if (!a) return;
    // Spark burst at the target's feet
    const s = camera.worldToScreen(a.data.rX || 0, a.data.rY || 0);
    particles.burst(s.x, s.y, 14, {
      speed: 4.5,
      life: 0.5,
      size: 4,
      sizeEnd: 0,
      gravity: 0,
      color: '255,230,140',
      friction: 0.92,
    });
    // Dust puff under the target
    particles.burst(s.x, s.y + 16, 7, {
      speed: 2.8,
      life: 0.6,
      size: 5,
      sizeEnd: 0,
      gravity: 0.5,
      color: '220,200,170',
      friction: 0.9,
    });
    // Halo shockwave at impact point
    _addShockwave(a.data.rX || 0, a.data.rY || 0, {
      r0: 0.25, r1: 1.6, ttl: 0.35, color: '255,220,140', width: 5,
    });
    camera.shake(6, 0.2);
    if (a) a.data.hitFlash = 1;
  }

  function triggerGroundPound(playerId) {
    const e = entities.get(playerId);
    if (!e) return;
    const s = camera.worldToScreen(e.data.rX || 0, e.data.rY || 0);
    // Big dust cloud
    particles.burst(s.x, s.y + 18, 22, {
      speed: 3.5,
      life: 0.9,
      size: 7,
      sizeEnd: 0,
      gravity: 0.5,
      color: '200,180,160',
      friction: 0.9,
    });
    // Inner expanding ring
    _addShockwave(e.data.rX || 0, e.data.rY || 0, {
      r0: 0.2, r1: 2.4, ttl: 0.55, color: '176,112,255', width: 8,
    });
    // Outer wide ring (faster fade)
    _addShockwave(e.data.rX || 0, e.data.rY || 0, {
      r0: 0.4, r1: 3.0, ttl: 0.7, color: '255,200,120', width: 4,
    });
    camera.shake(14, 0.35);
  }

  function triggerGravityBomb(playerId) {
    const e = entities.get(playerId);
    if (!e) return;
    // Implosion-then-explosion ring
    _addShockwave(e.data.rX || 0, e.data.rY || 0, {
      r0: 0.3, r1: 4.5, ttl: 0.9, color: '255,136,0', width: 10,
    });
    const s = camera.worldToScreen(e.data.rX || 0, e.data.rY || 0);
    particles.burst(s.x, s.y, 30, {
      speed: 6,
      life: 1.0,
      size: 6,
      sizeEnd: 0,
      gravity: -0.2,
      color: '255,136,0',
      friction: 0.93,
    });
    camera.shake(18, 0.5);
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

  // Phase 38c — hit-flash API. main.js bump handler calls this with the
  // player id that took the impact so the sprite plays a 'hit' pose
  // for ~350 ms.
  function triggerHit(playerId) {
    const e = entities.get(playerId);
    if (e) e.data.hitFlash = 1;
  }

  return {
    init, updateState, triggerWin, triggerHit,
    // Phase 38d juice triggers
    triggerDashStart, triggerBump, triggerGroundPound, triggerGravityBomb,
  };
})();
