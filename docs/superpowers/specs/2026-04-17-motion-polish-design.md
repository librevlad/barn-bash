# Motion Polish — Design Spec (Phase 14)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 14 of ?, fourth AAA-polish pass after Phase 12 closed the
scoreboard + avatar orb.
**Scope:** CSS-only motion additions — universal idle breathing on
hero Alfa Slab titles, a subtle gold shine-sweep across interactive
cards on hover. **No new PNG assets.** Pixel-car replacement (Phase
13) deferred per user selection; background ornament PNGs (Phase
15 or later) open when demand accumulates.

## Problem

The post-Phase-12 UI is painterly at the pixel level but STATIC at
the motion level. A Hearthstone-level surface has:

- Hero cards breathe (subtle scale pulse, ~3s cycle).
- Interactive cards tilt or gold-flare on hover.
- Numbers settle with a count-up + brief glow.
- Idle elements sway / flicker (banners, lanterns, stars).

Frantics has PARTIAL coverage (`--dur-breathe: 3000ms` token,
`tGoldGlow` keyframe, `animateScores` in tournament) but doesn't
apply it universally. Per-game lobby titles don't breathe.
Tournament CHAMPION! pulses but lobby titles don't. Ticket buttons
have a resting state but no shine sweep on hover.

Phase 14 closes the animation layer with two surgical additions:

1. **Universal idle breathing** on every Alfa Slab hero title
   (main lobby, per-game lobbies, overlay headings, winner name).
   Subtle 3s opacity/scale breathe signals "alive" vs "placeholder."
2. **Gold shine-sweep** on hover across ticket-btn, action-card,
   cell-car. A subtle light band travels diagonally across the
   card, signaling "interactable" with a tactile micro-polish
   moment.

## Success criteria

- **Every Alfa Slab hero title** — including main lobby "FRANTICS!",
  per-game lobby titles ("GRAND PRIX", "ESCAPE THE FOX", etc.),
  tournament STANDINGS / CHAMPION!, postgame winner-name —
  breathes subtly (scale 1.0 → 1.015 → 1.0 over 3s, opacity 0.92
  → 1.0 → 0.92).
- **Hover shine-sweep** on ticket-btn, .gp-action, .color-cell,
  .car-cell (and any other card-like interactive element):
  a diagonal gold-linear-gradient band sweeps across over 800ms
  on hover, subtle (~15% gold + transparent).
- **`prefers-reduced-motion`** disables both animations entirely.
- **Zero layout change**: pure transform / opacity / pseudo-
  element work, no reflow.

## Non-goals (explicitly out of scope for Phase 14)

- Pixel-car replacement (Phase 13 deferred per user).
- Background ornament PNGs (garland, corner flourishes, bunting).
  Phase 15+.
- Full-screen transition choreography (curtain reveals already
  Phase 1.5; further choreography open-ended).
- Per-game canvas motion tuning (lap pennant timing, meteor
  telegraph hold — those are Phase 3d's follow-up bucket that
  needs live-playtest data).
- Sound / haptic motion-pairing (vibrate patterns already exist
  via Phase 2c; audio cue-per-motion is a separate layer).

## Style guide

No new tokens introduced. Reuses existing `--dur-breathe` (3000ms)
and existing keyframes (`tGoldGlow`). Adds one new keyframe for
the shine-sweep diagonal band. All animations honor
`@media (prefers-reduced-motion: reduce)` per the existing DESIGN.md
accessibility rule.

## Deliverables

### Phase 14a — universal hero title breathing (CSS-only)

1. `client-shared/theme.css` — add a `.breathe` utility class:
   `animation: breatheHero var(--dur-breathe) ease-in-out infinite;
   @keyframes breatheHero { 0%,100% { transform:scale(1);
   opacity:0.92; } 50% { transform:scale(1.015); opacity:1; } }`
2. Apply `.breathe` to:
   - `.hud-title`, `h1` inside `#lobby`, `h2` inside `#lobby` in
     each per-game host.
   - `#t-content .t-title` (STANDINGS, CHAMPION!).
   - `#postgame-overlay .pg-winner-name`.
   - Main lobby "FRANTICS!" hero (in `client-host/index.html`).
3. Reduced-motion guard: `@media (prefers-reduced-motion: reduce)
   { .breathe { animation: none; } }`.

### Phase 14b — hover shine-sweep on interactive cards (CSS-only)

4. `client-shared/theme.css` — add `@keyframes shineSweep {
   0% { transform:translateX(-120%) skewX(-20deg); }
   100% { transform:translateX(320%) skewX(-20deg); } }`.
5. Add utility class `.shine-sweep` with `position:relative;
   overflow:hidden;` and a `::after`:
   - `position: absolute; top: 0; left: 0; width: 40%; height: 100%;`
   - `background: linear-gradient(90deg, transparent 0%,
     rgba(255, 221, 107, 0.3) 50%, transparent 100%);`
   - `transform: translateX(-120%) skewX(-20deg);`
   - `pointer-events: none;`
6. On `:hover` of the host element, run the shineSweep keyframe:
   `.shine-sweep:hover::after { animation: shineSweep 800ms
   ease-out; }`.
7. Apply `.shine-sweep` class to:
   - `.ticket-btn`
   - `.gameplay-root .gp-action` (controller action cards)
   - `.onboarding-root .color-cell` (car cells)
   - `.onboarding-root .animal-cell` (animal medallions)
8. Reduced-motion guard disables the sweep.

### Phase 14c — DESIGN.md fifteenth realization

After 14a + 14b land:

- Append a fifteenth-realization block covering Phase 14.
- Mark Phase 14 shipped on the roadmap with date.
- Decisions-log rows for: breathing applied via utility class
  (not per-element keyframe), shine-sweep over `::after`
  (not `::before` because `::before` already hosts painterly
  backdrops on many cells), `prefers-reduced-motion` honored.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| 10+ hero elements breathing simultaneously creates visual "seasick" effect | Subtle: scale 1.015 (1.5%) and opacity 0.92→1.0 — barely perceptible individually, collectively reads as "alive." If too much, tighten to 1.008 scale |
| Shine sweep on every `::after` competes with existing pseudo content | Existing `::after` uses on cells are ticket-btn bulbs (fixed positions) and a few modifiers. Shine-sweep on hover is ephemeral (800ms); ticket-btn bulbs painted inside the face, shine sweeps over them transparently — no visible conflict |
| Transform on hero text clips the letterpress shadow | Keep scale small (1.015) — shadow extends only 4-8px; growth 1.5% on a 40px title is 0.6px expansion, within shadow margin |
| Prefers-reduced-motion users see static UI, which ALSO should still read as "alive" | Accept the degradation. Reduced-motion users opt out of motion by design; a-ok |

## Open questions (for implementer)

1. Should `.shine-sweep` on hover re-trigger on subsequent hovers
   (within the same mount), or fire once? Lean: re-trigger per
   hover. Each hover should feel like a fresh flash.
2. Breathing frequency — 3s matches existing `--dur-breathe`.
   Should winner-name or CHAMPION! breathe faster (2s) to feel
   more "triumphant"? Lean: uniform 3s; varied cadence feels
   sloppy.
3. Stagger breathing across multiple elements on the same screen
   (random phase offsets) so they don't all scale simultaneously?
   Lean: uniform phase for simplicity; the subtlety is enough
   that sync doesn't feel robotic.

## Phase handoff

After 14a + 14b + 14c land, DESIGN.md gains the fifteenth
realization, roadmap item 14 marked shipped. Phase 15+ opens for
painterly ornament PNGs (garland, corner flourishes) and any
further motion work if Phase 14's breathing reveals more gaps.
