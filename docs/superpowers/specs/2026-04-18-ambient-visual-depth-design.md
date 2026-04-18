# Ambient Visual Depth — Design Spec (Phase 21)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 21 of ?, after Phase 20 (host-side painted polish) + E2E
audit round closed 2026-04-18
**Scope:** push the product from "painted" toward Hearthstone-tier
ambient depth. Three compound additions, zero new art assets:
(1) ambient particle layer (sparkles + embers + dust motes) on
painted surfaces; (2) glint sweeps on gold ornaments; (3) spring-
easing on overlay entry transitions.
**NOT** typography embellishments, object frame expansions, audio
layer, parallax backgrounds — each is its own future phase (22-26)
in the Hearthstone-polish arc.

## Problem

After Phase 20 + E2E audit, every painted surface renders cleanly
with legible text. But the product still feels *static* compared
to Hearthstone-tier party games: painted stages are frozen
snapshots rather than living environments. Hearthstone's signature
atmosphere is:

- Ambient particle drift (ember sparks, dust motes, glitter)
  constantly refreshing the scene
- Gold ornaments catch *moving* light — glint sweeps that traverse
  the surface every few seconds
- Overlay entries have a satisfying *spring overshoot* rather than
  linear fade-in, suggesting material weight

Frantics has painted backdrops, corner filigree, bunting, and
Phase 16 ornament motion. What's missing is the **ambient motion
layer** that makes the painted scene feel *alive* rather than
photographed.

## Success criteria

- Main host lobby, per-game lobbies, tournament overlay (all 3
  modes), PostGame hall, and controller gameplay elim/spectate/
  gameover overlays gain an ambient particle layer (sparkles /
  embers / dust motes) rendered on a canvas behind content.
- `.ornament-corner` divs get a diagonal glint sweep every 5s
  offsetting from existing `cornerShimmer` so the compound reads
  as "light moving across the gold" not a single pulse.
- Bunting + gold bulb ornaments gain subtle diagonal glint
  passes.
- Overlay entry transitions swap cubic / linear curves for
  `cubic-bezier(0.34, 1.56, 0.64, 1)` spring-overshoot easing on
  `opacity` and `transform` during `.show` add.
- All ambient effects honor `prefers-reduced-motion: reduce` —
  particles don't emit, glints don't sweep, entry transitions
  fall back to linear fade.
- Zero new art assets. Zero new typography. Zero new sound.
- Performance: ambient particle layer stays ≤ 50 active particles
  per surface, RAF-driven, auto-pauses when overlay is hidden.

## Non-goals (explicitly out of scope for Phase 21)

- Typography embellishments (drop caps, fancy letter treatments)
  — Phase 22.
- Ornate object frames on currently-unframed UI (QR card,
  controller intro bulbs, hintbar slots) — Phase 23.
- Parallax backgrounds / layered depth on painted lobbies —
  Phase 24.
- Ambient music + rich SFX polish — Phase 25.
- Spring easing on all micro-interactions (button press,
  hover, etc.) — Phase 26.
- Per-game canvas particle upgrades (`engine/Particles.js` stays
  as-is). This phase touches DOM overlays only.

## Architecture

### 21a — Ambient particle layer

A new shared module `client-shared/ambient-fx.js` (~150 lines, no
deps) that:

1. Injects a `<canvas class="ambient-fx-layer">` into any parent
   element via `AmbientFx.attach(parentEl, preset)`.
2. Runs one shared RAF loop across ALL attached canvases,
   spawning + updating + drawing particles based on the preset.
3. Auto-pauses when the parent element has `display: none` or is
   not in viewport.
4. Cleans up on `AmbientFx.detach(parentEl)`.

Presets:

- **`sparkles`** — small gold/white specks with additive glow.
  Low gravity, drift upward slowly, fade over 3-4s. 15-20 alive.
  For: tournament overlay, gameover hall, PostGame hall.
