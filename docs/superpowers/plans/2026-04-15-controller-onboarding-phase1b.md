# Controller Onboarding Phase 1b — Production Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the approved 5-screen carnival onboarding into `client-controller/` in production, and extend the server to honor preferred car color.

**Architecture:** Extract onboarding into a new self-contained ES module (`client-controller/onboarding.js`) with a clean `Onboarding.start({ onDone })` API. The module owns DOM, state machine, curtain transitions, and localStorage. `main.js` delegates to it on load, then connects the WS only after onboarding resolves. Server extends `COLORS` to 10 ID-addressable entries and `players.add()` accepts a `preferredColor` ID.

**Tech Stack:** Vanilla JS ES modules, Google Fonts (Alfa Slab One + Cutive + Inter), CSS custom properties, WebSocket (`ws` package already in use), `node --test` for server unit tests, Playwright MCP for visual verification.

**Source of truth:**
- Spec: `docs/superpowers/specs/2026-04-15-controller-onboarding-design.md`
- Prototype reference: `~/.gstack/projects/frantics/designs/controller-onboarding-20260415/finalized.html`
- Design tokens: `DESIGN.md` (repo root)

---

## File Structure

| File | Action | Notes |
|------|--------|-------|
| `server/players.js` | Modify | Extend COLORS to 10 ID-addressable entries; `add()` accepts `preferredColor` id; backward-compat hex field |
| `server/index.js:334-336` | Modify | `handleJoin` passes `msg.carColor` through to `players.add()` |
| `server/players.test.js` | Create | Node `node:test` unit tests for color assignment |
| `client-controller/onboarding.js` | Create | ES module: state machine, 5 screens, curtain, localStorage |
| `client-controller/onboarding.css` | Create | Design tokens + screen/component styles |
| `client-controller/index.html` | Modify | Remove inline onboarding overlay (lines 127-147), add `<link>` for fonts + onboarding.css, add `<div id="onboarding-root">`, keep gameplay elements intact |
| `client-controller/main.js` | Modify | Remove inline onboarding (~lines 47-127), delegate to `Onboarding.start()`, pass `carColor` in WS join msg |
| `client-shared/colors.js` | Create | Shared color ID ↔ hex mapping (consumed by controller and host code in Phase 2) |
| `DESIGN.md` | Already exists | Created in Phase 1a, no change |

---

## Task 1: Baseline + server color-ID mapping groundwork

**Files:**
- Create: `client-shared/colors.js`
- Read: `server/players.js`
- Read: `client-host/main.js`, `client-host-race/main.js` (verify how existing `color` hex is consumed)

- [ ] **Step 1: Verify clean baseline**

```bash
cd E:/frantics
git status
# Confirm: only pre-existing uncommitted changes (the .md spec and DESIGN.md,
# screenshots-qa/*.png, sprite*.png). Do NOT stash them.
# Note baseline files you'll touch — they must show as unchanged.
git diff --stat server/ client-controller/ client-host/
```

Expected: `server/index.js` already shows as M (pre-existing); `server/players.js`, `client-controller/*` should be untouched at this point.

- [ ] **Step 2: Audit how `color` hex is consumed by host code**

Run:

```bash
grep -rn "p\.color\|player\.color\|\.color" E:/frantics/client-host E:/frantics/client-host-race E:/frantics/client-host-escape E:/frantics/client-host-hill E:/frantics/client-host-meteor 2>/dev/null | grep -v node_modules | head -30
```

Document findings as inline comment in your task scratchpad:
- Host uses `.color` as CSS color string directly? → we must keep hex in `players.color`.
- Host uses `.color` as ID ('red' etc.)? → we can swap to ID strings.
- Mixed use? → add both `color` (hex, backward compat) and `colorId` (string).

For this plan we'll assume mixed-use and add both fields. Adjust if the audit finds differently.

- [ ] **Step 3: Create shared color mapping module**

Create `client-shared/colors.js`:

```js
// Shared between client-controller and client-host* — color IDs map to hex
// and to the car sprite filename. When added/removed, also update the
// sprite assets folder and server/players.js COLORS array.
(function (global) {
  const COLOR_IDS = [
    'red', 'blue', 'yellow', 'green', 'pink',
    'lightblue', 'purple', 'magenta', 'orange', 'greenalt',
  ];
  const COLOR_HEX = {
    red:       '#e74c3c',
    blue:      '#3498db',
    yellow:    '#f1c40f',
    green:     '#2ecc71',
    pink:      '#e84393',
    lightblue: '#5dc2e8',
    purple:    '#9b59b6',
    magenta:   '#d044a5',
    orange:    '#e67e22',
    greenalt:  '#2a7c33',
  };
  const COLOR_SPRITE = Object.fromEntries(
    COLOR_IDS.map(id => [id, '/assets/sprite-car-' + id + '.png'])
  );
  const COLOR_LABEL = {
    red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green',
    pink: 'Pink', lightblue: 'Light Blue', purple: 'Purple',
    magenta: 'Magenta', orange: 'Orange', greenalt: 'Dark Green',
  };
  const api = { COLOR_IDS, COLOR_HEX, COLOR_SPRITE, COLOR_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.FranticsColors = api;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Commit**

```bash
git add client-shared/colors.js
git commit -m "feat(colors): shared color-id/hex/sprite mapping for controller and hosts"
```

---

## Task 2: Server `players.add()` accepts preferred color

**Files:**
- Modify: `server/players.js`
- Create: `server/players.test.js`

- [ ] **Step 1: Write failing unit test**

Create `server/players.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const Players = require('./players.js');

