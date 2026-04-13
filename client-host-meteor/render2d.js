// ============================================================
// Meteor Shower — Premium 2D Renderer (Safe Zone mechanic)
// ============================================================

const Render2D = (() => {
  let canvas, ctx;
  let W, H, CX, CY, SCALE;
  let clock = 0, shakeX = 0, shakeY = 0, shakeI = 0;
  let targetPlatR = 4.5, renderPlatR = 4.5;
  let impactFlash = 0;

  const players = {};
  let safeZone = { x: 0, z: 0, r: 1.2 };
  let subPhase = 'idle';
  let showSafe = false;

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
    if (typeof FX !== 'undefined') FX.resize(W, H);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CX = W / 2; CY = H / 2;
    SCALE = Math.min(W, H) / 12;
  }

  function gts(gx, gz) {
    return [CX + gx * SCALE + shakeX, CY + gz * SCALE + shakeY];
  }

  // ---- ARENA ----
  function drawArena(radius) {
    const r = radius * SCALE;
    const [ax, ay] = [CX + shakeX, CY + shakeY];

    // Outer glow
    const glow = ctx.createRadialGradient(ax, ay, r * 0.9, ax, ay, r * 1.3);
    glow.addColorStop(0, 'rgba(255,68,0,0.12)');
    glow.addColorStop(1, 'rgba(255,68,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ax, ay, r * 1.3, 0, Math.PI * 2); ctx.fill();

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

    // Edge
    const pulse = 0.5 + Math.sin(clock * 3.5) * 0.15;
    ctx.strokeStyle = `rgba(255,68,0,${pulse})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ---- DANGER ZONE ----
  function drawDangerOverlay(radius) {
    if (!showSafe) return;
    const r = radius * SCALE;
    const [ax, ay] = [CX + shakeX, CY + shakeY];
    const [sx, sy] = gts(safeZone.x, safeZone.z);
    const sr = safeZone.r * SCALE;

    // Red tint over entire arena EXCEPT safe zone
    ctx.save();
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2);
    ctx.clip();

    // Danger overlay — pulsing red
    const dangerOpacity = 0.15 + Math.sin(clock * 6) * 0.05;
    ctx.fillStyle = `rgba(255,20,0,${dangerOpacity})`;
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

  // ---- SAFE ZONE ----
  function drawSafeZone() {
    if (!showSafe) return;
    const [sx, sy] = gts(safeZone.x, safeZone.z);
    const sr = safeZone.r * SCALE;

    // Green glow
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 1.5);
    glow.addColorStop(0, 'rgba(50,220,80,0.15)');
    glow.addColorStop(0.6, 'rgba(50,220,80,0.05)');
    glow.addColorStop(1, 'rgba(50,220,80,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, sr * 1.5, 0, Math.PI * 2); ctx.fill();

    // Safe disc
    ctx.fillStyle = 'rgba(50,200,80,0.1)';
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();

    // Pulsing ring
    const pulse = 0.4 + Math.sin(clock * 5) * 0.2;
    ctx.strokeStyle = `rgba(80,255,120,${pulse})`; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.stroke();

    // "SAFE" label
    ctx.fillStyle = `rgba(80,255,120,${pulse})`;
    ctx.font = '700 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAFE', sx, sy - sr - 8);
  }

  // ---- CHARACTER ----
  function drawCharacter(gx, gz, color, alive, safe, idx, character) {
    if (!alive) return;
    const [sx, sy] = gts(gx, gz);
    const expr = (subPhase === 'warning' && !safe) ? 'scared' : (safe && showSafe) ? 'happy' : 'determined';

    // Safe indicator ring
    if (safe && showSafe) {
      ctx.strokeStyle = 'rgba(80,255,120,0.5)'; ctx.lineWidth = 3;
      ctx.shadowBlur = 10; ctx.shadowColor = 'rgba(80,255,120,0.4)';
      ctx.beginPath(); ctx.arc(sx, sy, 28, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    CharDraw.blob(ctx, sx, sy, 22, color, { idx, clock, expression: expr, running: false, character });
  }

  // ---- EMBERS ----
  function drawEmbers() {
    ctx.fillStyle = 'rgba(255,90,25,0.25)';
    for (let i = 0; i < 25; i++) {
      const x = ((Math.sin(clock * 0.3 + i * 47) * 0.5 + 0.5) * W);
      const y = ((Math.cos(clock * 0.2 + i * 31) * 0.5 + 0.5) * H);
      const s = 1 + Math.sin(clock * 1.5 + i) * 0.5;
      ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- TIMER BAR ----
  let warnProgress = 0; // 0 = just started, 1 = about to impact
  function drawTimerBar() {
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

  // ---- RENDER ----
  function render(dt) {
    renderPlatR += (targetPlatR - renderPlatR) * 0.04;
    if (shakeI > 0.5) {
      shakeX = (Math.random() - 0.5) * shakeI;
      shakeY = (Math.random() - 0.5) * shakeI;
      shakeI *= 0.9;
    } else { shakeX = shakeY = 0; shakeI = 0; }
    if (impactFlash > 0) impactFlash -= dt * 3;

    // Clear
    ctx.fillStyle = '#0C0608';
    ctx.fillRect(0, 0, W, H);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    drawEmbers();
    drawArena(renderPlatR);
    drawDangerOverlay(renderPlatR);
    drawSafeZone();
    drawTimerBar();

    // Players
    const ids = Object.keys(players);
    ids.forEach((id, i) => {
      const p = players[id];
      if (!p.alive || !p.connected) return;
      p.rx += (p.tx - p.rx) * 0.25;
      p.rz += (p.tz - p.rz) * 0.25;
      drawCharacter(p.rx, p.rz, p.color, p.alive, p.safe, i, p.character);
    });

    // Impact flash
    if (impactFlash > 0) {
      ctx.fillStyle = `rgba(255,50,0,${impactFlash * 0.2})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
  }

  // ---- PUBLIC ----
  function updateState(state) {
    targetPlatR = state.platR;
    subPhase = state.subPhase;
    showSafe = state.subPhase === 'warning';
    if (state.safeZone) safeZone = state.safeZone;
    // Timer progress: subTick counts down, higher = more time left
    if (state.subPhase === 'warning' && state.subTick !== undefined) {
      const maxTicks = Math.max(30, 50 - (state.wave || 1) * 2);
      warnProgress = 1 - (state.subTick / maxTicks);
    } else {
      warnProgress = 0;
    }

    const ids = Object.keys(state.players);
    ids.forEach((id) => {
      const pd = state.players[id];
      if (!players[id]) {
        players[id] = { rx: pd.x, rz: pd.z, tx: pd.x, tz: pd.z, color: pd.color, alive: pd.alive, connected: pd.connected, safe: pd.safe };
      }
      const p = players[id];
      p.tx = pd.x; p.tz = pd.z;
      p.alive = pd.alive; p.connected = pd.connected;
      p.safe = pd.safe; p.color = pd.color; p.character = pd.character || null;
    });
  }

  function onWarning(data) {
    if (data.safeZone) safeZone = data.safeZone;
    showSafe = true;
  }

  function onImpact() {
    shakeI = 15;
    impactFlash = 1;
    showSafe = false;
  }

  function triggerWin() {}

  return { init, updateState, onWarning, onImpact, triggerWin };
})();
