# Per-Game Canvas Polish — Design Spec (Phase 3)

**Date:** 2026-04-15
**Project:** Frantics — party game
**Phase:** 3 of 4 (canvas-layer visual polish after UI system is settled)
**Scope:** `client-host-race/`, `client-host-escape/`, `client-host-hill/`,
`client-host-meteor/` canvas rendering + biome / character / effect
palettes. **NOT** the DOM overlay UI (that lives in Phase 1.5 + 2).
Server protocol unchanged.

## Problem

Phases 1.5 and 2 wrapped every DOM surface of the product in the
carnival system (`/shared/theme.css`): host lobby, controller onboarding,
per-game lobby text, HUD overlays, narrator, postgame, tournament,
winner-overlay. When a game is actually **running**, the canvas takes
over the entire viewport and renders the world — and every world has
its own palette that predates the carnival system.

- **race**: pro-grade procedural grass (`#2a6a2a → #133a12`), asphalt
  (`#3a3a3a → #454545`), checkered finish stripes (pure white), trees
  with canopy gradients. Cohesive within race, but has no dialogue
  with carnival tokens — wood reds/gold never appear in the world.
- **escape**: biome palette array with 5 entries (forest, cave, snow,
  volcano, ruins), each with sky gradient + ground gradient + tree.
  Saturated enough to work, but the fox (the star of the show) is a
  3D GLB with default shading, and the biome transitions are abrupt.
- **hillKing**: 3D arena (hexagonal platform rendering via three.js).
  Uses default three.js lighting; no carnival accent. The shrinking
  ring — the core tension mechanic — is not visually distinguished
  from a regular boundary.
- **meteor**: canvas floor with meteor shadows telegraphed 0.8s before
  impact. Shadow color is `rgba(255,60,0,0.3)`-ish; palette works, but
  not in dialogue with carnival warning-amber token.

Result: the player's experience has two halves. Lobby, onboarding,
controller, results — everything feels like a 1930s carnival. The
moment a game starts, they're in a generic 2D/3D game world. Nothing
*wrong* with the world, but the seam is visible.

## Success criteria

