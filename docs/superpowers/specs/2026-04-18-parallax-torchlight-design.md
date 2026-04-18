# Parallax & Torchlight — Design Spec (Phase 24)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 24 of ?, after Phase 23 (ornate object frames v2)
shipped. Fourth sub-phase of the Hearthstone-polish arc.
**Scope:** two CSS-only additions to the painted backdrops so
scenes feel like they're being seen through a slowly-floating
camera in an inn-lit room. (24a) gentle drift keyframe on
painted backdrop images; (24b) torchlight flicker — subtle
brightness oscillation simulating firelight.
**NOT** commissioned parallax-layer art (per-game tree / cloud
/ balloon split) — that's a future asset-heavy phase.

## Problem

After Phase 21 ambient particles drift over painted backdrops,
but the backdrops THEMSELVES are static snapshots. Hearthstone's
tavern atmosphere includes the PAINTED SCENE gently moving — not
individual layered parallax but a whole-scene subtle breathing
that reads as "the camera is floating in the room, there's a
fire somewhere off-screen warming the light."

Our painted backdrops (BARNYARD BEDLAM main, 4 per-game lobbies,
gameover-hall, tournament-round-intro poster, tournament-champion
throne, elim-shadow, race-podium) render frozen. Add:

1. **Gentle drift** — slow 12-18s sinusoidal X/Y translate + 
   subtle scale oscillation on the backdrop images.
2. **Torchlight flicker** — subtle brightness/hue-rotate cycle
   (40-50s period) that simulates firelight warming/cooling the
   scene's tonality.

## Success criteria

- All painted backdrop IMG elements (`.lobby-backdrop`,
  `#t-hall-backdrop`, `.t-backdrop`, `.pg-backdrop-hall`,
  `.gp-gameover-backdrop`, `.gp-elim-backdrop`,
  `.gp-spec-backdrop`, `.t-scroll-backdrop`,
  `.t-round-intro-backdrop`) gain a `backdropDrift` keyframe:
  14s sinusoidal translate ±3px X + ±2px Y + scale 0.998 ↔
  1.002.
- Same elements gain `torchFlicker` keyframe: 42s brightness
  0.97 ↔ 1.03 + hue-rotate(-3deg) ↔ hue-rotate(3deg).
- Animation delays staggered per-surface so no two backdrops
  sync their cycle.
- Respect `prefers-reduced-motion: reduce` — collapse both.
- Zero new art.

## Non-goals (explicitly out of scope for Phase 24)

- Layered parallax (per-game commissioned foreground/midground
  /background art splits). That's Phase 24+ if demand justifies.
- Mouse-tracked parallax (desktop-only, adds JS cost,
  controller is touch).
- Per-game canvas gameplay scenes — Phase 3 palette already
  handles in-game visuals.
- Painted assets' source art pipeline. This phase tweaks
  RENDERED PNG behavior with CSS, not the source assets.

## Architecture

### 24a — Gentle backdrop drift

Shared keyframes in `client-shared/theme.css`:

```css
@keyframes backdropDrift {
  0%   { transform: translate(-0.2%, -0.15%) scale(1.002); }
  33%  { transform: translate( 0.2%, -0.1% ) scale(0.998); }
  66%  { transform: translate(-0.1%,  0.2% ) scale(1.001); }
  100% { transform: translate(-0.2%, -0.15%) scale(1.002); }
}
```

Applied to:
- `.lobby-backdrop` (main + per-game lobbies)
- `#t-hall-backdrop` (tournament overlay hall)
- `.t-backdrop` (tournament champion throne)
- `.t-scroll-backdrop` (tournament standings scroll)
- `.t-round-intro-backdrop` (round-intro poster)
- `.pg-backdrop-hall` (postgame hall)
- `.pg-backdrop-podium` (postgame race podium)
- `.gp-gameover-backdrop`, `.gp-elim-backdrop`, `.gp-spec-backdrop`

