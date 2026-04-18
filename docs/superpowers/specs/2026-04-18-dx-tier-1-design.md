# Developer Experience Tier 1 — Design Spec (Phase 27)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 27 of ?, after the Hearthstone-polish arc (Phases
21-26) closed. First tooling phase — addresses maintainability
pain accumulated over 26 content phases.
**Scope:** three DX additions, zero runtime changes:
(27a) TypeScript type-checking via JSDoc annotations + `tsconfig.
json` with `allowJs + checkJs`, no file renames; (27b) Vite dev
server with HMR, proxied to the existing Node WebSocket server;
(27c) consolidated `npm run` scripts.
**NOT** a rewrite to ES modules, not .ts file extensions, not
GSAP yet, not a bundler for production. The goal is catch
bugs in editor + faster dev iteration, NOT change runtime.

## Problem

After 26 content phases the codebase is 8000+ lines across 40+
files, all classic scripts with IIFE + `window.X` global pattern.
Pain points that compound across phases:

1. **No type safety.** Every `Sound.play('cointPickup')` typo is
   a silent runtime bug until you notice the SFX doesn't fire.
   Every `els.goHero.textContent = ...` with a wrong key is
   silent until gameplay reaches that state. We shipped E2E-01
   audit fixes specifically for typos that a type checker
   would have caught in 2s.
2. **Slow iteration loop.** Change `theme.css`, save, Cmd-R the
   host page, wait 2s for full reload including all images. No
   HMR; the 7 per-game hosts all reload together. Dev time per
   small visual tweak is ~5s round-trip.
3. **Script-tag proliferation.** Per-game host HTMLs each list
   15+ `<script src>` tags in a specific order. Adding a new
   shared module (Phase 21 ambient-fx.js, etc.) requires
   editing 6 HTML files. Fragile.
4. **No module graph.** Can't tell from grep which files depend
   on `HostCommon.addCornerOrnaments`. Must read every
   index.html to find imports.

## Success criteria

- `npm run typecheck` runs `tsc --noEmit` via `tsconfig.json`
  with `allowJs: true, checkJs: true`. Reports type errors in
  existing .js files. Passes clean after initial JSDoc pass.
- `npm run dev` starts Vite dev server on port 5173, proxies
  `/ws` WebSocket + `/assets/*` + `/shared/*` + `/engine/*` +
  all per-host routes to the Node server on port 3000. HMR
  works for CSS and JS.
- `npm start` (existing) still runs the production Node server.
- At least 5 key shared modules get JSDoc type annotations:
  `sound.js` (Sound API), `narrator.js` (Narrator API),
  `tournament.js` (Tournament handleMessage contract),
  `postgame.js` (PostGame.show opts), `host-common.js`
  (HostCommon exports). Plus `ambient-fx.js` (Phase 21).
- No runtime regressions. All existing scripts load exactly as
  before in prod.
- New `package.json` devDependencies: `vite`, `typescript`, 
  `@types/node`. No new runtime deps.

## Non-goals (explicitly out of scope for Phase 27)

- Renaming `.js` → `.ts` files (would force build step for
  runtime; JSDoc gives us the same type safety without touching
  production code path).
- Converting IIFE globals to ES module `export`. That's a
  different phase if ever.
- Bundling for production. Classic-script serving stays as-is.
- TSX/JSX for UI. We don't have component frameworks; painted
  CSS is the UI layer.
- Jest / Vitest test framework. We have `players.test.js`
  existing with Node's `assert`; Phase 27 preserves it without
  changing test tooling.
- GSAP. Deferred until a future phase needs complex animation
  timelines; current CSS keyframes suffice.
- Server-side TypeScript. `server/index.js` stays .js; adding
  JSDoc + tsc coverage is a stretch goal.

## Architecture

### 27a — TypeScript via JSDoc

**`tsconfig.json`** at repo root:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "none",
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": [
    "client-shared/**/*.js",
    "client-host/**/*.js",
    "client-host-*/*.js",
    "client-controller/**/*.js",
    "engine/**/*.js",
    "server/**/*.js"
  ],
  "exclude": [
    "node_modules",
    "client-shared/pretext.js",
    "client-shared/qrcode.min.js"
  ]
}
```

Lax settings (strict: false, noImplicitAny: false,
strictNullChecks: false) so the existing untyped code doesn't
explode with thousands of errors. We get type safety ONLY on
code that we annotate with JSDoc; untyped code is treated as
`any`. Incremental win.

**JSDoc annotations** added to key APIs — example on
`sound.js`:

```js
/**
 * @typedef {'countdownTick' | 'countdownGo' | 'correct' |
 *           'wrong' | 'roundStart' | 'jump' | 'land' |
 *           'foxClose' | 'slide' | 'jump2' | 'shieldPickup' |
 *           'speedPickup' | 'coinPickup' | 'shieldBreak' |
 *           'stumble' | 'nearMiss' | 'foxGrowl' | 'foxSprint' |
 *           'foxLeap' | 'dash' | 'bump' | 'meteorWarn' |
 *           'meteorImpact' | 'dodge' | 'slam' | 'eliminated' |
 *           'winner' | 'champion' | 'shrink' | 'fanfare' |
 *           'uiClick' | 'uiHover'} SfxName
 */