function mockWS() { return { send: () => {} }; }

test('player.colorId is assigned from preferredColor when free', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat', 'red');
  assert.strictEqual(p.get(id).colorId, 'red');
  assert.strictEqual(p.get(id).color, '#e74c3c');
});

test('preferred color falls back to next free when taken', () => {
  const p = new Players();
  p.add(mockWS(), 'Alice', 'cat', 'red');
  const bobId = p.add(mockWS(), 'Bob', 'frog', 'red');
  // Bob requested red (taken) — gets a different free color
  assert.notStrictEqual(p.get(bobId).colorId, 'red');
  assert.ok(['blue','yellow','green','pink','lightblue','purple','magenta','orange','greenalt'].includes(p.get(bobId).colorId));
});

test('unknown preferredColor is ignored, falls back to next free', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat', 'not-a-color');
  assert.ok(['red','blue','yellow','green','pink','lightblue','purple','magenta','orange','greenalt'].includes(p.get(id).colorId));
});

test('missing preferredColor uses first free color', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat');
  assert.strictEqual(p.get(id).colorId, 'red'); // first in COLOR_IDS
});

test('11th player gets wrapped color (pool exhausted)', () => {
  const p = new Players();
  const ids = ['red','blue','yellow','green','pink','lightblue','purple','magenta','orange','greenalt'];
  for (const c of ids) p.add(mockWS(), 'player', 'cat', c);
  const id11 = p.add(mockWS(), 'overflow', 'cat');
  // 10 slots filled — 11th gets modulo assignment (any valid colorId)
  assert.ok(ids.includes(p.get(id11).colorId));
});

test('backward-compat: .color still returns hex string', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat', 'blue');
  assert.strictEqual(p.get(id).color, '#3498db');
  assert.strictEqual(typeof p.get(id).color, 'string');
  assert.ok(p.get(id).color.startsWith('#'));
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd E:/frantics
node --test server/players.test.js
```

Expected output includes failures because `add()` doesn't take `preferredColor` and `colorId` doesn't exist yet.

- [ ] **Step 3: Implement changes in `server/players.js`**

Replace the top of the file (lines 1-23) with:

```js
const COLOR_IDS = [
  'red', 'blue', 'yellow', 'green', 'pink',
  'lightblue', 'purple', 'magenta', 'orange', 'greenalt',
];
const COLOR_HEX = {
  red:       '#e74c3c',
  blue:      '#3498db',
  yellow:    '#f1c40f',
  green:     '#2ecc71',
  pink:      '#e84393',
  lightblue: '#5dc2e8',
  purple:    '#9b59b6',
  magenta:   '#d044a5',
  orange:    '#e67e22',
  greenalt:  '#2a7c33',
};
const VALID_CHARACTERS = ['cat', 'frog', 'wolf', 'bear', 'bunny', 'pig', 'chicken', 'raccoon'];

class Players {
  constructor() {
    this.map = {};
    this.nextId = 1;
  }

  add(ws, name, character, preferredColor) {
    const id = this.nextId++;
    const safeName = (name || '').slice(0, 16).replace(/[<>&"]/g, '') || ('Player ' + id);
    const safeChar = VALID_CHARACTERS.includes(character) ? character : null;
    const taken = new Set(this.all().filter(p => p.connected).map(p => p.colorId));
    let colorId;
    if (preferredColor && COLOR_IDS.includes(preferredColor) && !taken.has(preferredColor)) {
      colorId = preferredColor;
    } else {
      colorId = COLOR_IDS.find(c => !taken.has(c)) || COLOR_IDS[(id - 1) % COLOR_IDS.length];
    }
    this.map[id] = {
      id, ws, connected: true,
      name: safeName,
      colorId,
      color: COLOR_HEX[colorId],
      character: safeChar,
      score: 0, reacted: false, correct: null,
      gameData: {}
    };
    return id;
  }
  // ... rest unchanged (setName, selectCharacter, remove, get, all, connected, connectedCount, resetScores, resetReacted, resetGameData, toJSON)
}

module.exports = Players;
module.exports.COLOR_IDS = COLOR_IDS;
module.exports.COLOR_HEX = COLOR_HEX;
```

Also update `toJSON()` at the bottom of the class to include `colorId`:

```js
toJSON() {
  const out = {};
  for (const p of this.all()) {
    out[p.id] = {
      connected: p.connected,
      color: p.color,
      colorId: p.colorId,
      score: p.score,
      reacted: p.reacted,
      correct: p.correct
    };
  }
  return out;
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
node --test server/players.test.js
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/players.js server/players.test.js
git commit -m "feat(server): players.add accepts preferredColor, colorId field added

Extends COLORS to 10 id-addressable entries. Backward-compat: .color still
returns hex string consumed by host canvas rendering. Adds unit tests for
race conditions, overflow, and unknown-color fallback."
```

---

## Task 3: Server `handleJoin` passes carColor through

**Files:**
- Modify: `server/index.js:334-342`

- [ ] **Step 1: Read existing handleJoin block**

```bash
sed -n '330,360p' E:/frantics/server/index.js
```

Confirm structure: `case 'join': playerId = players.add(ws, msg.name, msg.character); ...`

- [ ] **Step 2: Modify `handleJoin`**

Change line 335 from:

```js
playerId = players.add(ws, msg.name, msg.character);
```

to:

```js
playerId = players.add(ws, msg.name, msg.character, msg.carColor);
```

Also update the `init` message sent to the joining client (around line 337) to include `colorId`:

```js
const p = players.get(playerId);
ws.send(JSON.stringify({
  type: 'init',
  playerId,
  color: p.color,
  colorId: p.colorId,
  name: p.name,
  character: p.character
}));
```

And `player_joined` broadcast (around line 342) to include `colorId`:

```js
broadcast({
  type: 'player_joined',
  playerId,
  name: p.name,
  character: p.character,
  color: p.color,
  colorId: p.colorId
});
```

- [ ] **Step 3: Smoke-test manually**

```bash
cd E:/frantics
node server/index.js &
SERVER_PID=$!
sleep 1
# Simulate a join message with preferred color
node -e "
const WS = require('ws');
const ws = new WS('ws://localhost:3000');
ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'join', name: 'Test', character: 'wolf', carColor: 'red' }));
});
ws.on('message', (msg) => {
  const data = JSON.parse(msg);
  if (data.type === 'init') {
    console.log('INIT:', data);
    if (data.colorId === 'red' && data.color === '#e74c3c') {
      console.log('PASS');
    } else {
      console.log('FAIL');
    }
    process.exit(0);
  }
});
"
kill $SERVER_PID 2>/dev/null
```

Expected: logs `INIT: { ... colorId: 'red', color: '#e74c3c' ... }` and `PASS`.

Note: port number may differ — check `server/index.js` for the actual listen port before running this step.

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(server): honor msg.carColor in handleJoin, include colorId in init/player_joined"
```

