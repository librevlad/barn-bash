// ============================================================
// FRANTICS GRAND PRIX — 2D Renderer (Engine-powered)
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
  let track = [];
  let trackWidth = 2.5;
  let items = [];
  let oilSlicks = [];
  let missiles = [];
  let totalLaps = 3;

  // Trackside objects (generated once)
  const trackObjects = [];
  let objectsGenerated = false;

  // Lap pennant — wood-plank drop signature moment
  let lapPennant = null; // { lap, totalLaps, t0 }
  let lastPennantLap = 0;

  // ============================================================
  // INIT
  // ============================================================
  let spritesReady = false;

  // Character → car sprite name. 8 chars → 8 distinct cars (2 spares left).
  const CAR_SPRITES = {
    cat:      'car-red',
    frog:     'car-green',
    wolf:     'car-lightblue',
    bear:     'car-blue',
    bunny:    'car-pink',
    pig:      'car-magenta',
    chicken:  'car-yellow',
    raccoon:  'car-purple',
    // fallback for unknown characters
    _fallback1: 'car-orange',
    _fallback2: 'car-greenalt',
  };

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Initial camera
    camera.setPosition(0, 1);
    camera.setZoom(40);

    // Load car + item + decoration sprites from sliced sprites.png
    const spriteLoads = [
      'car-red','car-blue','car-yellow','car-green','car-greenalt',
      'car-purple','car-lightblue','car-pink','car-magenta','car-orange',
      'item-boost','item-oil','item-missile',
      'bush-1','bush-2','bush-3','rock-1','rock-2',
    ].map(n => SpriteLoader.loadSprite(n, '/assets/sprite-' + n + '.png'));
    // Phase 6a — painterly tree asset sits outside the sprite-* atlas naming.
    // Use loadPainterly to strip the baked checker-preview background.
    spriteLoads.push(SpriteLoader.loadPainterly('tree-forest', '/assets/tree-forest.png'));
    // Phase 7c — painterly finish-line flag replacing the procedural red-velvet banners.
    spriteLoads.push(SpriteLoader.loadPainterly('race-flag', '/assets/race-flag.png'));
    Promise.all(spriteLoads)
      .then(() => { spritesReady = true; console.log('Race sprites loaded'); })
      .catch(e => { console.warn('Sprite load failed, falling back to procedural:', e); spritesReady = false; });

    // Setup scene layers
    scene.createLayer('grass', 0);
    scene.createLayer('gravel', 2);
    scene.createLayer('track', 5);
    scene.createLayer('trackmarks', 7);
    scene.createLayer('objects', 8);
    scene.createLayer('items', 10);
    scene.createLayer('players', 20);
    scene.createLayer('effects', 30);
    scene.createLayer('ui', 40);

    // Register render functions per layer
    scene.getLayer('grass').addFn(drawGrass);
    scene.getLayer('gravel').addFn(drawGravelTraps);
    scene.getLayer('track').addFn(drawTrack);
    scene.getLayer('trackmarks').addFn(drawTireMarks);
    scene.getLayer('objects').addFn(drawTrackObjects);
    scene.getLayer('items').addFn(drawItems);
    scene.getLayer('items').addFn(drawOilSlicks);
    scene.getLayer('items').addFn(drawMissiles);
    scene.getLayer('players').addFn(drawPlayers);
    scene.getLayer('ui').addFn(drawMinimap);
    scene.getLayer('ui').addFn(drawLapPennant);

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
    const clock = renderLoop.getClock();

    // Update camera — follow players with enough zoom to see track
    const activePlayers = entities.all().filter(e => e.visible && !e.data.finished);
    if (activePlayers.length > 0) {
      camera.followGroup(activePlayers, 4);
      // Speed-based zoom: zoom out when players go fast (cinematic feel)
      let maxSpd = 0;
      for (const e of activePlayers) maxSpd = Math.max(maxSpd, e.data.speed || 0);
      const speedZoomOut = maxSpd * 30; // faster = wider view
      const minZoom = Math.max(22, 28 - speedZoomOut);
      if (camera._zoom < minZoom) camera._zoom = minZoom;
      if (camera._zoom > 50) camera._zoom = 50;
    }

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Render scene (draw functions use camera.worldToScreen internally, no double transform)
    scene.render(ctx, null);

    // Particles (screen space — positions already converted by draw functions)
    particles.draw(ctx);

    // Post-processing (screen space)
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
    let maxSpeed = 0;
    for (const e of entities.all()) { if ((e.data.speed || 0) > maxSpeed) maxSpeed = e.data.speed; }
    if (typeof Visual !== 'undefined') Visual.drawPost(ctx, {
      vignette: 0.2,
      grain: 0.015,
      speedIntensity: maxSpeed > 0.1 ? (maxSpeed - 0.1) * 5 : 0,
    });
  }

  // ============================================================
  // LAYER: GRASS
  // ============================================================
  function drawGrass(ctx) {
    const grassGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
    grassGrad.addColorStop(0, '#2a6a2a');
    grassGrad.addColorStop(0.6, '#1e5520');
    grassGrad.addColorStop(1, '#133a12');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, W, H);

    const clock = renderLoop ? renderLoop.getClock() : 0;
    for (let i = 0; i < 35; i++) {
      const gx = ((i * 137 + clock * 0.15) % (W + 80)) - 40;
      const gy = ((i * 89 + 50) % (H + 80)) - 40;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(45,90,38,0.06)' : 'rgba(15,35,12,0.04)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 12 + i % 8, 8 + i % 5, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============================================================
  // LAYER: GRAVEL TRAPS
  // ============================================================
  function drawGravelTraps(ctx) {
    if (track.length < 4) return;
    for (let i = 0; i < track.length; i++) {
      const prev = track[(i - 1 + track.length) % track.length];
      const curr = track[i];
      const next = track[(i + 1) % track.length];
      const a1 = Math.atan2(curr.z - prev.z, curr.x - prev.x);
      const a2 = Math.atan2(next.z - curr.z, next.x - curr.x);
      let diff = a2 - a1;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.3) continue;
      const side = diff > 0 ? -1 : 1;
      const s = camera.worldToScreen(
        curr.x + Math.cos(a1 + Math.PI / 2) * side * (trackWidth + 0.8),
        curr.z + Math.sin(a1 + Math.PI / 2) * side * (trackWidth + 0.8)
      );
      const r = camera.getZoom() * 1.5;
      ctx.fillStyle = 'rgba(160,140,100,0.12)';
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ============================================================
  // LAYER: TRACK
  // ============================================================
  function drawTrackPath(ctx, style, width) {
    if (track.length < 2) return;
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const s = camera.worldToScreen(track[0].x, track[0].z);
    ctx.moveTo(s.x, s.y);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const p = camera.worldToScreen(wp.x, wp.z);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  function drawTrack(ctx) {
    if (track.length < 2) return;
    const tw = trackWidth * camera.getZoom();

    // Ground shadow
    drawTrackPath(ctx, 'rgba(0,0,0,0.35)', tw + 18);
    // Brass rim — carnival signature: outer gold-dim band + hot highlight
    drawTrackPath(ctx, Palette.accentGoldEdge, tw + 12);
    drawTrackPath(ctx, Palette.accentGoldDim, tw + 8);
    drawTrackPath(ctx, 'rgba(200,40,40,0.5)', tw + 4);
    drawTrackPath(ctx, '#3a3a3a', tw);
    drawTrackPath(ctx, '#404040', tw - 6);
    drawTrackPath(ctx, '#454545', tw - 14);
    // Thin hot-gold highlight along the inside of the brass rim
    drawTrackPath(ctx, 'rgba(255,221,107,0.35)', tw + 1);

    // Animated center dashed line (moves with time for speed feel)
    const clock = renderLoop ? renderLoop.getClock() : 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -clock * 40; // animated — lines scroll along track
    ctx.beginPath();
    const s = camera.worldToScreen(track[0].x, track[0].z);
    ctx.moveTo(s.x, s.y);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const p = camera.worldToScreen(wp.x, wp.z);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Checkered start/finish
    if (track.length > 1) {
      const f = camera.worldToScreen(track[0].x, track[0].z);
      const angle = Math.atan2(track[1].z - track[0].z, track[1].x - track[0].x);
      const perpX = -Math.sin(angle) * tw * 0.5;
      const perpY = Math.cos(angle) * tw * 0.5;
      const squares = 8;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < squares; c++) {
          const t = (c / squares - 0.5) * 2;
          const t2 = ((c + 1) / squares - 0.5) * 2;
          const along = (r - 0.5) * 6;
          const ax = Math.cos(angle) * along, az = Math.sin(angle) * along;
          ctx.fillStyle = (r + c) % 2 === 0 ? '#222' : '#eee';
          ctx.beginPath();
          ctx.moveTo(f.x + perpX * t + ax, f.y + perpY * t + az);
          ctx.lineTo(f.x + perpX * t2 + ax, f.y + perpY * t2 + az);
          ctx.lineTo(f.x + perpX * t2 + ax + Math.cos(angle) * 6, f.y + perpY * t2 + az + Math.sin(angle) * 6);
          ctx.lineTo(f.x + perpX * t + ax + Math.cos(angle) * 6, f.y + perpY * t + az + Math.sin(angle) * 6);
          ctx.fill();
        }
      }
      // Carnival finish — painterly checker flags flanking the line,
      // connected by a gold rope with "FINISH" in Alfa Slab.
      // Phase 7c — painterly flag replaces the procedural red-velvet
      // banner rectangles. Flag PNG has pole on the LEFT and fabric
      // extending RIGHT; right-side flag is mirrored so both flags
      // wave toward the track interior.
      ctx.save();
      const bannerH = 34;
      const bannerW = 14;
      const sides = [
        { tx: perpX * 1.1, ty: perpY * 1.1, mirror: false },
        { tx: perpX * -1.1, ty: perpY * -1.1, mirror: true },
      ];
      const flagSprite = SpriteLoader.get('race-flag');
      sides.forEach((s) => {
        const bx = f.x + s.tx;
        const by = f.y + s.ty;
        if (spritesReady && flagSprite) {
          // Painterly flag: pole at bx, bottom at by, taller than banner
          const fw = bannerH * 1.4, fh = bannerH * 1.5;
          ctx.save();
          if (s.mirror) {
            ctx.translate(bx, by);
            ctx.scale(-1, 1);
            ctx.drawImage(flagSprite, -fw * 0.3, -fh, fw, fh);
          } else {
            ctx.drawImage(flagSprite, bx - fw * 0.3, by - fh, fw, fh);
          }
          ctx.restore();
        } else {
          // Fallback: procedural red-velvet banner + gold-bulb cap
          const g = Palette.redCurtain(ctx, bx - bannerW / 2, by - bannerH, bannerW, bannerH);
          ctx.fillStyle = g;
          ctx.fillRect(bx - bannerW / 2, by - bannerH, bannerW, bannerH);
          ctx.fillStyle = Palette.accentGoldHot;
          ctx.beginPath();
          ctx.arc(bx, by - bannerH - 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      // Gold rope between bulbs
      ctx.strokeStyle = Palette.accentGold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(f.x + sides[0].tx, f.y + sides[0].ty - bannerH - 2);
      ctx.quadraticCurveTo(f.x, f.y - Math.abs(perpY) * 0.6 - bannerH - 4,
                           f.x + sides[1].tx, f.y + sides[1].ty - bannerH - 2);
      ctx.stroke();

      // "FINISH" label above checkered line, Alfa Slab gold
      ctx.fillStyle = Palette.accentGold;
      Palette.applyLetterpress(ctx);
      ctx.font = '700 14px "Alfa Slab One", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const labelY = f.y - Math.abs(perpY) * 0.5 - bannerH - 8;
      ctx.fillText('FINISH', f.x, labelY);
      Palette.clearShadow(ctx);
      ctx.restore();
    }
  }

  // ============================================================
  // LAYER: TIRE MARKS
  // ============================================================
  function drawTireMarks(ctx) {
    if (track.length < 3) return;
    ctx.strokeStyle = 'rgba(30,30,30,0.08)';
    ctx.lineWidth = camera.getZoom() * 0.15;
    ctx.lineCap = 'round';
    for (let i = 0; i < track.length; i++) {
      const prev = track[(i - 1 + track.length) % track.length];
      const curr = track[i];
      const next = track[(i + 1) % track.length];
      const a1 = Math.atan2(curr.z - prev.z, curr.x - prev.x);
      const a2 = Math.atan2(next.z - curr.z, next.x - curr.x);
      let diff = a2 - a1;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.2) continue;
      const s = camera.worldToScreen(curr.x, curr.z);
      const p = camera.worldToScreen(prev.x, prev.z);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
  }

  // ============================================================
  // LAYER: TRACKSIDE OBJECTS
  // ============================================================
  const BUSH_VARIANTS = ['bush-1', 'bush-2', 'bush-3'];
  const ROCK_VARIANTS = ['rock-1', 'rock-2'];
  const TREE_VARIANTS = ['tree-forest'];

  function generateTrackObjects() {
    if (objectsGenerated || track.length < 2) return;
    objectsGenerated = true;
    for (let i = 0; i < track.length; i++) {
      const wp = track[i];
      const next = track[(i + 1) % track.length];
      const angle = Math.atan2(next.z - wp.z, next.x - wp.x);
      for (let side = -1; side <= 1; side += 2) {
        if (Math.random() < 0.4) continue;
        const dist = trackWidth + 1.5 + Math.random() * 3;
        // Phase 6a — 25% painterly tree, 45% bush (still "tree" type), 30% rock
        const roll = Math.random();
        let type, sprite, bigSprite = false;
        if (roll < 0.25) {
          type = 'tree';
          sprite = TREE_VARIANTS[Math.floor(Math.random() * TREE_VARIANTS.length)];
          bigSprite = true;
        } else if (roll < 0.7) {
          type = 'tree';
          sprite = BUSH_VARIANTS[Math.floor(Math.random() * BUSH_VARIANTS.length)];
        } else {
          type = 'rock';
          sprite = ROCK_VARIANTS[Math.floor(Math.random() * ROCK_VARIANTS.length)];
        }
        trackObjects.push({
          type, sprite, bigSprite,
          x: wp.x + Math.cos(angle + Math.PI / 2) * side * dist,
          z: wp.z + Math.sin(angle + Math.PI / 2) * side * dist,
          size: 0.4 + Math.random() * 0.6,
          shade: 0.5 + Math.random() * 0.5,
        });
      }
      if (i % 4 === 0) {
        trackObjects.push({
          type: 'barrier', angle,
          x: wp.x + Math.cos(angle + Math.PI / 2) * (trackWidth + 0.5),
          z: wp.z + Math.sin(angle + Math.PI / 2) * (trackWidth + 0.5),
          size: 1,
        });
      }
    }
  }

  function drawTrackObjects(ctx) {
    generateTrackObjects();
    const zoom = camera.getZoom();
    for (const obj of trackObjects) {
      const s = camera.worldToScreen(obj.x, obj.z);
      if (s.x < -80 || s.x > W + 80 || s.y < -80 || s.y > H + 80) continue;
      const sz = obj.size * zoom * 0.4; // slightly bigger

      // Try sprite-based rendering for tree/rock
      if (spritesReady && obj.sprite && SpriteLoader.has(obj.sprite)) {
        // Phase 6a — painterly tree sprites render taller so they read as
        // feature trees beside the shorter 60x60 bush silhouettes
        const scale = obj.bigSprite ? 2.2 : 2.0;
        const w = sz * scale, h = sz * scale;
        // Soft shadow under sprite
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.ellipse(s.x + 2, s.y + h * 0.35, w * 0.4, h * 0.15, 0, 0, Math.PI * 2); ctx.fill();
        SpriteLoader.draw(ctx, obj.sprite, s.x, s.y, { width: w, height: h });
        continue;
      }

      if (obj.type === 'tree') {
        const tr = sz * 1.2; // tree radius
        // Ground shadow (ellipse, offset)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(s.x + 3, s.y + 4, tr * 1.1, tr * 0.5, 0.2, 0, Math.PI * 2); ctx.fill();

        // Trunk
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(s.x - sz * 0.12, s.y - sz * 0.2, sz * 0.24, sz * 0.5);

        // Canopy — gradient (dark bottom, bright top)
        const g = Math.floor(60 + obj.shade * 50);
        const canopyGrad = ctx.createRadialGradient(s.x - tr * 0.2, s.y - tr * 0.5, tr * 0.1, s.x, s.y - tr * 0.2, tr);
        canopyGrad.addColorStop(0, `rgb(${50 + g * 0.3},${g + 40},${30 + g * 0.2})`);
        canopyGrad.addColorStop(0.6, `rgb(${30 + g * 0.2},${g + 10},${20 + g * 0.1})`);
        canopyGrad.addColorStop(1, `rgb(${15 + g * 0.1},${g - 15},${10})`);
        ctx.fillStyle = canopyGrad;
        ctx.beginPath(); ctx.arc(s.x, s.y - tr * 0.3, tr, 0, Math.PI * 2); ctx.fill();

        // Secondary canopy blob (depth)
        ctx.fillStyle = `rgba(${40 + g * 0.3},${g + 30},${25 + g * 0.15},0.7)`;
        ctx.beginPath(); ctx.arc(s.x - tr * 0.3, s.y - tr * 0.5, tr * 0.6, 0, Math.PI * 2); ctx.fill();

        // Highlight spot
        ctx.fillStyle = `rgba(${70 + g * 0.3},${g + 60},${40 + g * 0.2},0.4)`;
        ctx.beginPath(); ctx.arc(s.x + tr * 0.15, s.y - tr * 0.55, tr * 0.35, 0, Math.PI * 2); ctx.fill();

        // Outline
        ctx.strokeStyle = `rgba(${15},${g - 20},${8},0.3)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y - tr * 0.3, tr, 0, Math.PI * 2); ctx.stroke();

      } else if (obj.type === 'rock') {
        const rr = sz * 0.7;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(s.x + 2, s.y + 2, rr * 0.9, rr * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        // Rock body with gradient
        const rockGrad = ctx.createRadialGradient(s.x - rr * 0.2, s.y - rr * 0.2, 0, s.x, s.y, rr);
        const rb = Math.floor(80 + obj.shade * 50);
        rockGrad.addColorStop(0, `rgb(${rb + 30},${rb + 20},${rb + 10})`);
        rockGrad.addColorStop(0.7, `rgb(${rb},${rb - 10},${rb - 20})`);
        rockGrad.addColorStop(1, `rgb(${rb - 20},${rb - 30},${rb - 35})`);
        ctx.fillStyle = rockGrad;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, rr, rr * 0.65, obj.shade * 0.5, 0, Math.PI * 2); ctx.fill();
        // Specular
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.ellipse(s.x - rr * 0.2, s.y - rr * 0.15, rr * 0.25, rr * 0.18, -0.3, 0, Math.PI * 2); ctx.fill();
        // Outline
        ctx.strokeStyle = `rgba(${rb - 40},${rb - 50},${rb - 55},0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, rr, rr * 0.65, obj.shade * 0.5, 0, Math.PI * 2); ctx.stroke();

      } else if (obj.type === 'barrier') {
        // Tire stack — stacked circles
        for (let b = 0; b < 3; b++) {
          const bx = s.x + Math.cos(obj.angle) * b * sz * 0.45;
          const by = s.y + Math.sin(obj.angle) * b * sz * 0.45;
          const br = sz * 0.22;
          // Tire shadow
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath(); ctx.ellipse(bx + 1, by + 2, br * 1.1, br * 0.6, 0, 0, Math.PI * 2); ctx.fill();
          // Tire body
          ctx.fillStyle = b % 2 === 0 ? '#cc3333' : '#eee';
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
  }

  // ============================================================
  // LAYER: ITEMS
  // ============================================================
  function drawItems(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    for (const item of items) {
      const s = camera.worldToScreen(item.x, item.z);
      const bob = Math.sin(clock * 3 + item.x) * 4;
      const r = 18;
      const pulse = 0.7 + Math.sin(clock * 4 + item.x * 2) * 0.3;

      ctx.save();
      ctx.translate(s.x, s.y + bob);

      // Glow color per item type
      let glowColor;
      if (item.type === 'boost') glowColor = '68,170,255';
      else if (item.type === 'oil') glowColor = '255,200,40';
      else glowColor = '255,68,68';

      // Pulsing halo ring
      ctx.strokeStyle = `rgba(${glowColor},${0.3 + pulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, r + 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke();

      // Shadow under item
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, r * 0.9, r * 0.8, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();

      // Sprite if loaded
      const spriteName = 'item-' + item.type;
      if (spritesReady && SpriteLoader.has(spriteName)) {
        ctx.shadowBlur = 12; ctx.shadowColor = `rgba(${glowColor},0.8)`;
        SpriteLoader.draw(ctx, spriteName, 0, 0, { width: r * 2.2, height: r * 2.2 });
        ctx.shadowBlur = 0;
      } else {
        // Procedural fallback — colored disc + emoji
        ctx.fillStyle = `rgb(${glowColor})`;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(item.type === 'boost' ? '⚡' : item.type === 'oil' ? '💧' : '🚀', 0, 1);
      }

      ctx.restore();
    }
  }

  function drawOilSlicks(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    for (const oil of oilSlicks) {
      const s = camera.worldToScreen(oil.x, oil.z);
      ctx.fillStyle = 'rgba(20,20,20,0.6)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 12, 8, clock * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawMissiles(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    for (const m of missiles) {
      const s = camera.worldToScreen(m.x, m.z);
      ctx.fillStyle = '#ff2200';
      ctx.shadowBlur = 10; ctx.shadowColor = '#ff2200';
      ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      particles.burst(s.x, s.y, 1, { ...ParticleSystem.PRESETS.TRAIL, color: '255,100,0' });
    }
  }

  // ============================================================
  // LAYER: PLAYERS (using EntityManager)
  // ============================================================
  function drawPlayers(ctx) {
    const clock = renderLoop ? renderLoop.getClock() : 0;
    const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };

    for (const e of entities.all()) {
      if (!e.visible) continue;
      // Time-based interpolation between prev and target server states
      // Server sends every 100ms. We interpolate from prev→target over that window.
      const elapsed = performance.now() - lastStateTime;
      const t = Math.min(1, elapsed / 100); // 0→1 over 100ms window
      const prevX = e._prevX !== undefined ? e._prevX : e.x;
      const prevY = e._prevY !== undefined ? e._prevY : e.y;
      const prevA = e._prevAngle !== undefined ? e._prevAngle : e.angle;
      const tgt = e._target || {};
      e.x = prevX + ((tgt.x !== undefined ? tgt.x : prevX) - prevX) * t;
      e.y = prevY + ((tgt.y !== undefined ? tgt.y : prevY) - prevY) * t;
      // Angle: shortest path
      let da = ((tgt.angle !== undefined ? tgt.angle : prevA) - prevA);
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      e.angle = prevA + da * t;

      const s = camera.worldToScreen(e.x, e.y);
      const R = 14;

      // Try sprite-based car first (map by character, not color)
      const carSprite = spritesReady ? (CAR_SPRITES[e.character] || CAR_SPRITES._fallback1) : null;
      if (carSprite && SpriteLoader.has(carSprite)) {
        // Car aspect: PNG is ~170x220 (taller than wide). Keep that ratio.
        const carSize = 48 * (camera.getZoom() / 40);
        SpriteLoader.draw(ctx, carSprite, s.x, s.y, {
          rotation: e.angle + Math.PI / 2,
          width: carSize * 0.78, height: carSize,
          alpha: (e.data.stunned && Math.floor(clock * 10) % 2 === 0) ? 0.4 : (e.data.finished ? 0.4 : 1),
        });
        // Name label + held item even with sprite
        if (e.data.item) {
          const spriteName = 'item-' + e.data.item;
          if (SpriteLoader.has(spriteName)) {
            SpriteLoader.draw(ctx, spriteName, s.x, s.y - 20, { width: 18, height: 18 });
          } else {
            const itemIcons = { boost: '⚡', oil: '💧', missile: '🚀' };
            ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.arc(s.x, s.y - 18, 9, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(itemIcons[e.data.item] || '?', s.x, s.y - 18);
          }
        }
        if (!e.data.finished) {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(e.name || ('P' + e.id), s.x, s.y + 18);
        }
        // Effects still render
        if (e.data.boosting) {
          const tx = s.x - Math.cos(e.angle) * 15;
          const ty = s.y - Math.sin(e.angle) * 15;
          if (SpriteLoader.has('fire-trail-1')) {
            SpriteLoader.draw(ctx, 'fire-trail-1', tx, ty, { rotation: e.angle + Math.PI, width: 30, height: 15, alpha: 0.8 });
          }
          particles.burst(tx, ty, 2, { ...ParticleSystem.PRESETS.FIRE, speed: 2, life: 0.3, size: 6 });
        }
        if (e.data.drifting) {
          const dsx = s.x - Math.cos(e.angle) * 10;
          const dsy = s.y - Math.sin(e.angle) * 10;
          if (SpriteLoader.has('smoke-1')) {
            SpriteLoader.draw(ctx, 'smoke-' + (1 + Math.floor(clock * 3) % 4), dsx, dsy, { width: 20, height: 18, alpha: 0.5 });
          }
          particles.burst(dsx, dsy, 1, { ...ParticleSystem.PRESETS.SMOKE, speed: 0.5, life: 0.4, size: 5 });
        }
        continue; // skip procedural blob rendering
      }

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(e.angle + Math.PI / 2);

      // Squash/stretch based on speed (AAA juice — procedural fallback)
      const spd = e.data.speed || 0;
      const stretchX = 1.0 - spd * 0.8;
      const stretchY = 1.0 + spd * 0.6;
      ctx.scale(Math.max(0.85, stretchX), Math.min(1.15, stretchY));

      // Subtle bobbing (alive feeling)
      const bobY = Math.sin(clock * 6 + (e.id || 0) * 2) * 1.5;
      ctx.translate(0, bobY);

      if (e.data.stunned && Math.floor(clock * 10) % 2 === 0) ctx.globalAlpha = 0.4;
      if (e.data.finished) ctx.globalAlpha = 0.4;

      // Shadow (scales with height for depth)
      const shadowScale = 1.0 - spd * 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(2, 3 - bobY, R * 1.1 * shadowScale, R * 0.5 * shadowScale, 0, 0, Math.PI * 2); ctx.fill();

      // Body glow + gradient
      ctx.shadowBlur = 15; ctx.shadowColor = e.color;
      const grad = ctx.createRadialGradient(-3, -3, 1, 0, 2, R * 1.1);
      grad.addColorStop(0, CharDraw.lighten(e.color, 50));
      grad.addColorStop(0.35, CharDraw.lighten(e.color, 15));
      grad.addColorStop(0.7, e.color);
      grad.addColorStop(1, CharDraw.darken(e.color, 40));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Specular + outline
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(-R * 0.2, -R * 0.2, R * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = CharDraw.darken(e.color, 50); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

      // Direction arrow
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.moveTo(0, -R - 6); ctx.lineTo(-5, -R + 1); ctx.lineTo(5, -R + 1); ctx.fill();

      // Character emoji
      ctx.font = `${R}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.rotate(-(e.angle + Math.PI / 2));
      ctx.fillText(charIcons[e.character] || '', 0, 0);

      ctx.restore();

      // Boost trail — intense fire + glow halo
      if (e.data.boosting) {
        const tx = s.x - Math.cos(e.angle) * 15;
        const ty = s.y - Math.sin(e.angle) * 15;
        particles.burst(tx, ty, 2, { ...ParticleSystem.PRESETS.FIRE, speed: 2, life: 0.3, size: 6 });
        particles.burst(tx, ty, 1, { ...ParticleSystem.PRESETS.SPARKS, speed: 3, life: 0.2 });
        // Glow halo behind player
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.shadowBlur = 25; ctx.shadowColor = e.color;
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, R * 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Drift smoke — thicker, more visible
      if (e.data.drifting) {
        const dsx = s.x - Math.cos(e.angle) * 10;
        const dsy = s.y - Math.sin(e.angle) * 10;
        particles.burst(dsx, dsy, 2, { ...ParticleSystem.PRESETS.SMOKE, speed: 0.5, life: 0.4, size: 5 });
      }

      // Held item indicator above player
      if (e.data.item) {
        const itemIcons = { boost: '⚡', oil: '💧', missile: '🚀' };
        ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.arc(s.x, s.y - R - 12, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(itemIcons[e.data.item] || '?', s.x, s.y - R - 12);
      }

      // Name label above player
      if (!e.data.finished && e.name) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(e.name, s.x, s.y - R - 8);
      }
    }
  }

  // ============================================================
  // LAYER: MINIMAP
  // ============================================================
  function drawMinimap(ctx) {
    if (track.length < 2) return;
    const mmW = 120, mmH = 100;
    const mmX = W - mmW - 12, mmY = H - mmH - 12;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(mmX, mmY, mmW, mmH, 8); ctx.fill(); }
    else { ctx.fillRect(mmX, mmY, mmW, mmH); }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const wp of track) {
      if (wp.x < minX) minX = wp.x; if (wp.x > maxX) maxX = wp.x;
      if (wp.z < minZ) minZ = wp.z; if (wp.z > maxZ) maxZ = wp.z;
    }
    const rangeX = maxX - minX || 1, rangeZ = maxZ - minZ || 1;
    const mmScale = Math.min((mmW - 16) / rangeX, (mmH - 16) / rangeZ);

    const mmPos = (wx, wz) => [mmX + 8 + (wx - minX) * mmScale, mmY + 8 + (wz - minZ) * mmScale];

    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath();
    const [sx, sy] = mmPos(track[0].x, track[0].z);
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const [px, py] = mmPos(wp.x, wp.z);
      ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();

    for (const e of entities.all()) {
      if (!e.visible || e.data.finished) continue;
      const [px, py] = mmPos(e.x, e.y);
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ============================================================
  // LAYER: LAP PENNANT — wood-plank drop, carnival signature
  // ============================================================
  function drawLapPennant(ctx) {
    if (!lapPennant) return;
    const elapsed = performance.now() - lapPennant.t0;
    const enterMs = 180, holdEnd = 820, exitEnd = 1050;
    if (elapsed > exitEnd) { lapPennant = null; return; }

    const plankW = 240, plankH = 68;
    const restY = 28;
    let y;
    if (elapsed < enterMs) {
      const t = Palette.ease.curtain(elapsed / enterMs);
      y = -plankH + (restY + plankH) * t;
    } else if (elapsed < holdEnd) {
      y = restY;
    } else {
      const t = Palette.ease.out((elapsed - holdEnd) / (exitEnd - holdEnd));
      y = restY - (restY + plankH) * t;
    }
    const x = (W - plankW) / 2;

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    // Wood-plank face
    ctx.fillStyle = Palette.woodPlank(ctx, x, y, plankW, plankH);
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, plankW, plankH, 10); ctx.fill(); }
    else ctx.fillRect(x, y, plankW, plankH);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    // Gold-edge border + inner hot highlight for the "ticket" feel
    ctx.strokeStyle = Palette.accentGoldEdge;
    ctx.lineWidth = 2.5;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, plankW, plankH, 10); ctx.stroke(); }
    else ctx.strokeRect(x, y, plankW, plankH);
    ctx.strokeStyle = 'rgba(255,221,107,0.5)';
    ctx.lineWidth = 1;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x + 4, y + 4, plankW - 8, plankH - 8, 7); ctx.stroke(); }

    // Gold-bulb hanging nails at top corners
    ctx.fillStyle = Palette.accentGoldHot;
    ctx.beginPath(); ctx.arc(x + 14, y + 11, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + plankW - 14, y + 11, 3.5, 0, Math.PI * 2); ctx.fill();

    // Alfa Slab gold text with red letterpress
    ctx.font = '700 32px "Alfa Slab One", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    Palette.applyLetterpress(ctx);
    ctx.fillStyle = Palette.accentGold;
    const label = 'LAP ' + lapPennant.lap + '/' + lapPennant.totalLaps;
    ctx.fillText(label, x + plankW / 2, y + plankH / 2 + 3);
    Palette.clearShadow(ctx);
    ctx.restore();
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  let lastStateTime = 0;

  function updateState(state) {
    track = state.track || [];
    trackWidth = state.trackWidth || 2.5;
    totalLaps = state.totalLaps || 3;
    items = state.items || [];
    oilSlicks = state.oilSlicks || [];
    missiles = state.missiles || [];
    lastStateTime = performance.now();

    // Update entities — store previous position for smooth interpolation
    for (const [id, pd] of Object.entries(state.players)) {
      let e = entities.get(id);
      if (!e) {
        e = entities.create(id, 'player');
        e.x = pd.x; e.y = pd.z; e.angle = pd.angle;
        e.color = pd.color;
        e._prevX = pd.x; e._prevY = pd.z; e._prevAngle = pd.angle;
      }
      // Store previous as current before updating target
      e._prevX = e.x;
      e._prevY = e.y;
      e._prevAngle = e.angle;
      e.setTarget({
        x: pd.x, y: pd.z, angle: pd.angle,
      });
      e.color = pd.color;
      e.name = pd.name;
      e.character = pd.character;
      e.visible = pd.connected;
      e.data.finished = pd.finished;
      e.data.boosting = pd.boosting;
      e.data.drifting = pd.drifting;
      e.data.stunned = pd.stunned;
      e.data.item = pd.item;
      e.data.speed = pd.speed || 0;
    }
  }

  function triggerElim() {
    camera.shake(8, 0.3);
  }

  function triggerLap(lap, total) {
    if (typeof lap !== 'number') return;
    if (lap < lastPennantLap) lastPennantLap = 0; // race restarted
    if (lap <= lastPennantLap) return;            // dedup — first crossing per lap wins
    lastPennantLap = lap;
    lapPennant = {
      lap: lap,
      totalLaps: total || totalLaps || 3,
      t0: performance.now(),
    };
  }

  return { init, updateState, triggerElim, triggerLap };
})();

if (typeof window !== 'undefined') window.Render2D = Render2D;
