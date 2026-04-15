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
      font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
      color: var(--text-cream, #f5ead4);
      background: linear-gradient(180deg, rgba(61, 40, 23, 0.72) 0%, transparent 100%);
    `;
    container.innerHTML = `
      <div id="hud-left" style="display:flex;flex-direction:column;gap:4px"></div>
      <div id="hud-players" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;flex:1;margin:0 12px"></div>
      <div id="hud-right" style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"></div>
    `;
    document.body.appendChild(container);

    const style = document.createElement('style');
    style.textContent = `
      #shared-hud .hud-player {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 10px; border-radius: var(--radius-md, 8px);
        background: rgba(61, 40, 23, 0.72);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(244, 197, 66, 0.2);
        transition: opacity 0.3s, transform 0.2s;
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 12px;
        color: var(--text-cream, #f5ead4);
      }
      #shared-hud .hud-player.dead { opacity: 0.3; transform: scale(0.9); }
      #shared-hud .hud-player.stumbling { animation: hudBlink 0.3s ease-in-out infinite; }
      #shared-hud .hud-player-icon { font-size: 18px; }
      #shared-hud .hud-player-name {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-weight: 400; font-size: 15px;
        letter-spacing: 0.5px;
      }
      #shared-hud .hud-player-score {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 12px;
        color: var(--accent-gold, #f4c542);
        margin-left: 4px;
      }
      #shared-hud .hud-player-combo {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 11px;
        color: var(--accent-gold-hot, #ffdd6b);
      }
      #shared-hud .hud-player-shield {
        display: inline-block; width: 8px; height: 8px; border-radius: 50%;
        background: var(--info-blue, #5ba8d9); margin-left: 4px;
        box-shadow: 0 0 6px rgba(91, 168, 217, 0.6);
      }
      #shared-hud .hud-player-speed {
        display: inline-block; width: 8px; height: 8px; border-radius: 50%;
        background: var(--accent-gold-hot, #ffdd6b); margin-left: 4px;
        box-shadow: 0 0 6px rgba(255, 221, 107, 0.7);
      }
      #shared-hud .hud-label {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 10px; letter-spacing: 2px;
        color: var(--text-dim, rgba(245, 234, 212, 0.55));
        text-transform: uppercase;
        transition: color 0.3s;
      }
      #shared-hud .hud-value {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 20px; font-weight: 400;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818),
                     0 2px 8px rgba(0, 0, 0, 0.6);
        letter-spacing: 0.5px;
        transition: transform 0.15s ease-out, color 0.3s;
      }
      #shared-hud .hud-value.bump { transform: scale(1.2); }
      #shared-hud .hud-value-warn { color: var(--danger-red, #d9534f); }
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
