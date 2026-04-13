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
  // Trackside objects (generated once)
  const trackObjects = [];
  function generateTrackObjects() {
    if (trackObjects.length > 0 || track.length < 2) return;
    for (let i = 0; i < track.length; i++) {
      const wp = track[i];
      const next = track[(i + 1) % track.length];
      const angle = Math.atan2(next.z - wp.z, next.x - wp.x);
      // Trees on both sides
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
      // Tire barriers at tight corners
      if (i % 4 === 0) {
        const bdist = trackWidth + 0.5;
        trackObjects.push({
          type: 'barrier',
          x: wp.x + Math.cos(angle + Math.PI / 2) * bdist,
          z: wp.z + Math.sin(angle + Math.PI / 2) * bdist,
          angle, size: 1,
        });
      }
    }
  }

  function drawGrass() {
    // Dark green base
    const grassGrad = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.75);
    grassGrad.addColorStop(0, '#2a6a2a');
    grassGrad.addColorStop(0.6, '#1e5520');
    grassGrad.addColorStop(1, '#133a12');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grass patches
    for (let i = 0; i < 35; i++) {
      const gx = ((i * 137 + clock * 0.15) % (W + 80)) - 40;
      const gy = ((i * 89 + 50) % (H + 80)) - 40;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(45,90,38,0.06)' : 'rgba(15,35,12,0.04)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 12 + i % 8, 8 + i % 5, i * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gravel runoff zones at corners
  function drawGravelTraps() {
    if (track.length < 4) return;
    for (let i = 0; i < track.length; i++) {
      const prev = track[(i - 1 + track.length) % track.length];
      const curr = track[i];
      const next = track[(i + 1) % track.length];
      // Detect corners (angle change)
      const a1 = Math.atan2(curr.z - prev.z, curr.x - prev.x);
      const a2 = Math.atan2(next.z - curr.z, next.x - curr.x);
      let diff = a2 - a1;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.3) continue; // not a corner
      // Draw gravel on outside of corner
      const side = diff > 0 ? -1 : 1;
      const [sx, sy] = worldToScreen(
        curr.x + Math.cos(a1 + Math.PI / 2) * side * (trackWidth + 0.8),
        curr.z + Math.sin(a1 + Math.PI / 2) * side * (trackWidth + 0.8)
      );
      const r = camScale * 1.5;
      ctx.fillStyle = 'rgba(160,140,100,0.12)';
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(140,120,80,0.06)';
      ctx.beginPath(); ctx.arc(sx, sy, r * 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Tire marks on corners
  function drawTireMarks() {
    if (track.length < 3) return;
    ctx.strokeStyle = 'rgba(30,30,30,0.08)';
    ctx.lineWidth = camScale * 0.15;
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
      const [sx, sy] = worldToScreen(curr.x, curr.z);
      const [px, py] = worldToScreen(prev.x, prev.z);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy); ctx.stroke();
    }
  }

  // Trackside objects rendering
  function drawTrackObjects() {
    generateTrackObjects();
    for (const obj of trackObjects) {
      const [sx, sy] = worldToScreen(obj.x, obj.z);
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) continue;
      const s = obj.size * camScale * 0.3;

      if (obj.type === 'tree') {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(sx + 3, sy + 3, s * 1.2, s * 0.6, 0.3, 0, Math.PI * 2); ctx.fill();
        // Trunk
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(sx - s * 0.1, sy - s * 0.3, s * 0.2, s * 0.6);
        // Canopy (layered)
        ctx.fillStyle = `rgba(30,${60 + obj.shade * 40},25,0.9)`;
        ctx.beginPath(); ctx.arc(sx, sy - s * 0.3, s * 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(40,${80 + obj.shade * 30},35,0.7)`;
        ctx.beginPath(); ctx.arc(sx - s * 0.2, sy - s * 0.4, s * 0.5, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'rock') {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.ellipse(sx + 2, sy + 2, s * 0.6, s * 0.3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(${100 + obj.shade * 40},${90 + obj.shade * 30},${70 + obj.shade * 20},0.8)`;
        ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.5, s * 0.35, obj.shade, 0, Math.PI * 2); ctx.fill();
      } else if (obj.type === 'barrier') {
        // Red-white tire barrier
        for (let b = 0; b < 3; b++) {
          const bx = sx + Math.cos(obj.angle) * b * s * 0.4;
          const bz = sy + Math.sin(obj.angle) * b * s * 0.4;
          ctx.fillStyle = b % 2 === 0 ? 'rgba(200,40,40,0.6)' : 'rgba(240,240,240,0.5)';
          ctx.beginPath(); ctx.arc(bx, bz, s * 0.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  }

  // ---- TRACK ----
  function drawTrackPath(style, width) {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
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
  }

  function drawTrack() {
    if (track.length < 2) return;
    const tw = trackWidth * camScale;

    // Track shadow (soft dark outline for depth)
    drawTrackPath('rgba(0,0,0,0.35)', tw + 16);

    // Gravel/dirt edge strip (brownish)
    drawTrackPath('rgba(130,110,80,0.2)', tw + 10);

    // Outer kerbs — red/white
    drawTrackPath('rgba(200,40,40,0.5)', tw + 6);

    // Main track surface — dark asphalt (like real tarmac)
    drawTrackPath('#3a3a3a', tw);
    drawTrackPath('#404040', tw - 6);
    drawTrackPath('#454545', tw - 14);

    // Yellow edge lines (like real racing tracks)
    drawTrackPath('rgba(255,200,40,0.25)', tw + 1);

    // Ambient occlusion — darkened edges of track
    drawTrackPath('rgba(0,0,0,0.08)', tw);

    // Center dashed line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.lineCap = 'round';
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
    ctx.setLineDash([]);

    // Start/finish line — proper checkered flag
    if (track.length > 1) {
      const [fx, fy] = worldToScreen(track[0].x, track[0].z);
      const angle = Math.atan2(track[1].z - track[0].z, track[1].x - track[0].x);
      const perpX = -Math.sin(angle) * tw * 0.5;
      const perpY = Math.cos(angle) * tw * 0.5;

      // Checkered flag (8 squares)
      const squares = 8;
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < squares; c++) {
          const isBlack = (r + c) % 2 === 0;
          const t = (c / squares - 0.5) * 2;
          const t2 = ((c + 1) / squares - 0.5) * 2;
          const px1 = fx + perpX * t, py1 = fy + perpY * t;
          const px2 = fx + perpX * t2, py2 = fy + perpY * t2;
          const along = (r - 0.5) * 6;
          const ax = Math.cos(angle) * along, az = Math.sin(angle) * along;
          ctx.fillStyle = isBlack ? '#222' : '#eee';
          ctx.beginPath();
          ctx.moveTo(px1 + ax, py1 + az);
          ctx.lineTo(px2 + ax, py2 + az);
          ctx.lineTo(px2 + ax + Math.cos(angle) * 6, py2 + az + Math.sin(angle) * 6);
          ctx.lineTo(px1 + ax + Math.cos(angle) * 6, py1 + az + Math.sin(angle) * 6);
          ctx.fill();
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

      // Shadow (larger, softer)
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(2, 3, R * 1.1, R * 0.6, 0, 0, Math.PI * 2); ctx.fill();

      // Body glow
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;

      // Body (richer gradient)
      const grad = ctx.createRadialGradient(-3, -3, 1, 0, 2, R * 1.1);
      grad.addColorStop(0, lightenColor(p.color, 50));
      grad.addColorStop(0.35, lightenColor(p.color, 15));
      grad.addColorStop(0.7, p.color);
      grad.addColorStop(1, darkenColor(p.color, 40));
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Specular
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(-R * 0.2, -R * 0.2, R * 0.25, 0, Math.PI * 2); ctx.fill();

      // Outline
      ctx.strokeStyle = darkenColor(p.color, 50);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();

      // Direction arrow (brighter, larger)
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(0, -R - 6);
      ctx.lineTo(-5, -R + 1);
      ctx.lineTo(5, -R + 1);
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

    // Minimap background with rounded corners
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(mmX, mmY, mmW, mmH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

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
    drawGravelTraps();
    if (typeof FX !== 'undefined') FX.drawBefore(ctx);
    drawTrack();
    drawTireMarks();
    drawTrackObjects();
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
  function darkenColor(hex, amt) {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt);
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
