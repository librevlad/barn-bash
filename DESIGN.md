# Frantics — Design System

Source of truth for visual language across hosts, controller, and game modes.
Established in **Phase 1** (controller onboarding, 2026-04-15). See
`docs/superpowers/specs/2026-04-15-controller-onboarding-design.md`.

## Aesthetic

Retro carnival party game. Warm polished wood, golden ticket accents, red velvet
curtains. Serif slab display typography. Game Master personality in voice and
animation. Sound that feels like a 1950s radio theatre — low fanfares, dings,
theatrical beats.

## Color tokens

```css
:root {
  /* Wood (backgrounds, cards) */
  --bg-wood-deep:       #3d2817;  /* primary bg — dark polished oak */
  --bg-wood-warm:       #5a3a20;  /* cards, buttons base, input bg */
  --bg-wood-lite:       #7a5030;  /* elevated surfaces, medallion inside */

  /* Gold (accents, CTAs, highlights) */
  --accent-gold:        #f4c542;  /* primary accent, borders, ticket buttons */
  --accent-gold-hot:    #ffdd6b;  /* hover/active, glows */

  /* Red (curtains, ribbons, theatre) */
  --accent-red-curtain: #a72d2a;  /* curtain face, player-name ribbon */
  --accent-red-deep:    #6b1818;  /* curtain shadow, ribbon shadow */

  /* Text */
  --text-cream:         #f5ead4;  /* primary text (not pure white) */
  --text-dim:           rgba(245,234,212,0.55);

  /* Status */
  --success-green:      #7bc950;  /* confirmations */
  --danger-red:         #d9534f;  /* errors */
}
```

## Typography

| Use | Family | Weights | Sizes |
|-----|--------|---------|-------|
| Display / headlines | `Alfa Slab One` | 400 (only) | 22, 28, 32, 40, 48px |
| Accents / micro-copy / quips | `Cutive` | 400 (only) | 10, 11, 12, 13, 14, 16, 18px |
| UI / inputs | `Inter` | 400, 600 | 14, 16, 18px |

All via Google Fonts with `display=swap`. Vendor `.woff2` locally in production
for offline and regions where Google Fonts are blocked.

```html
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Cutive&family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

## Spacing

8px base grid.

- Screen edge padding: **24px** default, **16px** on narrow (≤360px viewport).
- Min tap area: **44×44px** (Apple HIG).
- Medallion (circular): **72×72**, shrinks to **64×64** on narrow.
- Color tile (square): **56×56**, shrinks to **48×48** on narrow.

## Motion

- Tap feedback: `transform: scale(0.94)` over **120ms**, returns.
- Selection pulse: **400ms** golden radial glow.
- Curtain reveal: **700ms** `cubic-bezier(0.5, 0, 0.3, 1)`.
- Game Master title card: fade at **400ms** into curtain, hold **250ms**.
- Button hover lift: **1px**, restore on mouse out.

Always wrap motion in `@media (prefers-reduced-motion: reduce)` — curtain → 150ms
crossfade, breathing/pulsing animations disabled.

## Components

### Ticket button (primary CTA)

Gold gradient (light top to dark bottom), 2px brown border, 4px drop shadow
forming a "raised" effect. Two small light-bulb dots inset at left/right on the
center-line. On press: translates 3px down, shadow compresses.

```css
.ticket-btn {
  font-family: var(--font-display);
  background: linear-gradient(180deg, var(--accent-gold) 0%, #d9a82f 100%);
  color: var(--bg-wood-deep);
  border: 2px solid #8a6718;
  border-radius: 14px;
  box-shadow: 0 4px 0 #654a12, 0 6px 14px rgba(0,0,0,0.45);
  /* ::before and ::after pseudo-elements draw the light bulbs */
}
```

### Medallion (animal badge)

Round gold-bordered disk with a dark-wood inset. Emoji or pixel sprite centered.
Selected: outer ring becomes `--accent-gold-hot`, 4 stars orbit via CSS
`@keyframes starOrbit`, haptic `navigator.vibrate?.([15])`.

### Player-name ribbon

Horizontal banner with red velvet face (`--accent-red-curtain`) and deep-red
triangular "tails" at each end (via `::before`/`::after` with border tricks).
Gold text in `Alfa Slab One`.

### Red velvet curtain (transition)

Two layered panels (top + bottom) sliding vertically to meet at center. Fabric
represented by repeating vertical color stripes at 22px intervals. Gold rope
trim (10px solid gold with inner gradient) along the meeting edge.

### Toast banner

Non-blocking. Top of screen, 10-14px text in `Cutive`, wood-warm bg, gold
border. Slides down 14px + fades in over 200ms. Auto-dismisses after 2.5s.

## Prototype

First realization of this system: mobile controller onboarding.
- HTML prototype: `~/.gstack/projects/frantics/designs/controller-onboarding-20260415/finalized.html`
- Screenshots: 9 viewports covered (390×844 and 320×568)
- Spec: `docs/superpowers/specs/2026-04-15-controller-onboarding-design.md`

## Phase roadmap

1. **Phase 1** (this): controller onboarding + theme tokens.
2. **Phase 2**: controller gameplay screens (score, gesture feedback) themed.
3. **Phase 3**: per-game controller UI (race, escape, hill, meteor).

Each phase opens its own spec and consumes (and optionally extends) this
DESIGN.md.
