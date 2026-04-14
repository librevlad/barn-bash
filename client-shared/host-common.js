// ============================================================
// FRANTICS — Shared Host Page Utilities
// ============================================================
// Common functions used by all 4 game host pages.
// Include via <script src="/shared/host-common.js"></script>

const HostCommon = (() => {
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };
  const gameUrls = {
    escapeFox: '/host-escape/',
    hillKing: '/host-hill/',
    meteor: '/host-meteor/',
    race: '/host-race/',
  };

  // Get player display name from last state
  function pname(id) {
    const p = window._lastPlayers && window._lastPlayers[id];
    return p ? (p.name || 'Player ' + id) : 'Player ' + id;
  }

  // Navigate to game host page
  function navigateToGame(gameId) {
    const url = gameUrls[gameId] || '/host/';
    if (typeof Transitions !== 'undefined') Transitions.navigateTo(url);
    else window.location.href = url;
  }

  // Redirect if wrong game (call from state handler)
  function redirectIfWrongGame(currentGameId, msgGameId) {
    if (msgGameId && msgGameId !== currentGameId) {
      window.location.href = gameUrls[msgGameId] || '/host/';
      return true;
    }
    return false;
  }

  // Build lobby player list HTML
  function lobbyPlayersHTML(players) {
    const conn = Object.entries(players).filter(([, p]) => p.connected);
    return conn.map(([id, p]) => {
      const name = p.name || ('P' + id);
      const icon = p.character ? (charIcons[p.character] || '') : '';
      return `<span style="color:${p.color};margin:0 12px;font-weight:700;font-size:16px;">${icon} ${name}</span>`;
    }).join('');
  }

  // Count connected/alive players
  function countPlayers(players) {
    const all = Object.values(players);
    const connected = all.filter(p => p.connected === true);
    const alive = connected.filter(p => p.alive);
    return { connected: connected.length, alive: alive.length };
  }

  // Show floating message
  function showMsg($el, text, ms) {
    clearTimeout($el._timer);
    $el.textContent = text;
    $el.classList.add('show');
    $el._timer = setTimeout(() => $el.classList.remove('show'), ms);
  }

  // Run countdown animation
  function runCountdown($el, $hud, steps, onComplete) {
    if ($hud) $hud.style.display = 'none';
    let i = 0;
    $el.style.display = 'block';
    function next() {
      if (i >= steps.length) {
        $el.style.display = 'none';
        if ($hud && typeof HUD === 'undefined') $hud.style.display = '';
        if (onComplete) onComplete();
        return;
      }
      $el.textContent = steps[i];
      $el.style.transform = 'translate(-50%, -50%) scale(1.6)';
      $el.style.opacity = '1';
      Sound.play(i < steps.length - 1 ? 'countdownTick' : 'countdownGo');
      setTimeout(() => {
        $el.style.transform = 'translate(-50%, -50%) scale(0.7)';
        $el.style.opacity = '0';
      }, 500);
      i++;
      setTimeout(next, 750);
    }
    next();
  }

  return { charIcons, gameUrls, pname, navigateToGame, redirectIfWrongGame, lobbyPlayersHTML, countPlayers, showMsg, runCountdown };
})();