---

## Task 4: Create `client-controller/onboarding.css`

**Files:**
- Create: `client-controller/onboarding.css`

- [ ] **Step 1: Create the CSS file**

Copy the full stylesheet from the approved prototype at
`~/.gstack/projects/frantics/designs/controller-onboarding-20260415/finalized.html`
(lines 8-500 — everything inside the `<style>` tag, minus the `#proto-controls`
block and the `#toast` block which are application-level).

Create `client-controller/onboarding.css` with all the sections:
- `:root` design tokens (from DESIGN.md)
- Reset + base (scoped to onboarding with `.onboarding-root` class)
- Screen container `.screen`
- Progress dots `.progress`, `.progress-dot`
- Back link `.back-link`
- Typography `.prompt`, `.headline`, `.quip`
- Ticket button `.ticket-btn`, `.ticket-btn-large`
- Intro bulbs + title
- Name form + input
- Animal medallion grid
- Color tile grid
- Waiting player-card + ribbon + contestant pills
- Quick-confirm card
- Curtain transition (top/bottom panels + title card)
- Toast banner
- Landscape rotate-gate
- Reduced-motion overrides
- Responsive media queries (`max-width: 360px`)

Important deviations from the prototype:
1. Scope root styles: the prototype used `body` for background and reset. In the module, wrap in `.onboarding-root { ... }` so it does not leak into gameplay CSS.
2. Remove `#proto-controls` and any demo-only classes.
3. Keep `font-family` variables pointing at Google Fonts names; vendor fallback in Task 7.

- [ ] **Step 2: Visual diff check**

```bash
cd E:/frantics/client-controller
wc -l onboarding.css  # Expected: ~420-450 lines
```

- [ ] **Step 3: Commit**

```bash
git add client-controller/onboarding.css
git commit -m "feat(controller): onboarding.css with carnival theme tokens"
```

---

## Task 5: Create `client-controller/onboarding.js` — module skeleton

**Files:**
- Create: `client-controller/onboarding.js`

- [ ] **Step 1: Create the module skeleton**

Create `client-controller/onboarding.js`:

