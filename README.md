# Barn Bash

A 2D farmyard party-game prototype. Title → character select → minigame
board → four mini-games (Pig Sprint, Hay Panic, Apple Aim, Whack-a-Gopher)
→ scoreboard → podium. Single-player vs CPU, 2-6 players, local-storage
backed tweaks panel (difficulty / player count / rounds / palette /
twists / your character).

Dropped from a claude.ai/design handoff bundle on 2026-04-19 and
promoted to the project root. React 18 + Babel loaded in-browser via
unpkg, so there's nothing to build — just serve the static files.

## Run

```
node server.js
```

Then open `http://localhost:3000/`.

## Layout

```
index.html         — root HTML, loads React + Babel + src/*.jsx
src/app.jsx        — top-level App, screen state, stage scaling,
                     palette tinting, tweaks panel host
src/characters.jsx — SVG character art (Pig / Fox / Bear / ...)
src/common.jsx     — shared widgets (Clouds, WoodSign, Coin,
                     Confetti, Sparkle, BackgroundPainting, ...)
src/screens.jsx    — TitleScreen / CharacterSelect / BoardScreen /
                     Scoreboard / Podium
src/minigames.jsx  — Pig Sprint, Hay Panic
src/minigames2.jsx — Apple Aim, Whack-a-Gopher
src/tweaks.jsx     — in-page tweaks panel
assets/bg.png      — painted barnyard scene (title + subtle
                     in-game watermark)
server.js          — 40-line static file server, Node stdlib only
```

## History

This repository previously housed a live multiplayer Frantics stack
(Node WebSocket server, 4 per-game hosts, mobile controller, painted
lobby / tournament / post-game heros). It was reset to the Barn Bash
prototype on 2026-04-19. The prior state is preserved under the
`pre-reboot-2026-04-19` git tag; any commissioned art or design spec
can be recovered via `git show pre-reboot-2026-04-19:<path>` or
`git checkout pre-reboot-2026-04-19 -- <path>`.
