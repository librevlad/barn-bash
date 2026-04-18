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
  // Defer to DOMContentLoaded so SpriteLoader script (loaded after
  // host-common.js in per-game HTMLs) is guaranteed to be defined.
  // setTimeout(0) isn't enough — subsequent <script src> tags fetch
  // async, and setTimeout can fire BEFORE they finish loading.
  function _initPainterlyPipeline() {
    if (typeof SpriteLoader === 'undefined') return;
    // Phase 5a — base sizing rules for <img class="char-glyph"> so
    // Phase 5a animal PNGs (1024x1024 natural) render at glyph size
    // inside pills / cards / lobbies on ALL hosts. Main lobby (client-
    // host/index.html) has its own .player-pill-icon rule; per-game
    // hosts (escape / hill / meteor / race) inherit these defaults.
    const baseStyleEl = document.createElement('style');
    baseStyleEl.id = 'host-common-char-glyph-base';
    baseStyleEl.textContent =
      'img.char-glyph {' +
      '  width: 1em; height: 1em;' +
      '  object-fit: cover; border-radius: 50%;' +
      '  display: inline-block; vertical-align: middle;' +
      '}' +
      'img.char-glyph-inline {' +
      '  width: 1.4em; height: 1.4em;' +
      '  object-fit: cover; border-radius: 50%;' +
      '  display: inline-block; vertical-align: middle;' +
      '  margin: 0;' +
      '}';
    document.head.appendChild(baseStyleEl);

    Object.keys(charAvatars).forEach((id) => {
      SpriteLoader.loadPainterly('charAvatar-' + id, charAvatars[id])
        .then((canvas) => _registerProcessedChar(id, canvas))
        .catch(() => {});
    });
    // Phase 15a — preload carnival bunting ornament; inject a <style>
    // tag with the processed data URL so every overlay's ::before
    // renders the clean bunting. CSS custom-property path silently
    // fails for long data URLs in Chrome.
    // Custom thresholds: bunting PNG's checker is two-tone (~150 / ~180)
    // and dimmer than the default 185-brightness seed. Lower seedBright
    // to 135 to catch both tones; bunting's saturated reds + browns +
    // golds stay untouched (high chroma).
    SpriteLoader.loadPainterly('ornament-bunting', '/assets/ornament-bunting.png',
      { seedBright: 135, expandBright: 120, expandChroma: 25 })
      .then((canvas) => {
        if (!canvas) return;
        const styleEl = document.createElement('style');
        styleEl.id = 'phase15a-bunting-override';
        styleEl.textContent =
          '#tournament-overlay::before,' +
          '#postgame-overlay::before,' +
          '#lobby::before {' +
          '  background-image: url(' + canvas.toDataURL('image/png') + ') !important;' +
          '}';
        document.head.appendChild(styleEl);
      })
      .catch(() => {});
    // Phase 15b — preload gold corner flourish; inject <style> override
    // targeting the four .ornament-corner elements (natural + mirrored
    // variants). addCornerOrnaments helper injects the four <div>s into
    // any overlay, called for #lobby here and by tournament.js +
    // postgame.js at overlay-create time.
    // Phase E2E fix — corner PNG has interior checker pockets inside
    // the curlicue filigree that loadPainterly's edge-seeded BFS
    // can't reach (dark ink outlines bound them). After the standard
    // edge pass, run a GLOBAL strict sweep that clears any remaining
    // neutral-bright pixels (chroma < 12, brightness > 135). This is
    // the "strict-everywhere" pass deprecated in Phase 7c — safe to
    // re-enable just for the corner asset because the painted
    // flourish is saturated-gold (high chroma) and survives the
    // strict criteria. Bunting uses custom thresholds without the
    // strict post-pass; corner needs both.
    SpriteLoader.loadPainterly('ornament-corner', '/assets/ornament-corner.png',
      { seedBright: 135, expandBright: 120, expandChroma: 25 })
      .then((canvas) => {
        if (!canvas) return;
        // Post-process: global strict sweep for interior pockets.
        // Chroma threshold widened to 40 to catch warm-tinted grey
        // (image-gen's checker bakes with warm cast alongside pure
        // grey). The painted gold flourish (chroma 75+) + dark ink
        // outlines (brightness < 100) both survive.
        const cx = canvas.getContext('2d');
        const data = cx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] === 0) continue; // already transparent
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const minC = Math.min(r, g, b);
          const maxC = Math.max(r, g, b);
          if ((maxC - minC) < 40 && minC > 135) {
            px[i + 3] = 0;
          }
        }
        cx.putImageData(data, 0, 0);
        const styleEl = document.createElement('style');
        styleEl.id = 'phase15b-corner-override';
        styleEl.textContent =
          '.ornament-corner {' +
          '  background-image: url(' + canvas.toDataURL('image/png') + ') !important;' +
          '}';
        document.head.appendChild(styleEl);
      })
      .catch(() => {});
    // Inject corners into the already-in-DOM #lobby element
    const lobbyEl = document.getElementById('lobby');
    if (lobbyEl) _addCornersTo(lobbyEl);

    // Phase 21a — ambient dustmotes layer on the lobby (main + per-game).
    // Keeps painted scene alive with drifting cream specks; honors
    // prefers-reduced-motion internally.
    if (lobbyEl && typeof AmbientFx !== 'undefined') {
      AmbientFx.attach(lobbyEl, 'dustmotes');
    }
  }
  function _addCornersTo(overlayEl) {
    if (!overlayEl) return;
    if (overlayEl.querySelector('.ornament-corner.tl')) return; // idempotent
    ['tl', 'tr', 'bl', 'br'].forEach((pos) => {
      const d = document.createElement('div');
      d.className = 'ornament-corner ' + pos;
      overlayEl.appendChild(d);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initPainterlyPipeline);
  } else {
    _initPainterlyPipeline();
  }

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

  return { charIcons, charAvatars, renderCharGlyph, gameUrls, pname, navigateToGame, redirectIfWrongGame, lobbyPlayersHTML, countPlayers, showMsg, runCountdown, addCornerOrnaments: _addCornersTo };
})();
