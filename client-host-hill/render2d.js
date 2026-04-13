// ============================================================
// King of the Hill — 2D Top-Down Arena (Canvas2D)
// ============================================================

const Render2D = (() => {
  let canvas, ctx;
  let W, H, CX, CY, SCALE;
  let clock = 0, shakeX = 0, shakeY = 0, shakeI = 0;
  let targetPlatR = 5, renderPlatR = 5;
  let kingZoneR = 1.5;

  const players = {};
  const trails = []; // dash trails

  // Stars
  const stars = [];
  for (let i = 0; i < 80; i++) {
    stars.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random() * 1.5, b: Math.random() });
  }

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    if (typeof FX !== 'undefined') FX.init(W, H);
    if (typeof Visual !== 'undefined') Visual.init(W, H);
    if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);
    let last = performance.now();
    (function animate(now) {
      requestAnimationFrame(animate);
      const rawDt = Math.min((now - last) / 1000, 0.05);
      const dt = rawDt * (typeof FX !== 'undefined' ? FX.getTimeScale() : 1);
      last = now; clock += dt;
      if (typeof FX !== 'undefined') FX.update(rawDt);
      if (typeof Visual !== 'undefined') Visual.update(rawDt);
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
    CX = W / 2; CY = H / 2;
    SCALE = Math.min(W, H) / 13;
  }

  function gts(gx, gz) {
    return [CX + gx * SCALE + shakeX, CY + gz * SCALE + shakeY];
  }

  // ---- STARS ----
  function drawStars() {
    for (const s of stars) {
      const twinkle = 0.2 + Math.sin(clock * 1.5 + s.b * 10) * 0.25;
      ctx.fillStyle = `rgba(200,180,255,${twinkle})`;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.s, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- ARENA ----
  function drawArena(radius) {
    const r = radius * SCALE;
    const [ax, ay] = [CX + shakeX, CY + shakeY];

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

    // King zone — golden center scoring area
    const kingR = (kingZoneR || 1.5) * SCALE;
    const kingGlow = ctx.createRadialGradient(ax, ay, 0, ax, ay, kingR);
    kingGlow.addColorStop(0, 'rgba(255,200,50,0.12)');
    kingGlow.addColorStop(0.7, 'rgba(255,200,50,0.04)');
    kingGlow.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = kingGlow;
    ctx.beginPath(); ctx.arc(ax, ay, kingR, 0, Math.PI * 2); ctx.fill();
    // King zone ring
    ctx.strokeStyle = 'rgba(255,200,50,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.arc(ax, ay, kingR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // Crown icon in center
    ctx.fillStyle = 'rgba(255,200,50,0.08)';
    ctx.font = `${Math.round(kingR * 0.4)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('👑', ax, ay);

    // Edge ring
    const danger = renderPlatR < 3.5;
    const pulse = 0.4 + Math.sin(clock * (danger ? 6 : 3)) * 0.2;
    ctx.strokeStyle = danger ? `rgba(255,60,60,${pulse})` : `rgba(120,80,220,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.stroke();
  }

  // ---- TRAILS ----
  function addTrail(x, y, color) {
    trails.push({ x, y, color, life: 1 });
  }

  function drawTrails() {
    for (let i = trails.length - 1; i >= 0; i--) {
      const t = trails[i];
      t.life -= 0.03;
      if (t.life <= 0) { trails.splice(i, 1); continue; }
      ctx.fillStyle = t.color.replace(')', `,${t.life * 0.3})`).replace('rgb', 'rgba');
      ctx.beginPath(); ctx.arc(t.x, t.y, 4 * t.life, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- CHARACTER ----
  function drawCharacter(gx, gz, color, alive, dashing, idx, character) {
    if (!alive) return;
    const [sx, sy] = gts(gx, gz);

    // Dash trail
    if (dashing) addTrail(sx, sy, color);

    const expr = dashing ? 'determined' : 'happy';
    CharDraw.blob(ctx, sx, sy, 22, color, { idx, clock, expression: expr, dashing, running: false, character });
  }

  // ---- POOF ----
  const poofs = [];
  function spawnPoof(gx, gz, color) {
    const [sx, sy] = gts(gx, gz);
    for (let i = 0; i < 12; i++) {
      poofs.push({
        x: sx, y: sy,
        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
        color, life: 1
      });
    }
    shakeI = 8;
  }

  function drawPoofs() {
    for (let i = poofs.length - 1; i >= 0; i--) {
      const p = poofs[i];
      p.life -= 0.03;
      p.x += p.vx; p.y += p.vy; p.vy += 0.1;
      if (p.life <= 0) { poofs.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---- RENDER ----
  function render(dt) {
    renderPlatR += (targetPlatR - renderPlatR) * 0.04;
    if (shakeI > 0.5) {
      shakeX = (Math.random() - 0.5) * shakeI;
      shakeY = (Math.random() - 0.5) * shakeI;
      shakeI *= 0.88;
    } else { shakeX = shakeY = 0; shakeI = 0; }

    ctx.fillStyle = '#06060f';
    ctx.fillRect(0, 0, W, H);
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);

    drawStars();
    drawArena(renderPlatR);
    drawTrails();

    const ids = Object.keys(players);
    ids.forEach((id, i) => {
      const p = players[id];
      if (!p.alive) return;
      p.rAngle += (p.tAngle - p.rAngle) * 0.15;
      p.rRadius += (p.tRadius - p.rRadius) * 0.18;
      const gx = Math.cos(p.rAngle) * p.rRadius;
      const gz = Math.sin(p.rAngle) * p.rRadius;
      drawCharacter(gx, gz, p.color, p.alive, p.dashing, i, p.character);
    });

    drawPoofs();
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
    if (typeof Visual !== 'undefined') Visual.drawPost(ctx, { vignette: 0.25, grain: 0.015 });
  }

  // ---- PUBLIC ----
  function updateState(state) {
    targetPlatR = state.platR;
    if (state.kingZoneR) kingZoneR = state.kingZoneR;
    const ids = Object.keys(state.players);
    ids.forEach((id, i) => {
      const pd = state.players[id];
      if (!players[id]) {
        players[id] = {
          rAngle: pd.angle, tAngle: pd.angle,
          rRadius: pd.radius, tRadius: pd.radius,
          color: pd.color, alive: pd.alive, dashing: pd.dashing,
          wasAlive: true
        };
      }
      const p = players[id];
      p.tAngle = pd.angle; p.tRadius = pd.radius;
      p.dashing = pd.dashing; p.alive = pd.alive; p.color = pd.color; p.character = pd.character || null;
      if (p.wasAlive && !pd.alive) {
        p.wasAlive = false;
        const gx = Math.cos(pd.angle) * pd.radius;
        const gz = Math.sin(pd.angle) * pd.radius;
        spawnPoof(gx, gz, pd.color);
      }
    });
  }

  function triggerWin() {}

  return { init, updateState, triggerWin };
})();
