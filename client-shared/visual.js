// ============================================================
// FRANTICS — Professional Visual Layer
// ============================================================
// AAA-quality rendering utilities shared across all games.
// Ambient particles, screen effects, post-processing.
// Include AFTER effects.js.

const Visual = (() => {
  let W = 0, H = 0, clock = 0;

  // ============================================================
  // AMBIENT PARTICLES — floating in background of every scene
  // ============================================================
  const ambientParticles = [];
  const MAX_AMBIENT = 40;

  function initAmbient(w, h) {
    W = w; H = h;
    ambientParticles.length = 0;
    for (let i = 0; i < MAX_AMBIENT; i++) {
      ambientParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random() * 3,
        speed: 0.1 + Math.random() * 0.3,
        opacity: 0.03 + Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? '255,255,255' : '200,220,255',
      });
    }
  }

  function updateAmbient(dt) {
    clock += dt;
    for (const p of ambientParticles) {
      p.y -= p.speed;
      p.x += Math.sin(clock * 0.5 + p.phase) * 0.3;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
    }
  }

  function drawAmbient(ctx) {
    for (const p of ambientParticles) {
      const pulse = 0.7 + Math.sin(clock * 2 + p.phase) * 0.3;
      ctx.fillStyle = `rgba(${p.color},${p.opacity * pulse})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============================================================
  // POST-PROCESSING — vignette, color grading, bloom
  // ============================================================
  function drawVignette(ctx, intensity, color) {
    if (intensity < 0.01) return;
    const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.75);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.7, `rgba(${color || '0,0,0'},${intensity * 0.3})`);
    grad.addColorStop(1, `rgba(${color || '0,0,0'},${intensity * 0.7})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  function drawBloom(ctx, x, y, radius, color, intensity) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(${color},${intensity})`);
    grad.addColorStop(0.5, `rgba(${color},${intensity * 0.3})`);
    grad.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle film grain overlay
  function drawGrain(ctx, intensity) {
    if (intensity < 0.01) return;
    ctx.globalAlpha = intensity;
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * W;
      const y = Math.random() * H;
      const bright = Math.random() > 0.5 ? 255 : 0;
      ctx.fillStyle = `rgba(${bright},${bright},${bright},0.03)`;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // CONFETTI — celebration bursts
  // ============================================================
  const confetti = [];
  const CONFETTI_COLORS = ['#ff3366', '#ffcc00', '#44ddff', '#66ff66', '#ff8800', '#cc33ff'];

  function burstConfetti(x, y, count) {
    for (let i = 0; i < (count || 30); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      confetti.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        size: 4 + Math.random() * 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        life: 1.5 + Math.random(),
        maxLife: 2.5,
      });
    }
  }

  function updateConfetti(dt) {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.life -= dt;
      if (c.life <= 0) { confetti.splice(i, 1); continue; }
      c.vy += 4 * dt; // gravity
      c.vx *= 0.99;
      c.x += c.vx * dt * 60;
      c.y += c.vy * dt * 60;
      c.rotation += c.rotSpeed;
    }
  }

  function drawConfetti(ctx) {
    for (const c of confetti) {
      const alpha = Math.min(1, c.life / (c.maxLife * 0.3));
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // SPEED LINES — radial motion blur for fast movement
  // ============================================================
  function drawSpeedLines(ctx, cx, cy, intensity) {
    if (intensity < 0.1) return;
    ctx.save();
    ctx.globalAlpha = intensity * 0.15;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const innerR = W * 0.3 + Math.random() * W * 0.2;
      const outerR = innerR + 30 + Math.random() * 60;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ============================================================
  // COUNTDOWN OVERLAY — professional animated countdown
  // ============================================================
  let countdownValue = null;
  let countdownTimer = 0;

  function showCountdown(value) {
    countdownValue = value;
    countdownTimer = 0.8;
  }

  function updateCountdown(dt) {
    if (countdownTimer > 0) countdownTimer -= dt;
    else countdownValue = null;
  }

  function drawCountdown(ctx) {
    if (!countdownValue) return;
    const t = 1 - countdownTimer / 0.8; // 0→1 over 0.8s
    const scale = 1 + (1 - t) * 1.5; // start big, shrink
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3; // fade out at end

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);

    // Glow
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#fff';

    // Ring
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 50 + t * 20, 0, Math.PI * 2 * Math.min(1, t * 1.5));
    ctx.stroke();

    // Text
    ctx.font = '900 72px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(countdownValue, 0, 0);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ============================================================
  // WINNER CELEBRATION
  // ============================================================
  let winnerActive = false;
  let winnerTimer = 0;

  function triggerWinner() {
    winnerActive = true;
    winnerTimer = 0;
    burstConfetti(W / 2, H / 3, 50);
    burstConfetti(W * 0.3, H / 2, 30);
    burstConfetti(W * 0.7, H / 2, 30);
  }

  function updateWinner(dt) {
    if (!winnerActive) return;
    winnerTimer += dt;
    if (winnerTimer > 0.5 && winnerTimer < 0.6) burstConfetti(W / 2, H / 2, 20);
    if (winnerTimer > 3) winnerActive = false;
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function init(w, h) { W = w; H = h; initAmbient(w, h); }
  function resize(w, h) { W = w; H = h; }

  function update(dt) {
    updateAmbient(dt);
    updateConfetti(dt);
    updateCountdown(dt);
    updateWinner(dt);
  }

  // Call after main scene render, before FX
  function drawPost(ctx, opts = {}) {
    drawAmbient(ctx);
    drawConfetti(ctx);
    if (opts.speedIntensity) drawSpeedLines(ctx, W / 2, H / 2, opts.speedIntensity);
    drawCountdown(ctx);
    if (opts.vignette) drawVignette(ctx, opts.vignette, opts.vignetteColor);
    if (opts.grain) drawGrain(ctx, opts.grain);
  }

  return {
    init, resize, update, drawPost,
    drawVignette, drawBloom, drawGrain, drawSpeedLines, drawCountdown,
    drawAmbient, drawConfetti,
    burstConfetti, showCountdown, triggerWinner,
    initAmbient,
  };
})();
