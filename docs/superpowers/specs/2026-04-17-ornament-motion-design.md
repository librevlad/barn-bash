# Ornament Motion — Design Spec (Phase 16)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 16 of ?, follow-up to Phase 15 ornaments.
**Scope:** CSS-only motion additions to the Phase 15 bunting + corner
flourishes. Bunting sways gently; gold-bulb region on the bunting
pulses subtly; corner flourishes get a slow radial shimmer. **No new
PNG assets.** Complements Phase 14 hero-title breathing + card shine-
sweep. Does NOT open any new content-art threads.

## Problem

Phase 15 landed the bunting + corner ornaments on every overlay, but
they render statically. At AAA-polish level, ornamental dressing
usually carries micro-motion — bunting sways, bulbs flicker or pulse,
gold accents shimmer. Without motion, the ornaments read as "painted
on" rather than "hanging in a living space."

The existing Phase 14 motion layer (breathing titles + shine-sweep on
hover) already established a motion idiom for the product. Phase 16
extends the same idiom to the ornament surfaces: subtle, slow, no
distracting intensity, `prefers-reduced-motion` respected.

## Success criteria

- **Bunting sway** on `#tournament-overlay::before`,
  `#postgame-overlay::before`, `#lobby::before`: a ~4 second
  sinusoidal transform-origin-pivoted rotation ±0.5° that reads as
  "slight breeze on the festival flags." Subtle enough that it's
  felt rather than noticed.
- **Bulb pulse** (brightness filter): 2.2s cycle on the whole
  bunting band, subtle opacity/saturation shift (0.95 → 1.0 →
  0.95). Adds a "flickering light" impression to the painted gold
  bulbs without strobing.
- **Corner flourish slow shimmer**: 6s cycle, `filter:
  brightness(0.95) → brightness(1.05)` breath. Almost imperceptible
  per-cycle but accumulates as "gold catching the light."
- **All respect `prefers-reduced-motion: reduce`**, which
  collapses both to zero animation.

## Non-goals (explicitly out of scope for Phase 16)

- Commissioned bunting-with-sway-already-animated asset. The PNG
  stays static; motion happens via CSS transform only.
- Particle systems on ornaments (sparkles, falling confetti from
  bunting, etc.). Future polish if demand persists.
- Interactive ornament motion (hover on corner triggers shimmer,
  etc.). Ornaments aren't interactive — motion is ambient only.
- Motion-sensitive sound pairing (bulb flicker synced to a low
  Audio fx). Audio cue layer untouched.
- Any additional CSS to the Phase 14 hero-title breathing (which
  is already live).

## Style guide

No new assets. All additions via CSS `@keyframes` + existing
selectors on Phase 15 elements. Motion is subtle by rule:
amplitudes ≤ 5% opacity / ≤ 0.5° rotation / ≤ 10% filter-brightness.
No acceleration, no bounce — pure sinusoidal ease-in-out cycles so
the motion never "peaks" sharply.

## Deliverables

### Phase 16a — bunting sway + bulb pulse (CSS-only)

1. `client-shared/theme.css` — new keyframes:
   ```css
   @keyframes buntingSway {
     0%, 100% { transform: rotate(-0.5deg); }
     50%      { transform: rotate(0.5deg); }
   }
   @keyframes buntingBulbPulse {
     0%, 100% { filter: brightness(0.95); }
     50%      { filter: brightness(1.05); }
   }
   ```
2. Apply both animations to the Phase 15a ::before selectors:
   ```css
   #tournament-overlay::before,
   #postgame-overlay::before,
   #lobby::before {
     transform-origin: 50% 0;
     animation:
       buntingSway 4s ease-in-out infinite,
       buntingBulbPulse 2.2s ease-in-out infinite;
   }
   ```

### Phase 16b — corner shimmer (CSS-only)

3. New keyframe:
   ```css
   @keyframes cornerShimmer {
     0%, 100% { filter: brightness(0.95); }
     50%      { filter: brightness(1.05); }
   }
   ```
4. Apply to `.ornament-corner`:
   ```css
   .ornament-corner { animation: cornerShimmer 6s ease-in-out infinite; }
   ```

### Phase 16c — reduced-motion guard

5. Extend existing `prefers-reduced-motion` block in theme.css:
   ```css
   @media (prefers-reduced-motion: reduce) {
     /* existing Phase 14 + */
     #tournament-overlay::before,
     #postgame-overlay::before,
     #lobby::before,
     .ornament-corner {
       animation: none;
     }
   }
   ```

### Phase 16d — DESIGN.md seventeenth realization

After 16a-c land:

- Append a seventeenth-realization block covering Phase 16.
- Mark Phase 16 shipped on the roadmap with date.
- Decisions-log rows for: motion amplitudes picked below
  "perceptible" threshold, transform-origin at `50% 0` (bunting
  hangs from top center), filter brightness over opacity for
  bulb pulse (saturation preserved).

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Multiple simultaneous animations produce a "seasick" compound effect (bunting + title breathing + corner shimmer + action-card actions) | Amplitudes kept below 5% intensity each. Cycles intentionally DIFFERENT periods (4s sway, 2.2s bulb, 6s shimmer, 3s title breathe) so they drift out of phase — compound motion reads as "ambient breathing room" rather than synchronized pulse |
| Bunting `transform: rotate()` might clip at overlay edges when rotated | Rotation ±0.5° at `transform-origin: 50% 0` — the bunting's 90px height sweeps ±0.8px horizontally at the bottom edge. Well within the viewport-width padding of `repeat-x` |
| Filter brightness on bunting affects the gold bulbs and the wooden end-caps equally (not bulb-specific) | The wooden end-caps are painted with low-chroma wood tones; small brightness modulation on them reads as "sunlight shifting on stage." Not a problem visually. If it becomes one, split into two stacked ::before layers with per-layer animation — out of scope for Phase 16 |
| Corner flourish filter brightness stacking with hover / data-URL animations elsewhere | Corner elements have `pointer-events: none` — no hover state. Filter brightness is the ONLY effect on `.ornament-corner`, simple cumulative |

## Open questions (for implementer)

1. Motion-intensity dial: users could want ornament motion turned off
   even without `prefers-reduced-motion`. A `localStorage` preference
   is out of scope; accept the default-on state for Phase 16.
2. Sway per-overlay variant (tournament slower, postgame faster)?
   Lean: uniform cadence across all overlays. Differentiation adds
   complexity without clear gain.
3. Should the `#lobby` bunting sway when the player is in-gameplay
   (the canvas render is the focus)? Lean: yes, but `#lobby` is
   `display: none` when gameplay runs — the bunting animation just
   pauses naturally via display-none reset.

## Phase handoff

After 16a-d land, DESIGN.md gains the seventeenth realization,
roadmap item 16 marked shipped. No immediate next phase scheduled;
remaining follow-ups (painterly pixel-car replacement, engineering
items) open their own specs when demand returns.
