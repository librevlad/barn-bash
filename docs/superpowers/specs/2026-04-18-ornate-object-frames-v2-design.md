# Ornate Object Frames v2 — Design Spec (Phase 23)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 23 of ?, after Phase 22 (typography) shipped. Third
sub-phase of the Hearthstone-polish arc.
**Scope:** gild the rectangular / pill-shaped UI objects that
currently read as plain CSS shapes. Three targets: (23a) host
JOIN QR card, (23b) controller connection-lost toast, (23c)
controller intro bulb row + onboarding progress dots. CSS-only;
zero new art.
**NOT** the already-painted frames (cell-action, cell-car,
score-plaque, standings-scroll, ornament-corner) — those stay.

## Problem

After Phase 10-15 we have painted ornate FRAMES on ticket-btns,
action-cards, orb, standings, etc. But rectangular containers
and small indicator dots still render as plain CSS rectangles
with gold borders — functional but out of register with the
surrounding Hearthstone-tier painted composition:

- `#join-card` (host lobby QR card): `background: rgba(47,28,12,
  0.72); border: 2px solid gold; border-radius: 8px`
- `.gp-lost-toast` (controller connection-lost): `background:
  wood-warm; border: 1.5px amber; border-radius: 10px`
- `.ob-intro-bulbs` (controller intro marquee 5 bulbs): flat
  circles
- `.progress-dot` (controller onboarding 1-of-3 dots): flat
  circles

Each is a plain shape with gold accents. Hearthstone equivalent
would be gilded carved borders with dimensional depth, corner
accents, and ornate shadows — card-game box-art register.

## Success criteria

- **23a — JOIN QR card:** gilded double border (inner gold +
  outer dark brass), corner accent dots at each of the 4 corners
  (small gold diamonds), deeper multi-layer shadow. Reads as a
  carved wooden plaque holding the QR, not a rectangle with
  border.
- **23b — Connection-lost toast:** multi-layer border (amber
  outer + red-deep inner + cream pinstripe), corner accent
  diamonds, warning-glow pulse animation that implies urgency
  without the flat amber-border look.
- **23c — Progress dots + intro bulbs:** dimensional treatment
  — filled dots get a gold gradient + inner highlight (looks
  like a real brass stud), unfilled dots get an engraved-hole
  inset look.
- Zero new art assets. All treatments use existing `--accent-*`
  tokens + CSS gradients/shadows.
- No regressions on reduced-motion: pulse/shimmer animations
  collapse.

## Non-goals (explicitly out of scope for Phase 23)

- Commissioning painted PNG frames for QR card / toast —
  possible future phase if demand justifies.
- Repainting existing painted frames (cell-action, cell-car,
  score-plaque, etc.) — they already carry ornate treatment.
- Controller gameplay HUD chrome (.gp-item-pill, .gp-topbar) —
  Phase 19 intentionally kept these CSS-only for HUD calm.
- Host modal BACK button styling — Phase 20 layout is locked.
- Form inputs on onboarding (name field) — Phase 1b CSS
  stays; user-typing affordance doesn't need ornament.

## Architecture

### 23a — JOIN QR card ornate frame

Current selector in `client-host/index.html` — `#join-card`.
Upgrade pattern: inset triple-border via box-shadow stack
(cheaper than multiple `<div>`s), plus corner-accent pseudo
elements.

```css
#join-card {
  background: linear-gradient(180deg,
    var(--bg-wood-warm) 0%,
    var(--bg-wood-deep) 100%);
  border: 1px solid var(--accent-gold);
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 1px rgba(244, 197, 66, 0.15),    /* inner gold hairline */
    inset 0 0 0 3px var(--bg-wood-deep),          /* engraved channel */
    inset 0 0 0 4px rgba(244, 197, 66, 0.4),      /* outer gold edge */
    0 0 0 1px rgba(0, 0, 0, 0.8),                 /* outer dark border */
    0 6px 22px rgba(0, 0, 0, 0.45),               /* ambient drop */
    0 0 30px rgba(244, 197, 66, 0.1);             /* soft gold halo */
  padding: 16px 20px;
  position: relative;
}
#join-card::before, #join-card::after {
  content: '';
  position: absolute;
  width: 8px; height: 8px;
  background: var(--accent-gold);
  transform: rotate(45deg);
  box-shadow: 0 0 6px rgba(244, 197, 66, 0.6),
              inset -1px -1px 0 rgba(0, 0, 0, 0.3);
}
#join-card::before { top: 6px; left: 6px; }
#join-card::after  { top: 6px; right: 6px; }
/* Bottom corners via new .join-card-corners helper or ::marker hack:
   simplest — extend with 2 `<span>` child markers in HTML. */
```

