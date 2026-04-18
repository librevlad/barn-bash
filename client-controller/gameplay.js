/* =========================================================================
   Frantics Controller Gameplay — Phase 2b
   Module API consumed by main.js after Onboarding.start({onDone}) finishes.

   Usage:
     Gameplay.start({ gameId, playerId, character, carColor, send });
     Gameplay.setPhase('running');
     Gameplay.setScore(284, { delta: +12 });
     Gameplay.onLocalAction('jump');                // confirm label + vibrate
     Gameplay.setModifier('shielded', true);        // or 'speeding', 'stumbling'
     Gameplay.setMeteorWarn(true|false);
     Gameplay.setItem('shield' | null);             // race held-item pill
     Gameplay.setSpectators([{id,name,character,color,score,leader}]);
     Gameplay.onGameOver({ winnerName, winnerCharacter, subline, quip });
     Gameplay.setPhase('lost');                     // connection-lost UI
     Gameplay.stop();                               // removes DOM

   Spec: docs/superpowers/specs/2026-04-15-controller-gameplay-design.md
   ========================================================================= */

window.Gameplay = (function () {
  var root = null;
  var els = {};
  var opts = null;
  var phase = 'idle';        // idle | countdown | running | eliminated | spectating | gameover | lost
  var lastActionConfirmTimer = null;
  var tapPulseTimer = null;
  var scoreBumpTimer = null;
  var activeDelta = null;

  // Phase 11b / 12b / 19 — preload painterly HUD chrome assets and
  // set their CSS custom properties. Raw PNG fallbacks in gameplay.css
  // show on first paint; processed (checker-stripped) versions swap
  // in once loadPainterly resolves.
  //   cell-action   (Phase 11b action-card + 12b orb reuse)
  //   score-plaque  (Phase 19a score block + countdown digit reuse)
  //   hintbar-stage (Phase 19b theatre stage under action cards)
  setTimeout(function () {
    if (typeof SpriteLoader === 'undefined') return;
    [
      ['cell-action',   '--cell-action-bg',   '/assets/cell-action.png'],
      ['score-plaque',  '--score-plaque-bg',  '/assets/score-plaque.png'],
      ['hintbar-stage', '--hintbar-stage-bg', '/assets/hintbar-stage.png'],
    ].forEach(function (t) {
      SpriteLoader.loadPainterly(t[0], t[2])
        .then(function (canvas) {
          if (canvas) {
            document.documentElement.style.setProperty(
              t[1], 'url(' + canvas.toDataURL('image/png') + ')');
          }
        })
        .catch(function () {});
    });
  }, 0);

  var GAME_NAMES = {
    escapeFox: 'Escape the Fox',
    hillKing:  'King of the Hill',
    meteor:    'Meteor Shower',
    race:      'Grand Prix',
  };
  var GAME_ICONS = {
    escapeFox: '\u{1F98A}',   // 🦊
    hillKing:  '\u{1F451}',   // 👑
    meteor:    '\u2604\uFE0F',// ☄️
    race:      '\u{1F3C1}',   // 🏁
  };
  var SCORE_CONTEXT = {
    escapeFox: 'meters dodged',
    hillKing:  'on the hill',
    meteor:    'waves survived',
    race:      'position',
  };
  var ANIMAL_EMOJI = {
    cat: '\u{1F431}', frog: '\u{1F438}', wolf: '\u{1F43A}', bear: '\u{1F43B}',
    bunny: '\u{1F430}', pig: '\u{1F437}', chicken: '\u{1F414}', raccoon: '\u{1F99D}',
  };
  var ACTION_CONFIRM_LABELS = {
    jump: 'JUMP!', jumpStart: 'LEAP!', jumpEnd: 'LAND', slide: 'SLIDE!',
    lane: 'LANE!', groundPound: 'SLAM!', useItem: 'USE!',
    dash: 'DASH!', shield: 'SHIELD!', slam: 'SLAM!', move: 'MOVE',
    dodge: 'DODGE!', sprint: 'SPRINT!',
    steer: 'STEER', boost: 'BOOST!', driftStart: 'DRIFT!', driftEnd: 'GRIP',
    dropItem: 'DROP',
  };
  var HINTBARS = {
    escapeFox: [
      { action: 'jump',    icon: '\u{1F446}', label: 'Tap · Jump',   primary: true },
      { action: 'jumpStart', icon: '\u{2B06}\uFE0F', label: 'High Jump' },
      { action: 'lane',    icon: '\u{2194}\uFE0F', label: 'Lane' },
      { action: 'slide',   icon: '\u{1F53D}', label: 'Slide' },
    ],
    race: [
      { action: 'steer',   icon: '\u{2194}\uFE0F', label: 'Swipe · Steer', primary: true },
      { action: 'boost',   icon: '\u{26A1}', label: 'Boost' },
      { action: 'driftStart', icon: '\u{1F3CE}\uFE0F', label: 'Drift' },
    ],
    hillKing: [
      { action: 'move',    icon: '\u{2194}\uFE0F', label: 'Move', primary: true },
      { action: 'slam',    icon: '\u{2B07}\uFE0F', label: 'Slam' },
      { action: 'dash',    icon: '\u{26A1}', label: 'Dash' },
      { action: 'shield',  icon: '\u{1F6E1}\uFE0F', label: 'Hold · Shield' },
    ],
    meteor: [
      { action: 'dodge',   icon: '\u{1F938}', label: 'Tap · Dodge', primary: true },
      { action: 'move',    icon: '\u{2194}\uFE0F', label: 'Move' },
      { action: 'sprint',  icon: '\u{1F3C3}', label: 'Sprint' },
    ],
  };
  var ITEM_EMOJI = {
    shield: '\u{1F6E1}\uFE0F',
    speed:  '\u{1F680}',
    coin:   '\u{1FA99}',
  };
  var ELIM_QUIPS = [
    'You tried. That\u2019s... something.',
    'Rest in pieces.',
    'The floor was optional, apparently.',
    'A moment of silence. Moment over.',
    'Plot twist: you were never going to win anyway.',
    'Your journey ends here. It was brief.',
  ];

  function pick(list, seed) {
    if (!seed) return list[Math.floor(Math.random() * list.length)];
    var hash = 0;
    for (var i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    return list[Math.abs(hash) % list.length];
  }

  function vibe(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    return e;
  }

  function buildDom(o) {
    root = el('div', 'gameplay-root game-' + o.gameId);

    // Top bar
    var topbar = el('div', 'gp-topbar');
    els.eyebrow = el('span', 'gp-eyebrow', { text: (GAME_NAMES[o.gameId] || o.gameId).toUpperCase() });
    els.phaseIcon = el('span', 'gp-phase-icon', { text: GAME_ICONS[o.gameId] || '' });
    topbar.appendChild(els.eyebrow);
    topbar.appendChild(els.phaseIcon);
    root.appendChild(topbar);

    // Race item pill (hidden unless set)
    els.itemPill = el('div', 'gp-item-pill empty');
    root.appendChild(els.itemPill);

    // Meteor warn overlay
    els.meteorFlash = el('div', 'gp-meteor-warn-flash');
    els.meteorLabel = el('div', 'gp-meteor-warn-label', { text: 'INCOMING!' });
    root.appendChild(els.meteorFlash);
    root.appendChild(els.meteorLabel);

    // Countdown
    els.countdownGame = el('div', 'gp-countdown-game', { text: (GAME_NAMES[o.gameId] || '').toUpperCase() });
    els.countdownDigit = el('div', 'gp-countdown-digit', { text: '' });
    els.countdownCaption = el('div', 'gp-countdown-caption', { text: 'get ready' });
    els.countdownGame.style.display = 'none';
    els.countdownDigit.style.display = 'none';
    els.countdownCaption.style.display = 'none';
    root.appendChild(els.countdownGame);
    root.appendChild(els.countdownDigit);
    root.appendChild(els.countdownCaption);

    // Score block
    var scoreBlock = el('div', 'gp-score-block');
    els.score = el('div', 'gp-score', { text: '0' });
    els.scoreContext = el('div', 'gp-score-context', { text: SCORE_CONTEXT[o.gameId] || '' });
    scoreBlock.appendChild(els.score);
    scoreBlock.appendChild(els.scoreContext);
    els.scoreBlock = scoreBlock;
    root.appendChild(scoreBlock);

    // Avatar orb — Phase 12b: painterly medallion frame via ::before
    // backdrop; animal avatar as <img> inside so the character reads
    // as a painted portrait instead of a raw emoji.
    els.orb = el('div', 'gp-avatar-orb');
    var avatarImg = document.createElement('img');
    avatarImg.className = 'gp-avatar-img';
    avatarImg.setAttribute('data-animal', o.character || 'cat');
    avatarImg.alt = ANIMAL_EMOJI[o.character] || '?';
    avatarImg.src = '/assets/animal-' + (o.character || 'cat') + '.png';
    avatarImg.onerror = function () {
      // Fall back to emoji text node on asset load failure
      this.replaceWith(document.createTextNode(ANIMAL_EMOJI[o.character] || '\u2753'));
    };
    // Async-swap src to loadPainterly-processed data URL so the baked
    // background (checker or solid) doesn't peek through the circle crop
    setTimeout(function () {
      if (typeof SpriteLoader === 'undefined') return;
      var cacheKey = 'orb-avatar-' + (o.character || 'cat');
      var cached = SpriteLoader.get(cacheKey);
      var apply = function (canvas) {
        if (canvas && avatarImg && !avatarImg.src.startsWith('data:')) {
          avatarImg.src = canvas.toDataURL('image/png');
        }
      };
      if (cached) apply(cached);
      else SpriteLoader.loadPainterly(cacheKey, avatarImg.src).then(apply).catch(function () {});
    }, 0);
    els.orb.appendChild(avatarImg);
    els.avatarLabel = el('div', 'gp-avatar-label', { text: o.name || '' });
    root.appendChild(els.orb);
    root.appendChild(els.avatarLabel);

    // Confirm overlays
    els.confirm = el('div', 'gp-confirm');
    els.tapPulse = el('div', 'gp-tap-pulse');
    els.swipeArrow = el('div', 'gp-swipe-arrow');
    els.holdRing = el('div', 'gp-hold-ring');
    els.nearMissFlash = el('div', 'gp-near-miss-flash');
    root.appendChild(els.confirm);
    root.appendChild(els.tapPulse);
    root.appendChild(els.swipeArrow);
    root.appendChild(els.holdRing);
    root.appendChild(els.nearMissFlash);

    // Hintbar
    els.hintbar = el('div', 'gp-hintbar');
    (HINTBARS[o.gameId] || []).forEach(function (a) {
      var action = el('div', 'gp-action' + (a.primary ? ' primary' : ''));
      action.dataset.action = a.action;
      action.appendChild(el('div', 'gp-action-icon', { text: a.icon }));
      action.appendChild(el('div', 'gp-action-label', { text: a.label }));
      els.hintbar.appendChild(action);
    });
    root.appendChild(els.hintbar);

    // Spectating block — Phase 18c: painterly backdrop reuses Phase 12a
    // standings-scroll.png (wooden scoreboard with 4 cream slot strips)
    // via <img> element sized at natural aspect ratio + centered, same
    // pattern as tournament.js. Pill list constrained to the scroll's
    // cream column; text color flips to --text-on-gold per Phase 12a.
    els.spectate = el('div', 'gp-spectate-block');
    els.specBackdrop = document.createElement('img');
    els.specBackdrop.className = 'gp-spec-backdrop';
    els.specBackdrop.src = '/assets/standings-scroll.png';
    els.specBackdrop.alt = '';
    els.specBackdrop.onerror = function () { this.remove(); };
    var specTitle = el('div', 'gp-spec-title', { text: 'SPECTATING' });
    els.specQuip = el('div', 'gp-spec-quip', { text: 'the show goes on without you' });
    els.specList = el('div', 'gp-spec-list');
    var specAwait = el('div', 'gp-spec-awaiting', { text: '\u00b7 \u00b7 \u00b7 waiting for the show to end' });
    els.spectate.appendChild(els.specBackdrop);
    els.spectate.appendChild(specTitle);
    els.spectate.appendChild(els.specQuip);
    els.spectate.appendChild(els.specList);
    els.spectate.appendChild(specAwait);
    root.appendChild(els.spectate);
    if (typeof AmbientFx !== 'undefined') AmbientFx.attach(els.spectate, 'dustmotes');

    // Phase 18 — async-swap overlay backdrops to loadPainterly-
    // processed data URLs so baked checker-preview fills don't peek
    // past the painted edges. Same pattern as tournament.js champion
    // throne backdrop.
    setTimeout(function () {
      if (typeof SpriteLoader === 'undefined') return;
      var swaps = [
        { el: els.specBackdrop, key: 'standings-scroll-spec', src: '/assets/standings-scroll.png' },
        { el: els.goBackdrop,   key: 'gameover-hall',         src: '/assets/gameover-hall.png' },
        { el: els.elimBackdrop, key: 'elim-shadow',           src: '/assets/elim-shadow.png' },
      ];
      swaps.forEach(function (s) {
        if (!s.el) return;
        var cached = SpriteLoader.get(s.key);
        var apply = function (canvas) {
          if (!canvas || !s.el) return;
          s.el.src = canvas.toDataURL('image/png');
        };
        if (cached) apply(cached);
        else SpriteLoader.loadPainterly(s.key, s.src).then(apply).catch(function () {});
      });
    }, 0);

    // Eliminated overlay — Phase 18b: painterly "after the act"
    // theatre backdrop (lowered red curtain + dim spotlight +
    // fallen jester hat) frames the grayscale avatar + red
    // ELIMINATED + GM quip composition.
    els.elim = el('div', 'gp-eliminated-overlay');
    els.elimBackdrop = document.createElement('img');
    els.elimBackdrop.className = 'gp-elim-backdrop';
    els.elimBackdrop.src = '/assets/elim-shadow.png';
    els.elimBackdrop.alt = '';
    els.elimBackdrop.onerror = function () { this.remove(); };
    els.elimAvatar = el('div', 'gp-elim-avatar', { text: ANIMAL_EMOJI[o.character] || '\u2753' });
    var elimLabel = el('div', 'gp-elim-label', { text: 'ELIMINATED' });
    var elimNarrator = el('div', 'gp-elim-narrator-label', { text: 'Game Master' });
    els.elimQuip = el('div', 'gp-elim-quip');
    els.elim.appendChild(els.elimBackdrop);
    els.elim.appendChild(els.elimAvatar);
    els.elim.appendChild(elimLabel);
    els.elim.appendChild(elimNarrator);
    els.elim.appendChild(els.elimQuip);
    root.appendChild(els.elim);
    if (typeof AmbientFx !== 'undefined') AmbientFx.attach(els.elim, 'embers');

    // Game over overlay — Phase 18a: painterly hall-of-fame backdrop
    // (cover-fit) replaces the old flat dark-blur scrim. Winner
    // composition sits in the painted center-stage spotlight.
    els.go = el('div', 'gp-gameover-overlay');
    els.goBackdrop = document.createElement('img');
    els.goBackdrop.className = 'gp-gameover-backdrop';
    els.goBackdrop.src = '/assets/gameover-hall.png';
    els.goBackdrop.alt = '';
    els.goBackdrop.onerror = function () { this.remove(); };
    els.goLabel = el('div', 'gp-go-label', { text: 'Round complete' });
    els.goAvatar = el('div', 'gp-go-winner-avatar', { text: '\u{1F3C6}' });
    els.goHero = el('div', 'gp-go-hero', { text: '' });
    els.goSubline = el('div', 'gp-go-subline', { text: '' });
    els.goQuip = el('div', 'gp-go-quip', { text: '' });
    els.goBtn = el('button', 'gp-go-btn', { text: 'BACK TO LOBBY' });
    els.goBtn.addEventListener('click', function () {
      if (opts && typeof opts.onLobby === 'function') opts.onLobby();
    });
    els.go.appendChild(els.goBackdrop);
    els.go.appendChild(els.goLabel);
    els.go.appendChild(els.goAvatar);
    els.go.appendChild(els.goHero);
    els.go.appendChild(els.goSubline);
    els.go.appendChild(els.goQuip);
    els.go.appendChild(els.goBtn);
    root.appendChild(els.go);
    if (typeof AmbientFx !== 'undefined') AmbientFx.attach(els.go, 'sparkles');

    // Connection lost
    els.lostToast = el('div', 'gp-lost-toast');
    els.lostToast.innerHTML = '<strong>LOST THE LINE</strong><span class="lost-msg">Trying to reconnect...</span>';
    els.lostStall = el('div', 'gp-lost-stall');
    els.lostStall.innerHTML = '<div class="gp-stall-icon">\u{1F3AA}</div>' +
                              '<div class="gp-stall-line">hold still \u2014 the Game Master is checking the wires</div>';
    root.appendChild(els.lostToast);
    root.appendChild(els.lostStall);

    document.body.appendChild(root);
  }

  function setPhaseClass(next) {
    if (!root) return;
    root.classList.remove('phase-idle', 'phase-countdown', 'phase-running', 'phase-eliminated', 'phase-spectating', 'phase-gameover', 'phase-lost');
    root.classList.add('phase-' + next);
    phase = next;
  }

  /* ===== Public API ===== */

  function start(o) {
    opts = o || {};
    if (root) stop();
    buildDom(opts);
    setPhaseClass('idle');
    return api;
  }

  function setPhase(next) {
    setPhaseClass(next);
    if (next === 'eliminated') {
      els.elimQuip.textContent = '"' + pick(ELIM_QUIPS, String(opts.playerId) + '-' + (opts.round || 0)) + '"';
      if (window.PretextHooks) window.PretextHooks.measure(els.elimQuip);
      vibe([20, 40, 20]);
    }
    if (next === 'countdown') {
      els.countdownGame.style.display = '';
      els.countdownDigit.style.display = '';
      els.countdownCaption.style.display = '';
      els.scoreBlock.style.display = 'none';
      els.orb.style.display = 'none';
      els.avatarLabel.style.display = 'none';
      els.hintbar.style.display = 'none';
    } else {
      els.countdownGame.style.display = 'none';
      els.countdownDigit.style.display = 'none';
      els.countdownCaption.style.display = 'none';
      els.scoreBlock.style.display = '';
      els.orb.style.display = '';
      els.avatarLabel.style.display = '';
      if (next === 'running') els.hintbar.style.display = '';
    }
    return api;
  }

  function setCountdown(digitText, caption) {
    if (!root) return api;
    setPhase('countdown');
    els.countdownDigit.textContent = digitText;
    if (caption) els.countdownCaption.textContent = caption;
    // retrigger stamp animation
    els.countdownDigit.style.animation = 'none';
    // force reflow
    void els.countdownDigit.offsetWidth;
    els.countdownDigit.style.animation = '';
    return api;
  }

  function setScore(value, extras) {
    if (!root) return api;
    els.score.firstChild && (els.score.firstChild.nodeType === 3
      ? (els.score.firstChild.textContent = String(value))
      : (els.score.innerHTML = String(value)));
    if (!els.score.firstChild) els.score.textContent = String(value);

    if (extras && typeof extras.delta === 'number' && extras.delta !== 0) {
      if (activeDelta && activeDelta.parentNode) activeDelta.parentNode.removeChild(activeDelta);
      activeDelta = el('span', 'gp-score-delta', { text: (extras.delta > 0 ? '+' : '') + extras.delta });
      els.score.appendChild(activeDelta);
      setTimeout(function () {
        if (activeDelta && activeDelta.parentNode) activeDelta.parentNode.removeChild(activeDelta);
        activeDelta = null;
      }, 1900);

      els.score.classList.add('bump');
      clearTimeout(scoreBumpTimer);
      scoreBumpTimer = setTimeout(function () {
        els.score.classList.remove('bump');
      }, 180);
    }
    if (extras && extras.context) els.scoreContext.textContent = extras.context;
    return api;
  }

  function setContext(text) {
    if (els && els.scoreContext) els.scoreContext.textContent = text;
    return api;
  }

  function setModifier(mod, on) {
    if (!els.orb) return api;
    els.orb.classList.toggle(mod, !!on);
    return api;
  }

  function setItem(kind) {
    if (!els.itemPill) return api;
    if (kind && ITEM_EMOJI[kind]) {
      els.itemPill.textContent = ITEM_EMOJI[kind];
      els.itemPill.classList.remove('empty');
    } else {
      els.itemPill.classList.add('empty');
    }
    return api;
  }

  function setMeteorWarn(on) {
    if (!els.meteorFlash) return api;
    els.meteorFlash.classList.toggle('active', !!on);
    els.meteorLabel.classList.toggle('active', !!on);
    return api;
  }

  function nearMiss() {
    if (!els.nearMissFlash) return api;
    els.nearMissFlash.classList.add('active');
    vibe([8, 40, 8]);
    setTimeout(function () { els.nearMissFlash.classList.remove('active'); }, 250);
    return api;
  }

  function setActionPrimary(actionKey) {
    if (!els.hintbar) return api;
    els.hintbar.querySelectorAll('.gp-action').forEach(function (n) {
      n.classList.toggle('primary', n.dataset.action === actionKey);
    });
    return api;
  }

  function onLocalAction(actionKey, meta) {
    if (!root || phase !== 'running') return api;
    var label = ACTION_CONFIRM_LABELS[actionKey] || actionKey.toUpperCase();
    els.confirm.textContent = label;
    els.confirm.classList.remove('rejected');
    els.confirm.classList.add('show');
    clearTimeout(lastActionConfirmTimer);
    lastActionConfirmTimer = setTimeout(function () {
      els.confirm.classList.remove('show');
    }, 500);

    if (meta && meta.gesture === 'swipe' && meta.direction) {
      var arrows = { up: '\u2B06\uFE0F', down: '\u2B07\uFE0F', left: '\u2B05\uFE0F', right: '\u27A1\uFE0F' };
      els.swipeArrow.textContent = arrows[meta.direction] || '';
      els.swipeArrow.classList.add('show');
      setTimeout(function () { els.swipeArrow.classList.remove('show'); }, 250);
    } else if (meta && meta.gesture === 'hold') {
      // hold ring management is external (charging/release)
    } else {
      els.tapPulse.classList.remove('active');
      void els.tapPulse.offsetWidth;
      els.tapPulse.classList.add('active');
    }
    vibe(15);
    return api;
  }

  function holdStart() { if (els.holdRing) els.holdRing.classList.add('charging'); }
  function holdEnd()   { if (els.holdRing) els.holdRing.classList.remove('charging'); }

  function rejectAction(reason) {
    if (!root || !els.confirm) return api;
    els.confirm.textContent = reason ? reason.toUpperCase() : 'COOLDOWN';
    els.confirm.classList.add('rejected', 'show');
    clearTimeout(lastActionConfirmTimer);
    lastActionConfirmTimer = setTimeout(function () {
      els.confirm.classList.remove('show');
      els.confirm.classList.remove('rejected');
    }, 400);
    return api;
  }

  function setSpectators(list) {
    if (!els.specList) return api;
    els.specList.innerHTML = '';
    (list || []).forEach(function (p) {
      var pill = el('div', 'gp-spec-pill' + (p.leader ? ' leader' : ''));
      var dot = el('span', 'gp-spec-pill-dot');
      dot.style.background = p.color || 'var(--color-player-unknown)';
      dot.style.color = p.color || 'var(--color-player-unknown)';
      var emoji = el('span', 'gp-spec-pill-emoji', { text: ANIMAL_EMOJI[p.character] || '' });
      var name = el('span', 'gp-spec-pill-name', { text: p.name || ('P' + p.id) });
      // Phase 18c — painted scroll cream strip can't accommodate "· LEADER"
      // text at 220px list width. Leader status is carried by the .leader
      // CSS class (gold underline / emphasis) instead.
      var meta = el('span', 'gp-spec-pill-meta', { text: p.score != null ? String(p.score) : '' });
      pill.appendChild(dot);
      pill.appendChild(emoji);
      pill.appendChild(name);
      pill.appendChild(meta);
      els.specList.appendChild(pill);
    });
    return api;
  }

  function onGameOver(info) {
    if (!root) return api;
    info = info || {};
    els.goLabel.textContent = info.label || 'Round complete';
    els.goAvatar.textContent = ANIMAL_EMOJI[info.winnerCharacter] || '\u{1F3C6}';
    els.goHero.textContent = info.winnerName || 'Nobody';
    els.goSubline.textContent = info.subline || (info.winnerName ? 'SURVIVED!' : 'NO WINNER');
    els.goQuip.textContent = info.quip ? '"' + info.quip + '"' : '';
    if (window.PretextHooks) {
      window.PretextHooks.measure(els.goHero);
      window.PretextHooks.measure(els.goSubline);
      window.PretextHooks.measure(els.goQuip);
    }
    setPhaseClass('gameover');
    vibe([30, 50, 30]);
    return api;
  }

  function setConnectionAttempt(n, total) {
    if (!els.lostToast) return api;
    var msg = els.lostToast.querySelector('.lost-msg');
    if (msg) {
      msg.textContent = 'Trying to reconnect... attempt ' + (n || 1) + ' of ' + (total || 4);
    }
    return api;
  }

  function stop() {
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    els = {};
    opts = null;
    phase = 'idle';
    clearTimeout(lastActionConfirmTimer);
    clearTimeout(scoreBumpTimer);
    lastActionConfirmTimer = null;
    scoreBumpTimer = null;
  }

  function getPhase() { return phase; }

  var api = {
    start: start,
    setPhase: setPhase,
    setCountdown: setCountdown,
    setScore: setScore,
    setContext: setContext,
    setModifier: setModifier,
    setItem: setItem,
    setMeteorWarn: setMeteorWarn,
    nearMiss: nearMiss,
    setActionPrimary: setActionPrimary,
    onLocalAction: onLocalAction,
    holdStart: holdStart,
    holdEnd: holdEnd,
    rejectAction: rejectAction,
    setSpectators: setSpectators,
    onGameOver: onGameOver,
    setConnectionAttempt: setConnectionAttempt,
    stop: stop,
    getPhase: getPhase,
  };

  return api;
})();
