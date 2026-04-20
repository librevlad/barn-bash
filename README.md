# Barn Bash

A 2D farmyard party-game prototype you play on the couch with a laptop
(the "host") and up to six friends joining from their phones. Nine
mini-games, 2-6 players, round twists, live scoreboard, emoji reactions,
and a full Jackbox-style auto-advance flow — nobody has to touch the
host keyboard once the first PLAY is pressed.

![Barn Bash title screen with a phone joined](screenshots/host-title.png)

## Run

```
node server.js
```

Then:
- Host TV: open `http://localhost:3000/` on the couch laptop.
- Phones: scan the QR in the top-left corner or visit
  `http://<your-lan-ip>:3000/controller/`.

React 18 + Babel are loaded in-browser via unpkg, so there is nothing
to build — just serve the static files.

## How it plays

1. Host loads the title screen; phones join the room by scanning the QR.
2. Each phone picks a critter from an emoji carousel and taps `LET'S GO!`.
3. Once everyone's in, the host auto-advances into Character Select →
   Minigame Board → one of eight mini-games → per-round Scoreboard →
   back to Board for the next round → final Podium.
4. Between rounds, phones tap `TAP WHEN READY`; the host advances the
   moment the last phone confirms. At the podium, phones tap
   `TAP FOR REMATCH` and a new game starts with the same lineup.
5. `TWEAKS` panel on the host lets you change difficulty, total rounds,
   palette, twist modifiers, and the total player count — phones fill
   the lineup first, CPU critters fill the rest up to the target, so
   any mix works: 6 phones + 0 CPU, 2 phones + 2 CPU, 1 solo + 3 CPU.

### Host TV — Minigame Board

Four players (one phone, three CPUs) line up at the top; the eight
mini-game tiles are the main event. Phones can vote by tapping a tile;
once every connected phone has voted, the host auto-picks the winner.
Round twists like "EVERYTHING IS 50% FASTER" shake up the rules.

![Minigame board with four players](screenshots/host-board.png)

### Phone controller — pick a critter

![Phone join screen with emoji carousel](screenshots/phone-join.png)

### Phone controller — lobby + board vote

Each phone sees a per-screen view driven by host broadcasts: a lobby
between screens, a `LET'S GO!` / `TAP WHEN READY` button whenever the
host is waiting on phone confirmation, and per-minigame input pads
(tap, steer, holes). A reaction bar floats emoji onto the host TV.

<p align="center">
  <img src="screenshots/phone-lobby.png" width="320" alt="Phone lobby with LET'S GO button">
  &nbsp;&nbsp;
  <img src="screenshots/phone-vote.png" width="320" alt="Phone board-vote screen">
</p>

## Layout

The host-side code is organised by domain. Nothing imports anything
(Babel-in-browser, no bundler), so every file attaches its exports to a
`window.BB` namespace or globals, and `index.html` loads the scripts in
dependency order. Adding a mini-game is a three-step recipe: create
`src/games/<id>/<Name>.jsx`, call `window.BB.games.register({...})` at
the bottom, drop a `<script>` tag into `index.html`. The SceneManager
+ Board tiles auto-pick it up; no switch statement anywhere needs to
change.

```
src/
  app.jsx                     — <200-line shell: tweaks state + reducer
                                + multiplayer bridge + <SceneManager/>
  characters.jsx              — SVG character art (Pig / Fox / Bear / …)
  multiplayer.jsx             — BB.mp: MultiplayerProvider + Context +
                                WebSocket host hook + QR overlay +
                                ReactionOverlay
  tweaks.jsx                  — in-page TWEAKS panel (difficulty, total
                                players, rounds, palette, twists)

  core/                       — pure game logic, no React
    screens.js                  BB.Screen enum (Title / CharacterSelect /
                                Board / Minigame / Scoreboard / Podium)
    gameReducer.js              BB.core.gameReducer + initialGameState;
                                all screen transitions live here
    lineup.js                   buildLineup(remote, tweaks) → players[]
    math.js                     randBetween, clamp, pick
    players.js                  playerLabel (phone-drop-aware)
    score.js                    rankByValue + buildRoundEndPayload +
                                buildGameOverPayload

  engine/
    SceneManager.jsx          — single switch on state.screen that
                                routes to screens/* and picks the
                                minigame component via the registry

  games/                      — one folder per mini-game, self-registering
    registry.js                 BB.games.{register,get,list}
    pig-sprint/PigSprint.jsx
    hay-panic/HayPanic.jsx      (+ HayBale svg helper)
    apple-aim/AppleAim.jsx
    whack-a-gopher/WhackAGopher.jsx  (+ GopherFace, BunnyFace)
    egg-pass/EggPass.jsx
    mud-dash/MudDash.jsx
    tug-o-war/TugOWar.jsx
    fishing-frenzy/FishingFrenzy.jsx (+ FishSVG)

  screens/                    — one host-TV view per file
    TitleScreen.jsx, CharacterSelect.jsx, BoardScreen.jsx,
    Scoreboard.jsx, Podium.jsx

  ui/
    widgets.jsx               — Clouds, Coin, Confetti, Sparkle,
                                WoodSign, Card, TitleWord, Btn,
                                SceneBG, Grass
    timing.jsx                — React hook destructure + useRaf +
                                useInterval
    Countdown.jsx             — shared 3-2-1 GO overlay

  config/
    twists.js                 — TWISTS array of round modifiers

client-controller/            — phone controller (index.html +
                                controller.jsx, one file, no build)
server.js                     — static file server + WebSocket relay
assets/bg.png                 — painted barnyard backdrop
```

