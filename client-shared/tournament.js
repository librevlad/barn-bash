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
      background:rgba(5,5,15,0.95);
      display:flex; align-items:center; justify-content:center;
      opacity:0; pointer-events:none;
      transition: opacity 0.6s ease-in-out;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      color: #eee;
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      #tournament-overlay.show { opacity:1; pointer-events:auto; }
      #t-content { text-align:center; max-width:560px; width:90%; }

      /* Animations */
      @keyframes slideInLeft {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0); }
        50% { transform: scale(1.2); }
        to { transform: scale(1); }
      }
      @keyframes countUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      @keyframes goldGlow {
        0%, 100% { text-shadow: 0 0 10px rgba(255,200,50,0.3); }
        50% { text-shadow: 0 0 20px rgba(255,200,50,0.6); }
      }
      @keyframes roundScaleSettle {
        0% { transform: scale(2); opacity: 0; }
        60% { transform: scale(0.95); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes fadeSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes trophyBounce {
        0% { transform: scale(0); }
        50% { transform: scale(1.3); }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }

      .t-round { font-size:12px; letter-spacing:4px; color:#666; margin-bottom:8px; }
      .t-title { font-size:28px; font-weight:800; margin-bottom:24px; }
      .t-title.champion {
        font-size:36px;
        background:linear-gradient(135deg,#f1c40f,#e67e22,#e74c3c);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        animation: goldGlow 2s ease-in-out infinite;
      }
      .t-scores { display:flex; justify-content:center; gap:20px; flex-wrap:wrap; margin-bottom:20px; }
      .t-player {
        text-align:center; padding:12px 16px; border-radius:10px;
        background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);
        min-width:90px; transition: transform 0.3s;
        opacity: 0;
      }
      .t-player.slide-in { animation: slideInLeft 0.5s ease-out forwards; }
      .t-player.leader {
        border-color:rgba(241,196,15,0.5); transform:scale(1.08);
        box-shadow: 0 0 20px rgba(241,196,15,0.15), inset 0 0 15px rgba(241,196,15,0.05);
      }
      .t-player-dot { width:28px; height:28px; border-radius:50%; margin:0 auto 6px; }
      .t-player-name { font-size:11px; color:#888; }
      .t-player-pts { font-size:24px; font-weight:800; margin-top:4px; }
      .t-player-pos-change { font-size:12px; margin-top:2px; height:16px; }
      .t-player-pos-change.up { color:#2ecc71; }
      .t-player-pos-change.down { color:#e74c3c; }
      .t-next { font-size:13px; color:#666; margin-top:16px; }
      .t-next-game { color:#aaa; font-weight:600; }
      .t-next.pulse-text { animation: pulse 1.5s ease-in-out infinite; }
      .t-crown { font-size:48px; margin-bottom:12px; }
      .t-bar { font-size:10px; letter-spacing:3px; color:#444; margin-bottom:16px; }

      /* Round intro dramatic */
      .t-round-intro-number {
        font-size:64px; font-weight:900; letter-spacing:6px; color:#fff;
        animation: roundScaleSettle 0.8s ease-out forwards;
        margin-bottom:12px;
      }
      .t-round-intro-game {
        font-size:24px; font-weight:700; color:#ccc; letter-spacing:2px;
        opacity:0; animation: fadeSlideUp 0.6s ease-out 0.6s forwards;
        margin-bottom:20px;
      }
      .t-round-intro-ready {
        font-size:16px; font-weight:600; letter-spacing:6px; color:#f1c40f;
        opacity:0; animation: pulse 1s ease-in-out 1.2s infinite;
        animation-fill-mode: forwards;
      }

      /* Champion dramatic */
      .t-trophy-anim {
        font-size:72px; display:inline-block;
        animation: trophyBounce 0.8s ease-out forwards;
      }
      .t-champion-label {
        font-size:42px; font-weight:900; letter-spacing:4px;
        background:linear-gradient(135deg,#f1c40f,#e67e22);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        animation: goldGlow 2s ease-in-out infinite;
        margin-bottom:8px;
      }
      .t-champion-name {
        font-size:32px; font-weight:800; color:#fff;
        text-shadow: 0 0 30px rgba(241,196,15,0.4);
        animation: fadeSlideUp 0.6s ease-out 0.5s forwards;
        opacity:0; margin-bottom:24px;
      }
      .t-final-scores-label {
        font-size:10px; letter-spacing:3px; color:#555; margin-bottom:12px;
        opacity:0; animation: fadeSlideUp 0.4s ease-out 1s forwards;
      }
      .t-standings-commentary {
        font-size:13px; color:#888; font-style:italic; margin-top:14px;
        opacity:0; animation: fadeSlideUp 0.5s ease-out 1.5s forwards;
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

    let html = '<div class="t-bar">TOURNAMENT</div>';
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
    var players = window._lastPlayers || {};
    var sorted = Object.entries(data.scores).sort(function(a, b) { return b[1] - a[1]; });

    // Champion display name
    var champDisplayName = data.champName || (data.champId ? getPlayerDisplayName(data.champId, data) : null);

    // Narrator quip
    var quip = '';
    if (typeof Narrator !== 'undefined' && Narrator.tournamentChampionQuip && champDisplayName) {
      quip = Narrator.tournamentChampionQuip(champDisplayName);
    }

    var html = '<div class="t-bar" style="opacity:0;animation:fadeSlideUp 0.4s ease-out 0.2s forwards;">TOURNAMENT COMPLETE</div>';
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

    html += '<div class="t-next" style="opacity:0;animation:fadeSlideUp 0.4s ease-out 2.5s forwards;">Returning to lobby...</div>';

    content.innerHTML = html;
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

    var html = '<div class="t-bar" style="opacity:0;animation:fadeSlideUp 0.4s ease-out forwards;">TOURNAMENT</div>';
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
