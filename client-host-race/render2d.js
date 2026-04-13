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

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Initial camera: centered on track, zoomed to fit (~40px per game unit)
    camera.setPosition(0, 1);
    camera.setZoom(40);

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

    drawTrackPath(ctx, 'rgba(0,0,0,0.35)', tw + 16);
    drawTrackPath(ctx, 'rgba(130,110,80,0.2)', tw + 10);
    drawTrackPath(ctx, 'rgba(200,40,40,0.5)', tw + 6);
    drawTrackPath(ctx, '#3a3a3a', tw);
    drawTrackPath(ctx, '#404040', tw - 6);
    drawTrackPath(ctx, '#454545', tw - 14);
    drawTrackPath(ctx, 'rgba(255,200,40,0.25)', tw + 1);

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
        trackObjects.push({
          type: Math.random() < 0.7 ? 'tree' : 'rock',
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
    for (const obj of trackObjects) {
      const s = camera.worldToScreen(obj.x, obj.z);
      if (s.x < -50 || s.x > W + 50 || s.y < -50 || s.y > H + 50) continue;
      const sz = obj.size * camera.getZoom() * 0.3;

      if (obj.type === 'tree') {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(s.x + 3, s.y + 3, sz * 1.2, sz * 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(s.x - sz * 0.1, s.y - sz * 0.3, sz * 0.2, sz * 0.6);
        ctx.fillStyle = `rgba(30,${60 + obj.shade * 40},25,0.9)`;
        ctx.beginPath(); ctx.arc(s.x, s.y - sz * 0.3, sz * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(40,${80 + obj.shade * 30},35,0.7)`;
        ctx.beginPath(); ctx.arc(s.x - sz * 0.2, s.y - sz * 0.4, sz * 0.5, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'rock') {
        ctx.fillStyle = `rgba(${100 + obj.shade * 40},${90 + obj.shade * 30},${70 + obj.shade * 20},0.8)`;
        ctx.beginPath(); ctx.ellipse(s.x, s.y, sz * 0.5, sz * 0.35, obj.shade, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'barrier') {
        for (let b = 0; b < 3; b++) {
          const bx = s.x + Math.cos(obj.angle) * b * sz * 0.4;
          const bz = s.y + Math.sin(obj.angle) * b * sz * 0.4;
          ctx.fillStyle = b % 2 === 0 ? 'rgba(200,40,40,0.6)' : 'rgba(240,240,240,0.5)';
          ctx.beginPath(); ctx.arc(bx, bz, sz * 0.2, 0, Math.PI * 2); ctx.fill();
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
      const r = 14;
      const pulse = 0.7 + Math.sin(clock * 4 + item.x * 2) * 0.3;

      ctx.save();
      ctx.translate(s.x, s.y + bob);

      let ringColor;
      if (item.type === 'boost') { ringColor = '68,170,255'; ctx.shadowBlur = 16; ctx.shadowColor = '#44aaff'; ctx.fillStyle = '#44aaff'; }
      else if (item.type === 'oil') { ringColor = '80,80,80'; ctx.shadowBlur = 10; ctx.shadowColor = '#666'; ctx.fillStyle = '#555'; }
      else { ringColor = '255,68,68'; ctx.shadowBlur = 16; ctx.shadowColor = '#ff4444'; ctx.fillStyle = '#ff4444'; }

      // Pulsing ring
      ctx.strokeStyle = `rgba(${ringColor},${0.2 + pulse * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r + 6 + pulse * 4, 0, Math.PI * 2); ctx.stroke();

      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-2, -2, r * 0.5, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.type === 'boost' ? '⚡' : item.type === 'oil' ? '💧' : '🚀', 0, 1);

      ctx.font = '8px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(item.type.toUpperCase(), 0, r + 10);

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
    const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };

    for (const e of entities.all()) {
      if (!e.visible) continue;
      // Interpolate
      e.lerp(0.25);

      const s = camera.worldToScreen(e.x, e.y);
      const R = 14;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(e.angle + Math.PI / 2);

      // Squash/stretch based on speed (AAA juice)
      const spd = e.data.speed || 0;
      const stretchX = 1.0 - spd * 0.8;  // narrower at high speed
      const stretchY = 1.0 + spd * 0.6;  // taller at high speed
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

      // Name label
      if (!e.data.finished) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px -apple-system, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(e.name || ('P' + e.id), s.x, s.y + R + 12);
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
  // PUBLIC API
  // ============================================================
  function updateState(state) {
    track = state.track || [];
    trackWidth = state.trackWidth || 2.5;
    totalLaps = state.totalLaps || 3;
    items = state.items || [];
    oilSlicks = state.oilSlicks || [];
    missiles = state.missiles || [];

    // Update entities from server state
    for (const [id, pd] of Object.entries(state.players)) {
      let e = entities.get(id);
      if (!e) {
        e = entities.create(id, 'player');
        e.x = pd.x; e.y = pd.z;
        e.color = pd.color;
      }
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

  return { init, updateState, triggerElim };
})();
