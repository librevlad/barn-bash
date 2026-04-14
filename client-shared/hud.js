// ============================================================
// FRANTICS — Shared HUD Component
// ============================================================
// Consistent player status bar across all game modes.
// Include via <script src="/shared/hud.js"></script>
// Call HUD.init() once, then HUD.update(players, extras) each state tick.

const HUD = (() => {
  let container = null;
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };

  function init() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'shared-hud';
    container.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 25;
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 10px 16px; pointer-events: none;
      background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%);
    `;
    container.innerHTML = `
      <div id="hud-left" style="display:flex;flex-direction:column;gap:4px"></div>
      <div id="hud-players" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;flex:1;margin:0 12px"></div>
      <div id="hud-right" style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"></div>
    `;
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = `
      .hud-player {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 10px; border-radius: 8px;
        background: rgba(0,0,0,0.3); backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.06);
        transition: opacity 0.3s, transform 0.2s;
        font-size: 12px; color: #ccc;
      }
      .hud-player.dead { opacity: 0.3; transform: scale(0.9); }
      .hud-player.stumbling { animation: hudBlink 0.3s ease-in-out infinite; }
      .hud-player-icon { font-size: 18px; }
      .hud-player-name { font-weight: 700; font-size: 15px; }
      .hud-player-score { font-size: 11px; color: #FFD700; margin-left: 4px; }
      .hud-player-combo { font-size: 10px; color: #FF8C00; font-weight: 700; }
      .hud-player-shield { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #4488ff; margin-left: 4px; box-shadow: 0 0 6px rgba(68,136,255,0.5); }
      .hud-player-speed { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ffdd44; margin-left: 4px; box-shadow: 0 0 6px rgba(255,220,68,0.5); }
      .hud-label { font-size: 10px; letter-spacing: 2px; color: #666; text-transform: uppercase; transition: color 0.3s; }
      .hud-value { font-size: 18px; font-weight: 800; color: #eee; text-shadow: 0 1px 8px rgba(0,0,0,0.5); transition: transform 0.15s ease-out, color 0.3s; }
      .hud-value.bump { transform: scale(1.2); }
      .hud-value-warn { color: #ff4422; }
      @keyframes hudBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    `;
    document.head.appendChild(style);
  }

  function update(players, extras = {}) {
    if (!container) return;
    const $left = document.getElementById('hud-left');
    const $players = document.getElementById('hud-players');
    const $right = document.getElementById('hud-right');

    // Left: game-specific info (with bump animation on value change)
    let leftHTML = '';
    if (extras.gameName) leftHTML += `<div class="hud-label">${extras.gameName}</div>`;
    if (extras.primary) {
      const changed = $left._lastPrimary && $left._lastPrimary !== extras.primary;
      leftHTML += `<div class="hud-value${changed ? ' bump' : ''}">${extras.primary}</div>`;
      $left._lastPrimary = extras.primary;
      if (changed) setTimeout(() => { const v = $left.querySelector('.hud-value'); if (v) v.classList.remove('bump'); }, 200);
    }
    if (extras.secondary) leftHTML += `<div class="hud-label" style="color:${extras.secondaryColor || '#888'}">${extras.secondary}</div>`;
    $left.innerHTML = leftHTML;

    // Right: alive count
    const connected = Object.values(players).filter(p => p.connected);
    const alive = connected.filter(p => p.alive);
    $right.innerHTML = `
      <div class="hud-value">${alive.length}/${connected.length}</div>
      <div class="hud-label">alive</div>
    `;

    // Players bar
    let playersHTML = '';
    for (const [id, p] of Object.entries(players)) {
      if (!p.connected) continue;
      const icon = p.character ? (charIcons[p.character] || '') : '';
      const name = p.name || ('P' + id);
      const dead = !p.alive;
      const stumbling = p.stumbling || false;
      const cls = dead ? 'hud-player dead' : (stumbling ? 'hud-player stumbling' : 'hud-player');

      let badges = '';
      if (p.shield) badges += '<span class="hud-player-shield"></span>';
      if (p.speedBoost) badges += '<span class="hud-player-speed"></span>';

      let scoreText = '';
      if (p.score > 0) scoreText = `<span class="hud-player-score">${p.score}</span>`;

      let comboText = '';
      if (p.combo > 1) comboText = `<span class="hud-player-combo">x${p.combo}</span>`;

      // Compact: emoji + color dot + score (name shown above blob on field)
      playersHTML += `
        <div class="${cls}" style="border-color:${p.color}22">
          <span class="hud-player-icon">${icon}</span>
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin:0 2px"></span>
          ${scoreText}${comboText}${badges}
        </div>
      `;
    }
    $players.innerHTML = playersHTML;
  }

  function hide() {
    if (container) container.style.display = 'none';
  }

  function show() {
    if (container) container.style.display = '';
  }

  return { init, update, hide, show };
})();