```js
// Controller onboarding module — Phase 1b.
// Public API:
//   Onboarding.start({ onDone: ({ name, character, carColor }) => void, root?: HTMLElement })
//
// The module mounts itself into `root` (default: document.body, inside a new
// `.onboarding-root` div), runs through intro → name → animal → color → waiting
// or intro → quick-confirm → waiting, then resolves `onDone` with the player's
// choices. It does not open a WebSocket — that's the caller's job. The caller
// passes `{ carColor }` to the server on join; the `init` reply's actual
// `colorId` may differ (race condition), and the caller notifies this module
// via `Onboarding.onServerAssignedColor(colorId)` to update the displayed car
// and optionally show a toast.
(function (global) {
  'use strict';

  const { COLOR_IDS, COLOR_HEX, COLOR_SPRITE, COLOR_LABEL } = global.FranticsColors;

  const ANIMALS = [
    { id: 'cat',     name: 'Cat',     trait: 'Agile',     emoji: '🐱' },
    { id: 'frog',    name: 'Frog',    trait: 'Bouncy',    emoji: '🐸' },
    { id: 'wolf',    name: 'Wolf',    trait: 'Powerful',  emoji: '🐺' },
    { id: 'bear',    name: 'Bear',    trait: 'Tank',      emoji: '🐻' },
    { id: 'bunny',   name: 'Bunny',   trait: 'Speedy',    emoji: '🐰' },
    { id: 'pig',     name: 'Pig',     trait: 'Endurance', emoji: '🐷' },
    { id: 'chicken', name: 'Chicken', trait: 'Chaotic',   emoji: '🐔' },
    { id: 'raccoon', name: 'Raccoon', trait: 'Trickster', emoji: '🦝' },
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
    'intro_to_name':          'FIRST — WHO ARE YOU?',
    'name_to_animal':         'NOW — CHOOSE YOUR FIGHTER!',
    'animal_to_color':        'AND FINALLY — YOUR CHARIOT!',
    'color_to_waiting':       'THE SHOW BEGINS!',
    'waiting_to_gameplay':    'LET THE GAMES BEGIN!',
    'intro_to_quick-confirm': 'WELCOME BACK, CONTESTANT.',
    'quick-confirm_to_waiting':'STRAIGHT TO THE SHOW!',
  };
  const LS_KEY = 'frantics_player';
  const CURTAIN_MS = 700;
  const REDUCED_CURTAIN_MS = 150;

  const state = {
    screen: null,
    name: '',
    animal: null,
    color: null,
    transitioning: false,
    onDone: null,
    root: null,
  };

  // Persistence
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

  // Rendering API (implemented in following tasks)
  function render() { /* fills state.root with .onboarding-root */ }
  function show(screenId) { /* shows one screen, hides others */ }
  async function curtainTo(nextScreen, key) { /* 700ms red velvet transition */ }
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Public API
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
      updateWaitingCard();
      showToast(oldLabel + ' was taken — you got ' + (COLOR_LABEL[colorId] || colorId) + ' instead.');
    },
    onPlayerJoined(player) {
      addContestantPill(player);
    },
    onPlayerLeft(playerId) {
      removeContestantPill(playerId);
    },
    reset() {
      clearSaved();
      state.name = ''; state.animal = null; state.color = null;
    },
  };

  function bootstrap() {
    const saved = loadSaved();
    const forceFresh = new URLSearchParams(location.search).has('fresh');
    if (saved && !forceFresh) {
      state.name = saved.name;
      state.animal = saved.character;
      state.color = saved.carColor;
      show('intro');
      setTimeout(() => curtainTo('quick-confirm', 'intro_to_quick-confirm'), 1200);
    } else {
      show('intro');
      setTimeout(() => curtainTo('name', 'intro_to_name'), 1200);
    }
  }

  // Placeholders filled in later tasks
  function updateWaitingCard() { /* Task 11 */ }
  function showToast(msg) { /* Task 13 */ }
  function addContestantPill(player) { /* Task 11 */ }
  function removeContestantPill(playerId) { /* Task 11 */ }

  global.Onboarding = Onboarding;
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 2: Syntax check**

```bash
node --check E:/frantics/client-controller/onboarding.js
```

Expected: no output (syntax valid).

- [ ] **Step 3: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): onboarding module skeleton with public API"
```

---

## Task 6: `render()` — mount DOM structure

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Implement `render()`**

Replace the placeholder `function render() {}` with the full DOM mount. The
HTML structure is copied from the prototype body (minus `#proto-controls`):

```js
function render() {
  const host = document.createElement('div');
  host.className = 'onboarding-root';
  host.innerHTML = `
    <div id="ob-rotate-gate">
      <div class="icon">📱</div>
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
        <button class="back-link" data-back>← BACK</button>
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
        <button class="back-link" data-back>← BACK</button>
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
        <button class="waiting-settings" id="ob-btn-settings" title="Leave the show">⚙</button>
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
}
```

Update `show()`:

```js
function show(screenId) {
  state.host.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = state.host.querySelector('#ob-screen-' + screenId);
  if (!el) return;
  el.classList.add('active');
  state.screen = screenId;
}
```

- [ ] **Step 2: Manual smoke test**

Create a tmp HTML file `client-controller/test-onboarding.html`:

```html
<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="onboarding.css">
  <link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Cutive&family=Inter:wght@400;600&display=swap" rel="stylesheet">