Each gets `animation: backdropDrift 14s ease-in-out infinite,
torchFlicker 42s ease-in-out infinite;` with a stagger
`animation-delay` derived from the selector name.

### 24b — Torchlight flicker

```css
@keyframes torchFlicker {
  0%   { filter: brightness(1) hue-rotate(0deg); }
  25%  { filter: brightness(1.02) hue-rotate(-1deg); }
  50%  { filter: brightness(0.97) hue-rotate(2deg); }
  75%  { filter: brightness(1.03) hue-rotate(-2deg); }
  100% { filter: brightness(1) hue-rotate(0deg); }
}
```

Amplitudes deliberately below perception threshold — individual
frames don't look noticeably different, but across the 42s
cycle the scene reads as alive. Combines with the drift for
compound ambient motion without visual chaos.

### Composition with existing transforms

Several backdrops already carry static transforms (e.g.,
`.t-scroll-backdrop { transform: translate(-50%, -50%) }`
for centering). Animating `transform` on those replaces the
centering. Fix: wrap the existing transform inside the keyframe
(keyframe values include the static offset), OR switch the
static centering to `position: absolute; top: 50%; left: 50%;
margin-top: -Npx; margin-left: -Npx;` style.

**Decision:** for transformed backdrops, define a scoped
version of the keyframe that includes the anchor transform.
E.g.:

```css
@keyframes backdropDriftCentered {
  0%   { transform: translate(calc(-50% - 4px), calc(-50% - 3px)) scale(1.002); }
  33%  { transform: translate(calc(-50% + 4px), calc(-50% - 2px)) scale(0.998); }
  ...
}
```

Ugly but works. Alternative cleaner: wrap the backdrop in a
transform-preserving parent div that gets the drift, while the
inner img retains its centering transform. For now, apply the
drift ONLY to the backdrops that are already cover-fit-inset
(don't carry `transform: translate(-50%,-50%)`) — leaves the
centered ones static (they're small enough that drift wouldn't
be noticed anyway).

### 24c — Subtle lobby vignette pulse (stretch)

Optional: add a `box-shadow: inset 0 0 100px rgba(0,0,0,0.3)` to
painted backdrops that pulses 0.25 ↔ 0.4 on the same 42s torch
cycle. Sells the "inn light from a central fire" illusion.

Defer this to keep scope tight — main drift + flicker is
enough for Phase 24.

## Sub-phase breakdown

Phase 24 lands as one implementation commit covering 24a + 24b
(all CSS). 24d DESIGN.md close.

## Testing

- Main lobby — verify BARNYARD BEDLAM bg breathes subtly,
  corners stay in place (they're NOT backdrops).
- Per-game lobby (race / hill / meteor / escape) — verify
  painted arch drifts.
- Tournament overlay — verify gameover-hall breathes (cover-
  fit backdrop, no centering transform conflict).
- Controller elim / spectate / gameover — verify backdrop
  breath.
- Reduced-motion — all animations stop.
- Open dev tools Performance tab, confirm no layout thrash
  during drift.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Transform animation triggers layout on every frame | `transform` doesn't trigger layout (it's composited). Browser handles 60fps cleanly |
| `filter: brightness/hue-rotate` is paint-expensive on large images | 42s period = minimal frame-to-frame delta. Browser doesn't repaint every frame, interpolates. Measurable cost but <1ms per frame on desktop GPU |
| Drift makes text misalign over backdrop | Drift amplitude is ±3px at 1000px+ viewport. Invisible offset. Text DOM elements sit at fixed positions; backdrop drifts behind them |
| Centering-transform backdrops break when keyframe sets transform | Centered backdrops (standings-scroll, champion throne, round-intro poster) excluded from `backdropDrift` animation. Only cover-fit ones get it. Cleaner than the calc() ugliness |

## Phase handoff

After Phase 24, painted backdrops breathe gently AND their light
warms/cools like torchlight. Remaining Hearthstone-polish arc:
Phase 25 sound design, Phase 26 animation polish.

Audit grade stays at A+ (3.84) — atmospheric depth polish.
