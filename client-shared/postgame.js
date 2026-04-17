// ============================================================
// FRANTICS — Post-Game Overlay (shared)
// ============================================================
// Rich result screen: winner, stats, narrator, auto-countdown.
// Include via <script src="/shared/postgame.js"></script>

const PostGame = (() => {
  let overlay = null;
  let countdownTimer = null;

  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'postgame-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 35;
      background: rgba(47, 28, 12, 0.92);
      backdrop-filter: blur(8px);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
      color: var(--text-cream, #f5ead4);
      opacity: 0; pointer-events: none;
      transition: opacity 0.6s ease-out;
    `;
    document.body.appendChild(overlay);

    // Phase 15b — gold filigree corner flourishes.
    if (typeof HostCommon !== 'undefined' && HostCommon.addCornerOrnaments) {
      HostCommon.addCornerOrnaments(overlay);
    }

    const style = document.createElement('style');
    style.textContent = `
      #postgame-overlay.show { opacity: 1 !important; pointer-events: auto !important; }
      #postgame-overlay .pg-backdrop {
        position: absolute;
        bottom: 0; left: 50%;
        transform: translate(-50%, 0);
        max-height: 380px; max-width: 440px;
        width: auto; height: auto;
        opacity: 0.95;
        pointer-events: none;
        z-index: 0;
      }
      #postgame-overlay > *:not(.pg-backdrop) {
        position: relative;
        z-index: 1;
      }
      #postgame-overlay .pg-winner-icon {
        font-size: 72px; margin-bottom: 8px;
        animation: pgBounce 0.6s ease-out;
      }
      #postgame-overlay .pg-winner-name {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 40px; font-weight: 400;
        letter-spacing: 1px;
        margin-bottom: 6px;
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818),
                     0 4px 12px rgba(0, 0, 0, 0.6);
      }
      #postgame-overlay .pg-winner-label {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 22px; font-weight: 400;
        letter-spacing: 3px;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818);
        margin-bottom: 22px;
      }
      #postgame-overlay .pg-narrator {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 16px; font-style: italic;
        color: var(--text-cream, #f5ead4);
        opacity: 0.85;
        margin-bottom: 24px; max-width: 460px;
        text-align: center;
        line-height: 1.5;
      }
      #postgame-overlay .pg-stats {
        display: flex; gap: 14px; flex-wrap: wrap;
        justify-content: center; margin-bottom: 26px;
      }
      #postgame-overlay .pg-stat {
        text-align: center;
        padding: 12px 18px;
        background: rgba(90, 58, 32, 0.72);
        border: 1.5px solid var(--accent-gold, #f4c542);
        border-radius: 10px;
        min-width: 90px;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3),
                    0 3px 8px rgba(0, 0, 0, 0.4);
      }
      #postgame-overlay .pg-stat-value {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 26px; font-weight: 400;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818);
        letter-spacing: 0.5px;
      }
      #postgame-overlay .pg-stat-label {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 10px;
        color: var(--text-dim, rgba(245, 234, 212, 0.55));
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-top: 4px;
      }
      #postgame-overlay .pg-countdown {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 14px; font-style: italic;
        color: var(--text-dim, rgba(245, 234, 212, 0.55));
        letter-spacing: 1px;
        margin-bottom: 18px;
      }
      #postgame-overlay .pg-buttons { display: flex; gap: 14px; }
      #postgame-overlay .pg-btn {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 16px;
        padding: 14px 28px;
        background: linear-gradient(180deg, var(--accent-gold, #f4c542) 0%, #d9a82f 100%);
        color: var(--bg-wood-deep, #3d2817);
        border: 2px solid var(--accent-gold-edge, #8a6718);
        border-radius: 14px;
        box-shadow: 0 4px 0 var(--accent-gold-edge, #8a6718),
                    0 6px 14px rgba(0, 0, 0, 0.45);
        letter-spacing: 1px;
        cursor: pointer;
        transition: transform 0.12s, box-shadow 0.12s, filter 0.15s;
        min-height: 44px;
      }
      #postgame-overlay .pg-btn:hover {
        background: linear-gradient(180deg, var(--accent-gold-hot, #ffdd6b) 0%, var(--accent-gold, #f4c542) 100%);
        transform: translateY(-1px);
        box-shadow: 0 5px 0 var(--accent-gold-edge, #8a6718),
                    0 8px 18px rgba(0, 0, 0, 0.55);
      }
      #postgame-overlay .pg-btn:active {
        transform: translateY(3px);
        box-shadow: 0 1px 0 var(--accent-gold-edge, #8a6718),
                    0 2px 4px rgba(0, 0, 0, 0.4);
      }
      #postgame-overlay .pg-btn.secondary {
        background: var(--bg-wood-warm, #5a3a20);
        color: var(--text-cream, #f5ead4);
        border-color: var(--accent-gold, #f4c542);
        box-shadow: 0 3px 0 var(--accent-gold-edge, #8a6718),
                    0 4px 10px rgba(0, 0, 0, 0.4);
      }
      #postgame-overlay .pg-btn.secondary:hover {
        background: var(--bg-wood-lite, #7a5030);
      }
      #postgame-overlay .pg-no-winner { font-size: 64px; margin-bottom: 12px; }
      @keyframes pgBounce {
        0% { transform: scale(0); }
        50% { transform: scale(1.25); }
        100% { transform: scale(1); }
      }
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

    // Phase 8c — optional painterly backdrop (race passes race-podium.png).
    // Sits first in DOM so flex-flow siblings paint above it without any
    // z-index gymnastics. onerror removes the img so a missing asset
    // falls back cleanly to the text-only layout.
    const backdropHTML = opts.backdrop
      ? `<img class="pg-backdrop" src="${opts.backdrop}" onerror="this.remove()">`
      : '';
    overlay.innerHTML = backdropHTML + `
      <div class="pg-winner-icon" style="${hasWinner ? 'filter:drop-shadow(0 0 20px ' + opts.winnerColor + ')' : ''}">${icon}</div>
      ${hasWinner ? `
        <div class="pg-winner-name" style="color:${opts.winnerColor};text-shadow:0 2px 0 var(--accent-red-deep,#6b1818), 0 0 25px ${opts.winnerColor}">${opts.winnerName}</div>
        <div class="pg-winner-label">${opts.winLabel || 'WINS!'}</div>
      ` : `
        <div class="pg-winner-name" style="color:var(--danger-red,#d9534f)">${opts.loseText || 'NOBODY SURVIVED!'}</div>
      `}
      ${narratorHTML}
      ${statsHTML}
      <div class="pg-countdown" id="pg-countdown">Returning to lobby in ${remaining}s...</div>
      <div class="pg-buttons">
        <div class="pg-btn" id="pg-again">PLAY AGAIN</div>
        <div class="pg-btn secondary" id="pg-lobby">LOBBY</div>
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