</head><body>
  <script src="../client-shared/colors.js"></script>
  <script src="onboarding.js"></script>
  <script>Onboarding.start({ onDone: (p) => console.log('DONE:', p) });</script>
</body></html>
```

Start a local server from `E:/frantics`:

```bash
cd E:/frantics
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((req,res)=>{const fp=path.join(__dirname,req.url);try{const d=f.readFileSync(fp);const ext=path.extname(fp);const t={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png'}[ext]||'text/plain';res.writeHead(200,{'Content-Type':t});res.end(d);}catch{res.writeHead(404);res.end();}}).listen(8746,()=>console.log('http://localhost:8746'));"
```

Open `http://localhost:8746/client-controller/test-onboarding.html` in Playwright
at 390×844. Expected: intro splash shows `FRANTICS!` on dark wood bg with 5
glowing bulbs. After 1.2s, curtain plays (not yet implemented — will be broken
until Task 8), screen switches to name.

Take screenshot: `E:/frantics/screenshots-human/onboarding-intro-smoke.png`.

- [ ] **Step 3: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): onboarding render() mounts DOM structure"
```

---

## Task 7: Google Fonts (with vendor fallback)

**Files:**
- Modify: `client-controller/index.html`

- [ ] **Step 1: Add font links to `<head>`**

Open `client-controller/index.html`. Add inside `<head>`, before the `<style>` block:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Cutive&family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

Note: vendor fallback (`.woff2` local) is marked as "Phase 1d" polish, not in
this plan.

- [ ] **Step 2: Commit**

```bash
git add client-controller/index.html
git commit -m "feat(controller): preconnect + Google Fonts for Alfa Slab, Cutive, Inter"
```

---

## Task 8: Curtain transition

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Implement `curtainTo()`**

Replace the `async function curtainTo(nextScreen, key) { /* ... */ }` placeholder:

```js
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
```

- [ ] **Step 2: Visual verification**

Reload `http://localhost:8746/client-controller/test-onboarding.html` at 390×844.
Take screenshot at t=0 (intro), t=1300ms (mid-curtain), t=2200ms (after curtain).

Files:
- `E:/frantics/screenshots-human/onboarding-curtain-0.png`
- `E:/frantics/screenshots-human/onboarding-curtain-mid.png`
- `E:/frantics/screenshots-human/onboarding-curtain-end.png`

Expected: dark wood bg → red velvet curtain closed with "FIRST — WHO ARE YOU?" in gold → name screen with progress dot 1/3 filled.

- [ ] **Step 3: Verify reduced-motion path**

Toggle OS-level prefers-reduced-motion (or use DevTools emulation). Reload. Expected: no curtain slide; brief fade with title card for 250ms; then next screen.

- [ ] **Step 4: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): curtain transition with reduced-motion fallback"
```

---

## Task 9: Name screen interactions

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Wire up name screen**

Add at bottom of the IIFE, after `bootstrap()`:

```js
function initNameScreen() {
  const input = state.host.querySelector('#ob-name-input');
  const btn = state.host.querySelector('#ob-btn-name-next');
  const quip = state.host.querySelector('#ob-name-quip');
  quip.textContent = NAME_QUIPS[Math.floor(Math.random() * NAME_QUIPS.length)];
  if (state.name) input.value = state.name;
  input.value && (btn.disabled = false);

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
}
```

Call `initNameScreen()` inside `render()` after `state.root.appendChild(host)`.

- [ ] **Step 2: Visual test**

Reload smoke-test page. Skip intro, verify name screen:
- Disabled NEXT initially.
- Type "Vladimir". NEXT becomes gold+active.
- Press Enter → curtain plays → arrives at animal screen (grid still empty — next task).

Screenshot `E:/frantics/screenshots-human/onboarding-name-filled.png`.

- [ ] **Step 3: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): name screen interactions + validation + shake"
```

---

## Task 10: Animal screen interactions

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Wire up animal screen**

Add after `initNameScreen`:

```js
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

  return { renderGrid };
}
const animalScreen = initAnimalScreen();
```

Call `animalScreen.renderGrid()` right before each `curtainTo('animal', ...)` call (or in a `show(screenId)` hook when `screenId === 'animal'`).

Cleaner: extend `show()` to trigger screen-specific init:

```js
function show(screenId) {
  state.host.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = state.host.querySelector('#ob-screen-' + screenId);
  if (!el) return;
  el.classList.add('active');
  state.screen = screenId;
  if (screenId === 'animal') animalScreen.renderGrid();
  if (screenId === 'color')  colorScreen.renderGrid();
  if (screenId === 'waiting') waitingScreen.refresh();
}
```

(Add `colorScreen` and `waitingScreen` references — they're defined in later tasks.)

- [ ] **Step 2: Visual test**

Reload. Advance to animal screen. Verify:
- 8 medallions render with emoji + name + trait.
- Click Wolf → gold glow + stars orbit + quip appears.
- CONFIRM becomes active.
- Click CONFIRM → curtain plays → color screen.

Screenshot `E:/frantics/screenshots-human/onboarding-animal-selected.png`.

- [ ] **Step 3: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): animal screen with 8 medallions + selection feedback"
```

---

## Task 11: Color screen interactions

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Wire up color screen**

Add:

```js
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
    // Caller (main.js) will trigger connectWS on 'color_to_waiting' curtain completion
    state.onDone?.({ name: state.name, character: state.animal, carColor: state.color });
  });

  return { renderGrid };
}
const colorScreen = initColorScreen();
```

- [ ] **Step 2: Visual test**

Advance to color screen. Verify:
- 10 car sprites render in 5×2 grid.
- Click red car → gold border + lightbulb.
- Color name "RED" appears below.
- STEP RIGHT UP! becomes active.
- Click → curtain → waiting screen.
- `state.onDone` callback fired with `{ name: 'Vladimir', character: 'wolf', carColor: 'red' }` (check `console.log`).

Screenshot `E:/frantics/screenshots-human/onboarding-color-selected.png`.

- [ ] **Step 3: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): color screen with 10 car sprites + onDone callback"
```