## Architecture

### Server
`server.js` is a thin broker. It serves static files and relays
messages between the single host connection and N phone controllers.
Controllers get a stable integer `playerId` that survives reloads via
a `clientId` saved in their `localStorage`; slots flagged isCPU when
a phone drops flip back the moment it reconnects.

### Host state
A single `useReducer(gameReducer)` in `app.jsx` owns the `GameState`
(`screen`, `round`, `totalRounds`, `scores`, `players`, `coins`,
`modifier`, `difficulty`, `lastEarned`, `lastMinigame`, `currentGameId`).
Every transition is an action — `START_GAME`, `CONFIRM_CHARACTERS`,
`PICK_MINIGAME`, `FINISH_MINIGAME`, `QUIT_MINIGAME`, `CONTINUE_ROUND`,
`GO_TITLE`, `PHONE_PRESENCE_SYNC`. Side effects (broadcast to phones,
write to localStorage) live in `useEffect`s that watch the state.

### Mini-game registry
`src/games/registry.js` exposes `BB.games.{register, get, list}`.
Each mini-game file self-registers at load:
```js
BB.games.register({
  id: 'jump', name: 'Barn Jump',
  blurb: 'Wait for the signal, then tap first…',
  icon: '🐑', tint: '#6cc24a',
  phoneContract: 'tap', phonePrompt: 'TAP WHEN THE BARN TURNS GREEN!',
  component: BarnJump,
});
```
`BoardScreen` iterates `BB.games.list()` to render the tile grid, and
`SceneManager` picks `BB.games.get(state.currentGameId).component`
when `state.screen === Screen.Minigame`. No central switch.

The 9th mini-game, **Barn Jump**, was added post-refactor as a live
demo of the registry: one new folder under `src/games/barn-jump/`,
one `BB.games.register({…})` call, one `<script>` tag appended to
`index.html`, one new row in `client-controller/controller.jsx`'s
`BOARD_TILES` — no other file changed. The Board tile, the
SceneManager routing, the phone vote grid, and the Scoreboard recap
picked it up automatically.

![Barn Jump Scoreboard — the 9th game, added post-refactor, flows
end-to-end through the registry](screenshots/barn-jump-scoreboard.png)

### Multiplayer context
`BB.mp.MultiplayerProvider` wraps the App tree and exposes the
WebSocket API (`remotePlayers`, `broadcast*`, `onInput`, `send`) via
React Context. Consumers call `BB.mp.useMultiplayer()` — no more
`window.__BarnBashMPRT` globals, no prop drilling.

### Phone controller
`/controller/` renders per-minigame input contracts driven by host
broadcasts — tap pad, three-button steer pad, 3×2 holes grid,
board-vote grid, ready-ups, reactions, critter swap. Protocol (`join`,
`input`, `screen`, `minigameStart/End`, `scoreUpdate`, `turnUpdate`,
`roundEnd`, `gameOver`, `ready`) is unchanged through the refactor.

## History

This repository previously housed a live multiplayer Frantics stack
(Node WebSocket server, four per-game hosts, painted lobby / tournament
/ post-game heros). It was reset to the Barn Bash prototype on
2026-04-19. The prior state is preserved under the
`pre-reboot-2026-04-19` git tag; any commissioned art or design spec
can be recovered via `git show pre-reboot-2026-04-19:<path>` or
`git checkout pre-reboot-2026-04-19 -- <path>`.
