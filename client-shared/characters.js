// ============================================================
// Frantics — Premium Character Renderer (shared)
// ============================================================
// Include via <script src="/shared/characters.js"></script>
// Provides: CharDraw.blob(ctx, x, y, R, color, opts)

const CharDraw = (() => {

  // Premium blob character
  function blob(ctx, x, y, R, color, opts = {}) {
    const { jumpY = 0, idx = 0, clock = 0, expression = 'happy', dashing = false, running = true, sliding = false, character = null } = opts;

    const bob = running && jumpY < 0.02 && !sliding ? Math.sin(clock * 8 + idx * 2) * 2.5 : 0;
    let sY = jumpY > 0.05 ? 1.2 : (jumpY > 0.01 && jumpY < 0.04 ? 0.8 : 1);
    let sX = jumpY > 0.05 ? 0.85 : (jumpY > 0.01 && jumpY < 0.04 ? 1.15 : 1);
    if (dashing) { /* override */ }

    ctx.save();
    ctx.translate(x, y + bob);
    if (sliding) {
      ctx.translate(0, 10); // lower to ground
      ctx.scale(1.4, 0.45);
    } else if (dashing) ctx.scale(0.85, 1.15);
    else ctx.scale(sX, sY);

    // === IDLE BOUNCE (subtle life-like pulse) ===
    const idlePulse = 1 + Math.sin(clock * 3 + idx * 1.5) * 0.015;
    if (!sliding && jumpY < 0.01) ctx.scale(idlePulse, 1 / idlePulse);

    // === SHADOW (larger, softer, offset) ===
    const shadowScale = jumpY > 0.05 ? 0.5 : 1; // smaller shadow when jumping
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(2, R + 6, R * 0.85 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Secondary soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(0, R + 8, R * 1.2 * shadowScale, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // === BODY GLOW (stronger bloom) ===
    ctx.shadowBlur = 25;
    ctx.shadowColor = color;

    // === BODY — rich gradient (more contrast) ===
    const bodyGrad = ctx.createRadialGradient(-R * 0.25, -R * 0.35, R * 0.05, 0, R * 0.1, R * 1.1);
    bodyGrad.addColorStop(0, lighten(color, 50));
    bodyGrad.addColorStop(0.35, lighten(color, 15));
    bodyGrad.addColorStop(0.7, color);
    bodyGrad.addColorStop(1, darken(color, 40));
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 0;

    // === PRIMARY SPECULAR (top-left, large) ===
    const specGrad = ctx.createRadialGradient(-R * 0.3, -R * 0.35, 0, -R * 0.15, -R * 0.2, R * 0.55);
    specGrad.addColorStop(0, 'rgba(255,255,255,0.5)');
    specGrad.addColorStop(0.3, 'rgba(255,255,255,0.15)');
    specGrad.addColorStop(0.7, 'rgba(255,255,255,0.03)');
    specGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    // === SECONDARY SPECULAR (small bright dot) ===
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(-R * 0.22, -R * 0.28, R * 0.12, 0, Math.PI * 2); ctx.fill();

    // === RIM LIGHT (bottom edge, wider) ===
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, R - 0.5, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();

    // === OUTLINE (thicker, darker = more pop) ===
    ctx.strokeStyle = darken(color, 55);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

    // === CHARACTER FEATURES ===
    if (character === 'cat') {
      // Pointed ears
      ctx.fillStyle = darken(color, 20);
      ctx.beginPath(); ctx.moveTo(-R * 0.55, -R * 0.65); ctx.lineTo(-R * 0.7, -R * 1.4); ctx.lineTo(-R * 0.15, -R * 0.85); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.55, -R * 0.65); ctx.lineTo(R * 0.7, -R * 1.4); ctx.lineTo(R * 0.15, -R * 0.85); ctx.fill();
      // Inner ears
      ctx.fillStyle = lighten(color, 30);
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 0.7); ctx.lineTo(-R * 0.62, -R * 1.2); ctx.lineTo(-R * 0.22, -R * 0.85); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.5, -R * 0.7); ctx.lineTo(R * 0.62, -R * 1.2); ctx.lineTo(R * 0.22, -R * 0.85); ctx.fill();
      ctx.globalAlpha = 1;
      // Whiskers
      ctx.strokeStyle = darken(color, 10);
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(-R * 0.4, R * 0.15); ctx.lineTo(-R * 1.3, R * 0.0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-R * 0.4, R * 0.25); ctx.lineTo(-R * 1.3, R * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R * 0.4, R * 0.15); ctx.lineTo(R * 1.3, R * 0.0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(R * 0.4, R * 0.25); ctx.lineTo(R * 1.3, R * 0.25); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (character === 'frog') {
      // Bulging eyes on top (drawn before normal eyes which will be overridden)
      const bulgeR = R * 0.38;
      ctx.fillStyle = darken(color, 15);
      ctx.beginPath(); ctx.arc(-R * 0.35, -R * 0.85, bulgeR, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(R * 0.35, -R * 0.85, bulgeR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eeffee';
      ctx.beginPath(); ctx.arc(-R * 0.35, -R * 0.88, bulgeR * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(R * 0.35, -R * 0.88, bulgeR * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a3a';
      ctx.beginPath(); ctx.arc(-R * 0.33, -R * 0.85, bulgeR * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(R * 0.37, -R * 0.85, bulgeR * 0.35, 0, Math.PI * 2); ctx.fill();
      // Spots
      ctx.fillStyle = darken(color, 10);
      ctx.globalAlpha = 0.2;
      ctx.beginPath(); ctx.arc(-R * 0.3, R * 0.1, R * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(R * 0.35, R * 0.25, R * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(R * 0.05, R * 0.35, R * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (character === 'wolf') {
      // Angular tall ears
      ctx.fillStyle = darken(color, 15);
      ctx.beginPath(); ctx.moveTo(-R * 0.6, -R * 0.6); ctx.lineTo(-R * 0.8, -R * 1.5); ctx.lineTo(-R * 0.1, -R * 0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.6, -R * 0.6); ctx.lineTo(R * 0.8, -R * 1.5); ctx.lineTo(R * 0.1, -R * 0.8); ctx.fill();
      // Fur tufts
      ctx.fillStyle = lighten(color, 15);
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 0.7); ctx.lineTo(-R * 0.6, -R * 1.0); ctx.lineTo(-R * 0.35, -R * 0.8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.5, -R * 0.7); ctx.lineTo(R * 0.6, -R * 1.0); ctx.lineTo(R * 0.35, -R * 0.8); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // === EYES ===
    const eyeY = -R * 0.15;
    const eyeX = R * 0.32;
    const eyeW = R * 0.3;
    const eyeH = R * 0.4;
    const lookX = Math.sin(clock * 1.5 + idx) * R * 0.06;

    // Eye whites with subtle gradient
    const eyeGrad = ctx.createLinearGradient(0, eyeY - eyeH, 0, eyeY + eyeH);
    eyeGrad.addColorStop(0, '#fff');
    eyeGrad.addColorStop(1, '#e8e8f0');
    ctx.fillStyle = eyeGrad;
    ctx.beginPath(); ctx.ellipse(-eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();

    // Eye outline
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(-eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.stroke();

    // Iris
    const irisR = R * 0.18;
    ctx.fillStyle = '#2A2A3A';
    ctx.beginPath(); ctx.arc(-eyeX + lookX, eyeY + R * 0.04, irisR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX + lookX, eyeY + R * 0.04, irisR, 0, Math.PI * 2); ctx.fill();

    // Iris inner (subtle color)
    ctx.fillStyle = 'rgba(60,60,100,0.4)';
    ctx.beginPath(); ctx.arc(-eyeX + lookX, eyeY + R * 0.04, irisR * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX + lookX, eyeY + R * 0.04, irisR * 0.6, 0, Math.PI * 2); ctx.fill();

    // Eye highlights (double)
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeX + lookX - R * 0.06, eyeY - R * 0.1, R * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX + lookX - R * 0.06, eyeY - R * 0.1, R * 0.08, 0, Math.PI * 2); ctx.fill();
    // Small secondary highlight
    ctx.beginPath(); ctx.arc(-eyeX + lookX + R * 0.08, eyeY + R * 0.06, R * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX + lookX + R * 0.08, eyeY + R * 0.06, R * 0.04, 0, Math.PI * 2); ctx.fill();

    // === MOUTH ===
    ctx.lineCap = 'round'; ctx.lineWidth = R * 0.08;
    const mouthY = R * 0.35;

    if (expression === 'scared') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, mouthY, R * 0.15, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    } else if (expression === 'determined') {
      ctx.strokeStyle = darken(color, 50);
      ctx.beginPath(); ctx.moveTo(-R * 0.2, mouthY); ctx.lineTo(R * 0.2, mouthY); ctx.stroke();
    } else if (expression === 'happy') {
      ctx.strokeStyle = darken(color, 50);
      ctx.beginPath(); ctx.arc(0, mouthY - R * 0.05, R * 0.22, 0.15, Math.PI - 0.15); ctx.stroke();
    } else if (expression === 'excited') {
      ctx.fillStyle = darken(color, 40);
      ctx.beginPath();
      ctx.arc(0, mouthY, R * 0.18, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,100,100,0.3)';
      ctx.fill();
    }

    // === WOLF FANGS ===
    if (character === 'wolf') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(-R * 0.12, mouthY + R * 0.02); ctx.lineTo(-R * 0.08, mouthY + R * 0.22); ctx.lineTo(-R * 0.04, mouthY + R * 0.02); ctx.fill();
      ctx.beginPath(); ctx.moveTo(R * 0.04, mouthY + R * 0.02); ctx.lineTo(R * 0.08, mouthY + R * 0.22); ctx.lineTo(R * 0.12, mouthY + R * 0.02); ctx.fill();
    }
    // === CAT NOSE ===
    if (character === 'cat') {
      ctx.fillStyle = darken(color, 30);
      ctx.beginPath(); ctx.moveTo(0, mouthY - R * 0.12); ctx.lineTo(-R * 0.08, mouthY - R * 0.04); ctx.lineTo(R * 0.08, mouthY - R * 0.04); ctx.fill();
    }

    // === BLUSH (subtle) ===
    ctx.fillStyle = 'rgba(255,100,100,0.08)';
    ctx.beginPath(); ctx.ellipse(-eyeX - R * 0.1, eyeY + R * 0.3, R * 0.15, R * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(eyeX + R * 0.1, eyeY + R * 0.3, R * 0.15, R * 0.08, 0, 0, Math.PI * 2); ctx.fill();

    // === RUNNING LEGS ===
    if (running && jumpY < 0.02) {
      const phase = clock * 14 + idx * 3;
      ctx.strokeStyle = darken(color, 15);
      ctx.lineWidth = R * 0.15; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-R * 0.25, R * 0.8);
      ctx.lineTo(-R * 0.25 + Math.sin(phase) * R * 0.3, R + R * 0.3 + Math.abs(Math.cos(phase)) * R * 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(R * 0.25, R * 0.8);
      ctx.lineTo(R * 0.25 + Math.sin(phase + Math.PI) * R * 0.3, R + R * 0.3 + Math.abs(Math.cos(phase + Math.PI)) * R * 0.2);
      ctx.stroke();
    }

    // === LABEL ===
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `700 ${Math.round(R * 0.45)}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('P' + (idx + 1), 0, -R - R * 0.3);

    ctx.restore();

    // === SLIDE DUST TRAIL (outside transform) ===
    if (sliding) {
      ctx.fillStyle = 'rgba(180,160,140,0.15)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x - 10 - i * 8 + Math.random() * 4, y + 12 + Math.random() * 4, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Fox/enemy character
  function fox(ctx, x, y, R, clock) {
    const bob = Math.sin(clock * 12) * 2;
    ctx.save();
    ctx.translate(x, y + bob);

    // Aura glow
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(255,60,0,0.4)';

    // Body
    const bodyGrad = ctx.createRadialGradient(-R * 0.2, -R * 0.25, 0, 0, 0, R);
    bodyGrad.addColorStop(0, '#F06030');
    bodyGrad.addColorStop(0.6, '#D04818');
    bodyGrad.addColorStop(1, '#801808');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    ctx.shadowBlur = 0;

    // Specular
    const spec = ctx.createRadialGradient(-R * 0.25, -R * 0.3, 0, 0, 0, R * 0.6);
    spec.addColorStop(0, 'rgba(255,200,100,0.3)');
    spec.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = spec;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

    // Outline
    ctx.strokeStyle = '#601008'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

    // Evil eyes — glowing
    ctx.shadowBlur = 8; ctx.shadowColor = 'rgba(255,240,0,0.6)';
    ctx.fillStyle = '#FFE800';
    ctx.beginPath(); ctx.ellipse(-R * 0.3, -R * 0.15, R * 0.22, R * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R * 0.3, -R * 0.15, R * 0.22, R * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Slit pupils
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(-R * 0.3, -R * 0.12, R * 0.08, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(R * 0.3, -R * 0.12, R * 0.08, R * 0.22, 0, 0, Math.PI * 2); ctx.fill();

    // Teeth
    ctx.fillStyle = '#fff';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(i * R * 0.12, R * 0.45);
      ctx.lineTo(i * R * 0.05, R * 0.7);
      ctx.lineTo(i * R * 0.25, R * 0.45);
      ctx.fill();
    }

    // Ears
    ctx.fillStyle = '#D04818';
    ctx.beginPath(); ctx.moveTo(-R * 0.55, -R * 0.7); ctx.lineTo(-R * 0.8, -R * 1.3); ctx.lineTo(-R * 0.25, -R * 0.9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R * 0.55, -R * 0.7); ctx.lineTo(R * 0.8, -R * 1.3); ctx.lineTo(R * 0.25, -R * 0.9); ctx.fill();
    // Inner ears
    ctx.fillStyle = '#F08050';
    ctx.beginPath(); ctx.moveTo(-R * 0.55, -R * 0.75); ctx.lineTo(-R * 0.7, -R * 1.15); ctx.lineTo(-R * 0.35, -R * 0.9); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R * 0.55, -R * 0.75); ctx.lineTo(R * 0.7, -R * 1.15); ctx.lineTo(R * 0.35, -R * 0.9); ctx.fill();

    ctx.restore();
  }

  // Particle burst
  function particleBurst(ctx, particles, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt * (p.decay || 2);
      p.x += p.vx; p.y += p.vy;
      p.vy += (p.gravity || 0.15);
      if (p.life <= 0) { particles.splice(i, 1); continue; }

      ctx.globalAlpha = p.life;
      if (p.glow) {
        ctx.shadowBlur = 8; ctx.shadowColor = p.color;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, (p.size || 3) * p.life, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  function spawnBurst(particles, x, y, color, count, opts = {}) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * (opts.spread || 8),
        vy: (Math.random() - 0.5) * (opts.spread || 8) - (opts.upward || 2),
        color: opts.colors ? opts.colors[i % opts.colors.length] : color,
        life: 1,
        size: (opts.size || 4) + Math.random() * 2,
        gravity: opts.gravity || 0.15,
        decay: opts.decay || 2,
        glow: opts.glow || false,
      });
    }
  }

  // Color helpers
  function lighten(hex, amt) {
    const c = hexToRgb(hex);
    return `rgb(${Math.min(255, c.r + amt)},${Math.min(255, c.g + amt)},${Math.min(255, c.b + amt)})`;
  }
  function darken(hex, amt) {
    const c = hexToRgb(hex);
    return `rgb(${Math.max(0, c.r - amt)},${Math.max(0, c.g - amt)},${Math.max(0, c.b - amt)})`;
  }
  function hexToRgb(hex) {
    if (hex.startsWith('rgb')) {
      const m = hex.match(/(\d+)/g);
      return { r: +m[0], g: +m[1], b: +m[2] };
    }
    const h = hex.replace('#', '');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  return { blob, fox, particleBurst, spawnBurst, lighten, darken };
})();
