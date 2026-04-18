# Animation Polish — Design Spec (Phase 26)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 26 of ?, after Phase 25 (sound design) shipped.
Sixth and closing sub-phase of the Hearthstone-polish arc.
**Scope:** three CSS-only micro-interaction polish additions:
(26a) staggered entry animations on game-select modal cards
and onboarding animal/color cells; (26b) button press depth
on ticket-btn + modal-btn + sprite-btn so tap feels like
pressing a physical card; (26c) tap ripple on controller
action cards. Zero new assets.

## Problem

After Phase 21-25 the painted surfaces are alive (breathe,
drift, flicker), hero titles emboss, objects gild, sound
layers play. But **micro-interactions** — the moment-to-
moment "I touched something and it responded" — still read
as static instantly-applied state changes rather than weighted
card-game gestures.

Hearthstone's signature micro-interactions:
1. Lists/grids appear with staggered entry (1st item arrives
   at t=0, 2nd at t+80ms, 3rd at t+160ms, etc.)
2. Buttons depress with a physical "card-pressed" feel, not
   just a color change
3. Tap targets ripple outward when touched

## Success criteria

- **26a — Staggered entry.** Game-select modal cards fade+
  slide in with staggered delays (Escape 0s, Hill 100ms, Meteor
  200ms, Race 300ms, Tournament 400ms). Onboarding animal
  grid cells stagger their reveal. Controller gameover stats
  stagger.
- **26b — Button press depth.** `.ticket-btn`, `.modal-btn`,
  `.sprite-btn`, `.pg-btn`, `.gp-go-btn` get a shared `:active`
  treatment: translateY(4px) + reduced shadow, giving a pressed-
  card feel. Duration 80ms for crisp tactile snap.
- **26c — Tap ripple.** `.gp-action` gains a pseudo-element
  ripple that expands from touch-point on pointerdown. Gold-
  tinted radial at 0.3 opacity, scale 0→3, 400ms ease-out.
- Compound effect — micro-interactions across host + controller
  read as tactile and alive.
- Honors prefers-reduced-motion: staggered entries collapse to
  instant, button press has no Y-shift, ripple stops.

## Non-goals

- New JS animation engines (GSAP / anime.js). CSS keyframes
  + cubic-bezier handle the scope.
- Per-keyframe fine-tuning on every existing animation. Scope
  limited to the 3 new interaction patterns.
- Haptic feedback beyond existing vibrate patterns.

## Architecture

### 26a — Staggered entry

New shared keyframe in `theme.css`:

```css
@keyframes staggerIn {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
```

Applied to:

- `#game-modal .modal-btn`: `animation: staggerIn 400ms var(--ease-bounce) backwards;` + `:nth-child(N) { animation-delay: (N-1)*100ms; }` for 2x2 grid + TOURNAMENT
- `.onboarding-root .animal-cell`: similar staggered grid
- `.onboarding-root .color-cell`: similar
- `#postgame-overlay .pg-stat`: similar for stat cards

### 26b — Button press depth

```css
.ticket-btn:active,
.modal-btn:active,
.sprite-btn:active,
#postgame-overlay .pg-btn:active,
.gameplay-root .gp-go-btn:active {
  transform: translateY(4px) scale(0.98);
  transition-duration: 80ms;
  filter: brightness(0.92);
}
```

The existing `:active` rules on ticket-btn already translate
+2-3px; upgrade to the shared depth. Visually reads as the
card physically pressing into the wood beneath it.

### 26c — Tap ripple on gp-action

```css
.gameplay-root .gp-action {
  position: relative;
  overflow: visible; /* keep existing for label escape */
}
.gameplay-root .gp-action::before {
  /* ... existing cell-action bg ... */
}
.gameplay-root .gp-action.tap-ripple::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  width: 20px; height: 20px;
  margin: -10px 0 0 -10px;
  border-radius: 50%;
  background: radial-gradient(circle,
    rgba(255, 221, 107, 0.45) 0%,
    transparent 70%);
  pointer-events: none;
  animation: tapRipple 400ms ease-out forwards;
  z-index: 3;
}
@keyframes tapRipple {
  0%   { transform: scale(0.4); opacity: 0.8; }
  100% { transform: scale(3);   opacity: 0; }
}
```

JS: on pointerdown for `.gp-action`, add `tap-ripple` class,
setTimeout to remove after 400ms. Tiny snippet in
`gameplay.js`.

### 26d — Close

DESIGN.md twenty-sixth realization + roadmap item 26 shipped.
Closes the Hearthstone-polish arc (Phases 21-26).

## Sub-phase breakdown

Phase 26 lands as one implementation commit + DESIGN.md close.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Staggered entries animate on EVERY re-render (e.g., re-opening modal) | `animation` fires only on initial DOM insertion. Re-opening the modal creates new `.modal-btn` elements via innerHTML, which triggers entry animation — exactly the intended behavior |
| Button press translateY conflicts with existing keyframes (e.g., idleBreathe on hero titles) | Press animation is on `:active` pseudo-state — overrides keyframe for the brief tap duration, releases to idle animation after |
| Tap ripple adds memory pressure (many DOM pseudo-elements) | Ripple is ONE pseudo-element per button, recycled on each tap. Animation-based, not particle-system |

## Phase handoff

After Phase 26, the Hearthstone-polish arc is complete:
- 21: ambient particles + glints + spring easing
- 22: typography embossed + flourishes + illuminated first-letter
- 23: ornate object frames (QR, toast, dots, bulbs)
- 24: backdrop drift + torchlight flicker
- 25: tournament music + fanfare + UI clicks
- 26: staggered entries + button press depth + tap ripple

Product reads as Hearthstone-tier across painted atmosphere,
typography, object ornament, backdrop motion, audio, and
micro-interactions. No Phase 27 scheduled; future polish opens
its own spec when demand justifies.

Audit grade stays at A+ (3.84).