---

## Task 12: Waiting screen + contestants + quick-confirm + back navigation

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Wire up waiting screen**

Add:

```js
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
    descEl.textContent = (a?.name || '?').toLowerCase() + ' · ' + ((state.color && COLOR_LABEL[state.color]) || '?').toLowerCase();
  }

  settings.addEventListener('click', () => {
    if (confirm('Leave the show?')) {
      clearSaved();
      state.name = ''; state.animal = null; state.color = null;
      location.reload();
    }
  });

  function addPill(player) {
    const existing = contestants.querySelector('[data-pid="' + player.playerId + '"]');
    if (existing) return;
    const pill = document.createElement('div');
    pill.className = 'contestant-pill';
    pill.dataset.pid = player.playerId;
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
  function escapeHTML(s) {
    return String(s).replace(/[<>&"']/g, ch => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[ch]));
  }

  return { refresh, addPill, removePill };
}
const waitingScreen = initWaitingScreen();

// Hook into the module API
function updateWaitingCard() { waitingScreen.refresh(); }
function addContestantPill(p) { waitingScreen.addPill(p); }
function removeContestantPill(id) { waitingScreen.removePill(id); }
```

- [ ] **Step 2: Wire up quick-confirm screen**

Add:

```js
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

  return { refresh };
}
const quickConfirmScreen = initQuickConfirm();

// Extend show() one more time
const origShow = show;
show = function (screenId) {
  origShow(screenId);
  if (screenId === 'quick-confirm') quickConfirmScreen.refresh();
};
```

(Alternative cleaner: add all `refresh()` calls directly inside a single `show()` switch earlier. Pick one approach and stick to it — the above re-binding is shown for clarity.)

- [ ] **Step 3: Wire back button**

Add at bottom of module:

```js
state.host.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    const prev = state.screen === 'animal' ? 'name'
              : state.screen === 'color'  ? 'animal'
              : null;
    if (prev) show(prev);
  });
});
```

- [ ] **Step 4: Visual test**

Walk through complete happy path:
- Intro → name → animal → color → waiting. Verify card shows correct animal+car+name.
- Refresh with `?fresh=1` removed → quick-confirm appears with saved data.
- Click "or change my getup" → returns to name with cleared state.
- BACK button on animal and color screens works.

Screenshots:
- `E:/frantics/screenshots-human/onboarding-waiting-card.png`
- `E:/frantics/screenshots-human/onboarding-quick-confirm.png`