- **`embers`** — warm amber specks, slightly larger, rising with
  horizontal drift (wind). Flicker brightness. 10-15 alive.
  For: elim-shadow (curtain-down theatre), escape-volcano biome.
- **`dustmotes`** — cream-toned slow drifting specks, nearly
  horizontal motion, low opacity. 20-25 alive. For: main lobby
  (spotlight-lit scene), per-game lobbies.

Canvas positioned `absolute; inset: 0; z-index: 0; pointer-events:
none`, rendering at viewport resolution with `devicePixelRatio`
scaling.

### 21b — Glint sweeps

CSS-only. New keyframes:

```css
@keyframes ornamentGlint {
  0%, 85%, 100% { background-position: 0 0, 0 0; }
  90%           { background-position: 100% 0, 0 0; }
}
```

Applied to `.ornament-corner` + `.ornament-bunting-bulb` via a
SECOND background-image layer containing a diagonal white-alpha
streak mask. The streak traverses the element's width once every
5s, then pauses 4.25s before repeating. Staggered `animation-delay`
across corners (0s / 1.5s / 3s / 4.5s) so the sweep travels around
the overlay rather than firing synchronized.

The mask layer is painted via CSS linear-gradient, not a new asset:

```css
background-image:
  var(--glint-sweep, linear-gradient(105deg,
    transparent 45%,
    rgba(255, 255, 220, 0.35) 50%,
    transparent 55%)),
  var(--corner-bg, url('...'));
background-size: 300% 300%, 100% 100%;
background-blend-mode: screen, normal;
```

The gradient layer is wider than the container so `background-
position` shifts from `0 0` to `100% 0` during the sweep to slide
it across. Screen blend-mode makes the streak add to the painted
gold without replacing it.

### 21c — Spring-easing overlay entries

Add a `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` token to
`client-shared/theme.css`. Swap `transition` on the three overlay
show/hide states:

- `#postgame-overlay` (+ controller `.gp-gameover-overlay`): `opacity 0.6s ease-out` → `opacity 0.7s var(--ease-spring)`
- `#tournament-overlay`: `opacity 0.6s ease-in-out` → `opacity 0.7s var(--ease-spring)`
- `.gp-eliminated-overlay` / `.gp-spectate-block`: matching upgrade

For the inner content (winner-name, champion trophy bounce, etc.),
swap `ease-out` / `ease-bounce` keyframe anchors to the spring
curve where appropriate. Existing explicit `var(--ease-bounce)`
can point to the new spring token too — eliminates the "flat-ease"
feel on entries.

### 21d — DESIGN.md close

After 21a + 21b + 21c land, DESIGN.md gains a twenty-second
realization block narrating the arc. Roadmap item 21 shipped.
Decisions-log rows for:

- Ambient particles on a shared canvas layer (not per-surface
  SVG) — rationale: shared RAF + pooled allocator beats DOM
  reflow cost on 50+ moving elements.
- Glint sweep via CSS gradient layer over painted `--corner-bg`
  — no new asset.
- Spring-easing token (`--ease-spring`) over raw `cubic-bezier()`
  per-site — one place to retune the bounce feel.

## Sub-phase breakdown

- **21a — ambient-fx.js + integrations (new module).** Write
  `client-shared/ambient-fx.js` with `AmbientFx.attach/detach` +
  3 presets. Wire into:
  - `client-host/index.html` (main lobby `#lobby`) — dustmotes
  - Per-game lobbies — dustmotes
  - `client-shared/tournament.js` `#tournament-overlay` — sparkles
  - `client-shared/postgame.js` `#postgame-overlay` — sparkles
    when `backdropMode: 'hall'`
  - `client-controller/gameplay.js` `.gp-eliminated-overlay` —
    embers
  - `client-controller/gameplay.js` `.gp-spectate-block` — dustmotes
  - `client-controller/gameplay.js` `.gp-gameover-overlay` —
    sparkles

