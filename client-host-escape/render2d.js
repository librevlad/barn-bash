// ============================================================
// Escape the Fox — 2D Side-Scroll Runner (Engine-powered)
// Uses: RenderLoop, Camera2D, Scene, ParticleSystem, TweenManager, EntityManager
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
  let worldDist = 0, foxDist = -5, foxProx = 0, speed = 0.3;
  let obstacles = [];
  let powerups = [];
  let foxSprinting = false;
  let dramatic = false;
  let targetWorldDist = 0, targetFoxDist = -5, targetSpeed = 0.3;
  let lastUpdateTime = 0;
  let lastStateTime = 0;

  // Biome system — vibrant, saturated colors (pro quality)
  const BIOMES = [
    { name: 'forest', sky: ['#1e3560','#0c1a30'], ground: ['#2d7a42','#1a5a2a'], tree: '#35884a' },
    { name: 'cave',   sky: ['#1a1a30','#0e0e1e'], ground: ['#4a4a5e','#353050'], tree: '#5a5a70' },
    { name: 'snow',   sky: ['#5a70a0','#3a4a70'], ground: ['#a0b5cc','#7a90aa'], tree: '#5a9068' },
    { name: 'volcano',sky: ['#601a08','#351005'], ground: ['#7a3020','#4a1a0a'], tree: '#884030' },
  ];
  let currentBiome = 0;

  // Phase 6a — painterly biome tree overlay. Each PNG is loaded through
  // SpriteLoader.loadPainterly which chroma-keys the baked checker-preview
  // background (image-gen tools export a grey/white checker instead of
  // true alpha). Failed loads leave the slot empty, so drawTrees falls
  // through to the procedural round-canopy code untouched.
  if (typeof SpriteLoader !== 'undefined') {
    ['forest', 'cave', 'snow', 'volcano'].forEach((name) => {
      SpriteLoader.loadPainterly('tree-' + name, '/assets/tree-' + name + '.png')
        .catch(() => { /* asset not commissioned yet — fallback handles it */ });
    });
  }
  function getBiomeTreeSprite() {
    const dist = Math.max(0, worldDist);
    const biomeLen = 30;
    const idx = Math.floor(dist / biomeLen) % BIOMES.length;
    const t = (dist % biomeLen) / biomeLen;
    // Gate out during the 80-100% blend window so painterly trees don't
    // pop mid-transition (procedural draws through the crossfade).
    if (t > 0.8) return null;
    if (typeof SpriteLoader === 'undefined') return null;
    return SpriteLoader.get('tree-' + BIOMES[idx].name);
  }
  function lerpColor(a, b, t) {
    const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
    const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
    const r = pa.map((v,i) => Math.round(v + (pb[i] - v) * t));
    return '#' + r.map(v => v.toString(16).padStart(2,'0')).join('');
  }
  function getBiomeColors() {
    const dist = Math.max(0, worldDist);
    const biomeLen = 30;
    const idx = Math.floor(dist / biomeLen) % BIOMES.length;
    const t = (dist % biomeLen) / biomeLen;
    const next = (idx + 1) % BIOMES.length;
    const a = BIOMES[idx], b = BIOMES[next];
    // Smooth transition in last 20% of biome
    const blend = t < 0.8 ? 0 : (t - 0.8) / 0.2;
    return {
      sky1: lerpColor(a.sky[0], b.sky[0], blend),
      sky2: lerpColor(a.sky[1], b.sky[1], blend),
      ground: lerpColor(a.ground[0], b.ground[0], blend),
      groundDark: lerpColor(a.ground[1], b.ground[1], blend),
      tree: lerpColor(a.tree, b.tree, blend),
    };
  }

  // Stars (static background)
  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({ x: Math.random(), y: Math.random() * 0.45, s: 0.5 + Math.random() * 1.5, b: Math.random() });
  }

  // Cloud shapes
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({ x: Math.random() * 2, y: 0.15 + Math.random() * 0.25, w: 60 + Math.random() * 80, speed: 0.003 + Math.random() * 0.005 });
  }

  // Tree templates (x offset from world pos)
  const treeDefs = [];
  for (let i = 0; i < 30; i++) {
    treeDefs.push({
      worldX: i * 120 + Math.random() * 40,
      type: Math.floor(Math.random() * 3), // 0=round, 1=pine, 2=bush
      h: 30 + Math.random() * 40,
      side: Math.random() > 0.5 ? 1 : -1,
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
    if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);

    // Setup scene layers (all screen-space for this side-scroller).
    // Phase 62a — `painted-scene` layer sits under everything. It
    // draws /assets/gameplay-escape-scene.png cover-fit as the
    // atmospheric backdrop so procedural sky + hills + trees read
    // as biome-tinted overlay on top of Hearthstone-tier painted
    // horizon + moon + distant pines.
    scene.createLayer('painted-scene', -1);
    scene.createLayer('sky', 0);
    scene.createLayer('clouds', 2);
    scene.createLayer('hills', 4);
    scene.createLayer('ground', 5);
    scene.createLayer('trees', 8);
    scene.createLayer('obstacles', 10);
    scene.createLayer('powerups', 12);
    scene.createLayer('players', 20);
    scene.createLayer('fox', 22);
    scene.createLayer('foxwarning', 24);
    scene.createLayer('effects', 30);
    scene.createLayer('ui', 40);

    // Register render functions per layer
    scene.getLayer('painted-scene').addFn(drawPaintedScene);
    scene.getLayer('sky').addFn(drawSky);
    scene.getLayer('clouds').addFn(drawClouds);
    scene.getLayer('hills').addFn(drawHills);
    scene.getLayer('ground').addFn(drawGroundLayer);
    scene.getLayer('trees').addFn(drawTrees);
    scene.getLayer('obstacles').addFn(drawObstacles);
    scene.getLayer('powerups').addFn(drawPowerups);
    scene.getLayer('players').addFn(drawPlayers);
    scene.getLayer('fox').addFn(drawFox);
    scene.getLayer('foxwarning').addFn(drawFoxWarning);
    scene.getLayer('effects').addFn(drawBiomeCurtain);
    scene.getLayer('effects').addFn(drawDust);
    scene.getLayer('ui').addFn(drawLaneMarkers);

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
    if (typeof FX !== 'undefined') FX.resize(W, H);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    camera.resize(W, H);
  }

  // ============================================================
  // RENDER (called by RenderLoop)
  // ============================================================
  function render(ctx, dt) {
    const clock = renderLoop.getClock();

    // Client interpolation for smooth scrolling
    const elapsed = (performance.now() - lastUpdateTime) / 1000;
    worldDist = targetWorldDist + targetSpeed * Math.min(elapsed, 0.15);
    foxDist = targetFoxDist + targetSpeed * 0.95 * Math.min(elapsed, 0.15);

    // Camera tracks worldDist for side-scrolling (x axis = scroll)
    camera.x = worldDist;

    // Camera shake is handled by Camera2D.update(dt) via shake()

    ctx.clearRect(0, 0, W, H);

    // FX pre-draw
    ctx.save();
    ctx.translate(camera._shakeOffsetX, camera._shakeOffsetY);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    // Dramatic finish zoom
    if (dramatic) {
      ctx.translate(W * 0.025, H * 0.025);
      ctx.scale(0.95 + Math.sin(clock * 2) * 0.01, 0.95 + Math.sin(clock * 2) * 0.01);
    }

    // Render all scene layers (no camera transform — this is a side-scroller
    // where layers manage their own worldDist-based parallax)
    scene.render(ctx, null);

    ctx.restore();

    // Particles (screen space — dust at feet)
    particles.draw(ctx);

    // FX overlay (particles, popups, screen effects)
    if (typeof FX !== 'undefined') {
      FX.drawAfter(ctx);
      FX.setVignette(foxProx * 0.6, '180,20,0');
    }
    // Professional post-processing
    if (typeof Visual !== 'undefined') {
      Visual.drawPost(ctx, {
        vignette: 0.3 + foxProx * 0.4,
        vignetteColor: foxProx > 0.5 ? '180,20,0' : '0,0,0',
        grain: 0.02,
        speedIntensity: speed > 0.35 ? (speed - 0.35) * 3 : 0,
      });
    }
  }

  // ============================================================
  // LAYER: PAINTED SCENE (Phase 62a)
  // ============================================================
  // Commissioned painted dusk-forest horizon + moon + distant pines
  // + dark ground texture. Rendered as the bottom canvas layer so
  // every procedural / sprite render composites over it. Biome
  // tint is applied as a semi-transparent wash in drawSky (which
  // runs on the next layer up).
  const paintedScene = new Image();
  paintedScene.src = '/assets/gameplay-escape-scene.png';
  let paintedSceneReady = false;
  paintedScene.onload = () => { paintedSceneReady = true; };
  paintedScene.onerror = () => { paintedSceneReady = false; };
  function drawPaintedScene(ctx) {
    if (!paintedSceneReady) return;
    // Cover-fit: scale to fill canvas, preserve aspect, center-anchor
    const iw = paintedScene.naturalWidth, ih = paintedScene.naturalHeight;
    if (!iw || !ih) return;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale, dh = ih * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ctx.drawImage(paintedScene, dx, dy, dw, dh);
  }

  // ============================================================
  // LAYER: SKY
  // ============================================================
  // Phase 62a — when the painted scene loads, the biome gradient
  // becomes a low-alpha wash overlaying the painted dusk sky so
  // biome transitions (forest → cave → snow → volcano) still
  // read but don't obscure the commissioned art. Stars + moon
  // are gated off (painted scene has its own moon + stars).
  function drawSky(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const bc = getBiomeColors();
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    grad.addColorStop(0, bc.sky1);
    grad.addColorStop(1, bc.sky2);
    ctx.save();
    // Low-alpha biome tint wash over painted scene; raw paint if
    // the asset didn't load.
    ctx.globalAlpha = paintedSceneReady ? 0.35 : 1;
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.65);
    ctx.restore();

    if (paintedSceneReady) return;

    // Stars (fallback only — painted scene has its own)
    for (const s of stars) {
      const twinkle = 0.3 + Math.sin(clock * 2 + s.b * 10) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon (fallback only)
    ctx.fillStyle = 'rgba(255,240,200,0.15)';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.12, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.08)';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.12, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============================================================
  // LAYER: CLOUDS
  // ============================================================
  function drawClouds(ctx) {
    for (const c of clouds) {
      c.x -= c.speed;
      if (c.x < -0.2) c.x = 1.2;
      const cx = c.x * W, cy = c.y * H;
      ctx.fillStyle = 'rgba(200,210,230,0.06)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, c.w, c.w * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============================================================
  // LAYER: HILLS (parallax)
  // ============================================================
  function drawHills(ctx) {
    const bc = getBiomeColors();
    const groundY = H * 0.62;
    ctx.fillStyle = bc.groundDark;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - worldDist * 8) % (W + 400)) - 200;
      ctx.beginPath();
      ctx.ellipse(x, groundY + 10, 200, 50, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============================================================
  // LAYER: GROUND
  // ============================================================
  function drawGroundLayer(ctx) {
    const bc = getBiomeColors();
    const groundY = H * 0.62;

    // Main ground gradient
    const gGrad = ctx.createLinearGradient(0, groundY, 0, H);
    gGrad.addColorStop(0, bc.ground);
    gGrad.addColorStop(0.3, bc.groundDark);
    gGrad.addColorStop(1, '#0a1a10');
    ctx.fillStyle = gGrad;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Ground line
    ctx.strokeStyle = 'rgba(100,200,120,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
  }

  // ============================================================
  // LAYER: TREES
  // ============================================================
  function drawTrees(ctx) {
    const groundY = H * 0.62;
    const scrollX = worldDist * 30;
    for (const t of treeDefs) {
      let x = ((t.worldX - scrollX) % (30 * 120));
      if (x < -100) x += 30 * 120;
      if (x > W + 100) continue;

      const baseY = groundY - 2;
      ctx.save();
      ctx.translate(x, baseY);

      const bc = getBiomeColors();
      const lighten = CharDraw.lighten, darken = CharDraw.darken;
      if (t.type === 0) {
        // Phase 6a — painterly overlay when the biome PNG is ready
        const sprite = getBiomeTreeSprite();
        if (sprite) {
          // Ground shadow (mirror the procedural ellipse)
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath(); ctx.ellipse(3, 2, t.h * 0.3, 4, 0, 0, Math.PI * 2); ctx.fill();
          // Sprite centered on trunk base (y=0 is ground plane here)
          const drawH = t.h * 1.8;
          const drawW = drawH;
          ctx.drawImage(sprite, -drawW / 2, -drawH, drawW, drawH);
        } else {
          // Round tree — trunk + shadow + multi-layer canopy (procedural fallback)
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath(); ctx.ellipse(3, 2, t.h * 0.3, 4, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#4a3520';
          ctx.fillRect(-3, -t.h * 0.4, 7, t.h * 0.4);
          // Canopy layers (dark -> light)
          ctx.fillStyle = darken(bc.tree, 15);
          ctx.beginPath(); ctx.arc(0, -t.h * 0.45, t.h * 0.38, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = bc.tree;
          ctx.beginPath(); ctx.arc(-2, -t.h * 0.52, t.h * 0.3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = lighten(bc.tree, 20);
          ctx.beginPath(); ctx.arc(4, -t.h * 0.58, t.h * 0.2, 0, Math.PI * 2); ctx.fill();
          // Highlight
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.beginPath(); ctx.arc(-4, -t.h * 0.6, t.h * 0.15, 0, Math.PI * 2); ctx.fill();
        }
      } else if (t.type === 1) {
        // Pine — layered triangles with depth
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.ellipse(2, 2, t.h * 0.15, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(-2, -t.h * 0.3, 5, t.h * 0.3);
        // 3 triangle layers
        ctx.fillStyle = darken(bc.tree, 20);
        ctx.beginPath(); ctx.moveTo(0, -t.h); ctx.lineTo(-t.h * 0.32, -t.h * 0.15); ctx.lineTo(t.h * 0.32, -t.h * 0.15); ctx.fill();
        ctx.fillStyle = bc.tree;
        ctx.beginPath(); ctx.moveTo(0, -t.h * 0.88); ctx.lineTo(-t.h * 0.26, -t.h * 0.3); ctx.lineTo(t.h * 0.26, -t.h * 0.3); ctx.fill();
        ctx.fillStyle = lighten(bc.tree, 15);
        ctx.beginPath(); ctx.moveTo(0, -t.h * 0.75); ctx.lineTo(-t.h * 0.18, -t.h * 0.42); ctx.lineTo(t.h * 0.18, -t.h * 0.42); ctx.fill();
        // Snow cap in snow biome
        const biomeIdx = Math.floor(Math.max(0, worldDist) / 30) % BIOMES.length;
        if (BIOMES[biomeIdx].name === 'snow' || BIOMES[(biomeIdx + 1) % BIOMES.length].name === 'snow') {
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath(); ctx.moveTo(0, -t.h); ctx.lineTo(-t.h * 0.12, -t.h * 0.85); ctx.lineTo(t.h * 0.12, -t.h * 0.85); ctx.fill();
        }
      } else {
        // Bush — rounded with depth
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.ellipse(2, 2, t.h * 0.3, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = darken(bc.tree, 10);
        ctx.beginPath(); ctx.ellipse(0, -t.h * 0.18, t.h * 0.38, t.h * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = bc.tree;
        ctx.beginPath(); ctx.ellipse(-3, -t.h * 0.22, t.h * 0.25, t.h * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = lighten(bc.tree, 15);
        ctx.beginPath(); ctx.ellipse(6, -t.h * 0.26, t.h * 0.18, t.h * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ============================================================
  // LAYER: OBSTACLES
  // ============================================================
  function drawObstacles(ctx) {
    const groundY = H * 0.62;
    const centerX = W * 0.45;
    const laneW = 45;
    for (const obs of obstacles) {
      const relZ = (obs.z - worldDist) * 40;
      if (relZ < -60 || relZ > W * 0.8) continue;
      const scale = Math.max(0.3, 1 - relZ / (W * 0.8));
      const blockedLanes = obs.lanes || [0];

      for (const lane of blockedLanes) {
        const screenX = centerX + relZ + lane * laneW * scale * 0.4;

        if (obs.type === 'gap') {
          // Gap — dark pit with danger glow
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(screenX - 16 * scale, groundY - 2, 32 * scale, 20);
          ctx.strokeStyle = 'rgba(255,80,30,0.4)';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX - 16 * scale, groundY - 2, 32 * scale, 20);
          // Danger glow
          ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(255,80,30,0.3)';
          ctx.strokeRect(screenX - 16 * scale, groundY - 2, 32 * scale, 20);
          ctx.shadowBlur = 0;
        } else if (obs.type === 'high') {
          // Overhead branch/log — yellow warning, must slide under
          const barY = groundY - 40 * scale;
          // Warning glow
          ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(255,200,50,0.4)';
          ctx.fillStyle = '#7a5030';
          ctx.fillRect(screenX - 24 * scale, barY, 48 * scale, 8 * scale);
          ctx.shadowBlur = 0;
          // Support posts
          ctx.fillStyle = '#5a3018';
          ctx.fillRect(screenX - 22 * scale, barY, 4 * scale, (groundY - barY));
          ctx.fillRect(screenX + 18 * scale, barY, 4 * scale, (groundY - barY));
          // Yellow warning stripes
          ctx.fillStyle = 'rgba(255,200,50,0.3)';
          ctx.fillRect(screenX - 24 * scale, barY - 3, 48 * scale, 4);
          ctx.fillRect(screenX - 24 * scale, barY + 8 * scale, 48 * scale, 3);
        } else {
          // Rock — brighter, with highlight and shadow
          const rw = 22 * scale, rh = 20 * scale;
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath(); ctx.ellipse(screenX + 2, groundY, rw * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill();
          // Main body
          const rockGrad = ctx.createRadialGradient(screenX - rw * 0.2, groundY - rh * 0.5, 0, screenX, groundY - rh * 0.3, rw);
          rockGrad.addColorStop(0, '#8a7a6a');
          rockGrad.addColorStop(0.5, '#6a5a48');
          rockGrad.addColorStop(1, '#4a3a28');
          ctx.fillStyle = rockGrad;
          ctx.beginPath(); ctx.ellipse(screenX, groundY - rh * 0.35, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
          // Specular
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.beginPath(); ctx.ellipse(screenX - rw * 0.2, groundY - rh * 0.55, rw * 0.3, rh * 0.25, -0.3, 0, Math.PI * 2); ctx.fill();
          // Outline
          ctx.strokeStyle = 'rgba(60,40,20,0.5)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(screenX, groundY - rh * 0.35, rw, rh, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
  }

  // ============================================================
  // LAYER: POWER-UPS
  // ============================================================
  function drawPowerups(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const groundY = H * 0.62;
    const centerX = W * 0.45;
    const laneW = 45;
    for (const pu of powerups) {
      const relZ = (pu.z - worldDist) * 40;
      if (relZ < -60 || relZ > W * 0.8) continue;
      const scale = Math.max(0.3, 1 - relZ / (W * 0.8));
      const screenX = centerX + relZ + pu.lane * laneW * scale * 0.4;
      const puY = groundY - 25 - Math.sin(clock * 4) * 5;
      ctx.save();
      ctx.translate(screenX, puY);
      ctx.globalAlpha = 0.88;

      // Gold-bulb halo shared by every pickup — carnival signature
      const haloR = 16 * scale;
      const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
      halo.addColorStop(0, 'rgba(255,248,200,0.55)');
      halo.addColorStop(0.45, 'rgba(255,221,107,0.3)');
      halo.addColorStop(1, 'rgba(244,197,66,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();

      if (pu.type === 'shield') {
        ctx.fillStyle = (typeof Palette !== 'undefined' ? Palette.infoBlue : 'rgba(60,120,255,0.7)');
        ctx.beginPath(); ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = (typeof Palette !== 'undefined' ? Palette.accentGoldHot : '#88bbff');
        ctx.lineWidth = 1.8; ctx.stroke();
      } else if (pu.type === 'speedBoost') {
        // Core uses the gold-bulb gradient — reads as a lightbulb on a pole
        const core = (typeof Palette !== 'undefined'
          ? Palette.spotlight(ctx, 0, 0, 11 * scale)
          : 'rgba(255,220,50,0.8)');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(0, 0, 11 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = (typeof Palette !== 'undefined' ? Palette.accentGold : '#ffee88');
        ctx.lineWidth = 1.8; ctx.stroke();
      } else if (pu.type === 'coin') {
        // Gold disc with edge highlight
        ctx.fillStyle = (typeof Palette !== 'undefined' ? Palette.accentGoldHot : 'rgba(255,200,50,0.9)');
        ctx.beginPath(); ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = (typeof Palette !== 'undefined' ? Palette.accentGoldEdge : '#c89630');
        ctx.lineWidth = 1.8; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ============================================================
  // LAYER: PLAYERS (using EntityManager)
  // ============================================================
  // Phase 48a — hex → 'r,g,b' string for CharSprite tint.
  function _hexToRgb(hex) {
    if (!hex || hex.charAt(0) !== '#') return '255,255,255';
    const h = hex.slice(1);
    const r = parseInt(h.slice(0, 2), 16) || 255;
    const g = parseInt(h.slice(2, 4), 16) || 255;
    const b = parseInt(h.slice(4, 6), 16) || 255;
    return r + ',' + g + ',' + b;
  }

  function drawPlayers(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const groundY = H * 0.62;
    const centerX = W * 0.45;
    const laneW = 45;

    const allEntities = entities.all();
    allEntities.forEach((e, i) => {
      if (!e.visible) return;
      // Time-based interpolation between prev and target server states
      // Server sends every 100ms. We interpolate from prev→target over that window.
      const elapsed = performance.now() - lastStateTime;
      const t = Math.min(1, elapsed / 100);
      const prevX = e._prevX !== undefined ? e._prevX : e.x;
      const prevY = e._prevY !== undefined ? e._prevY : e.y;
      const tgt = e._target || {};
      e.x = prevX + ((tgt.x !== undefined ? tgt.x : prevX) - prevX) * t;
      e.y = prevY + ((tgt.y !== undefined ? tgt.y : prevY) - prevY) * t;

      const pdata = e.data;
      if (!pdata.alive && !pdata.stumbling) return;

      // Compute screen position from entity data
      const laneOffset = e.x * laneW; // e.x stores interpolated lane
      const distOff = (pdata.distOffset || 0) * 15;
      const px = centerX + laneOffset + distOff;
      const py = groundY - 20 - i * 6;
      const jumpY = e.y; // e.y stores interpolated jump height

      const sy = py - jumpY * 80;
      const expr = jumpY > 0.05 ? 'excited' : 'determined';
      const sliding = pdata.sliding;
      const stumbling = pdata.stumbling;

      ctx.save();
      // Stumble blink
      if (stumbling && Math.floor(clock * 10) % 2 === 0) ctx.globalAlpha = 0.4;

      // Phase 48a — CharSprite path with pose-driven animation.
      // Falls back to CharDraw.blob if CharSprite isn't loaded.
      if (typeof CharSprite !== 'undefined') {
        const pose = stumbling ? 'hit'
          : sliding ? 'windup'
          : jumpY > 0.05 ? 'dash'
          : 'move';
        CharSprite.draw(ctx, px, sy, 20, {
          character: pdata.character || 'cat',
          colorRgb: _hexToRgb(e.color),
          color: e.color,
          pose: pose,
          clock: clock,
          idx: i,
          facing: 0, // escape always faces right
          charge: sliding ? 1 : 0,
        });
      } else {
        CharDraw.blob(ctx, px, sy, 20, e.color, {
          jumpY, idx: i, clock, expression: expr, running: true,
          sliding: sliding,
          character: pdata.character || null,
        });
      }

      // Shield ring
      if (pdata.shield) {
        ctx.strokeStyle = `rgba(80,160,255,${0.3 + Math.sin(clock * 6) * 0.15})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, sy, 28, 0, Math.PI * 2); ctx.stroke();
      }
      // Speed lines
      if (pdata.speedBoost) {
        ctx.strokeStyle = 'rgba(255,220,50,0.3)';
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          const lx = px - 15 - j * 8;
          const ly = sy + (j - 1) * 6;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 12, ly); ctx.stroke();
        }
      }
      ctx.restore();

      // Name label above player (after restore so it's always full opacity)
      if (e.name) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(e.name, px, sy - 26 - jumpY * 80);
      }

      // Dust particles at feet via ParticleSystem
      if (pdata.alive && jumpY < 0.02) {
        particles.burst(px, py + 2, 1, {
          ...ParticleSystem.PRESETS.DUST,
          speed: 0.5, life: 0.25, size: 2,
          color: '200,220,180',
        });
      }
    });
  }

  // ============================================================
  // LAYER: FOX
  // ============================================================
  // Phase 63a — painted predator fox sprite. Eager load; flips
  // ready flag on load, falls back to the procedural CharDraw.fox
  // if asset 404s.
  const foxSprite = new Image();
  foxSprite.src = '/assets/fox-predator.png';
  let foxSpriteReady = false;
  foxSprite.onload = () => { foxSpriteReady = true; };
  foxSprite.onerror = () => { foxSpriteReady = false; };

  function drawFox(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const groundY = H * 0.62;
    const relDist = (worldDist - foxDist) * 40;
    const foxX = W * 0.45 - relDist;
    if (foxX < -60 || foxX > W + 60) return;
    const foxY = groundY - 22;

    if (foxSpriteReady) {
      // Painted fox PNG rendered with gallop-pose transforms
      // mirroring the CharSprite 'move' pattern — one static
      // sprite, motion driven by canvas transforms on the
      // render-loop clock. Cadence tuned higher than a walk
      // (fox gallops): 12 rad/s vs the CharSprite walk's 7.
      const size = 96;
      const iw = foxSprite.naturalWidth, ih = foxSprite.naturalHeight;
      const dh = size;
      const dw = size * (iw / ih);

      const cadence = clock * 12;
      const bob = Math.sin(cadence) * 3;           // suspension apex
      const squash = Math.cos(cadence * 2) * 0.08; // Y-axis squash-stretch
      const roll = Math.sin(cadence) * 0.06;       // ±3.4° gait roll
      const sx = 1 + squash;
      const sy = 1 - squash;

      ctx.save();
      ctx.translate(foxX, foxY + bob);
      ctx.rotate(roll);
      ctx.scale(sx, sy);
      // Warm gold rim glow intensifies with proximity.
      if (foxProx > 0.25) {
        const goldHot = (typeof Palette !== 'undefined' ? Palette.accentGoldHot : '#ffdd6b');
        ctx.shadowColor = goldHot;
        ctx.shadowBlur = 12 + foxProx * 18;
      }
      ctx.drawImage(foxSprite, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      // Dust puff trail — procedural particles spawned near the
      // fox feet on each gallop impact (bottom of bob cycle). Two
      // alternating puffs per gait cycle (one per paw landing).
      const phase = (cadence % (Math.PI * 2)) / (Math.PI * 2);
      const puffStages = [0.24, 0.74];
      for (const stage of puffStages) {
        const diff = Math.abs(phase - stage);
        if (diff < 0.08) {
          const t = 1 - (diff / 0.08); // 1 at peak, 0 at edge
          const pX = foxX + (Math.random() - 0.5) * 10;
          const pY = foxY + dh * 0.35 + Math.random() * 3;
          const puffR = 4 + t * 5;
          ctx.save();
          ctx.fillStyle = `rgba(180, 150, 110, ${0.18 * t})`;
          ctx.beginPath();
          ctx.arc(pX, pY, puffR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Eye glare — painted eyes are already warm; pulsing
      // highlight preserves the carnival "glowing predator eye"
      // beat. Eye positions calibrated to the sprite.
      if (foxProx > 0.25) {
        const goldHot = (typeof Palette !== 'undefined' ? Palette.accentGoldHot : '#ffdd6b');
        const pulse = 0.35 + Math.sin(clock * 8) * 0.25;
        ctx.save();
        ctx.translate(foxX, foxY + bob);
        ctx.rotate(roll);
        ctx.scale(sx, sy);
        ctx.fillStyle = `rgba(255, 250, 210, ${pulse * foxProx})`;
        ctx.shadowColor = goldHot;
        ctx.shadowBlur = 6 + foxProx * 8;
        ctx.beginPath(); ctx.arc(-dw * 0.12, -dh * 0.10, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc( dw * 0.10, -dh * 0.10, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      return;
    }

    // Fallback — procedural fox drawing when painted asset missing.
    CharDraw.fox(ctx, foxX, foxY, 24, clock);
    if (foxProx > 0.25) {
      const goldHot = (typeof Palette !== 'undefined' ? Palette.accentGoldHot : '#ffdd6b');
      const pulse = 0.55 + Math.sin(clock * 8) * 0.35;
      ctx.save();
      ctx.translate(foxX, foxY);
      ctx.fillStyle = `rgba(255,248,200,${pulse * foxProx})`;
      ctx.shadowColor = goldHot;
      ctx.shadowBlur = 8 + foxProx * 10;
      ctx.beginPath(); ctx.arc(-3, -5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 3, -5, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ============================================================
  // LAYER: BIOME CURTAIN — red-velvet wipe between biomes
  // ============================================================
  function drawBiomeCurtain(ctx) {
    // worldDist advances continuously; biome boundary sits at every
    // multiple of `biomeLen`. We show a gold-rope curtain swipe for
    // the last 12% of each biome, fading out as we settle into the
    // next one. Tight gate so it never steals gameplay focus.
    const biomeLen = 30;
    const local = worldDist % biomeLen;
    const entry = local / biomeLen;
    if (entry < 0.88) return;
    const t = (entry - 0.88) / 0.12;      // 0..1 inside the swipe window
    const open = Palette && Palette.ease ? Palette.ease.curtain(t) : t;
    const curtainH = H;
    ctx.save();
    ctx.globalAlpha = 1 - open; // fully opaque at start, gone at boundary

    // Two panels sweeping inward from screen edges
    const panelW = W * 0.55 * (1 - open);
    const g1 = Palette
      ? Palette.redCurtain(ctx, 0, 0, panelW, curtainH)
      : 'rgba(167,45,42,0.9)';
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, panelW, curtainH);
    ctx.fillStyle = Palette
      ? Palette.redCurtain(ctx, W - panelW, 0, panelW, curtainH)
      : 'rgba(167,45,42,0.9)';
    ctx.fillRect(W - panelW, 0, panelW, curtainH);

    // Gold rope along inner edges
    if (panelW > 6) {
      const gold = (Palette ? Palette.accentGold : '#f4c542');
      ctx.fillStyle = gold;
      ctx.fillRect(panelW - 3, 0, 3, curtainH);
      ctx.fillRect(W - panelW, 0, 3, curtainH);
    }
    ctx.restore();
  }

  // ============================================================
  // LAYER: FOX PROXIMITY WARNING
  // ============================================================
  function drawFoxWarning(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    if (foxProx < 0.3) return;
    const intensity = Math.min(1, (foxProx - 0.3) / 0.7);
    const pulse = Math.sin(clock * 6) * 0.5 + 0.5;

    // Red border glow
    ctx.strokeStyle = `rgba(255,30,0,${intensity * 0.3 * pulse})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    // Left edge red glow
    const edgeGrad = ctx.createLinearGradient(0, 0, W * 0.15, 0);
    edgeGrad.addColorStop(0, `rgba(255,30,0,${intensity * 0.2})`);
    edgeGrad.addColorStop(1, 'rgba(255,30,0,0)');
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, 0, W * 0.15, H);
  }

  // ============================================================
  // LAYER: DUST (additional dust via particle system)
  // ============================================================
  function drawDust(ctx) {
    // Particle system draws are handled in the main render function
    // This layer exists for any additional screen-space effects
  }

  // ============================================================
  // LAYER: LANE MARKERS (UI)
  // ============================================================
  function drawLaneMarkers(ctx) {
    const groundY = H * 0.62;
    const centerX = W * 0.45;
    const laneW = 45;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(centerX - laneW / 2, groundY - 50);
    ctx.lineTo(centerX - laneW / 2, groundY + 5);
    ctx.moveTo(centerX + laneW / 2, groundY - 50);
    ctx.lineTo(centerX + laneW / 2, groundY + 5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function updateState(state) {
    targetWorldDist = state.worldDist;
    targetFoxDist = state.foxDist;
    targetSpeed = state.speed;
    lastUpdateTime = performance.now();
    lastStateTime = performance.now();
    foxProx = state.foxProximity || 0;
    foxSprinting = state.foxSprinting || false;
    obstacles = state.obstacles || [];
    powerups = state.powerups || [];

    const ids = Object.keys(state.players);
    ids.forEach((id) => {
      const pd = state.players[id];
      let e = entities.get(id);
      if (!e) {
        e = entities.create(id, 'player');
        e.x = pd.lane || 0;
        e.y = pd.y || 0;
        e.color = pd.color;
        e._prevX = pd.lane || 0;
        e._prevY = pd.y || 0;
      }
      // Store previous as current before updating target
      e._prevX = e.x;
      e._prevY = e.y;
      e.setTarget({
        x: pd.lane || 0,     // lane position for interpolation
        y: pd.y || 0,        // jump height for interpolation
      });
      e.color = pd.color;
      e.name = pd.name;
      e.character = pd.character;
      e.visible = pd.connected !== false;
      e.data.alive = pd.alive;
      e.data.lane = pd.lane || 0;
      e.data.sliding = pd.sliding || false;
      e.data.shield = pd.shield || false;
      e.data.speedBoost = pd.speedBoost || false;
      e.data.distOffset = pd.distOffset || 0;
      e.data.stumbling = pd.stumbling || false;
      e.data.combo = pd.combo || 0;
      e.data.character = pd.character || 'cat';
    });
  }

  function triggerDramatic() { dramatic = true; }

  function triggerElim() {
    camera.shake(10, 0.3);
    // Elimination burst particles at screen center
    particles.burst(W * 0.45, H * 0.62, 15, {
      ...ParticleSystem.PRESETS.SPARKS,
      color: '255,80,30',
      speed: 4,
      life: 0.5,
    });
  }

  function triggerWin() {}

  return { init, updateState, triggerElim, triggerWin, triggerDramatic };
})();