- [ ] **Step 5: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): waiting screen + quick-confirm + back navigation"
```

---

## Task 13: Toast + landscape gate

**Files:**
- Modify: `client-controller/onboarding.js`

- [ ] **Step 1: Implement toast**

Replace placeholder `function showToast(msg) {}`:

```js
let toastTimer = null;
function showToast(msg) {
  const el = state.host.querySelector('#ob-toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}
```

- [ ] **Step 2: Landscape gate is already in CSS**

The `#ob-rotate-gate` div is mounted in `render()` and the CSS rule
`@media (orientation: landscape) and (max-height: 500px) { display: flex }`
handles auto-showing. Verify nothing else needed.

- [ ] **Step 3: Test color-race toast**

Temporarily add at end of module bootstrap for testing:

```js
// TEMPORARY — remove before commit
setTimeout(() => Onboarding.onServerAssignedColor('blue'), 3000);
```

Run flow: pick red, get to waiting, 3s later `onServerAssignedColor('blue')` fires → toast appears with "Red was taken — you got Blue instead." → car image updates to blue car.

Verify visually, then REMOVE the temporary line.

- [ ] **Step 4: Commit**

```bash
git add client-controller/onboarding.js
git commit -m "feat(controller): toast + landscape rotate gate"
```

---

## Task 14: `client-controller/index.html` cleanup

**Files:**
- Modify: `client-controller/index.html`

- [ ] **Step 1: Remove inline onboarding overlay**

Open `client-controller/index.html`. Delete the entire `#onboarding` div
(currently lines 127-147, containing the name input and character selection).

Also remove any onboarding-specific CSS inside the existing `<style>` tag
(leave the gameplay CSS: `#score`, `#result`, `#dpad`, `#swipe-arrow` etc.).

- [ ] **Step 2: Add onboarding.css and colors.js + onboarding.js**

Before the gameplay `<script>` tags at bottom, add:

```html
<link rel="stylesheet" href="onboarding.css">
<script src="/shared/colors.js"></script>
<script src="onboarding.js"></script>
```

Also update the existing script for shared path (colors.js lives at `client-shared/colors.js` — server must expose it at `/shared/` or whichever path is used by `/shared/sound.js`).

- [ ] **Step 3: Verify server serves the new static files**

Read `server/index.js` `serveStatic` logic. Confirm `/shared/` resolves to `client-shared/`. If not, adjust either the script path or the server route.

- [ ] **Step 4: Commit**

```bash
git add client-controller/index.html
git commit -m "feat(controller): remove inline onboarding, load onboarding.js/css"
```

---

## Task 15: `client-controller/main.js` — delegate to Onboarding

**Files:**
- Modify: `client-controller/main.js`

- [ ] **Step 1: Remove inline onboarding logic**

Delete lines 47-127 (the entire "ONBOARDING" block including character building, quick-join, name submit, and `finishOnboarding`). Keep the DOM query lines 1-15 for gameplay elements.

- [ ] **Step 2: Replace with Onboarding.start delegation**

After the gameplay DOM queries and before `connectWS`, insert:

```js
let myName = null;
let selectedChar = null;
let selectedColor = null;

Onboarding.start({
  onDone: ({ name, character, carColor }) => {
    myName = name;
    selectedChar = character;
    selectedColor = carColor;
    connectWS();
  },
});

function connectWS() {
  ws = new WebSocket('ws://' + location.host);
  ws.onopen = () => ws.send(JSON.stringify({
    type: 'join',
    name: myName,
    character: selectedChar,
    carColor: selectedColor,
  }));
  ws.onmessage = onMessage;
  ws.onclose = () => {
    // existing close handler unchanged
  };
}
```

- [ ] **Step 3: Forward player_joined/left events to Onboarding**

In the existing `onMessage` handler, find the `player_joined` / `player_left` cases and add calls:

```js
case 'player_joined':
  if (state.phase === 'lobby') {
    Onboarding.onPlayerJoined(msg);
  }
  // ... existing gameplay handling
  break;
case 'player_left':
  if (state.phase === 'lobby') {
    Onboarding.onPlayerLeft(msg.playerId);
  }
  // ... existing gameplay handling
  break;
```

In the `init` case, after reading `msg.colorId`:

```js
case 'init':
  playerId = msg.playerId;
  myColor = msg.color;
  if (msg.colorId && msg.colorId !== selectedColor) {
    Onboarding.onServerAssignedColor(msg.colorId);
    selectedColor = msg.colorId;
  }
  break;
```

- [ ] **Step 4: WS retry with exponential backoff**

Replace the simple `connectWS` from Step 2 with a retry-aware version:

```js
let wsRetryCount = 0;
const WS_RETRY_DELAYS = [1000, 2000, 4000]; // 3 retries: 1s, 2s, 4s

function connectWS() {
  ws = new WebSocket('ws://' + location.host);
  ws.onopen = () => {
    wsRetryCount = 0;
    ws.send(JSON.stringify({
      type: 'join',
      name: myName,
      character: selectedChar,
      carColor: selectedColor,
    }));
  };
  ws.onmessage = onMessage;
  ws.onclose = () => {
    if (wsRetryCount < WS_RETRY_DELAYS.length) {
      const delay = WS_RETRY_DELAYS[wsRetryCount++];
      setTimeout(connectWS, delay);
    } else {
      // Final failure — show error screen or fall back to existing disconnect UI
      showDisconnectScreen();
    }
  };
  ws.onerror = () => { /* allow onclose to handle retry */ };
}

function showDisconnectScreen() {
  // Reuse existing disconnect UI from main.js (info/status/score handler), or
  // if inside onboarding (lobby phase), delegate to Onboarding — TBD which.
  // For Phase 1b: simple alert and reload button.
  if (confirm("Can't reach the show. Retry?")) {
    wsRetryCount = 0;
    connectWS();
  }
}
```

- [ ] **Step 5: Manual end-to-end smoke test**

```bash
cd E:/frantics
npm start &
SERVER_PID=$!
sleep 1
```

Open two browser tabs pointing to `http://localhost:3000/controller/` (or whatever port).
- Tab 1: run onboarding with name=Alice, animal=cat, color=red.
- Tab 2: run onboarding with name=Bob, animal=frog, color=red.
- Expected: Tab 1 shows red car, Tab 2 toast "Red was taken — you got blue instead." and car updates to blue. Both tabs see each other in contestants list.

```bash
kill $SERVER_PID 2>/dev/null
```

- [ ] **Step 6: Test retry path**

Start server, open controller, stop server, observe client retries with 1s/2s/4s gaps. Then restart server → client reconnects. Finally stop server permanently → confirm error screen after 3 retries.

- [ ] **Step 7: Commit**

```bash
git add client-controller/main.js
git commit -m "feat(controller): delegate onboarding to module, pass carColor to server, forward player events, WS retry with backoff"
```

---

## Task 16: Cross-viewport visual verification

**Files:** None modified — verification only

- [ ] **Step 1: Browse capture**

Start the server, open Playwright or the `browse` binary. For each combination below, navigate through onboarding and capture waiting screen (most complex):

- iPhone SE 320×568
- iPhone 14 390×844
- iPhone Pro Max 430×932

Save to `E:/frantics/screenshots-qa/`:
- `phase1b-se-waiting.png`
- `phase1b-std-waiting.png`
- `phase1b-max-waiting.png`

Plus animal and color at 320×568 (densest layouts):
- `phase1b-se-animal.png`
- `phase1b-se-color.png`

- [ ] **Step 2: Compare against approved prototype**

Diff against the prototype shots in
`~/.gstack/projects/frantics/designs/controller-onboarding-20260415/`.
Pixel-match is not required; structural + color fidelity is.

If differences found, fix in CSS/JS and re-capture. Record any intentional
deviations in a `MIGRATION_NOTES.md` inline comment at the top of `onboarding.js`.

- [ ] **Step 3: Test reduced-motion**

DevTools emulation → prefers-reduced-motion: reduce. Re-run onboarding. Confirm:
- No curtain slide, just a 150ms fade.
- Breathing/pulse animations disabled.
- Title card still appears briefly between screens.

Screenshot `E:/frantics/screenshots-qa/phase1b-reduced-motion.png`.

- [ ] **Step 4: Test landscape gate**

Rotate emulator / resize to `height < 500` and landscape. Confirm the "PLEASE ROTATE" overlay appears and blocks interaction.

Screenshot `E:/frantics/screenshots-qa/phase1b-landscape-gate.png`.

- [ ] **Step 5: Commit screenshots**

```bash
git add screenshots-qa/phase1b-*.png
git commit -m "chore(qa): Phase 1b visual verification across 3 viewports + motion + landscape"
```

---

## Task 17: Cleanup + docs

**Files:**
- Delete: `client-controller/test-onboarding.html` (if created in Task 6)
- Possibly update: `CLAUDE.md` (doesn't exist — skip if not present)

- [ ] **Step 1: Delete smoke-test file**

```bash
rm -f E:/frantics/client-controller/test-onboarding.html
```

- [ ] **Step 2: Sanity check**

```bash
cd E:/frantics
git status
git log --oneline -15
```

Expected commits (reverse chronological):
```
feat(qa): Phase 1b visual verification...
feat(controller): delegate onboarding to module...
feat(controller): remove inline onboarding...
feat(controller): toast + landscape rotate gate
feat(controller): waiting screen + quick-confirm + back navigation
feat(controller): color screen with 10 car sprites + onDone callback
feat(controller): animal screen with 8 medallions + selection feedback
feat(controller): name screen interactions + validation + shake
feat(controller): curtain transition with reduced-motion fallback
feat(controller): preconnect + Google Fonts for Alfa Slab, Cutive, Inter
feat(controller): onboarding render() mounts DOM structure
feat(controller): onboarding module skeleton with public API
feat(controller): onboarding.css with carnival theme tokens
feat(server): honor msg.carColor in handleJoin, include colorId in init/player_joined
feat(server): players.add accepts preferredColor, colorId field added
feat(colors): shared color-id/hex/sprite mapping for controller and hosts
```

- [ ] **Step 3: Final commit (if any pending)**

```bash
git add -A
git status  # verify clean
```

If anything pending: commit with descriptive message. Otherwise: done.

---

## Non-goals for this plan

Explicitly NOT covered here (separate specs/plans):
- Vendor `.woff2` font files for offline use (Phase 1d polish).
- 8 pixel-art animal sprites (Phase 1c art task — emoji placeholder remains).
- Gameplay controller screens (Phase 2 spec).
- Game-specific controller UI (Phase 3 spec).
- Host-side color updates beyond backward-compat hex (covered only by keeping `color` hex in init/broadcast).
- End-to-end automated integration tests with a real WS server (Phase 1e if deemed necessary — manual E2E suffices for Phase 1b).

---

## Risk checklist

- [ ] Host canvas code uses `player.color` as hex string — verified in Task 1 audit. If host uses `colorId`, adjust Task 2 to not keep `color` backward-compat.
- [ ] 8-color → 10-color extension affects existing game rendering. Verify by running each game mode after Task 2 and before Task 15.
- [ ] Google Fonts may be slow on cold cache; `display=swap` mitigates. If it's a severe regression for the e2e experience, escalate to Phase 1d (local vendor).
- [ ] `navigator.vibrate` is flaky on iOS Safari — optional chaining handles it silently.
- [ ] On hard-refresh during curtain transition, the DOM may be in an odd state — test by pressing F5 mid-curtain.