- **21b — glint sweeps.** Add `@keyframes ornamentGlint` and
  second-layer gradient to `.ornament-corner` in `theme.css`,
  staggered delays on tl/tr/bl/br selectors. Same pattern for
  `.ornament-bunting` bulb highlights.

- **21c — spring-easing.** Add `--ease-spring` token to theme.css.
  Update the 5 overlay transition rules.

- **21d — DESIGN.md + WebP-skip.** No new asset, so no WebP step.
  Just DESIGN.md close + commit.

## Testing

- **Ambient particles render** on each of the 7 surfaces listed
  above via JS force-show + screenshot.
- **Auto-pause** — navigate away from an overlay, verify RAF
  loop detects display:none and halts CPU.
- **Reduced-motion** — toggle `prefers-reduced-motion: reduce`
  in devtools, verify particles stop, glints stop, transitions
  collapse to linear fade.
- **Performance** — run Performance tab on host lobby with
  dustmotes active for 30s, verify JS heap doesn't grow
  (pool reuse works), RAF stays ≤ 1.5ms budget.
- **Glint visibility** — each gold ornament (4 corners, bunting
  bulbs if time allows) shows a visible sweep once per 5s,
  non-synchronized.
- **Spring entries** — show → hide → show cycle on tournament +
  postgame + gameover overlays reads as a satisfying overshoot,
  not a flat fade.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Canvas layer hurts battery on mobile controllers | Auto-pause when parent is hidden. Respect reduced-motion. Keep particle counts low (15-25 per surface) |
| Sparkles compete with painted gold ornaments for attention | Particles use additive blend (screen mode or low-opacity lighten), drift SLOWLY, stay small (2-3px). Never cross the main composition zone where text renders |
| Spring overshoot breaks animation timing assumptions in existing code (e.g., `setTimeout` tied to transition end) | The spring curve's 700ms duration is slightly longer than the old 600ms — existing setTimeout waits for `transitionend` or uses generous 1000ms+ delays. Verify by scanning for transition-tied timers. If any are tight, bump them |
| Glint animation conflicts with existing `cornerShimmer` (Phase 16b) filter: brightness animation | Glint operates on `background-position`; cornerShimmer operates on `filter: brightness`. Different CSS properties, different time scales (5s vs 6s). Compound reads as ambient layered motion, not conflicting |
| Ambient canvas re-injects on every overlay show | Helper is idempotent: `AmbientFx.attach(el, preset)` checks for existing `.ambient-fx-layer` child and early-returns. Reference-counted across show/hide cycles |
| 50+ particles pool allocation jitter | Pool pre-allocated at module init (fixed 120-element array). Particles reset by flipping `.active` flag, no GC pressure |

## Open questions

1. **Ambient-fx preset per per-game lobby** — dustmotes for all 4,
   OR tailor (escape → leaf specks, hill → snow, meteor → stars,
   race → track-dust)? Lean universal dustmotes for Phase 21
   simplicity; per-game variants are a Phase 24 parallax candidate.
2. **Controller HUD during active play** — ambient particles on
   the running score-plaque? Probably NO — active gameplay
   demands calm HUD. Only on full-screen overlays.

## Phase handoff

After Phase 21 lands, Frantics reads as *ambient-alive* rather
than painted-still. The compound effect is:
- Painted backdrops (Phase 10-18) — the theatrical SET
- Ornament motion (Phase 16) — the static ornaments BREATHE
- **Ambient particles (Phase 21)** — the atmosphere DRIFTS
- **Glint sweeps (Phase 21b)** — the gold CATCHES LIGHT
- **Spring easing (Phase 21c)** — surface entries feel WEIGHTED

Next candidates in the Hearthstone-polish arc: typography
embellishments (Phase 22), ornate object frames v2 (Phase 23),
parallax backgrounds (Phase 24), sound design (Phase 25),
animation polish (Phase 26).

Audit grade stays at A+ (3.84) — ambient depth is internal
visual-atmosphere polish, not a new scored dimension.
