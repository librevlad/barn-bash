// ============================================================
// FRANTICS — Shared Host Page Utilities
// ============================================================
// Common functions used by all 4 game host pages.
// Include via <script src="/shared/host-common.js"></script>

const HostCommon = (() => {
  // Unicode emoji fallbacks. Used directly where avatars aren't available
  // (tiny icons in 2D canvas, HUD tiles) and as the onerror fallback for
  // the big UI surfaces where custom PNG avatars live.
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };

  // Phase 5a — per-character PNG avatars. If the file is missing, the
  // onerror handler in renderCharGlyph swaps in the emoji fallback so
  // display never breaks before the asset lands.
  const charAvatars = {
    cat:     '/assets/animal-cat.png',
    frog:    '/assets/animal-frog.png',
    wolf:    '/assets/animal-wolf.png',
    bear:    '/assets/animal-bear.png',
    bunny:   '/assets/animal-bunny.png',
    pig:     '/assets/animal-pig.png',
    chicken: '/assets/animal-chicken.png',
    raccoon: '/assets/animal-raccoon.png',
  };

  // Audit / post-Phase 9: animal PNGs carry baked checker or black-solid
  // backgrounds that peek through CSS circle-crop around the silhouette.
  // Pipe each avatar through SpriteLoader.loadPainterly at module init,
  // cache the processed data URL, and swap rendered imgs' src in place.
  const processedCharAvatars = {};
  function _registerProcessedChar(id, canvas) {
    if (!canvas) return;
    processedCharAvatars[id] = canvas.toDataURL('image/png');
    document.querySelectorAll('img[data-char="' + id + '"]').forEach((img) => {
      if (!img.src.startsWith('data:')) img.src = processedCharAvatars[id];
    });
  }
  // Defer so SpriteLoader script has time to execute in per-game hosts
  // where it may load AFTER host-common.js in index.html.
  setTimeout(() => {
    if (typeof SpriteLoader === 'undefined') return;
    Object.keys(charAvatars).forEach((id) => {
      SpriteLoader.loadPainterly('charAvatar-' + id, charAvatars[id])
        .then((canvas) => _registerProcessedChar(id, canvas))
        .catch(() => {});
    });
  }, 0);

  // Renders an <img class="char-glyph"> with emoji text-node fallback on
  // load failure. Returns HTML string (for innerHTML / template use).
  // Pass an extra CSS class for per-context sizing when needed.
  function renderCharGlyph(character, extraClass) {
    if (!character) return '?';
    const emoji = charIcons[character] || '?';
    const avatar = charAvatars[character];
    if (!avatar) return emoji;
    const cls = 'char-glyph' + (extraClass ? ' ' + extraClass : '');
    // onerror replaces the <img> with a text node holding the emoji.
    // JSON.stringify handles quoting for arbitrary emoji payloads.
    const onerr = 'this.replaceWith(document.createTextNode(' + JSON.stringify(emoji) + '))';
    const src = processedCharAvatars[character] || avatar;
    return '<img class="' + cls + '" data-char="' + character + '" src="' + src + '" alt="' + emoji + '" onerror=\'' + onerr + '\'>';
  }

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
      const icon = renderCharGlyph(p.character, 'char-glyph-inline');
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

  return { charIcons, charAvatars, renderCharGlyph, gameUrls, pname, navigateToGame, redirectIfWrongGame, lobbyPlayersHTML, countPlayers, showMsg, runCountdown };
})();
