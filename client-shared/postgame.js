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
      /* Phase 21c — spring overshoot on entry. */
      transition: opacity 0.7s var(--ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1));
    `;
    document.body.appendChild(overlay);

    // Phase 15b — gold filigree corner flourishes.
    if (typeof HostCommon !== 'undefined' && HostCommon.addCornerOrnaments) {
      HostCommon.addCornerOrnaments(overlay);
    }

    // Phase 21a — ambient sparkles layer. Gold specks drift over the
    // painted hall / podium / wood-plank so the celebration beat feels
    // alive rather than photographed.
    if (typeof AmbientFx !== 'undefined') {
      AmbientFx.attach(overlay, 'sparkles');
    }

    const style = document.createElement('style');
    style.textContent = `
      #postgame-overlay.show { opacity: 1 !important; pointer-events: auto !important; }
      /* Phase 8c — default 'podium' mode: backdrop anchored bottom-center,
         bounded size. Race race-podium.png uses this. */
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
      /* Phase 20a — 'hall' mode: cover-fit painterly atmosphere (Phase
         18 gameover-hall.png reused on non-race postgame overlays). */
      #postgame-overlay .pg-backdrop-hall {
        position: absolute;
        inset: 0;
        top: 0; left: 0; right: 0; bottom: 0;
        width: 100%; height: 100%;
        max-width: none; max-height: none;
        transform: none;
        object-fit: cover;
        object-position: center;
        opacity: 0.95;
        pointer-events: none;
        z-index: 0;
      }
      /* Phase 20a — scrim drops from 0.92 to 0.55 for hall mode so the
         painted hall reads; podium mode keeps 0.92 behind the bottom-
         anchored composition. */
      #postgame-overlay[data-backdrop-mode="hall"] {
        background: rgba(47, 28, 12, 0.55) !important;
      }
      #postgame-overlay > *:not(.pg-backdrop):not(.pg-backdrop-hall) {
        position: relative;
        z-index: 1;
      }
      #postgame-overlay .pg-winner-icon {
        font-size: 72px; margin-bottom: 8px;
        animation: pgBounce 0.6s ease-out;
      }
      /* Phase 54 — painted animal portrait replaces the emoji icon
         when we have a winner character. Circular brass frame, the
         winner's color on the rim, entry overshoot. onerror on the
         inner <img> swaps to a text-node emoji — font-size keeps
         that fallback big enough to read inside the 132px disc. */
      #postgame-overlay .pg-winner-portrait {
        width: 132px; height: 132px;
        border-radius: 50%;
        margin-bottom: 10px;
        background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.14), rgba(0,0,0,0.35));
        box-shadow:
          inset 0 3px 0 rgba(255, 250, 220, 0.28),
          inset 0 -3px 6px rgba(0, 0, 0, 0.45),
          0 0 0 3px rgba(20, 10, 5, 0.85),
          0 0 0 6px var(--winner-rim, var(--accent-gold, #f4c542)),
          0 10px 32px rgba(0, 0, 0, 0.55),
          0 0 60px var(--winner-glow, rgba(244, 197, 66, 0.55));
        overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        font-size: 72px; line-height: 1;
        animation: pgPortraitPop 0.7s var(--ease-bounce, cubic-bezier(0.34, 1.56, 0.64, 1));
      }
      #postgame-overlay .pg-winner-portrait img {
        width: 100%; height: 100%; object-fit: cover;
        border-radius: 0;
      }
      @keyframes pgPortraitPop {
        0%   { transform: scale(0.3) rotate(-20deg); opacity: 0; }
        70%  { transform: scale(1.1) rotate(6deg); opacity: 1; }
        100% { transform: scale(1) rotate(0); opacity: 1; }
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
        opacity: 1;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.75),
                     0 0 12px rgba(0, 0, 0, 0.6);
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
        color: var(--text-cream, #f5ead4);
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.75),
                     0 0 10px rgba(0, 0, 0, 0.6);
        letter-spacing: 1px;
        margin-bottom: 18px;
      }
      /* Phase 41b — painted post-game leaderboard. Rows per player,
         winner row highlighted, per-row stat chips. */
      #postgame-overlay .pg-leaderboard {
        width: min(620px, 92vw);
        margin: 10px 0 18px;
        padding: 12px 14px 14px;
        background:
          linear-gradient(180deg, rgba(74, 46, 24, 0.95) 0%, rgba(42, 24, 12, 0.95) 100%);
        border-radius: 12px;
        box-shadow:
          inset 0 1px 0 rgba(255, 236, 200, 0.22),
          inset 0 -2px 4px rgba(0, 0, 0, 0.45),
          0 0 0 2px rgba(30, 18, 10, 0.9),
          0 0 0 4px rgba(216, 152, 45, 0.85),
          0 6px 18px rgba(0, 0, 0, 0.55);
      }
      #postgame-overlay .pg-lb-head {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 11px;
        letter-spacing: 5px;
        color: var(--accent-gold, #f4c542);
        text-align: center;
        padding: 4px 0 10px;
        border-bottom: 1px solid rgba(216, 152, 45, 0.35);
        text-transform: uppercase;
      }
      #postgame-overlay .pg-lb-list {
        list-style: none; padding: 0; margin: 10px 0 0;
        display: flex; flex-direction: column; gap: 6px;
      }
      #postgame-overlay .pg-lb-row {
        display: grid;
        grid-template-columns: 22px 34px 1fr auto auto;
        align-items: center;
        gap: 10px;
        padding: 6px 10px;
        border-radius: 8px;
        background: rgba(20, 12, 6, 0.55);
        border-left: 3px solid var(--lb-rim, rgba(216, 152, 45, 0.85));
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 13px;
        color: var(--text-cream, #f5ead4);
      }
      #postgame-overlay .pg-lb-row.winner {
        background: linear-gradient(90deg, rgba(216, 152, 45, 0.3), rgba(216, 152, 45, 0.08));
        box-shadow: inset 0 0 0 1px rgba(255, 221, 107, 0.55);
      }
      #postgame-overlay .pg-lb-rank {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 16px;
        color: var(--accent-gold, #f4c542);
        text-align: center;
      }
      #postgame-overlay .pg-lb-av {
        width: 34px; height: 34px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0, 0, 0, 0.35);
        box-shadow: inset 0 0 0 2px var(--lb-rim, rgba(216, 152, 45, 0.85));
        overflow: hidden;
      }
      #postgame-overlay .pg-lb-glyph { width: 100%; height: 100%; object-fit: cover; }
      #postgame-overlay .pg-lb-name {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 14px;
        letter-spacing: 0.5px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
      }
      #postgame-overlay .pg-lb-chips {
        display: flex; gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      #postgame-overlay .pg-chip {
        padding: 3px 8px;
        background: rgba(0, 0, 0, 0.45);
        border: 1px solid rgba(216, 152, 45, 0.4);
        border-radius: 6px;
        font-size: 11px;
        color: rgba(255, 231, 170, 0.85);
        letter-spacing: 0.4px;
      }
      #postgame-overlay .pg-chip b {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        color: var(--accent-gold-hot, #ffdd6b);
        font-weight: 400;
      }
      #postgame-overlay .pg-lb-score {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 18px;
        color: var(--accent-gold-hot, #ffdd6b);
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818);
        min-width: 40px; text-align: right;
        letter-spacing: 1px;
      }
      @media (max-width: 640px) {
        #postgame-overlay .pg-lb-row {
          grid-template-columns: 22px 30px 1fr auto;
        }
        #postgame-overlay .pg-lb-chips { display: none; }
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
    // Phase 54 — when we know the winner's character and HostCommon
    // is loaded, render the painted animal portrait. renderCharGlyph
    // picks the processed (checker-stripped) data URL when the
    // painterly pipeline has finished, falls back to the raw PNG
    // otherwise, and carries its own text-node emoji fallback
    // through onerror. When unavailable, we keep the original
    // emoji .pg-winner-icon branch.
    const winnerAvatarHTML = (hasWinner && opts.winnerCharacter
      && typeof HostCommon !== 'undefined'
      && typeof HostCommon.renderCharGlyph === 'function')
      ? HostCommon.renderCharGlyph(opts.winnerCharacter, 'pg-winner-char')
      : null;
    const autoSeconds = opts.autoLobbySeconds || 15;
    let remaining = autoSeconds;

    // Build stats HTML
    let statsHTML = '';
    if (opts.stats && opts.stats.length > 0) {
      statsHTML = '<div class="pg-stats">' +
        opts.stats.map(s => `<div class="pg-stat"><div class="pg-stat-value">${s.value}</div><div class="pg-stat-label">${s.label}</div></div>`).join('') +
        '</div>';
    }

    // Phase 41b — optional per-player leaderboard. Each row shows the
    // animal glyph, name, score, and up to 3 stat chips (bumps / king
    // time / max combo). Winner row highlighted with gold wash.
    let leaderboardHTML = '';
    if (opts.leaderboard && opts.leaderboard.length > 0) {
      const rows = opts.leaderboard.map((p, i) => {
        const isWinner = (p.id && String(p.id) === String(opts.winnerId));
        const chips = (p.chips || []).map(c => `<span class="pg-chip">${c.label}: <b>${c.value}</b></span>`).join('');
        const glyph = p.character ? `<img class="pg-lb-glyph" data-char="${p.character}" src="${(typeof HostCommon !== 'undefined' && HostCommon.charAvatars && HostCommon.charAvatars[p.character]) || ''}" onerror="this.remove()">` : '';
        return `
          <li class="pg-lb-row ${isWinner ? 'winner' : ''}" style="--lb-rim:${p.color || '#d5972b'}">
            <span class="pg-lb-rank">${i + 1}</span>
            <span class="pg-lb-av">${glyph}</span>
            <span class="pg-lb-name" style="color:${p.color || 'var(--text-cream)'}">${p.name || ('Player ' + p.id)}</span>
            <span class="pg-lb-chips">${chips}</span>
            <span class="pg-lb-score">${p.score || 0}</span>
          </li>
        `;
      }).join('');
      leaderboardHTML = `
        <div class="pg-leaderboard">
          <div class="pg-lb-head">FINAL STANDINGS</div>
          <ol class="pg-lb-list">${rows}</ol>
        </div>
      `;
    }

    // Narrator quote
    let narratorHTML = '';
    if (hasWinner) {
      narratorHTML = `<div class="pg-narrator">"${opts.winnerName} survived. ${['Barely.', 'Impressive.', 'The rest of you should practice.', 'Don\'t let it go to your head.'][Math.floor(Math.random() * 4)]}"</div>`;
    } else if (opts.loseQuote) {
      narratorHTML = `<div class="pg-narrator">"${opts.loseQuote}"</div>`;
    }

    // Phase 8c / 20a — optional painterly backdrop.
    //   backdropMode: 'podium' (default) — race-style bottom-anchored
    //   backdropMode: 'hall'             — cover-fit atmosphere (hill/meteor/escape)
    const backdropMode = opts.backdropMode || 'podium';
    overlay.setAttribute('data-backdrop-mode', backdropMode);
    // Sits first in DOM so flex-flow siblings paint above it without any
    // z-index gymnastics. onerror removes the img so a missing asset
    // falls back cleanly to the text-only layout.
    const backdropHTML = opts.backdrop
      ? `<img class="pg-backdrop pg-backdrop-${backdropMode}" src="${opts.backdrop}" onerror="this.remove()">`
      : '';
    // Phase 54 — prefer painted portrait over emoji icon when we
    // have a winner with a known character. Rim picks up the
    // winner's color; the glow layer shares the color but falls
    // back to the CSS default when no winnerColor was supplied.
    const winnerVisualHTML = winnerAvatarHTML
      ? `<div class="pg-winner-portrait" style="${opts.winnerColor ? '--winner-rim:' + opts.winnerColor + ';--winner-glow:' + opts.winnerColor : ''}">${winnerAvatarHTML}</div>`
      : `<div class="pg-winner-icon" style="${hasWinner ? 'filter:drop-shadow(0 0 20px ' + opts.winnerColor + ')' : ''}">${icon}</div>`;
    overlay.innerHTML = backdropHTML + `
      ${winnerVisualHTML}
      ${hasWinner ? `
        <div class="pg-winner-name hero-flourish" style="color:${opts.winnerColor};text-shadow:0 2px 0 var(--accent-red-deep,#6b1818), 0 0 25px ${opts.winnerColor}">${opts.winnerName}</div>
        <div class="pg-winner-label">${opts.winLabel || 'WINS!'}</div>
      ` : `
        <div class="pg-winner-name hero-flourish" style="color:var(--danger-red,#d9534f)">${opts.loseText || 'NOBODY SURVIVED!'}</div>
      `}
      ${narratorHTML}
      ${statsHTML}
      ${leaderboardHTML}
      <div class="pg-countdown" id="pg-countdown">Returning to lobby in ${remaining}s...</div>
      <div class="pg-buttons">
        <div class="pg-btn" id="pg-again">PLAY AGAIN</div>
        <div class="pg-btn secondary" id="pg-lobby">LOBBY</div>
      </div>
    `;

    overlay.classList.add('show');

    // Phase 25b — victory fanfare sting for winner reveal. Delayed
    // 400ms so the overlay fade-in settles before the horn flourish.
    if (hasWinner && typeof Sound !== 'undefined' && Sound.play) {
      setTimeout(() => { try { Sound.play('fanfare'); } catch (e) {} }, 400);
    }

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