- Every canvas-rendered game includes at least **three carnival
  signature moments** — discrete visual callbacks to the carnival
  system the player can name without prompting (e.g., "the finish
  line is a red curtain", "the fox's eyes glow gold", "the hill edge
  is a brass ring").
- **Biome / arena palettes** stay distinct per-game (race greens stay,
  meteor reds stay, etc) — we are not painting everything brown. But
  every palette gets a **carnival anchor**: one element drawn from
  `--accent-gold`, `--accent-red-deep`, or `--text-cream` that ties
  back to the DOM chrome.
- **Signature effects** (fox close-up growl, meteor impact, hill
  ring shrink, race lap-crossing) each get a dedicated carnival
  treatment — spotlight, golden flash, red curtain wipe — beyond
  pure gameplay feedback.
- Framerate parity: no new effect may drop the race renderer below
  the current 60fps on target devices (mid-range laptop, iPad Pro).
- All canvas colors referenced in JavaScript come from a shared
  **`engine/palette.js`** module that reads the shared CSS tokens at
  startup. Swap the wood-deep hex in `theme.css` and race's asphalt
  bevel follows.

## Non-goals (explicitly out of scope for Phase 3)

- New games or new gameplay mechanics.
- Server protocol changes — phase 3 is pure client rendering.
- Replacing the existing 3D models (fox GLB, cat GLB, frog GLB) —
  they stay; only lighting and shader tweaks are allowed.
- Accessibility for colorblind modes — that's a Phase 4 add.
- VFX authoring pipeline (new sprite sheets, video backgrounds) —
  everything here must ship as procedural code or existing assets.

## Architecture

### Shared palette loader

New: `engine/palette.js`. Reads computed styles of `:root` once at
boot, exposes a typed surface to renderers:

```js
window.Palette = {
  woodDeep: '#3d2817',
  accentGold: '#f4c542',
  accentGoldHot: '#ffdd6b',
  accentRedDeep: '#6b1818',
  accentRedCurtain: '#a72d2a',
  textCream: '#f5ead4',
  successGreen: '#7bc950',
  dangerRed: '#d9534f',
  warningAmber: '#e8a33c',
  infoBlue: '#5ba8d9',

  // Pre-built 2D gradients (updated on theme change)
  spotlight: ctx => { /* returns CanvasGradient */ },
  redCurtainFabric: ctx => { /* ... */ },
  woodPlank: ctx => { /* ... */ },
};
```

Renderers no longer hardcode `#f4c542`; they call
`Palette.accentGold`. If `theme.css` updates a token, renderers pick
it up on the next frame.

### Per-game signature moments

Each game owns its signature palette; the spec locks down the specific
carnival callbacks.

#### race — Grand Prix

1. **Finish-line curtain.** The final straight is flanked by vertical
   red-velvet banners (`--bg-curtain-fabric` recipe, drawn on canvas
   as `repeating-linear-gradient`-equivalent). Crossing the line
   triggers a half-second gold spotlight sweep across the finisher's
   car.
2. **Brass track borders.** The outer rail is `--accent-gold-dim`
   with a subtle `--accent-gold-hot` highlight. Players see the
   track as a **ticket** with gold edges, not generic asphalt.
3. **Lap banner.** On lap complete, a wood-plank pennant drops from
   the top of the canvas for ~1s ("LAP 2/3" in Alfa Slab gold —
   rendered as text baked into the canvas at load time, not DOM).

#### escape — Escape the Fox

1. **Fox gold-eye glare.** When `fox_growl` fires, the fox's eyes
   flash `--accent-gold-hot` with a 6px bloom. Same event already
   triggers the host narrator quip; now it has a canvas twin.
2. **Biome transition curtain.** Between biomes (forest → cave etc.),
   a 300ms red-curtain wipe covers the transition seam. Replaces the
   current abrupt palette switch.
3. **Coin-toss pickups.** Every powerup shows a small gold-bulb
   flash on pickup (reuses `--bg-bulb` recipe, drawn as canvas
   radial gradient).

#### hillKing — King of the Hill

1. **Brass ring rim.** The arena edge gets a 8px `--accent-gold`
   band with shadow — players see the hill as a bronze platter.
   When it shrinks, the ring compresses inward with a wood-creak
   sound (already in `sound.js` as `shrink`).
2. **Center crown glow.** The center point has a faint pulsing
   `--accent-gold-hot` radial; the king of the hill (last player
   standing) gets an intensified version.
3. **Elimination fall-off.** When a player falls off the edge, a
   red-velvet "curtain drop" effect (0.4s, `--accent-red-deep` →
   transparent) sweeps from the edge they crossed. Replaces the
   current abrupt despawn.

#### meteor — Meteor Shower

1. **Shadow → amber telegraph.** Replace current `rgba(255,60,0,0.3)`
   meteor shadow with a two-phase indicator:
   - Phase 1 (0–400ms before impact): `--warning-amber` faded disc
   - Phase 2 (400–800ms): pulsing ring in `--danger-red`
   Matches the controller's meteor warn flash token.
2. **Impact bloom.** On impact, a 200ms `--accent-gold-bulb` core
   dissolves into `--danger-red` smoke. Replaces pure white flash.
3. **Safe-zone halo.** When a player stands in a safe tile, the
   tile borders light up in `--success-green` to confirm. Purely
   additive (no existing behavior to replace).

### Motion tokens for canvas

Canvas animations can't consume CSS transition tokens directly, so
they mirror them as constants in `engine/palette.js`:

```js
window.Palette.dur = {
  tap: 120,      // matches --dur-tap
  short: 200,
  pulse: 400,
  medium: 500,
  curtain: 700,
  breathe: 3000,
};
window.Palette.ease = {
  out:     (t) => 1 - Math.pow(1 - t, 3),    // matches --ease-out
  curtain: (t) => /* cubic-bezier(0.5, 0, 0.3, 1) */,
  bounce:  (t) => /* cubic-bezier(0.34, 1.56, 0.64, 1) */,
};
```

### File changes

| File | Change | Size |
|------|--------|------|
| `engine/palette.js` | NEW — shared CSS-token → JS surface | +~140 lines |
| `client-host-race/render2d.js` | Replace inline hex, add finish-line curtain, brass borders, lap banner | −30, +180 |
| `client-host-escape/render2d.js` | Replace inline hex, add gold-eye glare, biome curtain, gold-bulb pickups | −40, +200 |
| `client-host-hill/render3d.js` | Adjust three.js materials for brass rim, crown glow, fall-off wipe | −10, +120 |
| `client-host-meteor/render2d.js` | Two-phase telegraph, impact bloom, safe-zone halo | −20, +140 |
| `client-shared/effects.js` | Expose carnival helpers (curtain wipe, gold spotlight) | −0, +80 |
| `docs/superpowers/specs/` | Spec document | +this file |

Total roughly +900 lines, −100. Most deltas are additive (new
signature effects) rather than rewrites.

## Screen-by-screen — signature-effect cues

| Game | Trigger | Carnival effect | Duration | Performance |
|------|---------|-----------------|----------|-------------|
| race | `lap_complete` | Wood pennant drop "LAP 2/3" | 1000ms | 1 text sprite, cached |
| race | finish line crossed | Gold spotlight sweep | 500ms | 1 radial gradient |
| race | player in 1st place | Faint gold bloom around kart | continuous | 1 radial gradient, low-alpha |
| escape | `fox_growl` event | Fox eye gold-flash + 6px bloom | 350ms | 2 filled circles |
| escape | biome boundary | Red-curtain wipe across screen | 300ms | 1 filled rect with gradient |
| escape | `powerup_collected` | Gold-bulb flash at pickup location | 400ms | 1 radial gradient |
| hillKing | ring shrink tick | Brass ring compress + creak | ease-in 700ms | three.js ring geometry mutation |
| hillKing | `eliminated` via fall | Red-curtain wipe from fall edge | 400ms | 1 gradient plane |
| hillKing | king state (last alive) | Center crown glow doubled | continuous | 1 pulsing radial light |
| meteor | meteor telegraphed | Amber disc → danger-red ring | 800ms | 2 circle fills |
| meteor | meteor impact | Gold-bulb core → red-smoke | 200ms | 1 radial + particles |
| meteor | safe tile occupied | Green border highlight | continuous | 1 stroke path |

## Testing

### Visual capture

Host-side screenshots via `browse` skill:
- Each game lobby (4 shots) — unchanged from Phase 1.5 ship state.
- Each game mid-run with signature effect triggered (4 × 3 = 12
  shots): lap complete, fox growl, ring shrink, meteor telegraph
  at all three stages.
- Before/after diffs checked into `screenshots-review/phase3-*`.

### Framerate regression

- Race renderer: 60fps target on 1280×800 viewport. Measure with
  `performance.now()` around render frames. Log p99 frame time.
- Fallback: if p99 > 18ms, a specific signature effect is the
  culprit — disable via feature flag in `render2d.js` and re-measure.

### Palette integration

- Manual: change `--accent-gold` in `theme.css` to magenta. Reload
  host-race/ — track borders turn magenta. Revert. Confirms
  `Palette.accentGold` is live-bound, not baked in.

### Accessibility

- Safe-zone halo: ensure `--success-green` ring is distinguishable
  from `--danger-red` meteor ring under protanopia filter (test
  via Chrome DevTools color-blindness simulator).
- No reliance on red-alone for meteor warning; the pulsing ring
  and size change carry the message.

## Deliverables

### Phase 3a — palette scaffold (1 session)

- `engine/palette.js` lands; all per-game renderers updated to read
  gold/red/cream through it.
- No new effects yet — just plumbing. Verify: every game renders
  identically to Phase 2 state, no regressions, no new hex in
  render files.

### Phase 3b — race + meteor signature effects (1 session)

- Race: finish-line curtain, brass borders, lap banner.
- Meteor: two-phase telegraph, impact bloom, safe-zone halo.
- Both games capture-diffed vs Phase 3a baseline.

### Phase 3c — escape + hill signature effects (1 session)

- Escape: gold-eye glare, biome curtain wipe, gold-bulb pickups.
- Hill: brass ring, crown glow, fall-off wipe.
- Same capture/diff cadence.

### Phase 3d — polish pass (0.5 session)

- Playtest with 4 controllers across all games. Note which effects
  need timing tweaks.
- Document in DESIGN.md under "Third realization → Fourth
  realization" decisions log.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Signature effects break framerate on low-end devices | Feature flags per effect in `palette.js`; disable for < 60fps devices |
| Brass ring / curtain wipe feel theatrical to the point of slowing gameplay | Cap total signature-effect screen time at 10% of round duration; playtest validates |
| Three.js material changes invalidate existing cached GLB setup | Keep GLB untouched; only add new light + material passes |
| Player misreads safe-zone green as "go" signal in meteor and moves out | Green only appears *while standing on* safe tile, not *where to go* |
| Gold-on-green (race grass + gold track borders) reads as Christmas | Keep race borders narrow (3–4px) and desaturate gold by 15% in race only |

## Open questions (for implementer)

1. Does `render3d.js` in hill/escape use shared lighting or per-game?
   Need to check before adding brass-ring material.
2. Do we animate the brass ring shrink as continuous geometry or
   discrete steps? Continuous looks smoother but costs more draw
   calls — measure first.
3. Should the lap banner be DOM (over canvas) or canvas-baked? DOM
   integrates with `/shared/theme.css` for free; canvas avoids layout
   thrash. Lean DOM unless framerate suffers.

## Phase handoff

After Phase 3 ships, DESIGN.md gets a fourth realization entry:
"canvas signature effects across race / escape / hill / meteor,
Phase 3, <date>". The decisions log captures any effect timings
tuned during playtest.

Phase 4 (custom iconography, vendored fonts, optional dark-only
lock) can proceed in parallel with Phase 3b/c since it touches
no canvas code.
