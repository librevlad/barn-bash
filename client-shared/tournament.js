// ============================================================
// Tournament Overlay — shared across all host pages
// ============================================================
// Include via <script src="/shared/tournament.js"></script>
// Injects its own DOM elements and handles tournament messages.

const Tournament = (() => {
  let overlay = null;
  let active = false;

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
      position:fixed; inset:0; z-index:50;
      background:rgba(5,5,15,0.95);
      display:flex; align-items:center; justify-content:center;
      opacity:0; pointer-events:none;
      transition: opacity 0.5s;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      color: #eee;
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      #tournament-overlay.show { opacity:1; pointer-events:auto; }
      #t-content { text-align:center; max-width:500px; width:90%; }
      .t-round { font-size:12px; letter-spacing:4px; color:#666; margin-bottom:8px; }
      .t-title { font-size:28px; font-weight:800; margin-bottom:24px; }
      .t-title.champion { font-size:36px; background:linear-gradient(135deg,#f1c40f,#e74c3c);
        -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
      .t-scores { display:flex; justify-content:center; gap:20px; flex-wrap:wrap; margin-bottom:20px; }
      .t-player { text-align:center; padding:12px 16px; border-radius:10px;
        background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06);
        min-width:80px; transition: transform 0.3s; }
      .t-player.leader { border-color:rgba(241,196,15,0.3); transform:scale(1.08); }
      .t-player-dot { width:28px; height:28px; border-radius:50%; margin:0 auto 6px; }
      .t-player-name { font-size:11px; color:#888; }
      .t-player-pts { font-size:24px; font-weight:800; margin-top:4px; }
      .t-next { font-size:13px; color:#666; margin-top:16px; }
      .t-next-game { color:#aaa; font-weight:600; }
      .t-crown { font-size:48px; margin-bottom:12px; }
      .t-bar { font-size:10px; letter-spacing:3px; color:#444; margin-bottom:16px; }
    `;
    document.head.appendChild(style);
  }

  function show() { createOverlay(); overlay.classList.add('show'); }
  function hide() { if (overlay) overlay.classList.remove('show'); }

  function renderStandings(data) {
    createOverlay();
    const content = document.getElementById('t-content');
    const maxPts = Math.max(...Object.values(data.scores), 0);

    // Get player colors from state
    const players = window._lastPlayers || {};

    let html = `
      <div class="t-bar">TOURNAMENT</div>
      <div class="t-round">ROUND ${data.round} OF ${data.totalRounds}</div>
      <div class="t-title">STANDINGS</div>
      <div class="t-scores">
    `;

    const sorted = Object.entries(data.scores).sort((a, b) => b[1] - a[1]);
    for (const [id, pts] of sorted) {
      const p = players[id] || {};
      const isLeader = pts === maxPts && pts > 0;
      html += `
        <div class="t-player ${isLeader ? 'leader' : ''}">
          <div class="t-player-dot" style="background:${p.color || '#666'}"></div>
          <div class="t-player-name">P${id}</div>
          <div class="t-player-pts">${pts}</div>
        </div>`;
    }
    html += '</div>';

    if (data.nextGameId) {
      html += `<div class="t-next">Next: <span class="t-next-game">${GAME_NAMES[data.nextGameId] || data.nextGameId}</span></div>`;
    }

    content.innerHTML = html;
    show();
  }

  function renderChampion(data) {
    createOverlay();
    const content = document.getElementById('t-content');
    const players = window._lastPlayers || {};
    const champ = players[data.champId] || {};

    const sorted = Object.entries(data.scores).sort((a, b) => b[1] - a[1]);

    let html = `
      <div class="t-bar">TOURNAMENT COMPLETE</div>
      <div class="t-crown">&#128081;</div>
      <div class="t-title champion">${data.champId ? 'PLAYER ' + data.champId + ' IS CHAMPION!' : 'NO CHAMPION!'}</div>
      <div class="t-scores">
    `;
    for (const [id, pts] of sorted) {
      const p = players[id] || {};
      const isChamp = Number(id) === data.champId;
      html += `
        <div class="t-player ${isChamp ? 'leader' : ''}">
          <div class="t-player-dot" style="background:${p.color || '#666'}"></div>
          <div class="t-player-name">P${id}</div>
          <div class="t-player-pts">${pts}</div>
        </div>`;
    }
    html += '</div>';
    html += '<div class="t-next">Returning to lobby...</div>';
    content.innerHTML = html;
    show();
  }

  function renderRoundIntro(data) {
    createOverlay();
    const content = document.getElementById('t-content');
    let html = `
      <div class="t-bar">TOURNAMENT</div>
      <div class="t-round">ROUND ${data.round} OF ${data.totalRounds}</div>
      <div class="t-title">${GAME_NAMES[data.gameId] || data.gameId}</div>
      <div class="t-next">Starting soon...</div>
    `;
    content.innerHTML = html;
    show();
  }

  // Handle tournament messages — call from each host page's ws.onmessage
  function handleMessage(msg) {
    switch (msg.type) {
      case 'tournamentRound':
        active = true;
        renderRoundIntro(msg);
        // Navigate to correct page after showing intro
        const targetUrl = GAME_URLS[msg.gameId];
        if (targetUrl && !window.location.pathname.startsWith(targetUrl.replace(/\/$/, ''))) {
          setTimeout(() => { window.location.href = targetUrl; }, 2000);
        } else {
          // Already on correct page — hide overlay after delay
          setTimeout(() => hide(), 3000);
        }
        return true;

      case 'tournamentStandings':
        renderStandings(msg);
        return true;

      case 'tournamentEnd':
        renderChampion(msg);
        // Navigate to lobby after champion display
        setTimeout(() => { window.location.href = '/host/'; }, 10000);
        return true;

      case 'tournamentStarted':
        active = true;
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
