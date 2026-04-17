// ============================================================
// Tournament Overlay — shared across all host pages
// ============================================================
// Include via <script src="/shared/tournament.js"></script>
// Injects its own DOM elements and handles tournament messages.

const Tournament = (() => {
  let overlay = null;
  let active = false;
  let previousPositions = {}; // track position changes between standings

  const GAME_NAMES = {
    escapeFox: 'ESCAPE THE FOX',
    hillKing: 'KING OF THE HILL',
    meteor: 'METEOR SHOWER',
    race: 'GRAND PRIX'
  };
  const GAME_URLS = {
    escapeFox: '/host-escape/',
    hillKing: '/host-hill/',
    meteor: '/host-meteor/',
    race: '/host-race/'
  };

  function createOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'tournament-overlay';
    overlay.innerHTML = '<div id="t-content"></div>';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:100;
      background: rgba(47, 28, 12, 0.94);
      backdrop-filter: blur(8px);
      display:flex; align-items:center; justify-content:center;
      opacity:0; pointer-events:none;
      transition: opacity 0.6s ease-in-out;
      font-family: var(--font-ui, -apple-system, 'Segoe UI', sans-serif);
      color: var(--text-cream, #f5ead4);
    `;
    document.body.appendChild(overlay);

    // Phase 15b — gold filigree corner flourishes. 4 <div>s injected
    // once per overlay lifetime; CSS handles positioning + mirroring.
    if (typeof HostCommon !== 'undefined' && HostCommon.addCornerOrnaments) {
      HostCommon.addCornerOrnaments(overlay);
    }

    const style = document.createElement('style');
    style.textContent = `
      #tournament-overlay.show { opacity:1 !important; pointer-events:auto !important; }
      #t-content { text-align:center; max-width:600px; width:90%; position:relative; }
      #t-content .t-backdrop {
        position:absolute;
        bottom:-40px; left:50%;
        transform: translate(-50%, 0);
        max-height: 440px; max-width: 480px;
        width:auto; height:auto;
        opacity: 0.85;
        z-index: 0;
        pointer-events: none;
      }
      #t-content > *:not(.t-backdrop) {
        position: relative;
        z-index: 1;
      }

      /* Animations */
      @keyframes tSlideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes tScaleIn {
        from { transform: scale(0); }
        50% { transform: scale(1.2); }
        to { transform: scale(1); }
      }
      @keyframes tCountUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tPulse {
        0%, 100% { opacity: 0.55; }
        50% { opacity: 1; }
      }
      @keyframes tGoldGlow {
        0%, 100% { text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818), 0 0 10px rgba(244,197,66,0.3); }
        50%      { text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818), 0 0 26px rgba(255,221,107,0.7); }
      }
      @keyframes tRoundScaleSettle {
        0% { transform: scale(2); opacity: 0; }
        60% { transform: scale(0.95); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes tFadeSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes tTrophyBounce {
        0% { transform: scale(0); }
        50% { transform: scale(1.3); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }

      #t-content .t-round {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size:12px; letter-spacing:4px;
        color: var(--accent-gold, #f4c542);
        text-transform:uppercase;
        margin-bottom:8px;
      }
      #t-content .t-title {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size:32px; font-weight:400;
        letter-spacing:1px;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818),
                     0 4px 12px rgba(0,0,0,0.6);
        margin-bottom:24px;
      }
      #t-content .t-title.champion {
        font-size:42px;
        color: var(--accent-gold-hot, #ffdd6b);
        animation: tGoldGlow 2s ease-in-out infinite;
      }
      /* Phase 12a — scoreboard scroll backdrop behind .t-scores stack */
      #t-content .t-scroll-backdrop {
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        max-height: 560px; max-width: 460px;
        width: auto; height: auto;
        opacity: 0.95;
        z-index: 0;
        pointer-events: none;
      }
      /* Phase 12a — scoreboard-scroll-aware layout scoped to standings
         mode. Champion view keeps the earlier horizontal card layout
         unchanged so the Phase 9a throne backdrop frames horizontal
         cards (not column-stacked transparent rows). */
      #t-content.mode-standings .t-scores {
        display:flex; flex-direction:column; align-items:center;
        gap: 6px; margin: 6px auto 14px;
        width: min(340px, 80%);
      }
      #t-content.mode-standings .t-player {
        display: flex; align-items: center; gap: 12px;
        padding: 6px 14px;
        border-radius: 6px;
        background: transparent;
        border: none;
        min-width: 100%;
        transition: transform 0.3s;
        opacity: 0;
        box-shadow: none;
      }
      /* Non-standings (champion) retains the original horizontal card */
      #t-content:not(.mode-standings) .t-scores {
        display:flex; justify-content:center; gap:18px; flex-wrap:wrap;
        margin-bottom:20px;
      }
      #t-content:not(.mode-standings) .t-player {
        text-align:center; padding:14px 18px;
        border-radius: 12px;
        background: rgba(90, 58, 32, 0.72);
        border: 1.5px solid rgba(244, 197, 66, 0.35);
        min-width: 100px;
        transition: transform 0.3s;
        opacity: 0;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3),
                    0 3px 8px rgba(0,0,0,0.4);
      }
      #t-content .t-player.slide-in { animation: tSlideInLeft 0.5s ease-out forwards; }
      #t-content .t-player.leader {
        border-color: var(--accent-gold, #f4c542);
        transform: scale(1.08);
        box-shadow: 0 0 24px rgba(255, 221, 107, 0.25),
                    inset 0 0 18px rgba(244, 197, 66, 0.08),
                    0 4px 10px rgba(0, 0, 0, 0.5);
      }
      /* Standings mode: dark text on cream slot (Phase 12a) */
      #t-content.mode-standings .t-player-dot {
        width: 22px; height: 22px; border-radius: 50%;
        margin: 0; flex: 0 0 auto;
        box-shadow: 0 0 6px currentColor;
      }
      #t-content.mode-standings .t-player-name {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 14px;
        color: var(--text-on-gold, #3d2817);
        letter-spacing: 0.5px;
        flex: 1 1 auto;
        text-align: left;
      }
      #t-content.mode-standings .t-player-pts {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 22px; font-weight: 400;
        color: var(--accent-red-deep, #6b1818);
        text-shadow: 0 1px 0 rgba(244, 197, 66, 0.3);
        margin: 0; flex: 0 0 auto;
      }
      /* Champion mode: restore original cream-on-dark scheme */
      #t-content:not(.mode-standings) .t-player-dot {
        width: 28px; height: 28px; border-radius: 50%;
        margin: 0 auto 8px;
        box-shadow: 0 0 8px currentColor;
      }
      #t-content:not(.mode-standings) .t-player-name {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 12px;
        color: var(--text-cream, #f5ead4);
        opacity: 0.82;
        letter-spacing: 0.5px;
      }
      #t-content:not(.mode-standings) .t-player-pts {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 26px; font-weight: 400;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 1px 0 var(--accent-red-deep, #6b1818);
        margin-top: 6px;
      }
      #t-content .t-player-pos-change {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 12px; margin-top: 2px; height: 16px;
        letter-spacing: 0.5px;
      }
      #t-content .t-player-pos-change.up   { color: var(--success-green, #7bc950); }
      #t-content .t-player-pos-change.down { color: var(--danger-red, #d9534f); }
      #t-content .t-next {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 14px; font-style: italic;
        color: var(--text-dim, rgba(245, 234, 212, 0.55));
        margin-top: 18px;
      }
      #t-content .t-next-game {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-style: normal;
        color: var(--accent-gold, #f4c542);
        letter-spacing: 1px;
      }
      #t-content .t-next.pulse-text { animation: tPulse 1.5s ease-in-out infinite; }
      #t-content .t-crown { font-size: 56px; margin-bottom: 12px; }
      #t-content .t-bar {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 10px; letter-spacing: 3px;
        color: var(--text-dim, rgba(245, 234, 212, 0.55));
        text-transform: uppercase;
        margin-bottom: 16px;
      }

      /* Round intro dramatic */
      #t-content .t-round-intro-number {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 84px; font-weight: 400; letter-spacing: 6px;
        color: var(--accent-gold, #f4c542);
        text-shadow: 0 4px 0 var(--accent-red-deep, #6b1818),
                     0 8px 20px rgba(0, 0, 0, 0.7);
        animation: tRoundScaleSettle 0.8s ease-out forwards;
        margin-bottom: 14px;
      }
      #t-content .t-round-intro-game {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 28px; font-weight: 400;
        color: var(--text-cream, #f5ead4);
        letter-spacing: 2px;
        text-shadow: 0 2px 0 var(--accent-red-deep, #6b1818);
        opacity: 0; animation: tFadeSlideUp 0.6s ease-out 0.6s forwards;
        margin-bottom: 20px;
      }
      #t-content .t-round-intro-ready {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 16px; letter-spacing: 6px; font-style: italic;
        color: var(--accent-gold-hot, #ffdd6b);
        opacity: 0; animation: tPulse 1s ease-in-out 1.2s infinite;
        animation-fill-mode: forwards;
      }

      /* Champion dramatic */
      #t-content .t-trophy-anim {
        font-size: 84px; display: inline-block;
        animation: tTrophyBounce 0.8s ease-out forwards;
        filter: drop-shadow(0 0 24px rgba(255, 221, 107, 0.6));
      }
      #t-content .t-champion-label {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 48px; font-weight: 400; letter-spacing: 4px;
        color: var(--accent-gold-hot, #ffdd6b);
        animation: tGoldGlow 2s ease-in-out infinite;
        margin-bottom: 10px;
      }
      #t-content .t-champion-name {
        font-family: var(--font-display, 'Alfa Slab One'), Georgia, serif;
        font-size: 38px; font-weight: 400;
        color: var(--text-cream, #f5ead4);
        text-shadow: 0 3px 0 var(--accent-red-deep, #6b1818),
                     0 0 30px rgba(255, 221, 107, 0.4);
        animation: tFadeSlideUp 0.6s ease-out 0.5s forwards;
        opacity: 0; margin-bottom: 26px;
        letter-spacing: 1px;
      }
      #t-content .t-final-scores-label {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 11px; letter-spacing: 3px;
        color: var(--text-dim, rgba(245, 234, 212, 0.55));
        text-transform: uppercase;
        margin-bottom: 12px;
        opacity: 0; animation: tFadeSlideUp 0.4s ease-out 1s forwards;
      }
      #t-content .t-standings-commentary {
        font-family: var(--font-accent, 'Cutive'), Georgia, serif;
        font-size: 15px; font-style: italic;
        color: var(--text-cream, #f5ead4);
        opacity: 0; margin-top: 16px; line-height: 1.5;
        animation: tFadeSlideUp 0.5s ease-out 1.5s forwards;
      }
    `;
    document.head.appendChild(style);
  }

  function show() { createOverlay(); overlay.classList.add('show'); }
  function hide() { if (overlay) overlay.classList.remove('show'); }

  // Animate score counting from 0 to target
  function animateScores() {
    const els = document.querySelectorAll('.t-player-pts[data-target]');
    els.forEach(function(el) {
      const target = parseInt(el.getAttribute('data-target'), 10) || 0;
      if (target === 0) { el.textContent = '0'; return; }
      const duration = 1000;
      const startTime = performance.now();
      function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function getPlayerDisplayName(id, data) {
    // Try server-provided names first, then _lastPlayers, then fallback
    if (data && data.playerNames && data.playerNames[id]) return data.playerNames[id];
    const players = window._lastPlayers || {};
    const p = players[id] || {};
    return p.name || ('P' + id);
  }

  function renderStandings(data) {
    createOverlay();
    const content = document.getElementById('t-content');
    // Phase 12a CSS (column-stack slot-strip layout) scopes to
    // .mode-standings; champion view keeps its horizontal card layout.
    content.classList.add('mode-standings');
    content.classList.remove('mode-champion');
    const maxPts = Math.max(...Object.values(data.scores), 0);
    const players = window._lastPlayers || {};
    const sorted = Object.entries(data.scores).sort(function(a, b) { return b[1] - a[1]; });

    // Compute current positions (1-indexed)
    const currentPositions = {};
    sorted.forEach(function(entry, idx) { currentPositions[entry[0]] = idx + 1; });

    // Narrator commentary
    var leaderName = sorted.length > 0 ? getPlayerDisplayName(sorted[0][0], data) : '';
    var lastName = sorted.length > 1 ? getPlayerDisplayName(sorted[sorted.length - 1][0], data) : '';
    var leaderScore = sorted.length > 0 ? sorted[0][1] : 0;
    var commentary = '';
    if (typeof Narrator !== 'undefined' && Narrator.tournamentStandingsCommentary) {
      commentary = Narrator.tournamentStandingsCommentary(leaderName, lastName, data.round || 0, leaderScore);
    }

    // Phase 12a — painterly scoreboard scroll backdrop; loadPainterly
    // strips the baked white surround and swaps src on resolve.
    let html = '<img class="t-scroll-backdrop" src="/assets/standings-scroll.png" onerror="this.remove()">';
    html += '<div class="t-bar">TOURNAMENT</div>';
    html += '<div class="t-round">ROUND ' + data.round + ' OF ' + data.totalRounds + '</div>';
    html += '<div class="t-title">STANDINGS</div>';
    html += '<div class="t-scores">';

    for (var i = 0; i < sorted.length; i++) {
      var id = sorted[i][0];
      var pts = sorted[i][1];
      var p = players[id] || {};
      var isLeader = pts === maxPts && pts > 0;
      var delay = i * 300;

      // Position change arrow
      var posChange = '';
      if (previousPositions[id] !== undefined) {
        var diff = previousPositions[id] - currentPositions[id];
        if (diff > 0) posChange = '<div class="t-player-pos-change up">\u2191' + diff + '</div>';
        else if (diff < 0) posChange = '<div class="t-player-pos-change down">\u2193' + Math.abs(diff) + '</div>';
        else posChange = '<div class="t-player-pos-change">&mdash;</div>';
      } else {
        posChange = '<div class="t-player-pos-change"></div>';
      }

      var crown = isLeader ? '<div style="font-size:18px;margin-bottom:2px;">\uD83D\uDC51</div>' : '';
      var displayName = getPlayerDisplayName(id, data);

      html += '<div class="t-player slide-in ' + (isLeader ? 'leader' : '') + '" style="animation-delay:' + delay + 'ms;">';
      html += crown;
      html += '<div class="t-player-dot" style="background:' + (p.color || '#666') + '"></div>';
      html += '<div class="t-player-name">' + displayName + '</div>';
      html += '<div class="t-player-pts" data-target="' + pts + '">0</div>';
      html += posChange;
      html += '</div>';
    }
    html += '</div>';

    if (data.nextGameId) {
      var nextName = GAME_NAMES[data.nextGameId] || data.nextGameId;
      html += '<div class="t-next pulse-text">NEXT: <span class="t-next-game">' + nextName + '</span></div>';
    }

    if (commentary) {
      html += '<div class="t-standings-commentary">' + commentary + '</div>';
    }

    content.innerHTML = html;

    // Phase 12a — async-swap scroll backdrop img src to loadPainterly-
    // processed data URL so the painted scroll loses its baked white
    // surround. Raw PNG paints first (~100ms); processed version
    // replaces it so the overlay scrim reads around the painted
    // silhouette.
    if (typeof SpriteLoader !== 'undefined') {
      const applyProcessedScroll = () => {
        const sprite = SpriteLoader.get('standings-scroll');
        const img = content.querySelector('.t-scroll-backdrop');
        if (sprite && img) img.src = sprite.toDataURL('image/png');
      };
      const cached = SpriteLoader.get('standings-scroll');
      if (cached) applyProcessedScroll();
      else SpriteLoader.loadPainterly('standings-scroll',
        '/assets/standings-scroll.png').then(applyProcessedScroll).catch(() => {});
    }

    show();

    // Start score count-up after cards slide in
    var totalSlideTime = sorted.length * 300 + 500;
    setTimeout(animateScores, totalSlideTime);

    // Save positions for next comparison
    previousPositions = currentPositions;
  }

  function renderChampion(data) {
    createOverlay();
    var content = document.getElementById('t-content');
    // Phase 12a CSS (standings column layout) is scoped to
    // .mode-standings; switch modes so champion keeps its horizontal
    // card layout + the Phase 9a throne backdrop integration.
    content.classList.add('mode-champion');
    content.classList.remove('mode-standings');
    var players = window._lastPlayers || {};
    var sorted = Object.entries(data.scores).sort(function(a, b) { return b[1] - a[1]; });

    // Champion display name
    var champDisplayName = data.champName || (data.champId ? getPlayerDisplayName(data.champId, data) : null);

    // Narrator quip
    var quip = '';
    if (typeof Narrator !== 'undefined' && Narrator.tournamentChampionQuip && champDisplayName) {
      quip = Narrator.tournamentChampionQuip(champDisplayName);
    }

    var html = '<div class="t-bar" style="opacity:0;animation:tFadeSlideUp 0.4s ease-out 0.2s forwards;">TOURNAMENT COMPLETE</div>';
    html += '<div class="t-trophy-anim">\uD83C\uDFC6</div>';

    if (champDisplayName) {
      html += '<div class="t-champion-label">CHAMPION!</div>';
      html += '<div class="t-champion-name">' + champDisplayName + '</div>';
    } else {
      html += '<div class="t-champion-label">NO CHAMPION!</div>';
    }

    html += '<div class="t-final-scores-label">FINAL SCORES</div>';
    html += '<div class="t-scores">';
    for (var i = 0; i < sorted.length; i++) {
      var id = sorted[i][0];
      var pts = sorted[i][1];
      var p = players[id] || {};
      var isChamp = Number(id) === data.champId;
      var delay = 1200 + i * 200;
      var displayName = getPlayerDisplayName(id, data);

      html += '<div class="t-player slide-in ' + (isChamp ? 'leader' : '') + '" style="animation-delay:' + delay + 'ms;">';
      html += '<div class="t-player-dot" style="background:' + (p.color || '#666') + '"></div>';
      html += '<div class="t-player-name">' + displayName + '</div>';
      html += '<div class="t-player-pts">' + pts + '</div>';
      html += '</div>';
    }
    html += '</div>';

    if (quip) {
      html += '<div class="t-standings-commentary" style="animation-delay:2s;">' + quip + '</div>';
    }

    html += '<div class="t-next" style="opacity:0;animation:tFadeSlideUp 0.4s ease-out 2.5s forwards;">Returning to lobby...</div>';

    // Phase 9a — painterly throne backdrop behind the champion stack.
    // Prepended so it sits first in DOM flow; absolute-positioned under
    // the z-index:1 siblings via the .t-backdrop rule above. onerror
    // removes the img so missing asset falls back to the prior text-
    // only layout. Raw img src is the on-disk PNG (may have a baked
    // solid-black background); SpriteLoader.loadPainterly async-strips
    // it and swaps src to the processed data URL once ready.
    const backdropHTML = '<img class="t-backdrop" src="/assets/tournament-champion.png" onerror="this.remove()">';
    content.innerHTML = backdropHTML + html;
    if (typeof SpriteLoader !== 'undefined') {
      const applyProcessed = () => {
        const sprite = SpriteLoader.get('tournament-champion');
        const img = content.querySelector('.t-backdrop');
        if (sprite && img) img.src = sprite.toDataURL('image/png');
      };
      const cached = SpriteLoader.get('tournament-champion');
      if (cached) applyProcessed();
      else SpriteLoader.loadPainterly('tournament-champion',
        '/assets/tournament-champion.png').then(applyProcessed).catch(() => {});
    }
    show();

    // Confetti burst if Visual is available
    if (typeof Visual !== 'undefined' && Visual.burstConfetti) {
      setTimeout(function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        Visual.burstConfetti(w / 2, h / 3, 50);
        setTimeout(function() {
          Visual.burstConfetti(w * 0.3, h / 2, 30);
          Visual.burstConfetti(w * 0.7, h / 2, 30);
        }, 400);
      }, 800);
    }
  }

  function renderRoundIntro(data) {
    createOverlay();
    var content = document.getElementById('t-content');
    var gameName = GAME_NAMES[data.gameId] || data.gameId;

    // Narrator commentary
    if (typeof Narrator !== 'undefined' && Narrator.tournamentRoundIntro) {
      Narrator.tournamentRoundIntro(data.round || 1, data.totalRounds || 3, gameName);
    }

    var html = '<div class="t-bar" style="opacity:0;animation:tFadeSlideUp 0.4s ease-out forwards;">TOURNAMENT</div>';
    html += '<div class="t-round-intro-number">ROUND ' + (data.round || '?') + '</div>';
    html += '<div class="t-round-intro-game">' + gameName + '</div>';
    html += '<div class="t-round-intro-ready">GET READY</div>';

    content.innerHTML = html;
    show();

    // Play sound
    if (typeof Sound !== 'undefined' && Sound.play) {
      Sound.play('countdownGo');
    }
  }

  // Handle tournament messages — call from each host page's ws.onmessage
  function handleMessage(msg) {
    switch (msg.type) {
      case 'tournamentRound':
        active = true;
        renderRoundIntro(msg);
        // Navigate to correct page after showing intro (4s hold)
        var targetUrl = GAME_URLS[msg.gameId];
        if (targetUrl && !window.location.pathname.startsWith(targetUrl.replace(/\/$/, ''))) {
          setTimeout(function() { window.location.href = targetUrl; }, 3000);
        } else {
          // Already on correct page — hide overlay after dramatic hold
          setTimeout(function() { hide(); }, 4000);
        }
        return true;

      case 'tournamentStandings':
        renderStandings(msg);
        return true;

      case 'tournamentEnd':
        renderChampion(msg);
        active = false; // reset so PostGame works for subsequent non-tournament games
        // Navigate to lobby after champion display (8s dramatic hold)
        setTimeout(function() { window.location.href = '/host/'; }, 8000);
        return true;

      case 'tournamentStarted':
        active = true;
        previousPositions = {};
        return true;

      case 'tournamentInfo':
        active = true;
        if (msg.phase === 'standings') {
          renderStandings(msg);
        }
        return true;
    }
    return false;
  }

  function isActive() { return active; }

  return { handleMessage, isActive, hide, show };
})();