Optionally add two `.join-corner-mark.bl` / `.br` child spans
(positioned bottom-left / bottom-right) for the full 4-corner
symmetry. Low-cost HTML edit.

### 23b — Connection-lost toast ornate frame

Current selector in `client-controller/gameplay.css` —
`.gp-lost-toast`. Upgrade:

```css
.gameplay-root .gp-lost-toast {
  /* (keep existing absolute positioning + animation) */
  background: linear-gradient(180deg,
    var(--bg-wood-warm) 0%,
    rgba(47, 28, 12, 0.95) 100%);
  border: 1.5px solid var(--warning-amber);
  border-radius: 10px;
  box-shadow:
    inset 0 0 0 1px rgba(232, 163, 60, 0.3),
    inset 0 2px 0 rgba(255, 235, 170, 0.15),  /* top specular */
    0 0 0 3px rgba(232, 163, 60, 0.2),         /* glow ring */
    0 4px 14px rgba(0, 0, 0, 0.55),
    0 0 18px rgba(232, 163, 60, 0.35);
  /* Add a pulsing amber heartbeat so "LOST THE LINE" feels urgent */
  animation: gpLostPulseRing 1.5s ease-in-out infinite,
             gpToastSlide var(--dur-short) var(--ease-out);
}
@keyframes gpLostPulseRing {
  0%, 100% { box-shadow: /* base stack */; }
  50%      { box-shadow: /* base stack + amplified amber ring */; }
}
```

### 23c — Progress dots + intro bulbs dimensional treatment

Controller onboarding `.progress-dot`:

```css
.onboarding-root .progress-dot {
  background: radial-gradient(circle at 35% 35%,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.85) 60%);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(0, 0, 0, 0.75);  /* engraved look */
}
.onboarding-root .progress-dot.filled {
  background: radial-gradient(circle at 35% 35%,
    var(--accent-gold-hot) 0%,
    var(--accent-gold) 45%,
    var(--accent-gold-dim) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 248, 200, 0.5),
    inset 0 1px 1px rgba(255, 255, 220, 0.45),
    0 0 6px rgba(255, 221, 107, 0.5);
}
```

Controller intro bulb row `.ob-intro-bulbs .bulb`:

```css
.onboarding-root .ob-intro-bulbs .bulb {
  background: radial-gradient(circle at 32% 30%,
    rgba(255, 255, 220, 0.9) 0%,
    var(--accent-gold-hot) 40%,
    var(--accent-gold) 75%,
    var(--accent-gold-dim) 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 248, 200, 0.55),
    inset 0 -2px 3px rgba(100, 50, 10, 0.35),
    0 0 10px var(--accent-gold-hot),
    0 0 28px rgba(244, 197, 66, 0.5);
  /* Existing bulbPulse keyframe retained */
}
```

Subtle but substantial upgrade — dots and bulbs read as painted
brass studs with inner specular highlights rather than flat
colored circles.

## Sub-phase breakdown

Phase 23 lands as one implementation commit covering 23a + 23b
+ 23c (all CSS). 23d DESIGN.md close.

## Testing

- Main lobby QR card — verify 4-corner diamond accents visible,
  multi-layer shadow reads as "carved plaque," QR code inside
  still scans.
- Controller connection-lost toast — force `phase-lost`, verify
  amber pulse ring + multi-layer border.
- Controller onboarding — verify progress dots show 3D inset
  for empty, bright brass for filled.
- Controller intro splash — verify bulb row pops with inner
  specular highlights.
- Reduced-motion — toast pulse ring stops, other treatments
  are static (shadows, gradients) and unaffected.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Multi-layer box-shadow adds paint cost on low-end mobile | Shadows are compile-time CSS, no layout recalc. Mobile GPUs handle 5-6 layer shadows cleanly |
| Corner diamond accents clash with the QR code's high-frequency pattern | Diamonds sit at CARD corners (inset 6px from rounded edge), QR code is centered inside with its own padding. No overlap |
| Bulb radial gradient drowns out the existing bulbPulse brightness cycle | Bulb pulse animates `filter: brightness()` or shadow opacity, not background. Compound reads as "bright brass stud shimmering" |
| Amber pulse on lost-toast is too aggressive | Pulse is 1.5s ease-in-out (Phase 16 ornament-motion cadence), low-amplitude amber glow. Amplitude tuned below perception-distract threshold |

## Phase handoff

After Phase 23, rectangular / pill / dot UI objects carry
gilded-brass treatment. Remaining Hearthstone-polish arc:
Phase 24 parallax backgrounds, Phase 25 sound design, Phase 26
animation polish.

Audit grade stays at A+ (3.84) — internal object-polish, not
a new scored dimension.
