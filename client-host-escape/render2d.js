// ============================================================
// Escape the Fox — 2D Side-Scroll Runner (Canvas2D)
// ============================================================

const Render2D = (() => {
  let canvas, ctx;
  let W, H;
  let clock = 0, shakeX = 0, shakeY = 0, shakeI = 0;

  const players = {};
  let worldDist = 0, foxDist = -5, foxProx = 0, speed = 0.3;
  let obstacles = [];
  let powerups = [];
  let foxSprinting = false;
  let dramatic = false;
  let targetWorldDist = 0, targetFoxDist = -5, targetSpeed = 0.3;
  let lastUpdateTime = 0;

  // Biome system
  const BIOMES = [
    { name: 'forest', sky: ['#1a2a4a','#0a1628'], ground: ['#2a5a3a','#1e4a2e'], tree: '#2a6a35' },
    { name: 'cave',   sky: ['#0a0a15','#050510'], ground: ['#3a3a4a','#2a2a3a'], tree: '#4a4a5a' },
    { name: 'snow',   sky: ['#4a5a7a','#2a3a5a'], ground: ['#8a9aaa','#6a7a8a'], tree: '#6a8a6a' },
    { name: 'volcano',sky: ['#4a1a0a','#2a0a05'], ground: ['#5a2a1a','#3a1a0a'], tree: '#6a3a2a' },
  ];
  let currentBiome = 0;
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

  // Parallax layers
  const BG_COLORS = { sky1: '#1a2a4a', sky2: '#0a1628', ground: '#2a5a3a', groundDark: '#1e4a2e' };

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

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if (typeof FX !== 'undefined') FX.init(W, H);
    if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);
    let last = performance.now();
    (function animate(now) {
      requestAnimationFrame(animate);
      const rawDt = Math.min((now - last) / 1000, 0.05);
      const dt = rawDt * (typeof FX !== 'undefined' ? FX.getTimeScale() : 1);
      last = now; clock += dt;
      if (typeof FX !== 'undefined') FX.update(rawDt);
      render(dt);
    })(performance.now());
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (typeof FX !== 'undefined') FX.resize(W, H);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- SKY ----
  function drawSky() {
    const bc = getBiomeColors();
    const grad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    grad.addColorStop(0, bc.sky1);
    grad.addColorStop(1, bc.sky2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.65);

    // Stars
    for (const s of stars) {
      const twinkle = 0.3 + Math.sin(clock * 2 + s.b * 10) * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon
    ctx.fillStyle = 'rgba(255,240,200,0.15)';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.12, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.08)';
    ctx.beginPath();
    ctx.arc(W * 0.8, H * 0.12, 55, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- CLOUDS ----
  function drawClouds() {
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

  // ---- GROUND ----
  function drawGround() {
    const bc = getBiomeColors();
    const groundY = H * 0.62;

    // Hills (parallax)
    ctx.fillStyle = bc.groundDark;
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - worldDist * 8) % (W + 400)) - 200;
      ctx.beginPath();
      ctx.ellipse(x, groundY + 10, 200, 50, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    // Main ground
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

    return groundY;
  }

  // ---- TREES ----
  function drawTrees(groundY) {
    const scrollX = worldDist * 30;
    for (const t of treeDefs) {
      let x = ((t.worldX - scrollX) % (30 * 120));
      if (x < -100) x += 30 * 120;
      if (x > W + 100) continue;

      const baseY = groundY - 2;
      ctx.save();
      ctx.translate(x, baseY);

      if (t.type === 0) {
        // Round tree
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(-3, -t.h * 0.4, 6, t.h * 0.4);
        ctx.fillStyle = '#2a6a35';
        ctx.beginPath(); ctx.arc(0, -t.h * 0.5, t.h * 0.35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a8a45';
        ctx.beginPath(); ctx.arc(4, -t.h * 0.6, t.h * 0.22, 0, Math.PI * 2); ctx.fill();
      } else if (t.type === 1) {
        // Pine
        ctx.fillStyle = '#3a2a18';
        ctx.fillRect(-2, -t.h * 0.3, 4, t.h * 0.3);
        ctx.fillStyle = '#1a5a28';
        ctx.beginPath();
        ctx.moveTo(0, -t.h); ctx.lineTo(-t.h * 0.3, -t.h * 0.2); ctx.lineTo(t.h * 0.3, -t.h * 0.2);
        ctx.fill();
        ctx.fillStyle = '#2a6a35';
        ctx.beginPath();
        ctx.moveTo(0, -t.h * 0.85); ctx.lineTo(-t.h * 0.22, -t.h * 0.35); ctx.lineTo(t.h * 0.22, -t.h * 0.35);
        ctx.fill();
      } else {
        // Bush
        ctx.fillStyle = '#2a6a30';
        ctx.beginPath(); ctx.ellipse(0, -t.h * 0.2, t.h * 0.35, t.h * 0.25, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3a8a40';
        ctx.beginPath(); ctx.ellipse(6, -t.h * 0.25, t.h * 0.2, t.h * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---- OBSTACLES ----
  function drawObstacles(groundY) {
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
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(screenX - 16 * scale, groundY - 2, 32 * scale, 18);
          ctx.strokeStyle = 'rgba(255,100,50,0.25)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX - 16 * scale, groundY - 2, 32 * scale, 18);
        } else if (obs.type === 'high') {
          // Overhead branch/log — must slide under
          const barY = groundY - 38 * scale;
          ctx.fillStyle = '#5a3a20';
          ctx.fillRect(screenX - 22 * scale, barY, 44 * scale, 7 * scale);
          // Support posts
          ctx.fillStyle = '#4a2a15';
          ctx.fillRect(screenX - 20 * scale, barY, 3 * scale, (groundY - barY));
          ctx.fillRect(screenX + 17 * scale, barY, 3 * scale, (groundY - barY));
          // Warning stripe
          ctx.fillStyle = 'rgba(255,200,50,0.15)';
          ctx.fillRect(screenX - 22 * scale, barY - 2, 44 * scale, 3);
        } else {
          const rw = 20 * scale, rh = 18 * scale;
          ctx.fillStyle = '#5a4a3a';
          ctx.beginPath();
          ctx.ellipse(screenX, groundY - rh * 0.4, rw, rh, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#6a5a48';
          ctx.beginPath();
          ctx.ellipse(screenX - 3, groundY - rh * 0.5, rw * 0.6, rh * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ---- POWER-UPS ----
  function drawPowerups(groundY) {
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
      ctx.globalAlpha = 0.8;
      if (pu.type === 'shield') {
        ctx.fillStyle = 'rgba(60,120,255,0.7)';
        ctx.beginPath(); ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#88bbff'; ctx.lineWidth = 1.5; ctx.stroke();
      } else if (pu.type === 'speedBoost') {
        ctx.fillStyle = 'rgba(255,220,50,0.8)';
        ctx.beginPath(); ctx.arc(0, 0, 10 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffee88'; ctx.lineWidth = 1.5; ctx.stroke();
      } else if (pu.type === 'coin') {
        ctx.fillStyle = 'rgba(255,200,50,0.9)';
        ctx.beginPath(); ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c89630'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // ---- CHARACTER (blob) ----
  function drawBlob(x, y, color, jumpY, alive, idx, pdata) {
    if (!alive && !(pdata && pdata.stumbling)) return;
    const sy = y - jumpY * 80;
    const expr = jumpY > 0.05 ? 'excited' : 'determined';
    const sliding = pdata && pdata.sliding;
    const stumbling = pdata && pdata.stumbling;

    ctx.save();
    // Stumble blink
    if (stumbling && Math.floor(clock * 10) % 2 === 0) ctx.globalAlpha = 0.4;

    CharDraw.blob(ctx, x, sy, 20, color, {
      jumpY, idx, clock, expression: expr, running: true,
      sliding: sliding,
      character: pdata ? pdata.character : null,
    });

    // Shield ring
    if (pdata && pdata.shield) {
      ctx.strokeStyle = `rgba(80,160,255,${0.3 + Math.sin(clock * 6) * 0.15})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, sy, 28, 0, Math.PI * 2); ctx.stroke();
    }
    // Speed lines
    if (pdata && pdata.speedBoost) {
      ctx.strokeStyle = 'rgba(255,220,50,0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const lx = x - 15 - i * 8;
        const ly = sy + (i - 1) * 6;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx - 12, ly); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---- FOX ----
  function drawFox(groundY) {
    const relDist = (worldDist - foxDist) * 40;
    const foxX = W * 0.45 - relDist;
    if (foxX < -60 || foxX > W + 60) return;
    const foxY = groundY - 22;
    CharDraw.fox(ctx, foxX, foxY, 24, clock);
  }

  // ---- FOX PROXIMITY WARNING ----
  function drawFoxWarning() {
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

  // ---- RENDER ----
  function render(dt) {
    if (shakeI > 0.3) {
      shakeX = (Math.random() - 0.5) * shakeI;
      shakeY = (Math.random() - 0.5) * shakeI;
      shakeI *= 0.88;
    } else { shakeX = shakeY = 0; shakeI = 0; }

    ctx.save();
    ctx.translate(shakeX, shakeY);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    // Client interpolation for smooth scrolling
    const elapsed = (performance.now() - lastUpdateTime) / 1000;
    worldDist = targetWorldDist + targetSpeed * Math.min(elapsed, 0.15);
    foxDist = targetFoxDist + targetSpeed * 0.95 * Math.min(elapsed, 0.15);

    // Dramatic finish zoom
    if (dramatic) {
      ctx.translate(W * 0.025, H * 0.025);
      ctx.scale(0.95 + Math.sin(clock * 2) * 0.01, 0.95 + Math.sin(clock * 2) * 0.01);
    }

    drawSky();
    drawClouds();
    const groundY = drawGround();
    drawTrees(groundY);
    drawObstacles(groundY);
    drawPowerups(groundY);

    // Lane markers
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

    // Players — positioned by lane + distOffset
    const ids = Object.keys(players);
    ids.forEach((id, i) => {
      const p = players[id];
      if (!p.alive && !p.stumbling) return;
      p.ry += ((p.ty || 0) - p.ry) * 0.25;
      if (p.rlane === undefined) p.rlane = p.lane || 0;
      p.rlane += ((p.lane || 0) - p.rlane) * 0.2;
      const laneOffset = p.rlane * laneW;
      const distOff = (p.distOffset || 0) * 15;
      const py = groundY - 20 - i * 6;
      drawBlob(centerX + laneOffset + distOff, py, p.color, p.ry, p.alive, i, p);
    });

    drawFox(groundY);
    drawFoxWarning();

    ctx.restore();

    // Dust particles at characters' feet
    if (Object.values(players).some(p => p.alive)) {
      ctx.fillStyle = 'rgba(200,220,180,0.15)';
      for (let i = 0; i < 8; i++) {
        const px = centerX + Math.sin(clock * 5 + i * 7) * 30;
        const py = groundY + 2 + Math.random() * 5;
        ctx.beginPath(); ctx.arc(px, py, 1 + Math.random(), 0, Math.PI * 2); ctx.fill();
      }
    }

    // FX overlay (particles, popups, screen effects)
    if (typeof FX !== 'undefined') {
      FX.drawAfter(ctx);
      // Dynamic vignette based on fox proximity
      FX.setVignette(foxProx * 0.6, 'rgba(180,20,0,');
    }
  }

  // ---- PUBLIC ----
  function updateState(state) {
    targetWorldDist = state.worldDist;
    targetFoxDist = state.foxDist;
    targetSpeed = state.speed;
    lastUpdateTime = performance.now();
    foxProx = state.foxProximity || 0;
    foxSprinting = state.foxSprinting || false;
    obstacles = state.obstacles || [];
    powerups = state.powerups || [];

    const ids = Object.keys(state.players);
    ids.forEach((id) => {
      const pd = state.players[id];
      if (!players[id]) {
        players[id] = { ry: 0, ty: 0, color: pd.color, alive: pd.alive };
      }
      const p = players[id];
      p.ty = pd.y || 0;
      p.alive = pd.alive;
      p.lane = pd.lane || 0;
      p.color = pd.color;
      p.sliding = pd.sliding || false;
      p.shield = pd.shield || false;
      p.speedBoost = pd.speedBoost || false;
      p.distOffset = pd.distOffset || 0;
      p.stumbling = pd.stumbling || false;
      p.combo = pd.combo || 0;
      p.character = pd.character || 'cat';
    });
  }

  function triggerDramatic() { dramatic = true; }

  function triggerElim() { shakeI = 10; }
  function triggerWin() {}

  return { init, updateState, triggerElim, triggerWin, triggerDramatic };
})();
