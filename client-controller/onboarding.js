// Controller onboarding module — Phase 1b.
// Public API:
//   Onboarding.start({ onDone: ({ name, character, carColor }) => void, root?: HTMLElement })
//   Onboarding.onServerAssignedColor(colorId)
//   Onboarding.onPlayerJoined(player)
//   Onboarding.onPlayerLeft(playerId)
//   Onboarding.reset()
(function (global) {
  'use strict';

  const { COLOR_IDS, COLOR_HEX, COLOR_SPRITE, COLOR_LABEL } = global.FranticsColors;

  const ANIMALS = [
    { id: 'cat',     name: 'Cat',     trait: 'Agile',     emoji: '\u{1F431}' },
    { id: 'frog',    name: 'Frog',    trait: 'Bouncy',    emoji: '\u{1F438}' },
    { id: 'wolf',    name: 'Wolf',    trait: 'Powerful',  emoji: '\u{1F43A}' },
    { id: 'bear',    name: 'Bear',    trait: 'Tank',      emoji: '\u{1F43B}' },
    { id: 'bunny',   name: 'Bunny',   trait: 'Speedy',    emoji: '\u{1F430}' },
    { id: 'pig',     name: 'Pig',     trait: 'Endurance', emoji: '\u{1F437}' },
    { id: 'chicken', name: 'Chicken', trait: 'Chaotic',   emoji: '\u{1F414}' },
    { id: 'raccoon', name: 'Raccoon', trait: 'Trickster', emoji: '\u{1F99D}' },
  ];
  const ANIMAL_QUIPS = {
    cat: '"Cats always land on their feet. Let\'s test that."',
    frog: '"Ribbit ribbit. That\'s frog for I\'m doomed."',
    wolf: '"Fangs won\'t save you here, wolf."',
    bear: '"A bear. Slow but... ow. That hurt."',
    bunny: '"Fast little thing. Let\'s see how far that gets you."',
    pig: '"Stubborn. I like that. Makes it funnier."',
    chicken: '"A chicken! In a game show! What could go wrong?"',
    raccoon: '"A raccoon. Sneaky. I\'ll be watching you."',
  };
  const NAME_QUIPS = [
    '"Make it memorable. You won\'t be here long."',
    '"The Game Master awaits your dignity."',
    '"Sixteen characters. Use them well."',
    '"Type fast. The crowd grows restless."',
    '"Something your mother would recognize on a tombstone."',
    '"Short, punchy, regrettable."',
    '"Whatever you pick, I\'ll mispronounce it."',
    '"Choose wisely — this appears in the scoreboard."',
  ];
  const CURTAIN_TITLES = {
    'intro_to_name':            'FIRST — WHO ARE YOU?',
    'name_to_animal':           'NOW — CHOOSE YOUR FIGHTER!',
    'animal_to_color':           'AND FINALLY — YOUR CHARIOT!',
    'color_to_waiting':          'THE SHOW BEGINS!',
    'waiting_to_gameplay':       'LET THE GAMES BEGIN!',
    'intro_to_quick-confirm':    'WELCOME BACK, CONTESTANT.',
    'quick-confirm_to_waiting':  'STRAIGHT TO THE SHOW!',
  };
  const LS_KEY = 'frantics_player';

  const state = {
    screen: null,
    name: '',
    animal: null,
    color: null,
    transitioning: false,
    onDone: null,
    root: null,
    host: null,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function loadSaved() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s && s.name && s.character && s.carColor) return s;
      return null;
    } catch { return null; }
  }
  function saveState() {
    if (state.name && state.animal && state.color) {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          name: state.name, character: state.animal, carColor: state.color,
        }));
      } catch {}
    }
  }
  function clearSaved() {
    try { localStorage.removeItem(LS_KEY); } catch {}
  }

  function escapeHTML(s) {
    return String(s).replace(/[<>&"']/g, ch =>
      ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[ch]));
  }

  function render() {
    const host = document.createElement('div');
    host.className = 'onboarding-root';
    host.innerHTML = `
      <div id="ob-rotate-gate">
        <div class="icon">\u{1F4F1}</div>
        <h2>PLEASE ROTATE</h2>
        <p>The Game Master only accepts contestants holding their phones vertically.</p>
      </div>

      <div id="ob-screen-intro" class="screen active" data-screen="intro">
        <div class="intro-bulbs">
          <div class="bulb"></div><div class="bulb"></div><div class="bulb"></div>
          <div class="bulb"></div><div class="bulb"></div>
        </div>
        <div class="intro-title">FRANTICS!</div>
        <div class="intro-subtitle">A Game Master Production</div>
        <div class="intro-skip-hint">TAP TO SKIP</div>
      </div>

      <div id="ob-screen-quick-confirm" class="screen" data-screen="quick-confirm">
        <div class="quick-card">
          <div class="quick-label">Welcome back</div>
          <div class="quick-name" id="ob-quick-name">—</div>
          <div class="quick-info">
            <span id="ob-quick-animal">?</span> &nbsp;·&nbsp; <span id="ob-quick-color">?</span>
          </div>
          <button class="ticket-btn" id="ob-btn-quick-play">PLAY AS MYSELF</button>
          <div><a class="quick-change" id="ob-link-quick-change">or change my getup</a></div>
        </div>
      </div>

      <div id="ob-screen-name" class="screen" data-screen="name">
        <div class="top-bar"><div class="progress">
          <div class="progress-dot filled"></div><div class="progress-dot"></div><div class="progress-dot"></div>
        </div></div>
        <div class="name-form">
          <div class="prompt">Your name, hero:</div>
          <input id="ob-name-input" class="name-input" type="text" maxlength="16"
            placeholder="enter your name..." autocomplete="off" autocapitalize="words"
            autocorrect="off" inputmode="text">
          <button class="ticket-btn" id="ob-btn-name-next" disabled>NEXT</button>
        </div>
        <div class="name-quip-slot"><div class="quip" id="ob-name-quip"></div></div>
      </div>

      <div id="ob-screen-animal" class="screen" data-screen="animal">
        <div class="top-bar">
          <div class="progress">
            <div class="progress-dot filled"></div><div class="progress-dot filled"></div><div class="progress-dot"></div>
          </div>
          <button class="back-link" data-back>\u2190 BACK</button>
        </div>
        <h1 class="headline">Choose your fighter.</h1>
        <div class="animal-grid" id="ob-animal-grid"></div>
        <div class="quip" id="ob-animal-quip"></div>
        <div style="flex:1"></div>
        <button class="ticket-btn" id="ob-btn-animal-confirm" disabled>CONFIRM</button>
      </div>

      <div id="ob-screen-color" class="screen" data-screen="color">
        <div class="top-bar">
          <div class="progress">
            <div class="progress-dot filled"></div><div class="progress-dot filled"></div><div class="progress-dot filled"></div>
          </div>
          <button class="back-link" data-back>\u2190 BACK</button>
        </div>
        <h1 class="headline">And your ride?</h1>
        <div class="color-grid" id="ob-color-grid"></div>
        <div class="color-name" id="ob-color-name">&nbsp;</div>
        <div style="flex:1"></div>
        <button class="ticket-btn ticket-btn-large" id="ob-btn-color-confirm" disabled>STEP RIGHT UP!</button>
      </div>

      <div id="ob-screen-waiting" class="screen" data-screen="waiting">
        <div class="waiting-header">
          <div class="waiting-title">YOU'RE IN!</div>
          <button class="waiting-settings" id="ob-btn-settings" title="Leave the show">\u2699</button>
        </div>
        <div class="player-card" id="ob-player-card">
          <div class="player-ribbon" id="ob-player-ribbon">—</div>
          <div class="player-animal" id="ob-player-animal">?</div>
          <div class="player-car"><img id="ob-player-car-img" alt="your car" src=""></div>
          <div class="player-desc" id="ob-player-desc">—</div>
        </div>
        <div class="contestants-label">OTHER CONTESTANTS</div>
        <div class="contestants" id="ob-contestants"></div>
        <div class="awaiting-host">awaiting the host<span class="dots"><span>.</span><span>.</span><span>.</span></span></div>
      </div>

      <div id="ob-curtain">
        <div class="curtain-panel top"></div>
        <div class="curtain-panel bottom"></div>
        <div class="curtain-title" id="ob-curtain-title"></div>
      </div>

      <div id="ob-toast"></div>
    `;
    state.root.appendChild(host);
    state.host = host;
    state.screen = 'intro';

    initIntro();
    initNameScreen();
    initAnimalScreen();
    initColorScreen();
    initWaitingScreen();
    initQuickConfirm();
    initBackLinks();
  }

  function show(screenId) {
    state.host.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = state.host.querySelector('#ob-screen-' + screenId);
    if (!el) return;
    el.classList.add('active');
    state.screen = screenId;
    if (screenId === 'animal')        animalScreen.renderGrid();
    if (screenId === 'color')         colorScreen.renderGrid();
    if (screenId === 'waiting')       waitingScreen.refresh();
    if (screenId === 'quick-confirm') quickConfirmScreen.refresh();
    if (screenId === 'name')          nameScreen.refresh();
  }

  async function curtainTo(nextScreen, key) {
    if (state.transitioning) return;
    state.transitioning = true;

    const curtain = state.host.querySelector('#ob-curtain');
    const title = state.host.querySelector('#ob-curtain-title');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    title.textContent = CURTAIN_TITLES[key] || '';

    curtain.classList.add('active');

    if (reducedMotion) {
      await sleep(50);
      show(nextScreen);
      curtain.classList.add('showtext');
      await sleep(250);
      curtain.classList.remove('showtext');
      await sleep(100);
      curtain.classList.remove('active');
    } else {
      await sleep(50);
      curtain.classList.add('closed');
      await sleep(300);
      curtain.classList.add('showtext');
      await sleep(250);
      show(nextScreen);
      curtain.classList.remove('showtext');
      await sleep(100);
      curtain.classList.remove('closed');
      await sleep(300);
      curtain.classList.remove('active');
    }
    state.transitioning = false;
  }

  function initIntro() {
    const intro = state.host.querySelector('#ob-screen-intro');
    intro.addEventListener('click', () => {
      if (state.screen !== 'intro') return;
      advanceFromIntro();
    }, { once: false });
  }

  function advanceFromIntro() {
    if (state.screen !== 'intro') return;
    const saved = loadSaved();
    const forceFresh = new URLSearchParams(location.search).has('fresh');
    if (saved && !forceFresh) {
      state.name = saved.name;
      state.animal = saved.character;
      state.color = saved.carColor;
      curtainTo('quick-confirm', 'intro_to_quick-confirm');
    } else {
      curtainTo('name', 'intro_to_name');
    }
  }

  function initNameScreen() {
    const input = state.host.querySelector('#ob-name-input');
    const btn = state.host.querySelector('#ob-btn-name-next');
    const quip = state.host.querySelector('#ob-name-quip');

    function refresh() {
      quip.textContent = NAME_QUIPS[Math.floor(Math.random() * NAME_QUIPS.length)];
      if (state.name) input.value = state.name;
      btn.disabled = !input.value.trim();
    }

    input.addEventListener('input', () => { btn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); btn.click(); }
    });
    btn.addEventListener('click', () => {
      const n = input.value.trim();
      if (!n) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 450);
        return;
      }
      state.name = n;
      curtainTo('animal', 'name_to_animal');
    });

    nameScreen = { refresh };
  }
  let nameScreen;

  function initAnimalScreen() {
    const grid = state.host.querySelector('#ob-animal-grid');
    const quipEl = state.host.querySelector('#ob-animal-quip');
    const btn = state.host.querySelector('#ob-btn-animal-confirm');

    function renderGrid() {
      grid.innerHTML = '';
      for (const a of ANIMALS) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'animal-cell' + (state.animal === a.id ? ' selected' : '');
        cell.dataset.id = a.id;
        cell.innerHTML =
          '<div class="medallion" aria-hidden="true">' + a.emoji + '</div>' +
          '<div class="animal-name">' + a.name + '</div>' +
          '<div class="animal-trait">' + a.trait + '</div>';
        cell.addEventListener('click', () => {
          state.animal = a.id;
          navigator.vibrate?.([15]);
          grid.querySelectorAll('.animal-cell').forEach(c =>
            c.classList.toggle('selected', c.dataset.id === a.id));
          quipEl.textContent = ANIMAL_QUIPS[a.id] || '';
          btn.disabled = false;
        });
        grid.appendChild(cell);
      }
      quipEl.textContent = state.animal ? ANIMAL_QUIPS[state.animal] : '';
      btn.disabled = !state.animal;
    }

    btn.addEventListener('click', () => {
      if (!state.animal) return;
      curtainTo('color', 'animal_to_color');
    });

    animalScreen = { renderGrid };
  }
  let animalScreen;

  function initColorScreen() {
    const grid = state.host.querySelector('#ob-color-grid');
    const nameEl = state.host.querySelector('#ob-color-name');
    const btn = state.host.querySelector('#ob-btn-color-confirm');

    function renderGrid() {
      grid.innerHTML = '';
      for (const id of COLOR_IDS) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'color-cell' + (state.color === id ? ' selected' : '');
        cell.dataset.id = id;
        cell.setAttribute('aria-label', COLOR_LABEL[id]);
        cell.innerHTML = '<img src="' + COLOR_SPRITE[id] + '" alt="">';
        cell.addEventListener('click', () => {
          state.color = id;
          navigator.vibrate?.([15]);
          grid.querySelectorAll('.color-cell').forEach(c =>
            c.classList.toggle('selected', c.dataset.id === id));
          nameEl.textContent = COLOR_LABEL[id].toUpperCase();
          btn.disabled = false;
        });
        grid.appendChild(cell);
      }
      nameEl.textContent = state.color ? COLOR_LABEL[state.color].toUpperCase() : '';
      btn.disabled = !state.color;
    }

    btn.addEventListener('click', () => {
      if (!state.color) return;
      saveState();
      curtainTo('waiting', 'color_to_waiting');
      state.onDone?.({ name: state.name, character: state.animal, carColor: state.color });
    });

    colorScreen = { renderGrid };
  }
  let colorScreen;

  function initWaitingScreen() {
    const ribbon = state.host.querySelector('#ob-player-ribbon');
    const animalEl = state.host.querySelector('#ob-player-animal');
    const carImg = state.host.querySelector('#ob-player-car-img');
    const descEl = state.host.querySelector('#ob-player-desc');
    const settings = state.host.querySelector('#ob-btn-settings');
    const contestants = state.host.querySelector('#ob-contestants');

    function refresh() {
      const a = ANIMALS.find(x => x.id === state.animal);
      ribbon.textContent = (state.name || '—').toUpperCase();
      animalEl.textContent = a ? a.emoji : '?';
      carImg.src = state.color ? COLOR_SPRITE[state.color] : '';
      descEl.textContent = (a?.name || '?').toLowerCase() + ' · ' +
        ((state.color && COLOR_LABEL[state.color]) || '?').toLowerCase();
    }

    settings.addEventListener('click', () => {
      if (confirm('Leave the show?')) {
        clearSaved();
        state.name = ''; state.animal = null; state.color = null;
        location.reload();
      }
    });

    function addPill(player) {
      const pid = player.playerId;
      const existing = contestants.querySelector('[data-pid="' + pid + '"]');
      if (existing) return;
      const pill = document.createElement('div');
      pill.className = 'contestant-pill';
      pill.dataset.pid = pid;
      const a = ANIMALS.find(x => x.id === player.character) || { emoji: '?' };
      const colorHex = COLOR_HEX[player.colorId] || player.color || '#888';
      const colorLabel = COLOR_LABEL[player.colorId] || '?';
      pill.innerHTML =
        '<div class="contestant-dot" style="background:' + colorHex + ';color:' + colorHex + '"></div>' +
        '<div class="contestant-name">' + escapeHTML(player.name || 'player') + '</div>' +
        '<div class="contestant-animal">' + a.emoji + '</div>' +
        '<div class="contestant-color">' + colorLabel + '</div>';
      contestants.appendChild(pill);
    }
    function removePill(playerId) {
      const pill = contestants.querySelector('[data-pid="' + playerId + '"]');
      if (pill) pill.remove();
    }

    waitingScreen = { refresh, addPill, removePill };
  }
  let waitingScreen;

  function initQuickConfirm() {
    const nameEl  = state.host.querySelector('#ob-quick-name');
    const animalEl= state.host.querySelector('#ob-quick-animal');
    const colorEl = state.host.querySelector('#ob-quick-color');
    const btnPlay = state.host.querySelector('#ob-btn-quick-play');
    const linkChg = state.host.querySelector('#ob-link-quick-change');

    function refresh() {
      const a = ANIMALS.find(x => x.id === state.animal);
      nameEl.textContent = (state.name || '—').toUpperCase();
      animalEl.textContent = a ? a.emoji : '?';
      colorEl.textContent = state.color ? COLOR_LABEL[state.color].toUpperCase() : '?';
    }

    btnPlay.addEventListener('click', () => {
      state.onDone?.({ name: state.name, character: state.animal, carColor: state.color });
      curtainTo('waiting', 'quick-confirm_to_waiting');
    });

    linkChg.addEventListener('click', () => {
      state.name = ''; state.animal = null; state.color = null;
      const input = state.host.querySelector('#ob-name-input');
      if (input) input.value = '';
      curtainTo('name', 'intro_to_name');
    });

    quickConfirmScreen = { refresh };
  }
  let quickConfirmScreen;

  function initBackLinks() {
    state.host.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => {
        const prev = state.screen === 'animal' ? 'name'
                   : state.screen === 'color'  ? 'animal'
                   : null;
        if (prev) show(prev);
      });
    });
  }

  let toastTimer = null;
  function showToast(msg) {
    const el = state.host.querySelector('#ob-toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
  }

  function bootstrap() {
    setTimeout(advanceFromIntro, 1200);
  }

  const Onboarding = {
    start(options) {
      state.onDone = options.onDone;
      state.root = options.root || document.body;
      render();
      bootstrap();
    },
    onServerAssignedColor(colorId) {
      if (!colorId || colorId === state.color) return;
      const oldLabel = COLOR_LABEL[state.color] || state.color;
      state.color = colorId;
      saveState();
      waitingScreen?.refresh();
      showToast(oldLabel + ' was taken — you got ' + (COLOR_LABEL[colorId] || colorId) + ' instead.');
    },
    onPlayerJoined(player) {
      waitingScreen?.addPill(player);
    },
    onPlayerLeft(playerId) {
      waitingScreen?.removePill(playerId);
    },
    reset() {
      clearSaved();
      state.name = ''; state.animal = null; state.color = null;
    },
  };

  global.Onboarding = Onboarding;
})(typeof window !== 'undefined' ? window : globalThis);