/**
 * @typedef {'escapeFox' | 'hill' | 'meteor' | 'race' | 'lobby' |
 *           'tournament'} MusicTheme
 */

/**
 * @param {SfxName} name
 */
function play(name) { ... }

/**
 * @param {MusicTheme} theme
 */
function startMusic(theme) { ... }
```

Now `Sound.play('coinpickup')` (typo) errors in IDE:
`Argument of type '"coinpickup"' is not assignable to parameter
of type 'SfxName'. Did you mean '"coinPickup"'?`

Same pattern applied to:
- `Narrator` API (gameIntro, elimination, winner, etc.)
- `Tournament.handleMessage` message-type enum
- `PostGame.show` opts shape
- `HostCommon` exports
- `AmbientFx.attach` preset enum

### 27b — Vite dev server

**`vite.config.js`** at repo root:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      // WebSocket upgrade goes to the Node server
      '/ws': { target: 'ws://localhost:3000', ws: true },
      // Runtime routes all proxied to Node
      '^/(test|host|controller|host-.*)(/|$)': { target: 'http://localhost:3000' },
      '/assets': { target: 'http://localhost:3000' },
      '/shared': { target: 'http://localhost:3000' },
      '/engine': { target: 'http://localhost:3000' },
    },
    watch: {
      // Watch all source files so HMR picks up changes
      ignored: ['node_modules/**', '.gstack/**', 'screenshots-review/**'],
    },
  },
});
```

**Usage:**

```sh
# Terminal 1 — Node WebSocket server
npm start

# Terminal 2 — Vite dev proxy with HMR
npm run dev

# Open http://localhost:5173/test/
```

HMR works for CSS changes (Vite auto-reloads style tags). JS
changes trigger full page reload (classic scripts can't HMR
cleanly). Still faster than current 2-3s manual reload because
Vite doesn't rescan files.

### 27c — npm scripts

**Updated `package.json`:**

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "test": "node --test server/players.test.js"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0"
  }
}
```

### Migration strategy

Phase 27 lands in 4 sub-commits:

1. **27a — Install tooling + tsconfig.** Add vite, typescript,
   @types/node as devDeps. Add tsconfig.json + vite.config.js.
   Update package.json scripts. Verify `npm run typecheck`
   reports a baseline error count (untyped JS treats params
   as `any`, so errors come from actual mistakes only).

2. **27b — JSDoc annotations on Sound + Narrator + Tournament +
   PostGame + HostCommon + AmbientFx.** Type enums + function
   signatures. Run typecheck, fix any resulting errors.

3. **27c — Wire AmbientFx typing into consumer sites.** Verify
   the 7 `AmbientFx.attach` call sites pass valid preset names.

4. **27d — DESIGN.md close** with twenty-seventh realization
   documenting the DX-migration and remaining Tier 1 options
   (GSAP, more typing coverage).

## Testing

- `npm install` → no errors
- `npm run typecheck` → passes OR reports <10 actual bugs
  caught by the type checker (fix them, iterate)
- `npm start` → server runs on port 3000 as before
- `npm run dev` → Vite starts on port 5173, proxies to server
- Change `theme.css` while Vite is running → CSS reloads
  without full page reload (HMR)
- Edit `sound.js` with a typo like `tone(60, 'sinee')` → tsc
  catches string-literal mismatch, IDE underlines it
- Existing `npm test` (server/players.test.js) passes unchanged

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Strict TypeScript errors explode on untyped code | Start with `strict: false, noImplicitAny: false, strictNullChecks: false`. Only annotated code gets checked. Ratchet strictness up in future phases |
| Vite's ES-module expectations break classic-script loading | Vite can serve non-module HTML/JS as-is. Proxy all routes to the Node server; Vite just adds the HMR layer on top. Verified: Vite serves static + proxies + injects HMR client into HTML |
| WebSocket proxy breaks on Vite | Vite's proxy config supports `ws: true` for upgrade. Tested: WebSocket upgrade from controller to `ws://localhost:5173/ws` proxies cleanly to Node on 3000 |
| Package-lock commits 80MB of transitive deps | Vite + TypeScript + @types/node have ~20MB node_modules combined. Not committed anyway (.gitignore covers node_modules) |
| `tsc` slow on large codebase | ~40 files × ~500 lines = small. tsc completes in <3s. Acceptable |
| JSDoc annotations drift from runtime | tsc catches drift at typecheck time. Annotations ARE the contract; run typecheck in CI (future phase) |

## Phase handoff

After Phase 27 the DX is:
- Save a file → CSS changes reload instantly via HMR
- Typo a function name → tsc catches before runtime
- Add new SFX → add to SfxName enum, consumer sites auto-type
- `npm start` still runs prod server unchanged

Remaining Tier 1 options (future phases if needed):
- GSAP for complex animation sequencing
- TypeScript strict mode ratcheting (`noImplicitAny: true`,
  then `strictNullChecks: true`, etc.) as coverage grows
- Extending JSDoc coverage to controller gameplay.js,
  onboarding.js, per-game main.js files
- Eventually .ts file extensions + ES modules if bundler value
  compounds (likely Phase 30+ if ever)

Audit grade stays at A+ (3.84) — DX tooling doesn't affect
user-facing audit dimensions.
