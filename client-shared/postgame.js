// ============================================================
// FRANTICS — Post-Game Overlay (shared)
// ============================================================
// Rich result screen: winner, stats, narrator, auto-countdown.
// Include via <script src="/shared/postgame.js"></script>

const PostGame = (() => {
  let overlay = null;
  let countdownTimer = null;

  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'postgame-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 35;
      background: rgba(5,5,15,0.9);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      color: #eee; opacity: 0; pointer-events: none;
      transition: opacity 0.6s ease-out;
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      #postgame-overlay.show { opacity: 1; pointer-events: auto; }
      .pg-winner-icon { font-size: 64px; margin-bottom: 8px; animation: pgBounce 0.6s ease-out; }
      .pg-winner-name { font-size: 28px; font-weight: 900; margin-bottom: 4px; }
      .pg-winner-label { font-size: 18px; font-weight: 700; letter-spacing: 3px; margin-bottom: 20px; }
      .pg-narrator { font-size: 13px; color: #888; font-style: italic; margin-bottom: 24px; max-width: 400px; text-align: center; }
      .pg-stats { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px; }
      .pg-stat { text-align: center; padding: 10px 16px; background: rgba(255,255,255,0.04); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); min-width: 80px; }
      .pg-stat-value { font-size: 22px; font-weight: 800; color: #FFD700; }
      .pg-stat-label { font-size: 10px; color: #666; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
      .pg-countdown { font-size: 14px; color: #555; margin-bottom: 16px; letter-spacing: 2px; }
      .pg-buttons { display: flex; gap: 12px; }
      .pg-btn { padding: 10px 24px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: rgba(255,255,255,0.06); color: #ccc; font-size: 14px; cursor: pointer; font-family: inherit; transition: background 0.2s; }
      .pg-btn:hover { background: rgba(255,255,255,0.12); }
      .pg-no-winner { font-size: 48px; margin-bottom: 12px; }
      @keyframes pgBounce { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
    `;
    document.head.appendChild(style);
  }

  /**
   * Show post-game results
   * @param {Object} opts
   * @param {string|null} opts.winnerId
   * @param {string} opts.winnerName
   * @param {string} opts.winnerColor
   * @param {string} opts.winnerCharacter
   * @param {string} opts.winLabel — "SURVIVED!" / "IS KING!" / "WINS THE RACE!"
   * @param {string} opts.loseIcon — emoji for nobody-wins case
   * @param {string} opts.loseText — "EVERYONE GOT BURNED!"
   * @param {string} opts.loseQuote — narrator quote for loss
   * @param {Array} opts.stats — [{label, value}] round stats
   * @param {Function} opts.onPlayAgain
   * @param {Function} opts.onLobby
   * @param {number} opts.autoLobbySeconds — auto-return to lobby (default 15)
   */
  function show(opts) {
    createOverlay();
    if (typeof HUD !== 'undefined') HUD.hide();
    clearInterval(countdownTimer);

    const hasWinner = opts.winnerId && opts.winnerName;
    const icon = hasWinner ? (charIcons[opts.winnerCharacter] || '🏆') : (opts.loseIcon || '💀');
    const autoSeconds = opts.autoLobbySeconds || 15;
    let remaining = autoSeconds;

    // Build stats HTML
    let statsHTML = '';
    if (opts.stats && opts.stats.length > 0) {
      statsHTML = '<div class="pg-stats">' +
        opts.stats.map(s => `<div class="pg-stat"><div class="pg-stat-value">${s.value}</div><div class="pg-stat-label">${s.label}</div></div>`).join('') +
        '</div>';
    }

    // Narrator quote
    let narratorHTML = '';
    if (hasWinner) {
      narratorHTML = `<div class="pg-narrator">"${opts.winnerName} survived. ${['Barely.', 'Impressive.', 'The rest of you should practice.', 'Don\'t let it go to your head.'][Math.floor(Math.random() * 4)]}"</div>`;
    } else if (opts.loseQuote) {
      narratorHTML = `<div class="pg-narrator">"${opts.loseQuote}"</div>`;
    }

    overlay.innerHTML = `
      <div class="pg-winner-icon" style="${hasWinner ? 'filter:drop-shadow(0 0 20px ' + opts.winnerColor + ')' : ''}">${icon}</div>
      ${hasWinner ? `
        <div class="pg-winner-name" style="color:${opts.winnerColor};text-shadow:0 0 25px ${opts.winnerColor}">${opts.winnerName}</div>
        <div class="pg-winner-label">${opts.winLabel || 'WINS!'}</div>
      ` : `
        <div class="pg-winner-name" style="color:#ff6644">${opts.loseText || 'NOBODY SURVIVED!'}</div>
      `}
      ${narratorHTML}
      ${statsHTML}
      <div class="pg-countdown" id="pg-countdown">Returning to lobby in ${remaining}s...</div>
      <div class="pg-buttons">
        <div class="pg-btn" id="pg-again">PLAY AGAIN</div>
        <div class="pg-btn" id="pg-lobby">LOBBY</div>
      </div>
    `;

    overlay.classList.add('show');

    // Button handlers
    document.getElementById('pg-again').onclick = () => {
      hide();
      clearInterval(countdownTimer);
      if (opts.onPlayAgain) opts.onPlayAgain();
    };
    document.getElementById('pg-lobby').onclick = () => {
      hide();
      clearInterval(countdownTimer);
      if (opts.onLobby) opts.onLobby();
    };

    // Auto countdown
    const cdEl = document.getElementById('pg-countdown');
    countdownTimer = setInterval(() => {
      remaining--;
      if (cdEl) cdEl.textContent = remaining > 0 ? `Returning to lobby in ${remaining}s...` : 'Returning...';
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        hide();
        if (opts.onLobby) opts.onLobby();
      }
    }, 1000);
  }

  function hide() {
    if (overlay) overlay.classList.remove('show');
    clearInterval(countdownTimer);
  }

  function isVisible() {
    return overlay && overlay.classList.contains('show');
  }

  return { show, hide, isVisible };
})();
