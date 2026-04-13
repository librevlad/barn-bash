// ============================================================
// FRANTICS GRAND PRIX — Top-Down 2D Renderer
// ============================================================

const Render2D = (() => {
  let canvas, ctx;
  let W, H;
  let clock = 0;

  const players = {};
  let track = [];
  let trackWidth = 2.5;
  let items = [];
  let oilSlicks = [];
  let missiles = [];
  let totalLaps = 3;

  // Camera
  let camX = 0, camZ = 0, camScale = 40;

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
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (typeof FX !== 'undefined') FX.resize(W, H);
  }

  function worldToScreen(wx, wz) {
    return [(wx - camX) * camScale + W / 2, (wz - camZ) * camScale + H / 2];
  }

  // ---- GRASS ----
  function drawGrass() {
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, W, H);
    // Subtle pattern
    ctx.fillStyle = 'rgba(30,60,30,0.3)';
    for (let i = 0; i < 20; i++) {
      const x = ((i * 137 + clock * 0.5) % (W + 200)) - 100;
      const y = ((i * 89 + 50) % (H + 200)) - 100;
      ctx.beginPath();
      ctx.ellipse(x, y, 40 + i * 3, 20 + i * 2, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- TRACK ----
  function drawTrack() {
    if (track.length < 2) return;
    const tw = trackWidth * camScale;

    // Track surface (gray asphalt)
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = tw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const [sx, sy] = worldToScreen(track[0].x, track[0].z);
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const [px, py] = worldToScreen(wp.x, wp.z);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Edge kerbs (red-white)
    ctx.strokeStyle = 'rgba(200,50,50,0.3)';
    ctx.lineWidth = tw + 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const [px, py] = worldToScreen(wp.x, wp.z);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Re-draw track on top of kerbs
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = tw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const [px, py] = worldToScreen(wp.x, wp.z);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Center dashed line
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const [px, py] = worldToScreen(wp.x, wp.z);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/finish line (checkered)
    if (track.length > 1) {
      const [fx, fy] = worldToScreen(track[0].x, track[0].z);
      const angle = Math.atan2(track[1].z - track[0].z, track[1].x - track[0].x);
      const perpX = -Math.sin(angle) * tw * 0.5;
      const perpY = Math.cos(angle) * tw * 0.5;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(fx + perpX, fy + perpY);
      ctx.lineTo(fx - perpX, fy - perpY);
      ctx.stroke();
      // Checkered pattern
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let c = 0; c < 6; c++) {
        if (c % 2 === 0) {
          const t = (c / 6 - 0.5) * 2;
          ctx.fillRect(fx + perpX * t - 3, fy + perpY * t - 3, 6, 6);
        }
      }
    }
  }

  // ---- ITEMS ----
  function drawItems() {
    for (const item of items) {
      const [ix, iy] = worldToScreen(item.x, item.z);
      const bob = Math.sin(clock * 3 + item.x) * 3;
      const r = 8;
      ctx.save();
      ctx.translate(ix, iy + bob);

      if (item.type === 'boost') {
        ctx.fillStyle = '#44aaff';
        ctx.shadowBlur = 8; ctx.shadowColor = '#44aaff';
      } else if (item.type === 'oil') {
        ctx.fillStyle = '#333';
        ctx.shadowBlur = 4; ctx.shadowColor = '#333';
      } else if (item.type === 'missile') {
        ctx.fillStyle = '#ff4444';
        ctx.shadowBlur = 8; ctx.shadowColor = '#ff4444';
      }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Icon
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.type === 'boost' ? '⚡' : item.type === 'oil' ? '💧' : '🚀', 0, 0);

      ctx.restore();
    }
  }

  // ---- OIL SLICKS ----
  function drawOilSlicks() {
    for (const oil of oilSlicks) {
      const [ox, oy] = worldToScreen(oil.x, oil.z);
      ctx.fillStyle = 'rgba(20,20,20,0.6)';
      ctx.beginPath(); ctx.ellipse(ox, oy, 12, 8, clock * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(60,60,60,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ---- MISSILES ----
  function drawMissiles() {
    for (const m of missiles) {
      const [mx, my] = worldToScreen(m.x, m.z);
      ctx.fillStyle = '#ff2200';
      ctx.shadowBlur = 10; ctx.shadowColor = '#ff2200';
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Trail
      if (typeof FX !== 'undefined') FX.trailParticle(mx, my, '#ff6600');
    }
  }

  // ---- PLAYERS (top-down) ----
  function drawPlayers() {
    const ids = Object.keys(players);
    ids.forEach((id, i) => {
      const p = players[id];
      if (!p.connected) return;
      // Interpolate position
      p.rx += (p.tx - p.rx) * 0.25;
      p.rz += (p.tz - p.rz) * 0.25;
      p.rAngle += ((p.tAngle - p.rAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.2;

      const [sx, sy] = worldToScreen(p.rx, p.rz);
      const R = 14;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rAngle + Math.PI / 2); // +90 so "up" = forward

      // Stun blink
      if (p.stunned && Math.floor(clock * 10) % 2 === 0) ctx.globalAlpha = 0.4;
      // Finished transparency
      if (p.finished) ctx.globalAlpha = 0.4;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(1, 2, R, R * 0.8, 0, 0, Math.PI * 2); ctx.fill();

      // Body
      const grad = ctx.createRadialGradient(-2, -2, 2, 0, 0, R);
      grad.addColorStop(0, lightenColor(p.color, 30));
      grad.addColorStop(1, p.color);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();

      // Direction arrow
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -R - 4);
      ctx.lineTo(-4, -R + 2);
      ctx.lineTo(4, -R + 2);
      ctx.fill();

      // Character features (top-down)
      const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };
      ctx.font = `${R}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.rotate(-(p.rAngle + Math.PI / 2)); // un-rotate for emoji
      ctx.fillText(charIcons[p.character] || '', 0, 0);

      ctx.restore();

      // Boost trail
      if (p.boosting && typeof FX !== 'undefined') {
        const trailX = sx - Math.cos(p.rAngle) * 15;
        const trailY = sy - Math.sin(p.rAngle) * 15;
        FX.trailParticle(trailX, trailY, p.color);
        FX.trailParticle(trailX + (Math.random() - 0.5) * 6, trailY + (Math.random() - 0.5) * 6, '#ffaa00');
      }
      // Drift smoke
      if (p.drifting) {
        const smokeX = sx - Math.cos(p.rAngle) * 10;
        const smokeY = sy - Math.sin(p.rAngle) * 10;
        ctx.fillStyle = 'rgba(200,200,200,0.15)';
        ctx.beginPath(); ctx.arc(smokeX + Math.random() * 6, smokeY + Math.random() * 6, 3 + Math.random() * 3, 0, Math.PI * 2); ctx.fill();
      }

      // Name label
      if (!p.finished) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name || ('P' + id), sx, sy + R + 12);
      }
    });
  }

  // ---- MINIMAP ----
  function drawMinimap() {
    if (track.length < 2) return;
    const mmW = 120, mmH = 100;
    const mmX = W - mmW - 12, mmY = H - mmH - 12;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    // Find track bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const wp of track) {
      if (wp.x < minX) minX = wp.x;
      if (wp.x > maxX) maxX = wp.x;
      if (wp.z < minZ) minZ = wp.z;
      if (wp.z > maxZ) maxZ = wp.z;
    }
    const rangeX = maxX - minX || 1, rangeZ = maxZ - minZ || 1;
    const mmScale = Math.min((mmW - 16) / rangeX, (mmH - 16) / rangeZ);

    function mmPos(wx, wz) {
      return [
        mmX + 8 + (wx - minX) * mmScale,
        mmY + 8 + (wz - minZ) * mmScale,
      ];
    }

    // Track line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const [sx, sy] = mmPos(track[0].x, track[0].z);
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= track.length; i++) {
      const wp = track[i % track.length];
      const [px, py] = mmPos(wp.x, wp.z);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    // Player dots
    for (const [id, p] of Object.entries(players)) {
      if (!p.connected || p.finished) continue;
      const [px, py] = mmPos(p.rx, p.rz);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- RENDER ----
  function render(dt) {
    // Update camera — center on players
    const activePlayers = Object.values(players).filter(p => p.connected && !p.finished);
    if (activePlayers.length > 0) {
      let avgX = 0, avgZ = 0;
      for (const p of activePlayers) { avgX += p.rx; avgZ += p.rz; }
      avgX /= activePlayers.length; avgZ /= activePlayers.length;

      // Find spread for zoom
      let maxDist = 0;
      for (const p of activePlayers) {
        const d = Math.sqrt((p.rx - avgX) ** 2 + (p.rz - avgZ) ** 2);
        if (d > maxDist) maxDist = d;
      }
      const targetScale = Math.max(25, Math.min(50, 300 / (maxDist + 4)));

      camX += (avgX - camX) * 0.08;
      camZ += (avgZ - camZ) * 0.08;
      camScale += (targetScale - camScale) * 0.05;
    }

    drawGrass();
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);
    drawTrack();
    drawOilSlicks();
    drawItems();
    drawMissiles();
    drawPlayers();
    drawMinimap();
    if (typeof FX !== 'undefined') FX.drawAfter(ctx);
    // Find max player speed for speed lines
    let maxSpeed = 0;
    for (const p of Object.values(players)) { if (p.speed > maxSpeed) maxSpeed = p.speed; }
    if (typeof Visual !== 'undefined') Visual.drawPost(ctx, {
      vignette: 0.2,
      grain: 0.015,
      speedIntensity: maxSpeed > 0.1 ? (maxSpeed - 0.1) * 5 : 0,
    });
  }

  // ---- HELPERS ----
  function lightenColor(hex, amt) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amt);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amt);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amt);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  // ---- PUBLIC ----
  function updateState(state) {
    track = state.track || [];
    trackWidth = state.trackWidth || 2.5;
    totalLaps = state.totalLaps || 3;
    items = state.items || [];
    oilSlicks = state.oilSlicks || [];
    missiles = state.missiles || [];

    for (const [id, pd] of Object.entries(state.players)) {
      if (!players[id]) {
        players[id] = {
          rx: pd.x, rz: pd.z, rAngle: pd.angle,
          tx: pd.x, tz: pd.z, tAngle: pd.angle,
          color: pd.color, connected: pd.connected, name: pd.name,
          character: pd.character,
          finished: pd.finished, boosting: pd.boosting,
          drifting: pd.drifting, stunned: pd.stunned, item: pd.item,
        };
      }
      const p = players[id];
      p.tx = pd.x; p.tz = pd.z; p.tAngle = pd.angle;
      p.color = pd.color; p.connected = pd.connected; p.name = pd.name;
      p.character = pd.character;
      p.finished = pd.finished; p.boosting = pd.boosting;
      p.drifting = pd.drifting; p.stunned = pd.stunned; p.item = pd.item;
    }
  }

  function triggerElim() {
    if (typeof FX !== 'undefined') FX.shake(8);
  }

  return { init, updateState, triggerElim };
})();
