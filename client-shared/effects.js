// ============================================================
// FRANTICS — AAA Effects Engine (shared)
// ============================================================
// Particle system, screen effects, text popups, slow-mo.
// Include via <script src="/shared/effects.js"></script>
// Call FX.init(canvas) once, then FX.update(dt) + FX.draw(ctx) each frame.

const FX = (() => {
  let W = 0, H = 0;
  let slowMo = 1.0; // time scale (1 = normal, 0.3 = slow)
  let slowMoTimer = 0;

  // ============================================================
  // PARTICLES
  // ============================================================
  const particles = [];
  const MAX_PARTICLES = 300;

  function spawnParticle(x, y, opts = {}) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push({
      x, y,
      vx: opts.vx || (Math.random() - 0.5) * 3,
      vy: opts.vy || (Math.random() - 0.5) * 3,
      life: opts.life || 0.6,
      maxLife: opts.life || 0.6,
      size: opts.size || 3,
      color: opts.color || '#fff',
      gravity: opts.gravity !== undefined ? opts.gravity : 0.1,
      friction: opts.friction || 0.98,
      shrink: opts.shrink !== undefined ? opts.shrink : true,
      glow: opts.glow || false,
    });
  }

  function burst(x, y, count, opts = {}) {
    const baseAngle = opts.angle || 0;
    const spread = opts.spread || Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = baseAngle - spread / 2 + Math.random() * spread;
      const speed = (opts.speed || 4) * (0.5 + Math.random() * 0.5);
      spawnParticle(x, y, {
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: (opts.life || 0.5) * (0.7 + Math.random() * 0.3),
        size: (opts.size || 3) * (0.5 + Math.random() * 0.5),
        color: opts.color || '#fff',
        gravity: opts.gravity !== undefined ? opts.gravity : 0.08,
        friction: opts.friction || 0.96,
        glow: opts.glow || false,
      });
    }
  }

  // Preset bursts
  function elimBurst(x, y, color) {
    burst(x, y, 25, { color, speed: 6, life: 0.8, size: 5, gravity: 0.15, glow: true });
    burst(x, y, 15, { color: '#fff', speed: 3, life: 0.4, size: 2 });
  }

  function powerupBurst(x, y, color) {
    burst(x, y, 12, { color, speed: 3, life: 0.5, size: 4, gravity: 0, glow: true });
  }

  function nearMissSpark(x, y) {
    burst(x, y, 8, { color: '#FFD700', speed: 2, life: 0.3, size: 2, gravity: 0 });
  }

  function trailParticle(x, y, color) {
    spawnParticle(x, y, {
      vx: (Math.random() - 0.5) * 0.5,
      vy: Math.random() * -0.5,
      life: 0.3, size: 2, color, gravity: 0, shrink: true,
    });
  }

  function dustKick(x, y) {
    for (let i = 0; i < 5; i++) {
      spawnParticle(x + (Math.random() - 0.5) * 10, y, {
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        life: 0.4, size: 2 + Math.random() * 2,
        color: 'rgba(180,160,140,0.4)', gravity: 0.05,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt * 60;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
    }
  }

  function drawParticles(ctx) {
    for (const p of particles) {
      const alpha = Math.min(1, p.life / p.maxLife);
      const size = p.shrink ? p.size * alpha : p.size;
      if (p.glow) {
        ctx.shadowBlur = size * 3;
        ctx.shadowColor = p.color;
      }
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
      if (p.glow) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  // ============================================================
  // SCREEN EFFECTS
  // ============================================================
  let flashAlpha = 0, flashColor = '#fff';
  let vignetteIntensity = 0, vignetteColor = 'rgba(0,0,0,';
  let chromaticAmount = 0;
  let shakeX = 0, shakeY = 0, shakeIntensity = 0;

  function screenFlash(color, duration) {
    flashColor = color || '#fff';
    flashAlpha = 1.0;
    // Decay handled in update
  }

  function setVignette(intensity, color) {
    vignetteIntensity = Math.min(1, intensity);
    if (color) vignetteColor = color;
  }

  function chromatic(amount) {
    chromaticAmount = amount;
  }

  function shake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity);
  }

  function updateScreenEffects(dt) {
    // Flash decay
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 4);
    // Chromatic decay
    if (chromaticAmount > 0) chromaticAmount = Math.max(0, chromaticAmount - dt * 3);
    // Shake decay
    if (shakeIntensity > 0.3) {
      shakeX = (Math.random() - 0.5) * shakeIntensity;
      shakeY = (Math.random() - 0.5) * shakeIntensity;
      shakeIntensity *= 0.88;
    } else { shakeX = shakeY = 0; shakeIntensity = 0; }
    // Slow-mo decay
    if (slowMoTimer > 0) {
      slowMoTimer -= dt;
      if (slowMoTimer <= 0) slowMo = 1.0;
    }
  }

  function drawScreenEffects(ctx) {
    // Vignette (supports custom color — e.g., red for danger)
    if (vignetteIntensity > 0.01) {
      const vc = vignetteColor || '0,0,0';
      const grad = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.75);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, `rgba(${vc},${vignetteIntensity * 0.7})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // Flash
    if (flashAlpha > 0.01) {
      ctx.globalAlpha = flashAlpha * 0.6;
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // ============================================================
  // TEXT POPUPS (floating score text)
  // ============================================================
  const popups = [];

  function popup(x, y, text, opts = {}) {
    popups.push({
      x, y,
      text,
      life: opts.life || 1.0,
      maxLife: opts.life || 1.0,
      size: opts.size || 18,
      color: opts.color || '#FFD700',
      vy: opts.vy || -1.5,
      scale: 1.5, // start big, shrink to 1
      glow: opts.glow || false,
    });
  }

  function comboPopup(x, y, combo) {
    const colors = ['#FFD700', '#FF8C00', '#FF4500', '#FF0000', '#FF00FF'];
    const colorIdx = Math.min(combo - 1, colors.length - 1);
    popup(x, y - 30, 'x' + combo, {
      size: 20 + Math.min(combo * 3, 15),
      color: colors[colorIdx],
      life: 0.8,
      glow: true,
    });
  }

  function scorePopup(x, y, score) {
    popup(x, y - 20, '+' + score, { size: 14, color: '#FFD700', life: 0.6 });
  }

  function textPopup(x, y, text, color) {
    popup(x, y - 25, text, { size: 16, color: color || '#fff', life: 1.0, glow: true });
  }

  function updatePopups(dt) {
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.life -= dt;
      if (p.life <= 0) { popups.splice(i, 1); continue; }
      p.y += p.vy * dt * 60;
      p.scale = Math.max(1, p.scale - dt * 3);
    }
  }

  function drawPopups(ctx) {
    for (const p of popups) {
      const alpha = Math.min(1, p.life / p.maxLife * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      if (p.glow) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
      }
      ctx.font = `900 ${p.size}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Outline
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, 0, 0);
      // Fill
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  // ============================================================
  // SLOW-MO
  // ============================================================
  function triggerSlowMo(scale, duration) {
    slowMo = scale || 0.3;
    slowMoTimer = duration || 1.5;
  }

  function getTimeScale() { return slowMo; }

  // ============================================================
  // PUBLIC API
  // ============================================================
  function init(w, h) { W = w; H = h; }

  function resize(w, h) { W = w; H = h; }

  function update(dt) {
    updateParticles(dt);
    updateScreenEffects(dt);
    updatePopups(dt);
  }

  function drawBefore(ctx) {
    // Apply shake transform (call before game rendering)
    if (shakeIntensity > 0) {
      ctx.save();
      ctx.translate(shakeX, shakeY);
    }
  }

  function drawAfter(ctx) {
    // Draw particles, popups, screen effects (call after game rendering)
    if (shakeIntensity > 0) ctx.restore();
    drawParticles(ctx);
    drawPopups(ctx);
    drawScreenEffects(ctx);
  }

  function clear() {
    particles.length = 0;
    popups.length = 0;
    flashAlpha = 0;
    vignetteIntensity = 0;
    chromaticAmount = 0;
    shakeIntensity = 0;
    slowMo = 1.0;
    slowMoTimer = 0;
  }

  return {
    init, resize, update, drawBefore, drawAfter, clear,
    // Particles
    spawnParticle, burst, elimBurst, powerupBurst, nearMissSpark, trailParticle, dustKick,
    // Screen effects
    screenFlash, setVignette, chromatic, shake,
    // Popups
    popup, comboPopup, scorePopup, textPopup,
    // Slow-mo
    triggerSlowMo, getTimeScale,
  };
})();
