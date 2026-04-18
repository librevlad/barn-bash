# Frantics — Design System

Source of truth for visual language across hosts, controller, and game modes.
Established **Phase 1** (controller onboarding, 2026-04-15). Extended **Phase 1.5**
(shared tokens + host migration + narrator/sound/a11y, 2026-04-15).

Specs live under `docs/superpowers/specs/`. The canonical token file is
`client-shared/theme.css`. This document explains the **why** behind the tokens
and the **rules** that keep the system coherent across screens.

---

## Aesthetic

Retro carnival party game. Warm polished wood, golden ticket accents, red velvet
curtains. Serif slab display typography. Game Master personality in voice and
animation. Sound that feels like a 1950s radio theatre — low fanfares, dings,
theatrical beats.

Every surface should feel like a hand-built wooden stage. Every transition
should feel like a curtain going up. Every headline should feel like it was
stamped with a letterpress. Nothing about the product should feel Material,
Bootstrap, or Tailwind-default.

---

## Token consumption

All tokens live in `client-shared/theme.css`. Pages consume them via:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Cutive&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/shared/theme.css">
```

Google Fonts with `display=swap` in production. Vendor `.woff2` locally for
offline and regions where Google is blocked.

**Never inline hex values** for carnival colors — always use a token. If the
value you need isn't a token, add it to `theme.css` first.

---

## Color

| Token | Hex | Role |
|-------|-----|------|
| `--bg-wood-deep` | `#3d2817` | Page background, deepest surface |
| `--bg-wood-warm` | `#5a3a20` | Cards, buttons base, inputs |
| `--bg-wood-lite` | `#7a5030` | Elevated surfaces, medallion interior |
| `--bg-wood-ink` | `#2f1c0c` | Vignette floor, shadow gradient stop |
| `--accent-gold` | `#f4c542` | Primary accent, borders, ticket face |
| `--accent-gold-hot` | `#ffdd6b` | Hover / selected / glow |
| `--accent-gold-dim` | `#b0851c` | Gradient bottom stop, thin borders |
| `--accent-gold-edge` | `#8a6718` | Button edges, darker gold borders |
| `--accent-gold-bulb` | `#fff8c8` | Light-bulb highlight, sparkle |
| `--accent-red-curtain` | `#a72d2a` | Curtain face, ribbon face |
| `--accent-red-deep` | `#6b1818` | Curtain shadow, ribbon tails |
| `--accent-red-light` | `#c63a36` | Curtain highlight (top) |
| `--accent-red-fold` | `#8a2a27` | Curtain fold accent stripe |
| `--text-cream` | `#f5ead4` | Primary text — never pure white |
| `--text-dim` | `rgba(245,234,212,0.55)` | Secondary text, captions |
| `--text-faint` | `rgba(245,234,212,0.30)` | Placeholder, disabled copy |
| `--text-on-gold` | `#3d2817` | Dark text used on gold buttons |
| `--text-disabled` | `rgba(245,234,212,0.35)` | Disabled text |
| `--success-green` | `#7bc950` | "You're in", positive outcomes |
| `--danger-red` | `#d9534f` | Errors, destructive actions |
| `--warning-amber` | `#e8a33c` | Approaching timer, caution |
| `--info-blue` | `#5ba8d9` | Informational, neutral notice |
| `--color-player-unknown` | `#8a7a68` | Fallback for player slots when the server assigns a colorId the client does not recognise. Warm grey — stays in palette. |

Scrims for overlays: `--scrim-light` (0.28), `--scrim-medium` (0.55),
`--scrim-dark` (0.75), `--scrim-heavy` (0.85). Use `--scrim-heavy` behind modals
so the bg painting stays readable but fully secondary.

**Contrast rules.** Body text on `--bg-wood-deep` or `--bg-wood-warm` must use
`--text-cream` (4.8:1 on deep, 4.5:1 on warm — WCAG AA). Dim text (`--text-dim`,
`--text-faint`) is for captions and meta only, never body content or interactive
labels. Gold text (`--accent-gold`) only on deep-wood backgrounds — it washes out
on warm wood.

---

## Typography

| Role | Family | Weights | Notes |
|------|--------|---------|-------|
| Display / headlines | `Alfa Slab One` | 400 only | Carnival poster slab, ornamental |
| Accents / micro-copy / quips | `Cutive` | 400 only | Typewriter, "old ticket" feel |
| UI / inputs / body | `Inter` | 400, 600 | Legible on small screens |
| Monospace | `SF Mono` / `Consolas` fallback | 400 | Connection URLs, debug |

Modular scale (`var(--fs-*)`):

| Token | Size | Use |
|-------|------|-----|
| `--fs-xs` | 10px | Micro-copy, eyebrow labels |
| `--fs-sm` | 12px | Pill labels, secondary meta |
| `--fs-base` | 14px | Body default |
| `--fs-md` | 16px | Prompts, inputs |
| `--fs-lg` | 18px | Emphasised body, primary button |
| `--fs-xl` | 22px | Sub-headings, large ticket button |
| `--fs-2xl` | 26px | Screen headlines |
| `--fs-3xl` | 28px | Waiting title, tournament ribbon |
| `--fs-4xl` | 32px | Game-over text |
| `--fs-5xl` | 40px | Section titles |
| `--fs-6xl` | 48px | Hero splash |
| `--fs-7xl` | 56px | `FRANTICS!` intro mark |

Letter-spacing: `--tracking-tight` (0.5px) for slab display, `--tracking-norm`
(1px) for UI buttons, `--tracking-wide` / `wider` / `widest` (2/3/4px) for
eyebrow labels and all-caps micro-copy.

Line-height: `--leading-tight` (1.15) for headlines, `--leading-norm` (1.4)
for body, `--leading-loose` (1.6) for narrator quips.

**Rules.** Never use system fonts for visible text — they break the aesthetic.
Never use Alfa Slab below 18px; it becomes unreadable. Never use Cutive for
interactive labels (buttons, links) — its typewriter feel reads as
"decorative," not "tappable." Inter carries all UI affordance.

---

## Spacing

8px base grid, exposed as `--sp-*`:

| Token | Value | Use |
|-------|-------|-----|
| `--sp-2xs` | 2px | Hairline gaps |
| `--sp-xs` | 4px | Icon-to-label, tight grids |
| `--sp-sm` | 8px | Standard gap |
| `--sp-md` | 16px | Default component padding |
| `--sp-lg` | 24px | Section spacing, screen edge |
| `--sp-xl` | 32px | Large blocks |
| `--sp-2xl` | 48px | Hero spacing |
| `--sp-3xl` | 64px | Rare, dramatic breaks |

Screen edge: `--pad-edge` (24px default, **16px on ≤360px viewports**). Use
`safe-area-inset-*` where the page covers the full viewport.

Tap target minimum: **44×44px** (`--tap-min`, Apple HIG). Exceptions require
visible hit-area padding.

---

## Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 4px | Ribbon, tight borders |
| `--radius-md` | 8px | Inputs, tiles, toasts |
| `--radius-lg` | 10px | Name input, modal sections |
| `--radius-xl` | 14px | Cards, ticket buttons |
| `--radius-2xl` | 20px | Contestant pills |
| `--radius-round` | 9999px | Circles, medallions |

---

## Borders

| Token | Value | Use |
|-------|-------|-----|
| `--border-hair` | 1px | Subtle dividers |
| `--border-thin` | 1.5px | Pills, light outlines |
| `--border-norm` | 2px | Inputs, card edges, ticket buttons |
| `--border-thick` | 3px | Medallion ring, primary selected state |

---

## Elevation / shadows

Standard drop-shadow scale:

| Token | Use |
|-------|-----|
| `--elevation-xs` | Pills, small chips |
| `--elevation-sm` | Resting cards, secondary buttons |
| `--elevation-md` | Default card / toast |
| `--elevation-lg` | Prominent card, waiting card |
| `--elevation-xl` | Hero, modal |

Specialty (the "3D stacked lift" for ticket buttons):

- `--shadow-ticket` — resting ticket button (offset + diffuse)
- `--shadow-ticket-hover` — lifted on hover
- `--shadow-ticket-press` — pressed down
- `--shadow-ticket-off` — disabled (offset only, no diffuse)

Inset (for wooden recessed feel):

- `--inset-wood` — cards, medallion interior
- `--inset-input` — text inputs (depth + sharp cast)

Glows (for selected, focus, bulbs):

- `--glow-gold-soft` — subtle gold halo
- `--glow-gold-hot` — bright gold halo (selected state)
- `--glow-gold-focus` — accessible focus ring
- `--glow-red-ribbon` — soft red shadow under ribbon

Text shadows for theatrical headlines:

- `--text-shadow-stack` — the stacked-letterpress effect (2 solid layers + blur)
- `--text-shadow-glow` — curtain title glow (red cast + gold halo)

**Rule.** Never invent new shadows inline. If the existing tokens don't cover
the need, add a new one to `theme.css` and document it here.

---

## Motion

Durations (`--dur-*`):

| Token | Value | Use |
|-------|-------|-----|
| `--dur-instant` | 80ms | Body transform on tap feedback |
| `--dur-tap` | 120ms | Button press feedback |
| `--dur-short` | 200ms | Hover states, toast slide |
| `--dur-pulse` | 400ms | Selection pulse, quick fade |
| `--dur-medium` | 500ms | Screen transitions (non-curtain) |
| `--dur-curtain` | 700ms | Red velvet curtain reveal |
| `--dur-long` | 1200ms | Loading spinners, splash auto-advance |
| `--dur-breathe` | 3000ms | Idle title breathing |

Easings:

- `--ease-out` — standard enter (`cubic-bezier(0.22, 1, 0.36, 1)`)
- `--ease-curtain` — curtain motion (`cubic-bezier(0.5, 0, 0.3, 1)`)
- `--ease-bounce` — playful pop (`cubic-bezier(0.34, 1.56, 0.64, 1)`)

Signature motions:

- **Tap feedback**: `transform: scale(0.94)` over `--dur-tap`, returns.
- **Selection pulse**: 400ms golden radial glow around selected cell.
- **Curtain reveal**: 700ms top-down + bottom-up, meeting at center, with Game
  Master title card held 250ms at middle.
- **Title breathing**: scale(1.02) every 3s on hero text — ambient life sign.
- **Button hover lift**: 1px rise, restore on mouse out.

**Reduced motion.** Every animation must honor
`@media (prefers-reduced-motion: reduce)`:

- Curtain → 150ms crossfade (single panel fade, no sliding).
- Breathing, pulsing, orbiting stars → disabled (`animation: none`).
- Ticket press → instant (`transition: none`).
- Toast slide → instant opacity swap.

---

## Background textures

Applied as `background: var(--bg-*)`. Defined once in `theme.css`, reused
everywhere — do not re-declare inline.

- `--bg-wood-plank` — dark polished oak. Repeating vertical hairline stripes
  (4px period, 4% black) + two radial vignettes (warm top-left, dark
  bottom-right) + 175° linear gradient from `#4a2f1c` to `var(--bg-wood-ink)`.
  Use on all full-screen carnival surfaces.
- `--bg-curtain-fabric` — red velvet. Vertical 22/26/48/52px stripe cadence
  over a vertical gradient `#c63a36 → --accent-red-curtain → #7a1d1a`. Use on
  curtain panels only.
- `--bg-bulb` — radial gold bulb. Highlight at 30% 30% (`--accent-gold-bulb`),
  falling through `--accent-gold-hot` to `--accent-gold-dim`. Use on any round
  lightbulb or sparkle highlight.
- `--bg-ticket-face` — gold button linear gradient (`--accent-gold` →
  `#d9a82f`). Use on all ticket-btn faces.
- `--bg-ticket-face-hot` — hover variant (`--accent-gold-hot` →
  `--accent-gold`).
- `--bg-ribbon` — red vertical ribbon gradient (`--accent-red-curtain` →
  `#7d1f1e`). Use on player-ribbon and tournament banners.

---

## Z-index

Flat scale, not 999999-ad-hoc:

| Token | Value | Use |
|-------|-------|-----|
| `--z-bg` | 0 | Background paintings |
| `--z-base` | 10 | Default content |
| `--z-hud` | 25 | In-game HUD overlays |
| `--z-overlay` | 50 | Modal backdrop |
| `--z-toast` | 150 | Toast banners |
| `--z-curtain` | 200 | Curtain transitions |
| `--z-modal` | 500 | Modal content above overlay |
| `--z-top` | 1000 | Onboarding root, system critical |

---

## Components

### Ticket button (primary CTA)

Gold gradient face with brown edge, two bulb dots inset, stacked 3D shadow.

```css
.ticket-btn {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  background: var(--bg-ticket-face);
  color: var(--text-on-gold);
  border: var(--border-norm) solid var(--accent-gold-edge);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-ticket);
  letter-spacing: var(--tracking-norm);
  padding: 16px 36px;
  min-height: var(--tap-min);
}
.ticket-btn:hover { background: var(--bg-ticket-face-hot); transform: translateY(-1px); box-shadow: var(--shadow-ticket-hover); }
.ticket-btn:active { transform: translateY(3px); box-shadow: var(--shadow-ticket-press); }
.ticket-btn:disabled { opacity: 0.45; filter: grayscale(0.4); box-shadow: var(--shadow-ticket-off); }
.ticket-btn-large { font-size: var(--fs-xl); padding: 18px 44px; min-width: 240px; }
```

The two `::before`/`::after` bulbs use `--bg-bulb` and sit inset on the
center line. Press drops the button 3px down and compresses the shadow.

### Secondary button (no gold fill)

Wood-warm background, gold border, cream text. Use for confirm/dismiss where
the primary flow already has a ticket-btn present.

```css
.secondary-btn {
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: var(--fs-md);
  background: var(--bg-wood-warm);
  color: var(--text-cream);
  border: var(--border-norm) solid var(--accent-gold);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  min-height: var(--tap-min);
  box-shadow: var(--elevation-sm);
}
.secondary-btn:hover { border-color: var(--accent-gold-hot); box-shadow: var(--glow-gold-soft); }
```

### Ghost button (text + underline)

For "change," "back," and inline actions.

```css
.ghost-btn {
  font-family: var(--font-accent);
  font-size: var(--fs-sm);
  color: var(--text-dim);
  text-decoration: underline;
  letter-spacing: var(--tracking-wide);
  background: none; border: none; cursor: pointer;
  padding: 8px 4px; min-height: var(--tap-min);
  text-transform: uppercase;
}
.ghost-btn:hover { color: var(--accent-gold); }
```

### Icon button

Transparent, expandable hitbox, only swap color on state.

```css
.icon-btn {
  background: none; border: none;
  color: var(--text-dim);
  font-size: 22px;
  min-width: var(--tap-min); min-height: var(--tap-min);
  display: inline-flex; align-items: center; justify-content: center;
}
.icon-btn:hover { color: var(--accent-gold); }
.icon-btn:focus-visible { outline: 2px solid var(--accent-gold-hot); outline-offset: 3px; }
```

### Destructive button

Red border over wood. Used for "Leave the show?" confirm.

```css
.destructive-btn {
  background: var(--bg-wood-warm);
  color: var(--danger-red);
  border: var(--border-norm) solid var(--danger-red);
  border-radius: var(--radius-md);
  padding: 12px 20px;
  font-family: var(--font-ui); font-weight: 600;
}
.destructive-btn:hover { background: var(--danger-red); color: var(--text-cream); }
```

### Medallion (animal badge)

Round gold-bordered disk with radial wood inset. Emoji / pixel sprite 36×36
centered. Selected state: outer ring becomes `--accent-gold-hot`, 4 stars
orbit, `navigator.vibrate?.([15])`.

### Player-name ribbon

Red velvet horizontal banner with deep-red triangular tails at each end
(border-trick pseudo-elements). Gold Alfa Slab text. See
`client-controller/onboarding.css` `.player-ribbon` for the canonical recipe.

### Red velvet curtain (transition)

Two layered panels sliding vertically to meet at center. Panel background is
`--bg-curtain-fabric`. Gold rope trim (`::after` pseudo, 10px linear-gradient
gold strip) along the meeting edge. Title card (`Alfa Slab`, gold, with
`--text-shadow-glow`) fades in at 400ms into the curtain, holds 250ms.

### Toast banner

Non-blocking, top of screen.

```css
.toast {
  background: var(--bg-wood-warm);
  border: var(--border-thin) solid var(--accent-gold);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-family: var(--font-accent);
  font-size: var(--fs-base);
  color: var(--text-cream);
  box-shadow: var(--elevation-md);
}
```

Slides down 14px + fades over `--dur-short`. Auto-dismisses after 2.5s
(success/info) or stays until tap (warnings).

### Contestant pill

Wood-warm glass pill with gold hairline border, used both in the controller's
waiting room and the host's top bar.

```css
.contestant-pill {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px;
  background: var(--scrim-light);
  border: var(--border-hair) solid rgba(244,197,66,0.15);
  border-radius: var(--radius-2xl);
  font-family: var(--font-accent);
  font-size: var(--fs-base);
  color: var(--text-cream);
}
```

### Input (text)

Wood-warm background, gold border, inset shadow for depth. Inter 600 body
text centered.

```css
.text-input {
  background: var(--bg-wood-warm);
  border: var(--border-norm) solid var(--accent-gold);
  border-radius: var(--radius-lg);
  color: var(--text-cream);
  font-family: var(--font-ui); font-weight: 600; font-size: var(--fs-lg);
  box-shadow: var(--inset-input);
  height: 56px; padding: 0 18px;
}
.text-input::placeholder {
  font-family: var(--font-accent); font-style: italic;
  color: var(--text-dim);
}
.text-input:focus {
  border-color: var(--accent-gold-hot);
  box-shadow: var(--inset-input), var(--glow-gold-focus);
  outline: none;
}
```

### Progress dots

Small circles, empty (gold hairline border) or filled (gold + soft glow).
3-dot pattern used for onboarding; could extend to 5-dot for tournament rounds.

### Idle quip slot

A reserved line of italic `--font-accent` at the bottom of choice screens.
Used for the Game Master's ambient commentary while the player chooses.

---

## Narrator / Game Master voice

The Game Master is a character, not a UI system. Every line routes through
`client-shared/narrator.js` (host) or the inline `#narrator-idle` slot. On
controller, only the curtain title cards speak in the GM voice during
onboarding — gameplay controller screens stay reactive, not dialogic.

### Personality

Theatrical, sardonic, slightly mean but affectionate. Imagine a 1930s radio
carnival barker who has seen too many shows. Would rather see you lose
spectacularly than win quietly. Always talks *about* the players, rarely *to*
them.

Voice influences: Rod Serling (Twilight Zone narrator cadence), Edna Mode
(short sharp asides), Werner Herzog (fatalistic amusement), a tired
Disneyland ride operator.

### Rules

1. **Second-person rare.** Prefer "the contestants," "our brave souls," "some
   of you," over "you." When addressing a specific player, use the name slot
   (`{player}`) not "you."
2. **Short sentences.** Two sentences per quip is the ceiling. One is the
   default. A period beats a comma-splice every time.
3. **Wry, not cruel.** "Tragic." "That's... something." "Rest in pieces."
   Aim for deadpan, not villain.
4. **Present tense, except for eliminations.** Live action runs now;
   eliminations are already past. "{player} tried. That's... something."
5. **No emoji, no exclamation chains.** One `!` max. The font does the yelling.
6. **Avoid earnest praise.** If a player wins, compliment them backhandedly
   ("Impressive. Or lucky. Hard to tell.") or resignedly ("I must admit,
   {player}, that was... adequate.").
7. **Quip-cap safety.** The narrator system dedupes within session (see
   `narrator.js` `shown` set). When adding new pools, aim for 10+ entries so
   players see a fresh line for 10+ repeats before recycling.
8. **Named pools exist for every game event.** See `client-shared/narrator.js`
   for the canonical pool list: `INTROS` (per-game), `ELIMINATIONS`, `WINNER`,
   `NO_WINNER`, `TOURNAMENT_START`, `TOURNAMENT_STANDINGS`,
   `TOURNAMENT_ROUND_INTRO`, `TOURNAMENT_CHAMPION_QUIPS`, `FOX_CLOSE`,
   `SHIELD_BLOCK`, `SPEED_BURST`, `POWERUP`, `STUMBLE`, `FOX_ANGRY`,
   `BIOME_CAVE`, `BIOME_SNOW`, `BIOME_VOLCANO`. Add new pools; don't overload
   existing ones with off-topic quips.

### Examples

**Good:**
- `"The fox doesn't get tired. You do."` (game intro, Escape)
- `"{player} discovered that the floor is optional."` (elimination)
- `"Congratulations, {player}. Try not to gloat."` (winner)
- `"Buckle up. This is going to be messy."` (tournament start)

**Bad (what to avoid):**
- `"Let's get this exciting game started! 🎮🔥"` — earnestness, emoji
- `"Player 3, you were eliminated because you ran out of health. Better luck next time!"` — second person, long, explanatory, kindly
- `"LOSER!"` — cruel, single-word, no voice
- `"It's time to race!"` — generic cheerful announcer, not GM

### Display surfaces

- **Host idle quip** (`#narrator-idle`, Cutive italic, `--fs-lg`) — floats
  over `bg.png`. Cycles every 9s.
- **Host narrator overlay** (`narrator.js` injects `#narrator-overlay`,
  bottom 60px, backdrop-blur pill) — triggered by game events. Has a
  "Game Master" label + quip.
- **Controller curtain title** (`--font-display`, gold, center) — short
  all-caps announcements between onboarding screens ("AND NOW... THE
  ANIMAL!"). Not a narrator overlay; theatrical title card.

---

## Sound design

Procedural Web Audio, not sample-based. See `client-shared/sound.js` (effects +
lobby/game themes) and `engine/Audio.js` (layered music engine with base /
tension / action voices).

### Effect tokens

Call via `Sound.play('name')`. Tied to discrete UI events. Each is designed
so the same effect can appear across multiple games without confusion.

| Effect | Trigger | Character |
|--------|---------|-----------|
| `countdownTick` | 3, 2, 1 before round start | 660Hz sine, 120ms |
| `countdownGo` | GO! | 880Hz + 1320Hz double-ding |
| `correct` | Correct answer (Color Smash) | Ascending sine pair |
| `wrong` | Wrong answer / minor fail | Low sawtooth growl |
| `roundStart` | Round begins | Rising two-tone |
| `jump`, `jump2`, `land`, `slide` | Escape actions | Swept sines, filtered noise |
| `shieldPickup`, `speedPickup`, `coinPickup` | Powerups | Bright ascending triads |
| `shieldBreak`, `stumble` | Damage taken | Noise burst + low square |
| `nearMiss` | Close call / hover | Quick double-tone (also used for hover SFX) |
| `foxGrowl`, `foxSprint`, `foxLeap`, `foxClose` | Escape fox AI | Sawtooth + filtered noise |
| `dash`, `bump` | Hill King | Triangle sweep / noise burst |
| `meteorWarn`, `meteorImpact`, `dodge` | Meteor | Low sine warn / noise impact / sweep dodge |
| `eliminated` | Any player out | Descending sawtooth + noise |
| `winner` | Round winner | Ascending 4-note sine arpeggio |
| `champion` | Tournament champion | 6-note ascending sine + octave-down triangle |
| `shrink` | Hill arena shrinking | Two descending square pulses |

Use `Sound.play('nearMiss')` for UI hover — it's the only SFX consistently used
in non-gameplay contexts.

### Music themes

`Sound.startMusic(theme)` — `lobby`, `escapeFox`, `hillKing`, `meteor`, `race`.
Each is a layered base + melody + arp with a low-pass filter (`filterFreq`
ranges 400–900Hz). BPM maps to game energy (`lobby` 80, `meteor` 100,
`hillKing` 120, `escapeFox` 140, `race` 160).

`engine/Audio.js` extends this with tension + action layers that crossfade
based on gameplay intensity (`audio.setTension(0.0-1.0)`,
`audio.setIntensity(0.0-1.0)`). Use `AudioEngine` for new games that need
dynamic music; `Sound.startMusic` is fine for static lobby loops.

### Rules

- **Always gate first playback behind user interaction.** Browsers block
  auto-play. The existing pattern is `document.addEventListener('click',
  () => Sound.startMusic('lobby'), { once: true })`.
- **Hover SFX is optional, click SFX is not.** Every interactive control
  should have a click response, even if subtle.
- **Narrator quips dip music.** When the Game Master speaks, duck music
  volume by ~40% for the quip duration. (Future implementation — not yet
  wired.)
- **Use `navigator.vibrate?.([15])` alongside** selection and significant
  toggle events on the controller. Short pulses only; never long or
  repeated.

---

## Iconography

Phase 1 uses emoji placeholders and CSS pseudo-elements. This is deliberate —
custom icons are a Phase 4 upgrade.

- **Animals** (`client-controller` onboarding): emoji (`🐱🐸🐺🐻🐰🐷🐔🦝`),
  swap-ready to 64×64 pixel sprites at `assets/sprite-animal-*.png`. Maintained
  in `client-shared/characters.js` and mapped 1:1 in `host-common.js`.
- **Stars** (`✦` in `::before`/`::after` on selected medallion) — CSS-only,
  gold-hot color, orbit animation.
- **Light bulbs** (`::before`/`::after` on ticket-btn) — CSS-only, 6×6 circles
  using `--bg-bulb`, inset 10px from left/right on centerline.
- **Settings gear** (`⚙`, in waiting screen) — emoji, `icon-btn` hitbox.
- **Car colors** (10 tiles) — PNG sprites from `assets/sprite-cars.png`,
  `image-rendering: pixelated`. Shared map in `client-shared/colors.js`.
- **Ticket PNGs** (game-select modal, tournament tile) — hand-crafted
  sprites in `assets/ticket-*.png`. Never scale up — they're sized 1:1 with
  the modal grid cells.

When custom icons arrive, follow these rules:

- 24×24 stroke weight 2px, no fills, gold (`--accent-gold`) or text-cream
  (`--text-cream`) by state.
- Always centered in a 44×44 tappable hitbox.
- Paired with a text label for screen readers (`aria-label`).

---

## Accessibility

- **Contrast.** Body text `--text-cream` on wood-deep/warm surfaces clears
  WCAG AA (4.5:1). `--text-dim` is below AA — only use for captions and
  decorative meta, never for interactive labels or body copy.
- **Tap targets.** Minimum 44×44px (`--tap-min`). Visible element can be
  smaller; hit area is enlarged with padding.
- **Focus.** Every interactive control gets a visible focus ring:
  `outline: 2px solid var(--accent-gold-hot); outline-offset: 3px`.
- **Reduced motion.** Every animation wraps in
  `@media (prefers-reduced-motion: reduce)`. Curtain → crossfade;
  breathing / orbiting → off.
- **Keyboard navigation.** Controller flows: Tab advances, Enter submits /
  activates primary CTA, Esc goes back (equivalent of BACK link). Host
  lobby: Tab cycles buttons (Play, Customize, Settings), Space/Enter
  activates.
- **ARIA.** `<input>` has `autocomplete="off"` on name fields. Buttons built
  from `<div>` or `<button>` with no text must have `aria-label`. Dialog
  overlays use `role="dialog"` + `aria-modal="true"` + focus-trap.
- **Screen reader narrator.** Narrator quips are decorative and should not
  be announced repeatedly. Add `aria-live="polite"` only on the initial
  quip slot, not the quip itself, and debounce changes.
- **Safe areas.** Every full-screen surface respects `safe-area-inset-*`
  so notches and home bars don't eat content.

---

## Responsive breakpoints

CSS custom properties can't drive media queries; these are the canonical
ranges referenced throughout `theme.css` and component files.

| Name | Range | Notes |
|------|-------|-------|
| narrow | ≤ 360px | iPhone SE portrait, old Androids — `--pad-edge` drops to 16px |
| phone | 361–430px | iPhone 14 / 14 Plus / Pro Max portrait (default) |
| tablet | 431–768px | iPad portrait — container max-width ~460px, centered |
| desktop | ≥ 769px | Host display — always fullscreen, no mobile chrome |

Write media queries against the **upper bound** of narrower ranges
(`@media (max-width: 360px)`) so the next range inherits desktop defaults.

---

## Text layout (Pretext)

Any text block that (a) wraps across multiple lines AND (b) lives inside a
container whose height depends on the text — narrator quips, Game Master
zingers, elimination copy, winner hero + subline + quip, rules tooltips,
card descriptions — is measured with **Pretext**, not approximated by CSS.

Pretext is vendored at `client-shared/pretext.js` (ES module, 30KB). A thin
imperative wrapper at `client-shared/pretext-hooks.js` exposes:

```js
window.PretextHooks.measure(el)    // prepare + layout, applies minHeight
window.PretextHooks.release(el)    // stop tracking
window.PretextHooks.relayoutAll()  // re-layout everything (called on resize)
window.PretextHooks.whenReady(fn)  // run fn once Pretext + fonts resolve
window.PretextHooks.isReady        // boolean flag
```

The hooks script is included in both `client-host/index.html` and
`client-controller/index.html` via `<script src="/shared/pretext-hooks.js">`.
It gates measurement on `import('/shared/pretext.js')` + `document.fonts.ready`
so the first `prepare()` always uses the real Inter/Alfa Slab/Cutive metrics,
never the system fallback.

### When to call measure()

Call `PretextHooks.measure(el)` **immediately after setting `textContent`**
on an element whose height should match its wrapped content. Examples
from the live codebase:

- `client-controller/gameplay.js` — `els.elimQuip` on phase 'eliminated',
  `els.goHero` + `els.goSubline` + `els.goQuip` in `onGameOver()`
- `client-host/main.js` — `.card-desc` + `.tip-body` inside `#game-modal`
  on `$btnPlay` click (the modal-open gate)

### When NOT to call measure()

- Single-line labels that never wrap (`.gp-eyebrow`, `.card-name` when
  bounded to 1 line) — unnecessary overhead.
- Decorative glyphs, icon-only buttons, background painting.
- Text inside `<svg>` or `<canvas>` — Pretext measures DOM text only.

### Tokens touched by Pretext

Pretext reads computed styles at measurement time, so the font-family,
font-size, line-height, and font-weight on each tracked element must come
from `--font-*`, `--fs-*`, `--leading-*`, `--font-weight-*`. If those
tokens change, call `PretextHooks.relayoutAll()` to re-run layout with
the new metrics.

---

## States (summary)

Recipes for each stateful combination; implement via classes, not ad-hoc:

| State | Visual cues |
|-------|-------------|
| Default | Base token colors |
| Hover | `--accent-gold` → `--accent-gold-hot`, 1px rise, `--glow-gold-soft` |
| Active / pressed | Ticket stacked shadow compresses, 3px drop |
| Focus-visible | 2px `--accent-gold-hot` outline, 3px offset |
| Selected | `--accent-gold-hot` border, `--glow-gold-hot` halo |
| Disabled | Opacity 0.45, `filter: grayscale(0.4)`, no shadow |
| Loading | Breathing animation at `--dur-breathe`, no interactivity |
| Error | `--danger-red` border/text, subtle shake (translate ±6px) |
| Success | `--success-green` flash + check glyph |
| Empty | Dashed border, `--text-faint`, placeholder copy in `--font-accent` italic |

---

## Per-game conventions

Every per-game host (race / escape / hill / meteor) consumes `theme.css`
and follows the same pattern:

- **Body bg**: `var(--bg-wood-deep)` + `var(--bg-wood-plank)`. Canvas renders
  over this during gameplay; the plank only shows through during lobby /
  winner-overlay states.
- **HUD** gets a top gradient scrim (`rgba(61, 40, 23, 0.72)` → transparent)
  to keep stats readable over any canvas content.
- **Primary stat** (lap, distance, wave, alive): Alfa Slab, gold, with red
  letterpress + soft gold glow.
- **Eyebrow label** (GRAND PRIX, ESCAPE THE FOX): Cutive, uppercase,
  gold, widest tracking.
- **Countdown**: 140px Alfa Slab gold with deep red drop-stack + bloom.
- **Message**: context-colored Alfa Slab with red letterpress — gold for
  positive moments (race "GO!"), gold-hot for playful (hill), danger-red for
  threat (escape, meteor).
- **Winner-overlay backdrop**: `rgba(47, 28, 12, 0.9)` + blur 6px.
- **All buttons**: ticket-btn pattern (gold face, 3D-stacked shadow, Alfa
  Slab copy). No plain white-text-on-dark-pill carry-over from the old UI.
- **Narrator quotes** inside overlays: Cutive italic `--text-dim`.

Per-game canvas colors (gameplay graphics) are not mandated by the design
system — each game keeps its character palette (race greens, meteor reds,
etc). The system governs UI, not the game world.

## Prototype

First realization of this system: mobile controller onboarding.

- HTML prototype: `~/.gstack/projects/frantics/designs/controller-onboarding-20260415/finalized.html`
- Production CSS: `client-controller/onboarding.css` (uses shared tokens)
- Screenshots: 9 viewports covered (390×844 and 320×568)
- Spec: `docs/superpowers/specs/2026-04-15-controller-onboarding-design.md`

Second realization: host lobby (Phase 1.5, 2026-04-15).

- Production HTML: `client-host/index.html`
- Uses shared tokens via `/shared/theme.css`
- PNG sprite buttons retained; Georgia replaced with Alfa Slab + Cutive

Third realization: all 4 per-game hosts + shared overlays (Phase 1.5,
2026-04-15).

- `client-host-race/`, `client-host-escape/`, `client-host-hill/`,
  `client-host-meteor/` — HUD / countdown / message / winner-overlay / lobby
  in carnival tokens.
- `client-shared/narrator.js`, `postgame.js`, `tournament.js`, `hud.js`,
  `transitions.js` — overlay UI mig­rated to shared tokens with fallbacks.
- Screenshots: `screenshots-review/per-game-*-lobby.png`,
  `screenshots-review/postgame-carnival-final.png`,
  `screenshots-review/tournament-*-carnival.png`,
  `screenshots-review/narrator-overlay-pinned.png`.

Fourth realization: canvas signature effects across race / escape / hill /
meteor (Phase 3, 2026-04-16).

- `engine/palette.js` — shared CSS-token → canvas surface, motion token
  mirror (`dur`, `ease`), pre-built gradient builders (`spotlight`,
  `redCurtain`, `ticketFace`, `woodPlank`) and letterpress helpers. All
  renderers read colors through it with graceful fallbacks to inline hex
  when the module is absent.
- `client-host-race/render2d.js` — brass three-layer track border, red-velvet
  finish banners + gold-rope arch + Alfa Slab FINISH label with red
  letterpress, wood-plank lap pennant (180ms drop, 640ms hold, 230ms rise;
  deduped by lap number so the first crossing wins).
- `client-host-escape/render2d.js` — gold-bulb halo behind every pickup
  (shield / speedBoost / coin), biome curtain wipe covering the last 12%
  of each biome (two panels from screen edges + gold rope seam), fox
  gold-eye glare synchronized with the `fox_growl` server event.
- `client-host-hill/render2d.js` — brass rim three-layer gold band
  (accent-gold-edge / accent-gold-dim / accent-gold-hot), king-zone
  spotlight with breathing oscillator, danger-red shrink pulse when the
  arena tightens under 3.5 units.
- `client-host-meteor/render2d.js` — two-phase telegraph
  (warning-amber underlay, danger-red pulsing ring on top), gold-bulb +
  smoke impact bloom, gold-bulb safe-zone tile with Alfa Slab SAFE label.
- Screenshots:
  `screenshots-review/phase3a-palette-wired-escape-lobby.png`,
  `screenshots-review/phase3b-race-track-brass.png`,
  `screenshots-review/phase3b-race-lobby-after.png`,
  `screenshots-review/phase3b-meteor-warning-safe.png`,
  `screenshots-review/phase3c-hill-brass-crown.png`,
  `screenshots-review/phase3d-lap-pennant-race.png`.

Phase 3d polish is deliberately lightweight — the lap pennant was the only
new signature effect reserved out of Phase 3b into the polish window.
Live 4-controller timing tweaks (biome-curtain duration, fox-eye bloom
radius, meteor telegraph hold) are left to follow-up playtests and should
be captured in the decisions log as they land.

Fifth realization: offline-first assets, functional iconography, and
dark-only browser-chrome lock (Phase 4, 2026-04-16).

- `/assets/fonts/` — Alfa Slab One, Cutive, and Inter (weights 400/600
  from a shared variable binary) vendored as 12 woff2 files across
  Latin / Latin-ext / Cyrillic / Cyrillic-ext / Greek / Greek-ext /
  Vietnamese subsets. `fonts.css` preserves Google's `unicode-range`
  split so a Latin-only viewport only downloads the Latin slice
  (~48 KB for Inter, not the full 228 KB). Six HTML entries replaced
  their `fonts.googleapis.com` `<link>` with a single local include;
  `server/index.js` added `font/woff2` and `font/woff` MIME types.
  `LICENSE.txt` records the SIL OFL 1.1 provenance for all three
  families.
- `/client-shared/icons.js` — functional-icon SVG sprite injected as
  `<svg id="frantics-icon-sprite">` into `document.body`. `Icons.use(id)`
  returns string markup, `Icons.el(id)` returns a live DOM node;
  both reference `<symbol>`s via `<use href="#icon-id">` so the sprite
  loads once per page. Initial roster: phone, wifi, arrow-right, check,
  close, gear. All paths use `currentColor` so icons tint through CSS.
  `client-controller/onboarding.js` replaced the rotate-gate phone emoji
  (`\u{1F4F1}`) with `Icons.use('phone')`; the platform-emoji-jitter is
  gone.
- Animal identities (cat / frog / wolf / bear / bunny / pig / chicken /
  raccoon) remain Unicode emoji — that's the cultural identity layer
  and the OS-native rendering is the feature, not the bug.
- `client-shared/theme.css` — `:root { color-scheme: dark; }` plus a
  `@media (prefers-color-scheme: light) { :root { color-scheme: dark; }}`
  re-assertion, and `<meta name="color-scheme" content="dark">` added
  to every HTML entry. Browser-chrome (scrollbars, form controls, iOS
  safe-area) now renders dark variants even when the OS theme is light.
- Screenshots:
  `screenshots-review/phase4a-controller-offline.png`,
  `screenshots-review/phase4a-host-lobby-offline.png`,
  `screenshots-review/phase4b-rotate-gate-icon.png`,
  `screenshots-review/phase4b-icon-sheet.png`.

Phase 4 closes the last visible carnival seams. The product now ships
to a captive-portal venue on a USB stick with all three brand fonts,
consistent chrome icons, and guaranteed-dark browser chrome.

Sixth realization: custom animal avatars + Game Master narrator
portrait (Phase 5a + 5b, 2026-04-16).

- `assets/animal-{cat,frog,wolf,bear,bunny,pig,chicken,raccoon}.png` —
  eight 1024×1024 PNG portraits commissioned through a human-in-the-
  loop image-generation pipeline (one prompt at a time, prompt
  template + per-animal accents checked into the Phase 5 spec).
  Style: digital-watercolor children's storybook, matching
  `assets/bg.png`'s "Barnyard Bedlam" hand — medium dark ink outlines,
  soft washy color fills, rounded friendly anthropomorphic
  proportions, small carnival-fair accents (neckerchief / jester
  collar / denim overalls / railway cap / racing jersey) extending
  the bg.png vocabulary.
- `client-controller/onboarding.js` — ANIMALS array gains an `avatar`
  field per entry; new `animalGlyph(a, extraClass)` helper renders
  `<img>` with an onerror handler that swaps in the unicode emoji as
  a text node so the display never breaks before a PNG drops. Four
  render sites switched: selection-grid medallion, waiting-screen
  player card, contestant pills, quick-confirm card.
- `client-shared/host-common.js` — `charAvatars` constant plus shared
  `renderCharGlyph(character, extraClass)` helper consumed by the
  main host's lobby player pill. Local emoji-only `charIcons` maps
  in per-game hosts, postgame, hud, tournament, and the in-canvas
  race renderer stay unchanged — those are small-context icons where
  emoji holds up and the integration win isn't worth the churn.
- `client-controller/onboarding.css` — `.animal-glyph` (medallion /
  player-card sites) uses `object-fit: cover` + `border-radius: 50%`
  so PNG transparent-edge padding never bleeds past the gold ring;
  `.animal-glyph-inline` for contestant-pill / quick-info contexts
  sizes at 1.4em with the same circular clip.
- `assets/narrator.png` — 1024×1024 digital-watercolor Game Master
  portrait in the same "Barnyard Bedlam" style as the animal roster:
  top hat with red ribbon, twirled handlebar moustache, brass
  spectacles, red tailcoat with gold buttons, white-gloved showman's
  gesture. Transparent background so it reads naturally against the
  overlay's wood-brown pill.
- `client-shared/narrator.js` — `#narrator-overlay` layout switched
  from a centered vertical text stack to a horizontal flex row
  (64px portrait circle + `narrator-body` column holding the
  `Game Master` label and quip). Max-width bumped 560 → 640 and
  padding rebalanced for the left-anchored portrait. `showQuip`
  renders `<img class="narrator-portrait" onerror="this.remove()">`
  so a missing asset collapses cleanly to the pre-5b text-only
  layout. New `.narrator-portrait` style: `border-radius: 50%` +
  `object-fit: cover`, accent-gold-edge border, inset + drop shadow
  for depth.
- Screenshots:
  - `screenshots-review/phase5a-parade-complete.png` — all eight
    avatars in the "Choose your fighter" grid as a single consistent
    family.
  - `screenshots-review/phase5b-narrator-overlay-forced.png` — GM
    portrait sitting in the lobby idle narrator pill beside a quip;
    reads as a single character card.

Phase 5 closes the product's content-identity layer. Animals no
longer render differently across Windows / iOS / Android / Chrome
versions, and the Game Master finally has a face to attach his
theatrical voice to.

Seventh realization: painterly biome trees overlay escape's procedural
renderer, with a shared PNG-loading utility that strips image-gen
tools' checker-preview backgrounds (Phase 6, 2026-04-17).

- `assets/tree-{forest,cave,snow,volcano}.png` — four 1024×1024
  digital-watercolor trees, one per escape biome, commissioned through
  the Phase 5 human-in-the-loop pipeline. Each anchors its biome:
  forest is lush leaf-green with warm brown trunk; cave is mossy
  desaturated green with stone-grey trunk and a small mushroom
  cluster; snow is blue-green canopy with a thick snow cap and frost-
  dusted trunk; volcano is charcoal-black with a charred-red canopy
  shot through with ember-orange highlights.
- `engine/SpriteLoader.js` — new `loadPainterly(name, url, opts)`
  method. Image-gen tools export "transparent" assets by rendering a
  neutral-grey + white checker-preview pattern into the raster
  instead of a true alpha channel (all Phase 5 and Phase 6 PNGs have
  opaque corners). loadPainterly runs two passes: (1) a strict
  chroma-key that clears pixels with near-zero chroma and high
  brightness, catching the bulk of clean checker squares, and (2) an
  edge-seeded flood fill that BFS-expands inward from transparent
  edge pixels through neutral-bright neighbours, catching tinted
  checker remnants (snow had r=g±2, b=253-style pixels that slipped
  past the strict pass). Interior highlights — snow caps, ember
  glow, mushroom pale — stay opaque because they aren't connected
  to the outside boundary.
- `client-host-escape/render2d.js` — at module init, four biome
  sprites load via `SpriteLoader.loadPainterly`. A new
  `getBiomeTreeSprite()` returns the current biome's canvas when
  loaded AND the biome-blend window is below 80% (gates mid-
  transition pop). `drawTrees`' type-0 (round-canopy) branch tries
  the painterly sprite first and falls through to the existing
  multi-layer canopy procedural code untouched when the sprite
  isn't available. Pines (type 1) and bushes (type 2) stay
  procedural — they're small-silhouette filler art where the
  integration win doesn't justify the art budget.
- `client-host-escape/index.html` — pulls in
  `/engine/SpriteLoader.js` so render2d can reuse the loader.
- `client-host-race/render2d.js` — `TREE_VARIANTS = ['tree-forest']`
  alongside BUSH_VARIANTS and ROCK_VARIANTS. `generateTrackObjects`
  now rolls three-way: 25% painterly tree / 45% bush (still "tree"
  type) / 30% rock. Painterly sprites carry a `bigSprite` flag that
  bumps `drawTrackObjects`' sprite scale from 2.0 to 2.2 so the
  tree reads as a taller feature beside shorter bush silhouettes.
  Loaded via `SpriteLoader.loadPainterly` to share the chroma-key
  path.
- `server/index.js` — `readFile` err branch now returns 404 for
  ENOENT and 500 only for real IO failures. Surfaced during Phase 6a
  when escape tried to load the three uncommissioned biome trees;
  client-side `.catch()` silently handled the fallback, but the 500
  console spam was noise.
- Screenshots: `screenshots-review/phase6b-escape-{forest,cave,snow,
  volcano}.png` — painterly trees anchoring each biome, procedural
  pines filler unchanged.

Phase 6 closes the first environmental-art pass. The procedural
renderer stays as the durable fallback; painterly art layers in
where the biome-characterising silhouette lives (round canopy)
without competing with pines / bushes / rocks for readability.

Eighth realization: controller gameplay module — the
post-onboarding HUD, hintbar, confirmations, elimination overlay,
spectator view, game-over card, and connection-lost toast, all
consumed through a single `Gameplay.*` API (Phase 2, shipped
2026-04-15, retro-documented 2026-04-17).

- `client-controller/gameplay.js` + `client-controller/gameplay.css`
  — production carrier of the gameplay spec. gameplay.js exposes a
  19-method API: `start / stop / setPhase / setCountdown / setScore /
  setContext / setModifier / setItem / setMeteorWarn / nearMiss /
  setActionPrimary / onLocalAction / holdStart / holdEnd /
  rejectAction / setSpectators / onGameOver / setConnectionAttempt /
  getPhase`. gameplay.css scopes every selector under
  `.gameplay-root` and consumes `/shared/theme.css` tokens for
  colors, typography, spacing, and motion. Reduced-motion block
  disables decorative keyframes.
- `client-controller/main.js` — rewritten as a thin WebSocket ↔
  Gameplay adapter (+261/-482). Legacy per-element DOM writes
  (`$info`, `$score`, `$result`, `$status`, `$gameName`, `$cdWrap`,
  `$cdFill`, `$pulse`, `$arrow`, `$holdRing`, `$gestHint`) gone;
  `engine/Input.js` gesture manager and WebSocket reconnect loop
  stay in main.js as controller-level concerns. Per-game behaviour
  maps directly: `gameSelected / tournamentRound` → `setPhase('idle'
  |'countdown')`, `state.phase=running` → `setScore / setItem /
  setMeteorWarn / setModifier`, discrete events (`powerup_collected`,
  `shield_break`, `bump`, `lap_complete`, etc.) route through
  `onLocalAction` / `rejectAction` with carnival-labelled confirms.
- `client-controller/index.html` — legacy gameplay DOM nodes
  deleted outright (not hidden); only the onboarding root, dpad
  dev-helper, and script tags remain. `gameplay.css` linked after
  `onboarding.css`; `gameplay.js` loads before `main.js` so
  `Gameplay` is global at WS-handler time.
- `ensureGameplay(gameId)` rebuilds the module on target-game
  change (playtest caught frozen eyebrow / icon / hintbar when
  switching between games in the same session).
- Elimination quip seeded deterministically from
  `playerId + round`, so a reconnecting eliminated player sees the
  same GM line they had before the WS dropped.
- `navigator.vibrate?.(pattern)` fires on significant transitions
  (countdown tick, elimination, game-over reveal). This is the
  Phase 2c polish piece that landed inline with the 2b
  implementation.
- Phase 2a (standalone HTML prototype for 8 screens at 390×844)
  was skipped — pattern was proven in Phase 1 onboarding and
  implementation went directly to production. Phase 2c remaining
  polish (stumble / powered animation tuning after multi-player
  playtest, tournament round-break UX verification) is deferred
  until live 4-controller playtest data accumulates.

Phase 2 closes the gameplay half of the controller UX. Onboarding
(Phase 1) and gameplay (Phase 2) both flow through token-scoped
modules with clean stop/start semantics; the controller no longer
has any "legacy" DOM writing code paths.

Ninth realization: per-game hero art — one painterly PNG per game
that wasn't covered by Phase 6, reusing the Phase 6 SpriteLoader
pipeline verbatim (Phase 7, 2026-04-17).

- `assets/hill-crown.png` — 1024×1024 digital-watercolor royal crown.
  Five gold spires tipped in red velvet, central ruby, pearl inlays
  around the rim.
- `assets/meteor-crater.png` — 1024×1024 digital-watercolor impact
  crater. Cracked dark-rock rim, ember-orange veins radiating from
  the centre, pale smoke plume rising.
- `assets/race-flag.png` — 1024×1024 digital-watercolor checker
  racing flag on a warm-brown pole with a gold cap, caught mid-
  flutter. Checker squares painted with slight imperfection, not
  machine-precise.
- `client-host-hill/render2d.js` + `client-host-hill/index.html` —
  hill picks up SpriteLoader (it had never needed it). The sprite
  loads via `SpriteLoader.loadPainterly` at init; `drawKingZone`
  renders the painterly crown at `kingR * 1.8` centered on the
  king-zone anchor with `globalAlpha = 0.85`, so the gold-bulb
  spotlight and dashed-gold ring still frame it. Falls back to the
  original gold-tinted emoji text (`\uD83D\uDC51`) when the sprite
  isn't loaded.
- `client-host-meteor/render2d.js` + `client-host-meteor/index.html`
  — meteor also picks up SpriteLoader. A new `craterFX` array
  tracks active craters as `{ x, z, t0 }`; a new `craters` scene
  layer at depth 17 (between `safezone=15` and `players=20`)
  renders them UNDER the impact flash so the flash reads as "the
  moment" and the crater as "the aftermath". Each entry ramps
  scale 0.3 → 1.0 over 180ms, alpha 1.0 → 0 over the next 820ms,
  and is pruned at 1000ms — no accumulation on rapid-fire impacts.
  `onImpact` now pushes an entry into `craterFX` alongside the
  existing camera shake + impact flash + FIRE particle burst.
- `client-host-race/render2d.js` — the sprite loads next to
  `tree-forest` in the SpriteLoader chain. In the finish-line
  block, the procedural red-velvet banner rectangles + gold-bulb
  caps are replaced by two painterly flag sprites. The PNG has
  its pole on the LEFT; the right-side flag is mirrored via
  `ctx.scale(-1, 1)` so both flags wave toward the track
  interior — finishers see them "greeting" them. Flag sizes to
  `bannerH × 1.4 × bannerH × 1.5` (taller than the previous
  14×34 banner) so it reads as a feature rather than a stripe.
  Gold rope + FINISH label + checker ground tile stay procedural.
  Procedural banner + gold-bulb remain as the sprite-missing
  fallback.
- `engine/SpriteLoader.js` — `loadPainterly` refactored from
  two-pass (strict full-image chroma-key + edge-seeded flood
  fill) to edge-seeded flood fill only. The prior strict pass
  ate pure-white interior squares of the checker flag because
  it treated every bright-neutral pixel the same, ignoring
  connectivity. Edge-seeded fill treats only pixels connected
  to the image boundary as checker. Interior whites (flag
  squares, snow caps) survive because saturated ink outlines /
  dark canopy edges break the flood path. Opt names renamed
  `tightChroma/tightBright/looseChroma/looseBright` →
  `seedChroma/seedBright/expandChroma/expandBright` for clarity.
- Screenshots: `screenshots-review/phase7{a,b,c}-*.png` — each
  hero piece in its native context (king-zone centerpiece,
  crater mid-fade, finish-line composite).

Phase 7 closes per-game hero-art bucket. Every game's signature
moment — king-zone crown, meteor impact, finish-line crossing —
now carries painterly art alongside its procedural framework.

Tenth realization: second-layer per-game hero art for the moments
Phase 7 didn't cover — arena-shrink crest on hill, safe-zone
bullseye on meteor, three-tier podium on race postgame
(Phase 8, 2026-04-17).

- `assets/hill-crest.png` — 1024×1024 digital-watercolor heraldic
  crest: gold-and-ruby crown matching `hill-crown.png`, hand-painted
  green laurel branches, red velvet ribbon banner with three gold
  stars.
- `assets/meteor-target.png` — 1024×1024 digital-watercolor
  bullseye: black outer rim, carnival red band, cream-white inner
  band, gold center dot. Painterly imperfection in ring edges.
- `assets/race-podium.png` — 1024×1024 digital-watercolor three-
  tier podium: tall center with gold "1", left shorter with silver
  "2", right shortest with bronze "3", warm-brown wood pedestals
  with gold-leaf trim, red velvet curtain backdrop.
- `client-host-hill/render2d.js` — new `crestFade` module-scope
  variable ramps 0→1 over ~400ms once `renderPlatR < 3.5` is
  reached; monotonic (never reverts) so micro-oscillations around
  the threshold don't flicker. New `crest` scene layer at depth 22
  (above players=20, below ui=40) registers `drawHillCrest`, which
  renders the sprite anchored at world (0, -4) at 2.5×zoom size
  with `globalAlpha = crestFade * 0.85` — HUD strip still reads
  through at full intensity.
- `client-host-meteor/render2d.js` — sprite loads alongside
  `meteor-crater` at init. In `drawSafeZone`, after the green
  glow + bulb core + pulsing ring but before the "SAFE" Alfa Slab
  label, draws the target centered on the safe-zone anchor at
  1.6× the safe radius with `globalAlpha = 0.8`. Label stacks
  above so text stays legible.
- `client-shared/postgame.js` — `show(opts)` gains an optional
  `backdrop` slot. When set, prepends
  `<img class="pg-backdrop" onerror="this.remove()">` as the first
  overlay child. CSS anchors the img at `bottom: 0` centered
  horizontally with max-height 380px. Z-ordering: backdrop gets
  `z-index: 0`, all other overlay children get
  `position: relative; z-index: 1` — without the explicit
  positioned-relative rule, `position: absolute` backdrop paints
  AFTER the static flex siblings and buries the text.
- `client-host-race/main.js` — race's `game_over` handler passes
  `backdrop: '/assets/race-podium.png'` into `PostGame.show`. Other
  games leave the slot undefined and render as before.
- Screenshots: `screenshots-review/phase8{a,b,c}-*.png` — each
  second-layer piece in its native moment (hill danger state,
  meteor warning state, race winner overlay).

Phase 8 covers the second-tier per-game signature moments. The
pipeline — commission a painterly PNG, load via
`SpriteLoader.loadPainterly` (edge-seeded after Phase 7c), overlay
with graceful procedural fallback — is now well-proven and can
extend indefinitely for further per-game art without architecture
rework.

Eleventh realization: tournament-champion painterly throne backdrop
(Phase 9, 2026-04-17).

- `assets/tournament-champion.png` — 1024×1024 digital-watercolor
  ornate royal throne. Carved wooden back, red velvet cushion and
  armrests, gold-leaf ornamental trim, gold laurel wreath floating
  above as a ceremonial award, red velvet curtain drape behind.
- `client-shared/tournament.js` — in `renderChampion`, prepends
  `<img class="t-backdrop" src="/assets/tournament-champion.png"
  onerror="this.remove()">` to `#t-content.innerHTML` before the
  existing champion text stack. createOverlay's inline stylesheet
  gains `.t-backdrop` rules (absolute-positioned, anchored at
  `bottom: -40px; left: 50%` centered, max-height 440px, opacity
  0.85, `z-index: 0`) and the `position: relative; z-index: 1`
  rule on `#t-content > *:not(.t-backdrop)` that mirrors the
  Phase 8c `PostGame.pg-backdrop` z-ordering fix.
- Backdrop present only during champion mode — standings and
  round-intro renderers clear `content.innerHTML` when they fire,
  so the tournament-champion art never leaks into the mid-round
  scoreboard or the between-round title card.

Phase 9 closes the tournament ceremony art. The throne + laurel +
curtain composition matches the product's "carnival-storybook
grand stage" language established by `bg.png`, the animal roster,
and the race podium. Session's peak moment now carries a
commissioned visual anchor.

Twelfth realization: per-game lobby painterly carnival backdrops —
first AAA-polish pass after the audit raised the benchmark bar
(Phase 10, 2026-04-17).

- `assets/lobby-race.png` — carnival race-starting arch: wooden
  posts with gold finial bulbs, deep-red velvet banner with a
  cream-white center panel, checker-flag bunting, painted toy
  race-car silhouette ornaments on the posts.
- `assets/lobby-escape.png` — forest gateway: weathered wooden
  posts with gold-lit lanterns, rope banner with cream-white
  drape, painted fox-tail silhouette crests along the rope,
  green vines curling up the posts.
- `assets/lobby-hill.png` — king's-arena banner: gold-gilded posts,
  red velvet drapes at the upper corners, cream-white center panel,
  gold crown silhouette cresting the top, carved chess-king-piece
  ornaments standing at the post bases.
- `assets/lobby-meteor.png` — cosmic tent entrance: wooden posts
  topped by gold star-finials, deep-navy-blue banner with gold
  star patterns, cream-white center panel, painted meteor trails
  tapering down the posts, shooting-star crest on top.
- Each per-game host (`client-host-{race,escape,hill,meteor}/
  index.html`) gains `.lobby-backdrop` CSS rules (absolute
  centered, max 500×700, z-index 0, opacity 0.95) plus the
  `#lobby > *:not(.lobby-backdrop) { position:relative; z-index:1 }`
  rule that the Phase 8c/9a z-index pattern proved out. The
  `<img class="lobby-backdrop" onerror="this.remove()">` sits as
  first child of `#lobby`.
- Each `main.js` runs a `setTimeout(0, ...)`-deferred
  `SpriteLoader.loadPainterly` pass against its lobby PNG and
  swaps the `<img>` src to the processed canvas's data URL when
  ready. setTimeout defers past SpriteLoader.js's own script-
  execution in the per-game HTML include order. Raw PNG with a
  baked white surround paints first (~100ms); processed version
  with a transparent surround replaces it once loadPainterly
  resolves.
- Title stack (FRANTICS eyebrow + Alfa Slab game title + Waiting
  italic caption) renders on top of the cream center panel via
  the z-index rule. The cream panel is sized large enough to
  contain the Alfa Slab title without clipping against the painted
  banner edges.

Phase 10 closes the largest single AAA gap identified in the
post-Phase-9 audit. Per-game lobby screens — seen 1-3 times per
session — now read as commissioned carnival stages rather than
wood-plank placeholder backgrounds. The four compositions form a
style-consistency series: the same archway/banner language with
per-game silhouette ornaments + accent colors. This sets the
reference bar for Phase 11+ frame commissions (selection-grid
cells, tournament scoreboard, gameplay orb, background ornaments).

Thirteenth realization: painterly selection-grid cell frames
replace the flat brown rectangles that hosted the car cells and
gameplay action cards (Phase 11, 2026-04-17).

- `assets/cell-car.png` — painterly carnival auction-ticket frame:
  rectangular wooden plaque, gold-leaf ornamental trim, cream-white
  center panel, gold star crest, gold tassels at top corners,
  rope-twist along the bottom. Used 10× in the car-selection grid.
- `assets/cell-action.png` — painterly slot-machine button face:
  rounded wooden outer ring, gold-rim bezel around a cream-white
  center circle, ornate gold curls at top+bottom, gold rivet bulbs
  at the four compass points. Used 3× in the controller gameplay
  action-hintbar row.
- Integration via CSS `::before` pseudo-element with a
  `background-image: var(--cell-{car,action}-bg, url('/assets/
  cell-{car,action}.png'))` rule — one PNG load per frame, reused
  across N cells with zero per-cell HTML changes.
  `background-size: 100% 100%` stretches to fit the cell bounds;
  the landscape (car) and round (action) ornaments survive the
  mild aspect squish without visual break.
- `document.documentElement.style.setProperty(
  '--cell-{car,action}-bg', 'url(' + canvas.toDataURL() + ')')`
  — CSS custom-property swap at root scope once loadPainterly
  resolves. Raw PNG renders during the first paint (~100ms with
  the baked white surround); processed transparent version
  replaces the bg-image once the data URL lands.
- Cell children (img for car, icon+label for action) get
  `position:relative; z-index:1` so they paint above the frame
  backdrop (mirror of Phase 8c/9a/10 z-index pattern).
- Primary-action selected-state glow migrated from `box-shadow`
  to `filter: drop-shadow()` — the latter tracks the actual
  painted silhouette (round action button) rather than a
  rectangular bounding box.

Phase 11 closes the second AAA-polish surface. The flat-brown
placeholder cells are gone across both the onboarding car
selection and the gameplay HUD action hintbar. Animal-medallion
cells intentionally kept as-is (post-Phase-5 audit fix's
loadPainterly processing + gold-ring CSS reads at bar). Host
game-select modal already commissioned via `ticket-*.png` in
Phase 1.5.

Fourteenth realization: painterly tournament scoreboard + avatar
orb in the controller gameplay HUD (Phase 12, 2026-04-17).

- `assets/standings-scroll.png` — painterly wooden scoreboard
  with gold-leaf trim, rope cords draping top+bottom, four cream-
  white horizontal slot strips separated by gold dividers,
  central gold emblem crest, painted carnival-flag silhouettes
  at the corners. Prepended inside `#t-content` during
  `Tournament.renderStandings`; loadPainterly swap strips the
  baked white surround once the PNG is processed.
- `#t-content` layout for standings switches from horizontal
  flex-row of score cards to vertical flex-column of row strips,
  matching the four painted slot strips in the scroll. Each
  `.t-player` row is color-dot + name + score laid out as a
  horizontal strip inside a cream slot. Text colors flip to dark-
  brown name on cream + deep-red score with gold letterpress so
  the content reads on the painted cream slot background instead
  of the dark overlay scrim it previously sat on.
- Controller gameplay avatar orb adopts the Phase 11b
  `cell-action.png` frame (reused via the same
  `--cell-action-bg` CSS custom property). One painted slot-
  machine face hosts both the avatar orb AND the three action
  cards — a single ornament language across all four HUD cells
  in the bottom row.
- Animal avatar in the orb finally consumes the Phase 5a
  painterly pipeline: `<img data-animal="{character}">` renders
  in place of the raw emoji, with an async `loadPainterly` pass
  swapping `src` to the processed data URL (Phase 5a onboarding
  already did this; controller gameplay was the last surface
  still rendering emoji). Emoji fallback retained via
  `onerror="this.replaceWith(document.createTextNode(emoji))"`.
- Pulse animation on the orb's painted frame reduced from
  `box-shadow: 0 0 14px currentColor` + opacity to opacity-only
  (0.88 → 1 at 1.2s ease-in-out). Rectangle-shaped box-shadow
  over a round painterly silhouette painted a per-game-colored
  rectangle around the orb; the painted frame carries all the
  visual interest on its own.
- Action-card labels (`SWIPE-STEER / BOOST / DRIFT`) reposition
  from inside the 72px cell (where the painted slot-machine
  bottom ornament cropped them) to `position: absolute; top:
  100%; margin-top: 4px` BELOW the card. `overflow: visible` on
  the cell permits the label to escape. Text-shadow gives
  contrast against the HUD scrim.

Phase 12 closes the tournament scoreboard and the controller
gameplay HUD's avatar orb — the two remaining audit-flagged
"flat CSS cards vs Hearthstone bar" surfaces. Controller gameplay
HUD now reads as four painted slot-machine faces in a row
(avatar + 3 actions) with consistent ornament language; between-
round tournament standings read as a painted wooden scoreboard
with four score strips instead of flex cards on a dark scrim.

Fifteenth realization: motion polish — universal idle breathing
on hero titles + hover gold shine-sweep on interactive cards
(Phase 14, 2026-04-17). Pixel-car replacement (Phase 13) skipped
per user direction as large content ask with marginal uplift
vs direct motion work.

- `client-shared/theme.css` — two new CSS utility layers:
- `@keyframes breatheHero` (scale 1.0 → 1.015 → 1.0, opacity
  0.92 → 1.0 → 0.92 over `--dur-breathe` 3000ms infinite).
  Applied via direct selectors to `#lobby h1`, `#lobby h2`,
  `#lobby .hud-title`, `#t-content .t-title`, `#postgame-overlay
  .pg-winner-name`, plus a `.breathe` utility class for ad-hoc
  use. Scope important: `.hud-title` is ALSO used in the
  in-game `#hud` for lap / distance counters; the `#lobby`
  prefix keeps breathing to the lobby attraction-banner
  moment only, not the gameplay HUD.
- `@keyframes shineSweep` (translateX -140% → 380% + skew-20°
  over 800ms). `::after` pseudo-element on `.ticket-btn`,
  `.onboarding-root .color-cell`, `.onboarding-root .animal-cell`
  — a faint gold diagonal band sweeps across the card face
  on hover and re-triggers per hover. Host element gets
  `position:relative; overflow:hidden` for clean clipping at
  the painted frame edges.
- `.gameplay-root .gp-action` deliberately excluded from the
  shine-sweep: its `overflow: visible` is required so Phase
  12b's below-frame labels don't clip. Controller is touch-
  only so the hover sweep would rarely fire anyway.
- Both layers honor `@media (prefers-reduced-motion: reduce)`:
  breathing animation falls to `none`, shine-sweep animation
  falls to `none`. Reduced-motion users see the static UI
  exactly as the painted surfaces render.

Phase 14 closes the third AAA-polish dimension — motion. The UI
no longer reads as static pixel art; hero titles breathe, cards
flash gold on hover, the product feels "alive" at rest. Zero new
PNG assets required; entirely CSS-driven.

Sixteenth realization: background ornaments — carnival bunting
drape at the top of every full-screen overlay + gold filigree
corner flourishes at each corner (Phase 15, 2026-04-17).

- `assets/ornament-bunting.png` — painted rope strung with
  alternating red + white triangular flags, tiny gold-bulb
  lights, warm-brown carved wooden end-caps at each side of the
  rope loop. 2064×512 landscape master.
- `assets/ornament-corner.png` — gold filigree corner flourish
  occupying the top-left quarter of a 1024×1024 square; gold
  vine-and-scroll with a tiny central ruby gem. Rendered 4×
  per overlay via CSS transforms (tl natural, tr scaleX(-1),
  bl scaleY(-1), br scale(-1,-1)) — one asset, four corners.
- `client-shared/theme.css`:
  - `#tournament-overlay::before`, `#postgame-overlay::before`,
    `#lobby::before` rule renders the bunting at `height: 90px`
    across the top edge via `background-repeat: repeat-x` so
    the same 2064×512 asset tiles horizontally at any
    viewport width.
  - `.ornament-corner` base rule + four variant classes for
    position + transform. `!important` needed on position
    and z-index to beat the per-host Phase 10a
    `#lobby > *:not(.lobby-backdrop) { position: relative }`
    selector that would otherwise push corner divs into the
    flex flow.
- `client-shared/host-common.js`:
  - `_initPainterlyPipeline` deferred to `DOMContentLoaded`
    event (was `setTimeout(0)`). Async `<script>` fetching
    makes `setTimeout(0)` race past subsequent script
    parsing — `DOMContentLoaded` guarantees all parser-
    blocking scripts (including SpriteLoader) have executed.
  - `loadPainterly('ornament-bunting', ...)` uses custom
    thresholds `{ seedBright: 135, expandBright: 120,
    expandChroma: 25 }` — the bunting PNG's checker is
    two-tone (~150 / ~180), dimmer than the default
    seedBright 185. Processed data URL injected as
    `<style id="phase15a-bunting-override">` with
    `!important` to override the CSS fallback.
  - `loadPainterly('ornament-corner', ...)` uses defaults
    (corner PNG has standard white/grey checker).
  - New `_addCornersTo(overlayEl)` helper injects 4
    `<div class="ornament-corner tl|tr|bl|br">` children
    into any overlay. Idempotent (checks for existing .tl).
    Called at init for the already-in-DOM `#lobby`; exported
    as `HostCommon.addCornerOrnaments`.
- `client-shared/tournament.js` + `postgame.js` — call
  `HostCommon.addCornerOrnaments(overlay)` immediately after
  `document.body.appendChild` in createOverlay so corners
  attach on first mount.

Phase 15 closes the fourth and final AAA-polish dimension —
background ornaments. Every full-screen overlay (main lobby,
per-game lobbies, tournament standings + champion, postgame
winner) now carries:
- bunting draped across the top edge (framing the attraction)
- gold filigree at each of the four corners (framing the stage)

Combined with the earlier phases' painted backdrops (lobby
arches, scoreboard scroll, throne, podium), each overlay reads
as a tangible carnival stage rather than a CSS card floating on
dark scrim.

Seventeenth realization: ornament motion — bunting sways,
bulbs pulse, corners shimmer. CSS-only additions layered on
the Phase 15 static ornaments (Phase 16, 2026-04-17).

- `client-shared/theme.css` — three new keyframes added inline
  within the Phase 15 ornament block:
- `@keyframes buntingSway`: `rotate(-0.5deg)` ↔ `rotate(0.5deg)`
  applied to the bunting `::before` selectors with
  `transform-origin: 50% 0` (pivot at top-center, sway like
  hanging fabric). 4s ease-in-out infinite.
- `@keyframes buntingBulbPulse`: `filter: brightness(0.95)` ↔
  `brightness(1.05)` on the same selectors. 2.2s ease-in-out
  infinite. Gold bulbs + wooden end-caps breathe together —
  reads as "sunlight shifting on the festival stage."
- `@keyframes cornerShimmer`: same 0.95↔1.05 brightness band
  on `.ornament-corner` at 6s ease-in-out. Per-corner mirror
  transforms preserved; filter stacks without affecting
  `scaleX/Y` values.
- Cycles chosen DIFFERENT periods (4s sway / 2.2s bulb / 6s
  shimmer / 3s Phase 14 title breathing) so compound motion
  drifts out of phase and reads as ambient rather than
  synchronized.
- `prefers-reduced-motion: reduce` block extended: all four
  ornament animations collapse to `animation: none`,
  continuing the Phase 14 a11y pattern.

Phase 16 adds the last layer of motion polish. Zero new assets;
entirely driven by keyframes on existing elements. The product
now breathes at rest: titles pulse subtly, cards shine on
hover, bunting sways as if in a light breeze, gold corners
catch the light slowly.

Eighteenth realization: post-audit polish + Pretext + WebP —
Phase 17, shipped 2026-04-18 across 21 commits.

- **17a — audit fixes.** The 2026-04-17 AAA design audit
  (`.gstack/design-audit-20260417/design-audit-frantics.md`)
  produced 16 labelled findings. Fourteen landed as dedicated
  commits on master, each tagged with its finding ID — a11y
  baseline (F-02, F-03, F-04, F-05-partial), content safety
  (F-01 tournament round counter guard, F-14 player-color
  fallback tokenized), responsive gates (F-07 QR code on
  host JOIN card via vendored qrcode-generator, F-08
  "WRONG SCREEN, FRIEND" at (min-width:1024) + pointer:fine,
  F-09 "WRONG SHOW, FRIEND" at (max-width:768)), hierarchy
  (F-11 "TAP TO SKIP" legibility lift), typography (F-12
  font-family hoist), motion (F-15 durations tokenized to
  `--dur-*`), performance (F-13 host bg 2.77MB → 298KB WebP),
  and timing (F-16 intro dwell 1200→2800ms). A seventeenth
  finding, F-17, surfaced post-audit when the controller's
  rotate-gate fired inside `/test/` iframes at standard laptop
  heights; fixed by adding `(pointer: coarse)` to the media
  query so the gate only triggers on actual touch hardware
  — mirror of F-08's `pointer: fine` signal. F-06 and F-10
  were investigated and marked not-applicable (already
  satisfied); F-05's `<main>` landmark deferred.
- **17b — Pretext.** Vendored `kazuhikoarase/pretext.js` (MIT,
  ~30KB ES module) at `client-shared/pretext.js`. A thin
  imperative wrapper at `client-shared/pretext-hooks.js`
  exposes `PretextHooks.measure(el) / release(el) /
  relayoutAll() / whenReady(fn) / isReady`. The hooks script
  is included in both `client-host/index.html` and
  `client-controller/index.html` via `<script src="/shared/
  pretext-hooks.js">`. It gates measurement on both
  `import('/shared/pretext.js')` AND `document.fonts.ready`
  so the first `prepare()` always uses real Inter / Alfa
  Slab / Cutive metrics, never system fallbacks. A
  body-scoped `ResizeObserver` drives `relayoutAll()` on
  viewport change. Consumer sites: `client-controller/
  gameplay.js` (elim-quip, game-over hero+subline+quip),
  `client-host/main.js` (game-select modal card-desc +
  tip-body), `client-shared/narrator.js` (quip body),
  `client-shared/tournament.js` (standings commentary line).
  Pattern is additive — if the import fails, elements fall
  back to CSS-defined heights.
- **17c — WebP content-negotiation.** Two commits sweep all
  102 PNGs in `/assets/` into WebP siblings (the first
  covers 45 assets ≥500KB; the second rounds out the
  remaining 57). Totals: 89MB PNG (source-canonical,
  unchanged) + 7.1MB WebP (-92% wire weight). `server/
  index.js` gains `preferWebp(filePath, acceptHeader)`:
  when a request for `/assets/foo.png` carries `Accept:
  image/webp` AND a sibling `.webp` exists on disk, the
  server serves the WebP with `Content-Type: image/webp`.
  Response carries `Vary: Accept` so proxies cache the two
  representations separately. All existing `.png` URLs in
  HTML / JS / CSS / canvas code keep working untouched —
  modern browsers pick up WebP transparently, old ones
  still get PNG. The BARNYARD BEDLAM host backdrop drops
  2.77MB → 298KB, closing the audit's performance finding.

Phase 17 lifts the project from audit grade **B (2.99)** to
**A+ (3.84)** across the 10 weighted dimensions, with
typography, color, motion, interaction, responsive, content
quality, and join-flow all moving up at least half a band.
DESIGN.md gained a **Text layout (Pretext)** section
(committed separately as 7783a30) and a `--color-player-unknown`
token row. Spec:
`docs/superpowers/specs/2026-04-18-post-audit-polish-design.md`.
Audit doc:
`.gstack/design-audit-20260417/design-audit-frantics.md`.

Nineteenth realization: controller gameplay overlay backdrops —
Phase 18, shipped 2026-04-18 across 4 commits. Paints the three
full-screen overlays that stack above controller gameplay
(`.gp-eliminated-overlay`, `.gp-spectate-block`,
`.gp-gameover-overlay`) with the same painted-theatre register
established by Phases 8c (race podium) and 10 (lobby backdrops).

- **18a — `gameover-hall.png`.** Painterly hall-of-fame: red velvet
  curtains parted at the sides, gold-braided rope tiebacks, wooden
  proscenium with gold-leaf carvings, warm center-stage spotlight
  pool, carnival bunting hint at the top rail. One universal asset
  fires on all four games' controller game-over. Winner composition
  (eyebrow + avatar + hero name + subline + quip + BACK TO LOBBY)
  sits inside the spotlight. Host-side Phase 8c race podium
  continues independently — different surface.
- **18b — `elim-shadow.png`.** Painterly "after the act" theatre:
  lowered red curtain with a thin gold seam of light peeking
  between the panels, dim warm spotlight on wooden floorboards, a
  fallen jester hat resting near the hem, stage-dust motes in the
  light. Dimmer than hall-of-fame but still daylight-pastel —
  never sinister. Grayscale elim avatar + red `ELIMINATED` + GM
  quip composition sits on the dim stage.
- **18c — spectate reuses `standings-scroll.png`** (Phase 12a, no
  new asset). `<img class="gp-spec-backdrop">` centers the wooden
  scoreboard at natural aspect ratio; pill list constrained to the
  cream slot column (220px × 62%); dot 10px; emoji hidden; names
  flip to `--text-on-gold`; scores become display-font red; leader
  row gets gold glow instead of the previous `· LEADER` text tag.
  Tournament pattern applied to controller.
- **18d — WebP siblings via Phase 17c pipeline.**
  `gameover-hall.webp` 394KB (-81% of the 2.08MB PNG),
  `elim-shadow.webp` 336KB (-85% of 2.22MB PNG). Modern clients
  pay ~730KB instead of ~4.3MB for both painted atmospheres;
  server's existing `preferWebp()` + `Vary: Accept` does the
  negotiation.

Shared CSS pattern across the three overlays: `<img>` backdrop is
first child with `position: absolute; inset: 0; object-fit: cover;
z-index: 0; opacity: 0.95`. All siblings get `position: relative;
z-index: 1`. For gameover and elim, the heavy dark-blur scrim
drops from 0.92 to 0.55 so the painted atmosphere reads while the
blur still separates the state from live gameplay underneath. JS
side: one `setTimeout` array loop drives `SpriteLoader.loadPainterly`
for the three backdrops in parallel, async-swapping each `<img>.src`
to the processed data URL so baked checker previews never peek past
the painted edges. Raw PNG renders from first paint via the
fallback; processed data URL replaces once loadPainterly resolves.

Phase 18 depth-polishes the final emotional-beat surfaces that Phase
12b touched only at the orb level. Audit grade stays at A+ (3.84) —
the 2026-04-17 audit didn't score controller overlay backdrops as a
separate dimension; this is internal visual-depth polish. A
follow-up audit against live-game conditions would exercise the
new painted overlays. Spec:
`docs/superpowers/specs/2026-04-18-controller-hud-polish-design.md`.

Twentieth realization: in-game HUD chrome paint — Phase 19,
shipped 2026-04-18 across 3 commits. Paints the two biggest
controller gameplay HUD surfaces (the score / countdown numbers
and the bottom hintbar) to finish the painted-HUD arc started in
Phase 11b (action cards) and 12b (avatar orb).

- **19a — `score-plaque.png`** (1536×1024). Ornate painted carnival
  scoreboard — gold-leaf corner ornaments, cream inner panel, red
  accent ribbons, warm brown wood frame. CSS `::before` with
  `background-image: var(--score-plaque-bg, url(...))` stretches
  behind `.gp-score-block` (small inset bleed so the frame
  ornaments frame the 64px score) AND `.gp-countdown-digit`
  (bigger inset to accommodate the 180px countdown letterform).
  One asset, two surfaces — same Phase 12b reuse discipline that
  took cell-action to both the action cards and the avatar orb.
- **19b — `hintbar-stage.png`** (1536×1024). Red-gold proscenium
  valance running across the top + wooden theatre-floor planks
  receding in slight perspective. `background-image: var(--hintbar-
  stage-bg, url(...))` covers the full 96px hintbar strip. The
  previous dark `linear-gradient` scrim drops from 0.82 to 0.45
  so the painted stage reads while still fading into the safe-area
  inset. The four per-game action cards (Phase 11b painted slot-
  machine frames) now sit on the stage like carnival attractions
  on a fair row — "attraction on a stage" becomes the live-play
  mental model.
- **19c — WebP siblings** via the Phase 17c pipeline.
  `score-plaque.webp` 326KB (-88% of 2.69MB PNG),
  `hintbar-stage.webp` 831KB (-76% of 3.49MB PNG). Modern clients
  pay ~1.15MB instead of ~6.18MB for the painted chrome.

JS side: the module-init `setTimeout` that drives Phase 11b + 12b
`cell-action` preload collapses into a forEach loop over three
`[key, customProp, url]` tuples (`cell-action`, `score-plaque`,
`hintbar-stage`). Raw PNG CSS fallback renders from first paint;
processed (checker-stripped) data URLs swap into the custom
properties once `SpriteLoader.loadPainterly` resolves. One
loader, three assets, zero new CSS custom-property patterns.

Phase 19 closes the controller HUD painting arc. The only in-game
surfaces still on pure CSS chrome are intentionally scoped out:
`.gp-topbar` eyebrow (thin 44px strip), `.gp-item-pill` (race-only
small medallion), `.gp-meteor-warn-*` (ephemeral alarm beat),
`.gp-lost-toast` (functional error state). Each rationale
documented in the Phase 19 spec. Audit grade stays at A+ (3.84) —
this is internal visual-depth polish, not a new scored dimension.
Spec:
`docs/superpowers/specs/2026-04-18-ingame-hud-chrome-design.md`.

Twenty-first realization: host-side painted polish — Phase 20,
shipped 2026-04-18 across 4 commits. Closes two remaining host-
side painted gaps so the host surface paints end-to-end:

- **20a — host PostGame `backdropMode`.** `PostGame.show` gains
  an `opts.backdropMode` parameter distinguishing `'podium'`
  (Phase 8c race layout — anchored bottom-center, max 440×380)
  from `'hall'` (Phase 18 gameover-hall cover-fit). Default
  stays `'podium'` for backward compat. The `<img>` backdrop
  gets a dual class (`pg-backdrop pg-backdrop-${mode}`) so
  podium mode keeps its existing CSS and hall mode gets a
  dedicated cover-fit rule with `object-fit: cover`. The
  overlay's scrim switches on a `data-backdrop-mode="hall"`
  attribute: 0.92 for podium (competes with race's bottom-
  anchored composition otherwise), 0.55 for hall (lets the
  painted spotlight and curtains read). Hill, meteor, and
  escape per-game `main.js` pass `backdrop: '/assets/gameover-
  hall.png', backdropMode: 'hall'`. Race keeps `race-podium.png`
  at default podium. Host and controller now show the same
  Phase 18 painted hall atmosphere on game-end — one visual
  mood across both surfaces.
- **20b — `tournament-round-intro.png`** (new 1024×1024
  painted attraction-announce poster — wooden signboard with
  ornate carved ribbon banners, cream-white inner panel, flanking
  carnival pennants + striped tent pole, gold-leaf corner
  flourishes). Reverses the Phase 9 "skip round-intro backdrop"
  decision now that painted backdrops are firmly established
  across every adjacent surface. `Tournament.renderRoundIntro`
  prepends `<img class="t-round-intro-backdrop">` inside
  `#t-content.innerHTML` (mirrors Phase 9a champion pattern
  — mode switches automatically drop prior-mode backdrops).
  A new `mode-round-intro` class scopes the round-intro CSS
  so standings + champion modes stay self-contained.
- Layout decision: TOURNAMENT bar + GET READY italic moved to
  absolute positions ABOVE and BELOW the painted poster (via
  `calc(50% ± NNNpx)`). The poster's top + bottom painted
  ribbon banners would have competed with the DOM text if
  left inside natural flex flow. Text colors scoped per mode:
  game-name flips to `--text-on-gold` (dark-on-cream on the
  painted central panel — Phase 12a standings precedent),
  ROUND X keeps gold-on-red letterpress (legible on cream
  via existing shadow), GET READY flips to gold-hot with red
  letterpress on the dark overlay scrim below the poster.
- **20c — DESIGN.md close** (this block).
- **20d — WebP sibling** (Phase 17c pipeline).
  `tournament-round-intro.webp` 135KB (-91% of 1.44MB PNG).

Phase 15b corner ornaments were already extended to both
tournament + postgame overlays — `HostCommon.addCornerOrnaments`
is called at overlay-create time on both surfaces. So a
separate Phase 20 sub-phase for corner ornaments wasn't
needed — prior work already covered it.

After Phase 20 the host surface paints end-to-end: main lobby
(`bg.png`), per-game lobbies (Phase 10, 4 backdrops),
tournament standings (Phase 12a scroll), tournament round-intro
(**Phase 20b** poster), tournament champion (Phase 9a throne),
PostGame race (Phase 8c podium), PostGame non-race (**Phase 20a**
hall reuse), ornaments (Phase 15b bunting + corners). Every
visible host screen has a painted composition behind its text.
Audit grade stays at A+ (3.84) — internal visual-depth polish.
Spec:
`docs/superpowers/specs/2026-04-18-host-polish-design.md`.

Twenty-second realization: ambient visual depth — Phase 21,
shipped 2026-04-18. Opens the Hearthstone-polish arc (Phases
22-26 — typography, object frames v2, parallax backgrounds,
sound design, animation polish — each to follow). Three compound
additions, zero new art assets.

- **21a — `client-shared/ambient-fx.js`.** New shared module
  (~220 lines, no deps) that injects a `<canvas class="ambient-
  fx-layer">` behind any overlay's content and renders pool-
  allocated drifting particles. Three presets: `sparkles` (gold/
  white specks, additive glow, 2-4s life, rising), `embers`
  (amber flicker, larger, wind drift), `dustmotes` (cream
  specks, near-horizontal, 5-9s life). One shared RAF loop
  across all attached canvases, auto-pauses when parent has
  zero-area rect, honors `prefers-reduced-motion`. Wired into
  7 surfaces: main lobby + per-game lobbies (dustmotes),
  tournament overlay (sparkles), PostGame overlay (sparkles),
  controller spectate (dustmotes), controller elim (embers),
  controller gameover (sparkles).
- **21b — corner glint sweep.** `.ornament-corner::after`
  pseudo-element renders a diagonal linear-gradient streak
  (transparent 42% → cream 50% → transparent 58%) that
  translates from -110% to +110% over 6s with
  screen-blend-mode. Staggered per corner (tl 0s / tr 1.5s /
  bl 3s / br 4.5s) so the sweep travels around the overlay
  perimeter rather than firing synchronized. `overflow:
  hidden` added to `.ornament-corner` so the streak clips
  cleanly at the corner bounds. Compound with the Phase 16b
  `cornerShimmer` brightness cycle — two layered motions
  (filter brightness + sweeping position) reading as "gold
  catching ambient light."
- **21c — spring-easing on overlay entries.** The four shared
  overlay transitions (tournament, PostGame, controller
  gameover, controller elim) swap `ease-out` / `ease-in-out`
  for `var(--ease-bounce)` — existing token at
  `cubic-bezier(0.34, 1.56, 0.64, 1)`. Duration bumped 0.6s
  → 0.7s so the overshoot reads as weighted theatrical entry
  rather than a glitch. No new token added; reused the
  Phase 14 bounce curve.

Compound effect of Phase 16 + 21 motion layers: painted
backdrops breathe (existing ornament-bulb pulse + bunting
sway + title idle), particles drift (new ambient canvas), gold
catches light (new glint sweep), overlays enter with weight
(new spring easing). Moves the product from "painted" toward
"painted AND alive" — Hearthstone-tier ambient atmosphere.

Audit grade stays at A+ (3.84) — Phase 21 is internal
atmospheric polish, not a new scored dimension. Spec:
`docs/superpowers/specs/2026-04-18-ambient-visual-depth-design.md`.

1. **Phase 1** (shipped 2026-04-15): controller onboarding + initial theme tokens.
2. **Phase 1.5** (shipped 2026-04-15, this pass): shared `theme.css`, host
   lobby migration, all 4 per-game host UIs, shared overlays (narrator,
   postgame, tournament, hud, transitions), component library, narrator
   voice guide, sound catalogue, accessibility baseline, decisions log.
3. **Phase 2** (shipped 2026-04-15, retro-documented 2026-04-17):
   controller gameplay screens — score, hintbar, avatar orb, center
   confirmations, elimination overlay, spectator view, game-over
   card, connection-lost toast. Lives in `client-controller/
   gameplay.{js,css}` behind a 19-method `Gameplay.*` API; `main.js`
   is a thin WebSocket adapter. Phase 2a prototype skipped, Phase 2c
   polish (vibrate patterns) landed inline with 2b; remaining polish
   deferred to live-playtest follow-up. Spec:
   `docs/superpowers/specs/2026-04-15-controller-gameplay-design.md`.
4. **Phase 3** (shipped 2026-04-16): per-game canvas polish — `engine/palette.js`
   scaffold (3a), race brass track + meteor carnival telegraph (3b), escape +
   hill carnival signatures (3c), wood-plank lap pennant + DESIGN.md update
   (3d). Spec: `docs/superpowers/specs/2026-04-15-per-game-canvas-polish-design.md`.
5. **Phase 4** (shipped 2026-04-16): offline & iconography polish —
   vendored Alfa Slab / Cutive / Inter (4a), `/client-shared/icons.js`
   functional-SVG sprite (4b), dark-only `color-scheme` lock + DESIGN.md
   fifth realization (4c). Spec:
   `docs/superpowers/specs/2026-04-16-offline-and-iconography-design.md`.

6. **Phase 5** (shipped 2026-04-16): content pass — 8 custom animal
   PNG avatars (5a) replace Unicode emoji on the selection grid,
   pills, quick-confirm, waiting-screen, and lobby; a Game Master
   narrator portrait (5b) anchors the bottom-center narrator overlay
   whenever a quip fires. Human-in-the-loop image-gen pipeline;
   style guide + prompt template in the spec. Spec:
   `docs/superpowers/specs/2026-04-16-content-pass-design.md`.

7. **Phase 6** (shipped 2026-04-17): environmental art —
   `assets/tree-{forest,cave,snow,volcano}.png` painterly biome trees
   overlay escape's procedural `drawTrees` for type-0 (round-canopy)
   tiles only (6a forest, 6b cave/snow/volcano), plus the forest
   tree becomes a new race track-side variant beside existing
   bush/rock sprites. New `SpriteLoader.loadPainterly` utility
   strips image-gen-tool checker-preview backgrounds via a two-pass
   chroma-key (strict + edge-seeded flood fill). Spec:
   `docs/superpowers/specs/2026-04-17-environmental-art-design.md`.

8. **Phase 7** (shipped 2026-04-17): per-game hero art — one
   painterly PNG per game not covered by Phase 6. `hill-crown.png`
   (7a) replaces the emoji king-zone icon, `meteor-crater.png`
   (7b) fires as an ephemeral 1s scale-up / fade-out at every
   meteor impact, `race-flag.png` (7c) replaces the procedural
   red-velvet banner rectangles on each side of the finish line.
   Hill and meteor retrofit SpriteLoader; race adds the flag
   alongside the Phase 6a tree load. `loadPainterly` refactored
   from two-pass to edge-seeded-only (7c fix) to preserve pure-
   white interior squares of the checker flag. Spec:
   `docs/superpowers/specs/2026-04-17-per-game-hero-art-design.md`.

9. **Phase 8** (shipped 2026-04-17): per-game second-layer art —
   `hill-crest.png` (8a) heraldic overlay fades in when
   `renderPlatR < 3.5`, `meteor-target.png` (8b) bullseye overlays
   the safe-zone tile between the bulb core and the SAFE label,
   `race-podium.png` (8c) three-tier podium anchors the `PostGame`
   winner overlay via a new `backdrop` option. Hill gets a
   monotonic crest-fade variable; meteor stacks target between
   existing safe-zone elements; PostGame gains an API slot and
   z-index rule so the backdrop sits behind flex siblings. Spec:
   `docs/superpowers/specs/2026-04-17-per-game-second-layer-art-design.md`.

10. **Phase 9** (shipped 2026-04-17): tournament champion art —
    `tournament-champion.png` painterly throne + laurel wreath +
    red velvet curtain composition, prepended into
    `Tournament.renderChampion`'s `#t-content` as a backdrop
    behind the existing trophy / CHAMPION! / name / final scores
    stack. Re-uses the Phase 8c z-index pattern
    (`position: relative; z-index: 1` on children,
    `z-index: 0` on backdrop). Spec:
    `docs/superpowers/specs/2026-04-17-tournament-champion-art-design.md`.

11. **Phase 10** (shipped 2026-04-17): per-game lobby painterly
    backdrops — one ornate carnival arch / banner / tent
    composition per per-game host (`lobby-race.png`, `lobby-escape.png`,
    `lobby-hill.png`, `lobby-meteor.png`). Each prepended as the
    first child of `#lobby` with the Phase 8c/9a z-index pattern;
    `setTimeout(0)`-deferred `SpriteLoader.loadPainterly` swaps
    src to the processed data URL. First AAA-polish pass driven
    by the post-Phase-9 audit. Spec:
    `docs/superpowers/specs/2026-04-17-per-game-lobby-backdrops-design.md`.

12. **Phase 11** (shipped 2026-04-17): painterly selection-grid
    cell frames — `cell-car.png` (carnival auction-ticket) behind
    10 car-color cells in onboarding, `cell-action.png` (slot-
    machine button face) behind 3 action-hintbar cards in
    controller gameplay. CSS `::before` + `background-image:
    var(--cell-{name}-bg, url(raw))` + runtime data-URL swap per
    frame. Spec:
    `docs/superpowers/specs/2026-04-17-selection-grid-frames-design.md`.

13. **Phase 12** (shipped 2026-04-17): painterly tournament
    scoreboard + controller avatar orb — `standings-scroll.png`
    wooden scoreboard with four cream slot strips replaces the
    flat flex cards in `Tournament.renderStandings`; avatar orb
    in controller gameplay HUD adopts the Phase 11b
    `cell-action.png` slot-machine frame (reused, one ornament
    language for all four HUD cells in the bottom row) and
    finally pipes the Phase 5a painterly animal avatar through
    instead of raw emoji. Pulse migrated from box-shadow to
    opacity-only; action-card labels repositioned below the card
    so they escape the painted frame's bottom ornament. Spec:
    `docs/superpowers/specs/2026-04-17-scoreboard-orb-frames-design.md`.

14. **Phase 14** (shipped 2026-04-17): motion polish — universal
    idle breathing on Alfa Slab hero titles (lobby, overlay
    headings, winner name) + hover gold shine-sweep on
    interactive cards (ticket buttons, car cells, animal cells).
    CSS-only, zero new assets, honors prefers-reduced-motion.
    Phase 13 (pixel-car painterly replacement) skipped per user
    direction. Spec:
    `docs/superpowers/specs/2026-04-17-motion-polish-design.md`.

15. **Phase 15** (shipped 2026-04-17): background ornaments —
    `ornament-bunting.png` carnival bunting drapes across the
    top of every full-screen overlay via `::before` +
    `background-repeat: repeat-x`; `ornament-corner.png` gold
    filigree flourish mirrors into 4 corners via CSS transforms
    on 4 injected `<div>` children. Closes the fourth AAA-
    polish dimension. Spec:
    `docs/superpowers/specs/2026-04-17-background-ornaments-design.md`.

16. **Phase 16** (shipped 2026-04-17): ornament motion — CSS-
    only keyframes added to the Phase 15 ornaments: bunting
    sways ±0.5° at 4s cadence, bunting brightness pulses at
    2.2s, corner flourishes shimmer at 6s. Cycles intentionally
    out of phase for ambient-rather-than-pulse feel. Respects
    `prefers-reduced-motion`. Spec:
    `docs/superpowers/specs/2026-04-17-ornament-motion-design.md`.

17. **Phase 17** (shipped 2026-04-18): post-audit polish +
    Pretext + WebP. 17a — 15 fix commits closing audit
    findings F-01..F-16 plus follow-up F-17 (controller
    rotate-gate qualified by `(pointer: coarse)` so it stops
    firing inside `/test/` iframes). 17b — Pretext vendored
    at `client-shared/pretext.js` + `pretext-hooks.js`
    wrapper; wired into gameplay elim-quip + game-over copy,
    host game-select modal, narrator overlay, tournament
    standings commentary. 17c — WebP content-negotiation
    (45 + 57 assets) via `server/index.js preferWebp()` +
    `Vary: Accept`; 89MB PNG stays source-canonical, 7.1MB
    WebP on the wire (-92%). Audit grade **B (2.99) → A+
    (3.84)**. Spec:
    `docs/superpowers/specs/2026-04-18-post-audit-polish-design.md`.
    Audit log:
    `.gstack/design-audit-20260417/design-audit-frantics.md`.

After Phase 17 the project is at audit grade A+. Follow-ups
(painterly pixel-car replacement if ever revisited, F-05
`<main>` landmark, i18n / WebGL / GLB / race-2nd-3rd-place
items) each open their own spec when demand justifies.

18. **Phase 18** (shipped 2026-04-18): controller gameplay
    overlay backdrops — 18a universal `gameover-hall.png`
    painted hall-of-fame behind all four games' controller
    game-over (red-velvet curtains + gold proscenium +
    spotlight pool); 18b `elim-shadow.png` after-the-act
    theatre (lowered curtain + dim spotlight + fallen jester
    hat) behind `.gp-eliminated-overlay`; 18c `.gp-spectate-
    block` reuses Phase 12a `standings-scroll.png` wooden
    scoreboard with pill list retuned into the cream slot
    column; 18d WebP siblings via Phase 17c pipeline (-81%
    and -85%). CSS pattern uniform: `<img>` first-child
    backdrop at `object-fit: cover; z-index: 0`, content
    siblings at `z-index: 1`. Spec:
    `docs/superpowers/specs/2026-04-18-controller-hud-polish-design.md`.

After Phase 18 the controller gameplay surface has painted
atmospheres on every full-screen emotional beat (elim,
spectate, gameover). In-game HUD chrome (top-bar banner,
score plaque, hintbar stage, item-pill medallion) remains
CSS-only — candidate for a potential Phase 19 if demand
accumulates.

19. **Phase 19** (shipped 2026-04-18): in-game HUD chrome
    paint — 19a `score-plaque.png` painted carnival
    scoreboard behind `.gp-score-block` AND
    `.gp-countdown-digit` (one asset, two surfaces, Phase 12b
    reuse discipline); 19b `hintbar-stage.png` red-gold
    proscenium + wooden theatre floor covering `.gp-hintbar`
    so the four action cards sit on a painted stage; 19c
    WebP siblings via Phase 17c pipeline (-88% and -76%).
    Scrim on the hintbar lightens 0.82 -> 0.45 to let the
    painted stage read. JS-side module-init setTimeout
    collapses into a forEach over three preload tuples.
    Spec:
    `docs/superpowers/specs/2026-04-18-ingame-hud-chrome-design.md`.

After Phase 19 the controller HUD paints end-to-end: Phase
5a avatar portrait inside Phase 12b orb frame, Phase 11b
action cards on Phase 19b stage, Phase 19a plaque behind the
score and countdown numbers, Phase 18 overlays on
end-of-game beats. The only un-painted in-game surfaces
(`.gp-topbar`, `.gp-item-pill`, `.gp-meteor-warn-*`,
`.gp-lost-toast`) are intentionally scoped out — low-impact,
ephemeral, or functional states with rationale in the
Phase 19 spec.

20. **Phase 20** (shipped 2026-04-18): host-side painted
    polish — 20a `PostGame.show` gains `backdropMode: 'hall' |
    'podium'` option; hill/meteor/escape pass Phase 18
    `gameover-hall.png` + mode 'hall' (scrim drops to 0.55);
    race keeps `race-podium.png` at default mode 'podium'
    (scrim stays 0.92). 20b `tournament-round-intro.png`
    painted attraction-poster renders behind round-intro
    TOURNAMENT/ROUND X/game-name stack; TOURNAMENT + GET
    READY absolute-positioned outside the poster bounds so
    the painted top/bottom ribbons don't compete with DOM
    text; a new `mode-round-intro` class scopes the layout
    CSS like Phase 12a `mode-standings` does. 20c DESIGN.md
    21st realization close. 20d WebP sibling (-91%). Spec:
    `docs/superpowers/specs/2026-04-18-host-polish-design.md`.

After Phase 20 the host surface paints end-to-end (main lobby
+ per-game lobbies + every tournament mode + every PostGame
variant + corner ornaments), and both host + controller shared
PostGame states (non-race winner + gameover) show the same
Phase 18 painted hall — the product's visual atmosphere is now
synchronized across screens.

21. **Phase 21** (shipped 2026-04-18): ambient visual depth —
    opens the Hearthstone-polish arc. 21a `client-shared/
    ambient-fx.js` shared canvas particle layer (sparkles /
    embers / dustmotes) on 7 painted surfaces; 21b corner
    glint sweeps via `::after` gradient translating with
    staggered per-corner delays; 21c spring-easing
    (`var(--ease-bounce)`) on overlay entry transitions. Zero
    new art, zero typography, zero sound. Honors prefers-
    reduced-motion. Spec:
    `docs/superpowers/specs/2026-04-18-ambient-visual-depth-design.md`.

After Phase 21 the painted surfaces breathe AND drift AND
catch moving light. Remaining Hearthstone-polish arc: Phase
22 typography embellishments, Phase 23 ornate object frames
v2, Phase 24 parallax backgrounds, Phase 25 sound design,
Phase 26 animation polish. Each its own spec when demand
accumulates.

Each phase opens its own spec and consumes (and optionally extends) this
DESIGN.md. When a phase adds a new token, it goes into `client-shared/theme.css`
first, and this document is updated to reflect the addition.

---

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-15 | Initial system created (Phase 1) | Controller onboarding needed cohesive visual language |
| 2026-04-15 | Shared `theme.css` under `client-shared/` | Tokens were duplicated inside `.onboarding-root`, couldn't be reused by host or per-game |
| 2026-04-15 | Host lobby migrated off Georgia | Visual dissonance between host (Georgia) and controller (Alfa Slab) broke "one product" feel |
| 2026-04-15 | Narrator voice guide documented | Existing GM quips are strong; needed rules to keep future additions consistent |
| 2026-04-15 | Sound effect tokens documented | `sound.js` and `engine/Audio.js` had no design-level reference, making it easy to reinvent SFX |
| 2026-04-15 | `background-color` + `background-image` split instead of shorthand | Shorthand `background: color image` silently overrode the color, leaving full-screen surfaces transparent — gameplay bled through onboarding |
| 2026-04-15 | `!important` on overlay `.show` selectors | `style.cssText` set `opacity: 0` inline with higher specificity than `.show { opacity: 1 }`; overlays were never becoming visible. Hidden bug across narrator / postgame / tournament — revealed by carnival screenshots, fixed in all three |
| 2026-04-15 | Per-game keyframes namespaced (`tSlideInLeft` etc) | Original `slideInLeft` / `goldGlow` names were generic enough to collide with future per-game CSS; prefixed for tournament overlay to stay self-contained |
| 2026-04-15 | Per-game canvas palettes stay game-specific | Carnival UI wraps every game; character palettes (race greens, meteor reds) are part of game feel and shouldn't be normalized |
| 2026-04-15 | All 4 per-game hosts migrated in one pass | Treating them individually would cause drift (each author making slightly different token choices). Canonical pattern applied uniformly |
| 2026-04-16 | `engine/palette.js` reads `:root` CSS tokens at boot | Canvas renderers had hardcoded hex values drifting from the DOM theme — a token-driven surface keeps wood / gold / red in sync across the canvas-to-DOM seam |
| 2026-04-16 | Palette exposes pre-built gradient builders (spotlight, redCurtain, ticketFace, woodPlank) | Each game was reconstructing the same carnival gradients inline; centralizing prevents drift in the recipe across race / escape / hill / meteor |
| 2026-04-16 | Canvas palette refs fall back to inline hex on lookup failure | `engine/palette.js` reads `:root`; if theme.css fails to load, gameplay must keep rendering. Fallbacks in the per-game renderers prevent a blank world when tokens are missing |
| 2026-04-16 | Lap pennant is canvas-baked, not DOM | Spec called for a drop / hold / rise signature timed against render frames; a DOM element would need duplicate animation wiring and wouldn't sit naturally over canvas z-order |
| 2026-04-16 | Lap pennant dedupes by lap number (first crossing wins) | Race emits `lap_complete` for every player completing each lap — without dedup a 4-player field would stack 4 pennants per lap and clobber the hold phase |
| 2026-04-16 | Phase 3d scope limited to lap pennant + DESIGN.md | Live timing tweaks (biome-curtain duration, fox-eye bloom radius, meteor telegraph hold) need real 4-controller playtest — captured as follow-up rather than speculatively retuned |
| 2026-04-16 | Vendored fonts preserve Google's `unicode-range` per-subset split | Merging into one file per family would force every page to download the Cyrillic and Greek blocks even for Latin-only content; keeping the split halves the Latin-only payload |
| 2026-04-16 | Inter weight 400 and 600 share one woff2 per subset | Inter is served as a variable font; Google's own CSS points both weight declarations at the same binary. Storing only one copy per subset saves ~228 KB of duplicated disk/git weight |
| 2026-04-16 | Animal emoji stay Unicode, functional UI goes SVG | Animals (cat / frog / wolf…) ARE the player-identity fantasy — OS-native rendering is a feature. Chrome icons (phone, check, gear) are product surface and demand per-browser consistency |
| 2026-04-16 | Icon sprite is one hidden `<svg>` injected into `document.body` | `<use href="#icon-*">` resolves against same-document symbols; one injection, many renders, no per-icon fetch |
| 2026-04-16 | Icons render in `currentColor` only | Forcing consumers to set `color` on the wrapper keeps the sprite a pure silhouette; accent (gold vs cream vs red) stays a design-system decision per context, not baked into the icon |
| 2026-04-16 | Dark-only theme lock via `color-scheme` + `prefers-color-scheme: light` no-op | Browsers render scrollbars and native form controls from the computed color-scheme. Without the lock, a user flipping their OS to light mode sees light scrollbars against our wood-deep surface |
| 2026-04-16 | No Phase 5 on the roadmap | After Phase 4 the visible product IS the carnival. Future work (illustration pass for animals, i18n for expanded Unicode blocks, WebGL offload) is substantial enough to each deserve its own spec — not a numbered continuation of this thread |
| 2026-04-16 | Phase 5 reopened as content pass | Reversing the "no Phase 5" decision — the 8-animal emoji roster was visibly clashing with the commissioned `bg.png` art. Scoped narrowly to PNG avatar replacement (not per-game env art or GLB extension); those stay open as separate future initiatives |
| 2026-04-16 | Phase 5a style anchored on `bg.png`, not `theme.css` tokens | Initial style guide over-indexed on the DOM palette (wood brown / gold / red / vintage warm). But in-product illustration style lives in the commissioned `assets/bg.png` — a bright daylight children's-storybook scene. Avatars drawn in vintage warm sepia would have clashed with the lobby scene they sit inside |
| 2026-04-16 | Emoji stays as onerror fallback, not removed | The `animalGlyph` helper renders `<img>` but each consumer keeps the emoji as the text-node fallback on load failure. Cheap resilience for captive-portal / missing-asset edge cases, and the PNG→emoji swap is invisible to working users |
| 2026-04-16 | Shared `renderCharGlyph` helper only on main lobby + controller | Per-game hosts (race / escape / hill / meteor), postgame, hud, tournament, and the in-canvas race renderer kept their local `charIcons` emoji maps. Their icons are small (~14-22px) where emoji still reads fine, and the integration churn wasn't worth the marginal visual upgrade |
| 2026-04-16 | Avatar images use `object-fit: cover` + `border-radius: 50%` in circular medallions | Initial CSS used `object-fit: contain` inside `border-radius: 50%` parent — PNGs with transparent-edge padding showed square bleed at medallion corners. Cover+radius clips the image to the circle directly, ignoring how much padding the source has |
| 2026-04-16 | Narrator portrait rides inside the overlay as a 64px circle, not a standalone floating element | Keeping the GM face attached to the same pill that carries his quip reads as one character card. Detaching the portrait to a separate floater would fight the existing overlay placement rules and scatter eye movement across two elements |
| 2026-04-16 | Narrator overlay switched from vertical text stack to horizontal flex row | Adding a portrait to the left required horizontal composition; the prior "label above text" rhythm is preserved inside a `.narrator-body` column so existing quip reading cadence holds |
| 2026-04-16 | `<img onerror="this.remove()">` for the narrator portrait instead of a feature-detect path | The pre-5b text-only layout still renders when `narrator.png` is absent — flex collapses the row cleanly. Inline `onerror` avoids adding a load-check branch or a CSS fallback layer for the rare missing-asset case |
| 2026-04-17 | Painterly biome trees OVERLAY the procedural renderer, not replace it | Escape's existing `drawTrees` is already good (multi-layer canopy, snow cap in snow biome). Replacing it wholesale would scrap a working path for a PNG-only path that breaks on missing asset / slow load. Overlay keeps procedural as the durable fallback and restricts painterly to type-0 tiles, so pines/bushes/dust keep their cheap procedural home |
| 2026-04-17 | Only round-canopy (type 0) tiles get painterly art; pines and bushes stay procedural | Pine silhouettes (triangles) and bush silhouettes (ovals) already read distinctively at their small in-canvas size. The biome-characterising piece is the round canopy — that's where saturated biome palette differences live. Art budget is one commissioned tree per biome, not three |
| 2026-04-17 | Race borrows `tree-forest.png` as a track-side variant without a dedicated race-specific tree | Race has no biome system; forest is the universal default foliage feel and the animal-lobby / narrator art already anchors "daylight storybook" as the product's visual identity. A race-only tree would duplicate the commission for minimal differentiation |
| 2026-04-17 | Painterly tree gated behind `t < 0.8` biome-blend window | Escape crossfades procedural colors in the last 20% of each biome. Popping a painterly PNG in mid-crossfade would clash visually (the PNG has fixed colors while the procedural renders are interpolating). Gating the sprite out during the blend window keeps the transition smooth — procedural draws through the crossfade and painterly enters once the next biome settles |
| 2026-04-17 | `SpriteLoader.loadPainterly` lives in the shared loader, not inline per renderer | Both escape and race needed the same checker-strip logic on PNGs generated by the same image-gen workflow. Centralising it keeps the chroma-key threshold tuning in one place and means future per-game art pipelines pick it up for free |
| 2026-04-17 | Two-pass chroma-key (strict + edge-seeded flood fill) over a single-pass strict key | Forest PNG's checker was pure-neutral (r=g=b, bright) so strict (chroma<12, minBright>185) cleared it. Snow PNG's checker had slight chroma tint (r=255, g=255, b=253 style) that slipped past strict. Edge-seeded flood fill catches the tinted remnants via looser (chroma<40, minBright>165) thresholds that only apply to pixels CONNECTED to the image boundary, so interior highlights (snow caps, ember glow, mushroom pale) stay opaque |
| 2026-04-17 | Flood fill loose thresholds stay at 40/165 even though a halo persists on snow | Widening to 60/150 caught more anti-alias halo BUT also eroded the snow caps from the canopy edge inward (caps are bright-neutral and connect to outside via anti-aliased transitions). 40/165 keeps snow caps intact at the cost of a barely-perceptible halo — prioritise the deliverable (snow cap is the biome-defining feature) over cosmetic edge cleanliness |
| 2026-04-17 | `server/index.js` returns 404 for ENOENT (was flattening to 500) | readFile's generic err branch classified missing files as server errors. Phase 6a surfaced this when escape tried to load uncommissioned biome trees — console noise even though client-side .catch handled the fallback. ENOENT→404 is the correct HTTP semantics and makes console-monitoring during development honest |
| 2026-04-15 | Gameplay carrier is a module with a 19-method API, not inline main.js DOM writes | main.js was mixing WebSocket protocol, gesture capture, and direct DOM mutation across a dozen `$`-cached nodes. Splitting the DOM/state concerns into `Gameplay.*` let main.js shrink to a WS→API adapter (-482/+261 lines), made the surface testable in isolation, and clamps all gameplay-screen styling under a single `.gameplay-root` scope |
| 2026-04-15 | Phase 2a prototype skipped; implementation went directly to production | Phase 1 onboarding proved the token + scoped-root + spec→production pattern. Rebuilding the gameplay screens as a standalone HTML mock first would have just duplicated work — the Gameplay API could be exercised live in the controller with mocked WS messages. Time saved went into the 2b scope |
| 2026-04-15 | Legacy gameplay DOM nodes removed outright, not hidden behind feature flag | Keeping the old `$info` / `$score` / `$gestHint` nodes as a fallback would have let drift re-enter via someone editing the wrong path. Gameplay module is the single carrier; dual-implementation risk beats the cost of a clean revert if the migration had gone bad |
| 2026-04-15 | `ensureGameplay(nextGameId)` rebuilds the module on target-game change | First implementation only toggled `.game-*` class on the root — eyebrow text, phase icon, and hintbar stayed frozen because they were baked into `buildDom()` at first mount. Rebuild-on-change is the simplest correct fix; per-game partial updates would spread game-shape coupling across the API |
| 2026-04-15 | Elimination quip seeded deterministically from `playerId + round` | Plain `Math.random()` pick would reshuffle every render / reconnect, so an eliminated player's quip could change on WS reconnect — breaking the narrative beat. Seeded pick keeps the same line through disconnect / rejoin cycles |
| 2026-04-15 | `engine/Input.js` `excludeSelector` extended for `.gp-action` and `.gp-go-btn` | Gesture manager captures taps/swipes on the controller canvas to translate into game actions. Hintbar cards and the game-over BACK-TO-LOBBY button needed native click semantics; excluding them from the gesture capture layer keeps the affordance honest without a per-event `preventDefault()` branch |
| 2026-04-17 | Per-game-prefix filename convention for hero art (`hill-`, `meteor-`, `race-`) | Phase 5/6 used category-prefix (`animal-`, `tree-`). Phase 7 pieces are heterogeneous (crown / crater / flag) with no shared category, so per-game prefix is the natural slot. Forward-compatible with future hill-banner, meteor-safetile, race-podium, etc. without namespace churn |
| 2026-04-17 | Meteor crater is ephemeral (1000ms lifetime) rather than persistent/accumulating | A persistent impact mark would accumulate over a 30s meteor round — 6+ impacts stacking craters across the arena would clutter the gameplay read. Ephemeral ramp-up + fade-out delivers the "that spot got hit" moment without visual debt. Each entry auto-prunes so craterFX stays bounded |
| 2026-04-17 | Meteor crater draws UNDER the impact flash, not over it | Flash is "the moment" (impulse red full-screen tint). Crater is "the aftermath" (localised painterly mark). Draw-order matches the narrative: flash dominates the first 100-200ms, crater reveals as the flash fades. Scene layer 'craters' at depth 17 sits between safezone=15 and players=20, so the layering is explicit rather than relying on sub-ordering within one layer |
| 2026-04-17 | Right-side race flag is mirror-rendered (`ctx.scale(-1, 1)`) rather than commissioning a second flag PNG | The flag illustration has a natural direction (pole left, fabric right). A second "pole-right" asset would duplicate the art for a 1-bit piece of information. Mirroring via canvas transform ships in 3 lines and matches the spec's "both flags wave toward the track interior" intent |
| 2026-04-17 | `loadPainterly` refactored from two-pass to edge-seeded-only mid-Phase 7c | The prior strict-everywhere first pass ate pure-white interior squares of the checker flag (they matched the neutral-bright criterion just like the outside checker did). The strict pass was never strictly necessary — the edge-seeded flood fill's strict-at-seed rule catches the same outside-checker pixels while preserving interior whites disconnected by saturated-color ink outlines. Simpler logic, correct behaviour on more asset types |
| 2026-04-17 | Hill and meteor retrofitted SpriteLoader mid-Phase 7 | Escape picked up SpriteLoader in Phase 6a; race has had it since Phase 3 for atlas sprites. Hill and meteor hadn't needed it until now. Adding it in-phase means all four per-game hosts share one painterly-asset loading path — future hero art in any game picks up `loadPainterly` for free |
| 2026-04-17 | Hill crest fade is monotonic (0→1 only, never reverses) | `renderPlatR` lerps smoothly toward `targetPlatR`, so a target just below 3.5 would oscillate the render value across the threshold each frame and flicker the crest in/out. Locking the fade to monotonic 0→1 after the first threshold crossing removes the flicker without adding hysteresis state. If a round somehow expands the arena back, the crest stays; the round is ending anyway |
| 2026-04-17 | Hill crest anchored at world (0, -4) not (0, -6) | First integration pass used (0, -6) so the crest sat above the max arena radius regardless of zoom. At 1280x720 the top of the crest clipped above the viewport. Moving to (0, -4) + shrinking crest size 3.5→2.5 world units keeps the full composition visible at the standard host viewport. Arena shrinks under the crest, crest stays in its anchor spot |
| 2026-04-17 | Meteor target draws BETWEEN the pulsing ring and the SAFE label | Target above the pulsing green ring (stacks on top of halo+bulb core composition) so the painterly rings read clearly. SAFE label ABOVE target so the carnival-voice text stays legible and letterpress gold reads without competing with the bullseye colors |
| 2026-04-17 | Race podium anchored at overlay `bottom: 0` rather than centered | First pass centered the podium; the red velvet curtain backdrop landed exactly where the winner name + label rendered, and the red-on-red killed legibility. Anchoring at overlay bottom puts the CURTAIN below the text block and the STAIRS+NUMBERS in the lower half where buttons sit — decorative, not competitive |
| 2026-04-17 | PostGame backdrop needs explicit z-index: 0 + position:relative on flex siblings | `position: absolute` backdrop without z-index paints LAST within the stacking context, over the static flex children. Giving the backdrop z-index:0 and siblings `position:relative; z-index:1` makes DOM order explicit: backdrop first, everything else on top |
| 2026-04-17 | Race podium integrated via PostGame API, not custom race overlay | Race uses the shared `PostGame.show` overlay already. Adding a `backdrop` opt threaded through `show(opts)` is one API surface change that benefits any future per-game postgame scene. Avoids a race-only overlay implementation that would duplicate the winner-name / countdown / buttons logic |
| 2026-04-17 | Phase 9 scoped to champion mode only, not standings / round-intro | Standings needs dense scoreboard readability — painterly art would compete with numbers and player-color dots. Round-intro already has its own title-card aesthetic (curtain reveal, AND NOW... game name) that a backdrop would fight. Champion is the session's emotional peak and has sparse text; backdrop elevates it without competition |
| 2026-04-17 | Tournament backdrop prepended to `#t-content.innerHTML` rather than created as a DOM-level sibling | Each tournament mode (standings / round-intro / champion) calls `content.innerHTML = html` which wipes prior children. Prepending inside the innerHTML puts the backdrop INSIDE the per-mode render, so standings/round-intro automatically lose the backdrop when they fire. No manual remove call needed when switching modes |
| 2026-04-17 | Tournament backdrop anchored at `bottom: -40px` rather than `bottom: 0` | The throne illustration has a slight padding below its base from transparent cropping + the curtain's lower sweep visually exceeds the pedestal footprint. Anchoring 40px below visual overlay bottom avoids a hard edge where the throne's base would otherwise cut off at the overlay edge. Image is tall enough that the top stays inside the overlay; no HUD clipping |
| 2026-04-17 | Per-game lobby backdrops opened as Phase 10 after a formal AAA-polish audit | The audit (conducted 2026-04-17 after Phase 9 shipped) reframed the benchmark from "cohesive token UI" to "Hearthstone pixel-for-pixel." Per-game lobbies were the single largest gap — empty wood-plank gradient vs the commissioned bg.png main lobby. Phase 10 opens the staged AAA-polish thread with lobby backdrops; subsequent phases tackle selection-grid frames, tournament scoreboard, gameplay orb, motion polish, etc., one peak per phase |
| 2026-04-17 | Four lobby backdrops commissioned as a series with shared compositional grammar | Rather than commissioning four unrelated backgrounds, each follows the same structural language: two symmetric ornate posts, connecting banner with a cream-white center panel for overlay text, per-game silhouette ornaments at the crests, per-game accent color. Reads as a unified theatrical series — race/escape/hill/meteor as four different attractions on the same carnival stage |
| 2026-04-17 | `loadPainterly` swap via setTimeout(0) instead of sync call at module load | SpriteLoader.js loads AFTER main.js-referencing render2d.js in several per-game HTMLs (retrofitted at different Phase boundaries). Calling loadPainterly synchronously at main.js module top would hit a `typeof SpriteLoader === 'undefined'` early-return. setTimeout(0) defers one task-queue tick, by which time all scripts have parsed. No ordering-fragility across past and future HTML include lists |
| 2026-04-17 | Cell frames integrated via CSS `::before` + custom property, not per-cell `<img>` | Each frame is used 10× (car cells) or 3× (action cards). Inlining an `<img>` child per cell would multiply the asset across the DOM tree; `::before` with `background-image: var(--cell-{name}-bg)` loads the asset once, references it N times, swaps to the processed data URL at the document root with zero DOM churn. CSS fallback (raw PNG url) means the frame renders from the first paint even before loadPainterly resolves |
| 2026-04-17 | Frame stretch (`background-size: 100% 100%`) over `contain` | Car cells are 56×56 square, frame PNG is 1.7:1 landscape; contain would leave transparent vertical bands showing the overlay parent bg. Action cards are 72×72 with a round frame — contain would introduce transparent corners. Stretch distorts proportions slightly but the painterly ornament (tassels, rope, gold curls, rivets) survives cleanly; reads as "hand-painted with intentional looseness" rather than "pixel-perfect mismatch" |
| 2026-04-17 | Primary-action glow migrated to `filter: drop-shadow()` from `box-shadow` | Box-shadow renders around the element's BOUNDING BOX (rectangular) — would paint a rectangle of gold glow around the round painterly slot-machine face. Filter drop-shadow tracks the PAINTED silhouette via the transparent PNG edges, so the glow follows the curls and rivets rather than a phantom rectangle around them |
| 2026-04-17 | Standings layout flipped from horizontal-row cards to vertical-column strips | The painterly scoreboard PNG is a tall wooden plank with four painted slot strips stacked vertically. Horizontal flex cards would overlay the strips misaligned and compete with the painted dividers. Column stack puts each player row inside its matching painted cream slot — layout follows the art |
| 2026-04-17 | Standings text color flipped from cream on dark scrim to dark brown on cream slot | Before Phase 12a, player-card text sat on a `rgba(90,58,32,0.72)` card bg atop the overlay's dark scrim — cream name + gold number read clearly. After the scoreboard backdrop lands, the cream painted slot is the text bg — cream-on-cream would vanish. Flipped to `--text-on-gold` for names, `--accent-red-deep` for scores with a gold letterpress shadow; reads against the cream slot like a painted carnival ledger entry |
| 2026-04-17 | Avatar orb reuses `cell-action.png` frame rather than a dedicated `orb-frame.png` | Initial Phase 12b commissioned a distinct orb-frame with crown finial + red ribbon + gold tool-work. User flagged the ornament clash with the simpler slot-machine action cards sitting immediately to the right in the HUD row. Reusing the Phase 11b cell-action frame unifies the four bottom-HUD cells (avatar + 3 actions) under one ornament language. Dedicated orb-frame.png deleted |
| 2026-04-17 | Controller gameplay HUD finally consumes the Phase 5a painterly avatar pipeline | Phase 5a shipped painterly animal PNGs to onboarding + main host pills but missed the controller gameplay HUD (audit-flagged). Phase 12b closes the loop: `buildDom` renders `<img data-animal="{character}">` with `loadPainterly` async-swap, matching the rest of the UI. Emoji fallback via `onerror` kept for resilience |
| 2026-04-17 | Orb pulse migrated from `box-shadow: 0 0 14px currentColor` to opacity-only breathing | The pulse keyframe's `currentColor` shadow painted a per-game-colored rectangle (the ::before's bounding box) around the round painterly silhouette. Removing the shadow entirely — and holding pulse to `opacity: 0.88 ↔ 1` — preserves the breathing-life signal without a phantom rectangle outline. Painted frame carries the visual interest |
| 2026-04-17 | Action-card labels positioned absolute below the painted frame instead of inside | Phase 11b baked labels into the flex column with 4px gap; the painted slot-machine bottom curl ornament then cropped the label. `position: absolute; top: 100%; overflow: visible` on the parent pushes the label text outside the 72px painted cell, to sit on the HUD scrim with a text-shadow for contrast |
| 2026-04-17 | Breathing applied via direct selector in theme.css, not a per-element utility class | Utility class would require editing every hero-title element in every host + shared module to add `class="breathe"`. Direct selector targets the semantic hierarchy (`#lobby h1`, `#postgame-overlay .pg-winner-name`, etc.) so the shared CSS automatically covers every instance that matches. Zero HTML edits. The `.breathe` utility still exists as an escape hatch for ad-hoc future use |
| 2026-04-17 | `#lobby` prefix on `.hud-title` breathing selector to exclude in-game HUD | `.hud-title` is reused inside the gameplay `#hud` element for lap / distance / position counters. Breathing on those would distract during high-pace play. Scoping to `#lobby .hud-title` keeps the attraction-banner eyebrow animation without touching the live-score counters |
| 2026-04-17 | `.gp-action` excluded from the shine-sweep list | Shine-sweep requires `overflow: hidden` on the host element so the gold band clips cleanly at painted frame edges. Phase 12b action cards use `overflow: visible` to let their below-card labels escape the 72px frame. Controller is touch-only anyway; the hover trigger would rarely fire. Accepting the static state on actions is cheaper than reworking label positioning for a marginal hover effect |
| 2026-04-17 | Phase 13 (pixel-car painterly replacement) skipped per user direction | User chose Phase 14 motion polish over Phase 13 car-asset commissioning. Car sprites are pixel-art (Phase 3 atlas) and sit inside Phase 11a's painted ticket frames, so the mixed-art register reads as "ticket tag with a retro car emblem" — acceptable tradeoff vs a 10-car commission. Pixel-car replacement stays on the follow-up list for future revisit |
| 2026-04-17 | `DOMContentLoaded` instead of `setTimeout(0)` for pipeline initialization | `setTimeout(0)` defers one task-queue tick, but modern browsers allow async fetching of subsequent `<script src>` tags — a `setTimeout(0)` scheduled by an early script can fire BEFORE later scripts finish loading. In Phase 15, `SpriteLoader` was `undefined` at setTimeout-fire time in per-game hosts, silently breaking the whole pipeline. `DOMContentLoaded` fires only after ALL parser-blocking scripts execute, which is what we actually need |
| 2026-04-17 | Large-data-URL CSS swap via `<style>` injection, not custom properties | Chrome silently rejects very long values (several-hundred-KB base64) assigned via `document.documentElement.style.setProperty('--foo', 'url(data:...)')`. The property appears unset on read. `<style>` tag `textContent` has no such limit; injecting a rule directly with the data URL works reliably. Phase 15a + 15b use `<style>` injection for all loadPainterly swaps on ornament assets |
| 2026-04-17 | One corner PNG + CSS transforms for 4 corners vs 4 commissioned pieces | Symmetric mirrors around a square container come for free via `scaleX(-1)` / `scaleY(-1)` / `scale(-1,-1)`. Commissioning 4 corners would have quadrupled the art request while producing visually identical results. Prompt anchored the flourish to occupy ONLY the top-left quarter of the 1024×1024 square so the mirrored composition frames the container naturally |
| 2026-04-17 | `!important` on `.ornament-corner` position/z-index | Per-host Phase 10a rule `#lobby > *:not(.lobby-backdrop) { position: relative; z-index: 1 }` is more specific (ID + descendant combinator) than a bare class selector. Without `!important`, corner divs injected into `#lobby` were forced into the flex flow (stacked vertically in the middle of the viewport) instead of absolute-positioned at corners |
| 2026-04-17 | Bunting loadPainterly uses custom `{ seedBright: 135, expandBright: 120, expandChroma: 25 }` | The bunting PNG's baked checker is two-tone ~150 / ~180, dimmer than the default seedBright 185. Default thresholds left grey checker in place. Lowered seedBright matches the actual baked-checker luminance; saturated flags / rope / gold bulbs have high chroma and stay untouched |
| 2026-04-17 | Ornament motion amplitudes kept below perception threshold (≤5% filter, ≤0.5° rotation) | At AAA-polish level, static ornaments read as "painted on" rather than "hanging in space." But overshoot on amplitudes quickly creates "seasick" compound motion when multiple cycles overlap. Keeping each cycle's amplitude below perception threshold individually makes the compound compose smoothly as "ambient stage breathing" rather than synchronized pulse |
| 2026-04-17 | Ornament cycle periods deliberately different (4s sway / 2.2s bulb / 6s shimmer / 3s title breathe) | Four simultaneous cycles at the SAME period would synchronize into an annoying pulse. Non-harmonic periods drift out of phase continuously, producing a sensed-not-seen "living room" background rather than a rhythmic wave. Cycles picked to have no simple integer ratios between them |
| 2026-04-17 | Bunting transform-origin `50% 0` (pivot at top center) rather than center or bottom | Bunting in the physical world hangs from a central rope anchor — top-center pivot matches that physics. Rotating around center would swing the whole strip side-to-side like a pendulum, which reads wrong for a stretched-rope element. Top-center pivot gives the rope a natural "flag-in-wind" motion |
| 2026-04-18 | F-17 rotate-gate qualified by `(pointer: coarse)` rather than a `/test` bypass | The gate's intent is "phone held sideways" — a physical-device signal. Adding `pointer: coarse` keeps the media query self-describing (it fires only when the device is actually touch), so the gate no longer fires in desktop iframes that happen to have landscape-short viewports (`/test/` at any standard laptop height). Symmetric to F-08's `pointer: fine` signal on the desktop-gate. A global `/test` query-param bypass would have needed JS state on every surface; the CSS media-query qualifier lives in one line |
| 2026-04-18 | Pretext vendored as `client-shared/pretext.js` + `pretext-hooks.js` wrapper, not consumed directly | The Pretext API is an ES module; `client-controller/gameplay.js` and `client-host/main.js` are classic scripts (no `type="module"`). The hooks wrapper does the dynamic `import('/shared/pretext.js')` once, surfaces an imperative `window.PretextHooks` API, and gates all measurement on `Promise.all([import, document.fonts.ready])` so the first `prepare()` uses real font metrics. Keeps the callers a no-knowledge adapter surface |
| 2026-04-18 | Pretext hooks are additive, never load-bearing | If the dynamic import fails or `document.fonts.ready` rejects, `PretextHooks.measure` stays a no-op and elements keep their CSS-defined heights. No caller branches on `isReady`; the pattern degrades silently. This is why the hook script can be added to every HTML entry point without a fallback-asset audit |
| 2026-04-18 | WebP content-negotiation via server-side MIME swap + `Vary: Accept`, not per-asset `<picture>` tags | Rewriting every HTML / JS / CSS / canvas call site to emit a `<picture><source type="image/webp">` fallback would have meant dozens of edits and broken the canvas renderers (which `new Image()` — no picture element). `server/index.js preferWebp()` intercepts the byte-serving layer: requests for `/assets/foo.png` carrying `Accept: image/webp` with a `foo.webp` sibling on disk silently get the WebP; everything else gets the PNG. `Vary: Accept` keeps proxies honest. Every existing asset path keeps working |
| 2026-04-18 | PNG stays the source-canonical format; WebP is wire-only | Canvas renderers that sample pixels (`SpriteLoader.loadPainterly` chroma-key, `CharDraw.blob` procedural reads) need predictable RGBA data. Browser WebP decoding is visually identical to PNG but the workflow stays simpler when the art pipeline outputs PNG and the server compresses at serve time. Keeps the 89MB of canonical PNGs in the repo (no double-commit of PNG + WebP authoritative sources) |
| 2026-04-18 | Phase 18 overlay backdrops use `<img>` element, not CSS `background-image` | Phase 10 lobby-backdrops + Phase 12a standings + Phase 9 tournament throne all converged on the `<img>` pattern because it enables `object-fit: cover` / natural aspect ratio + easy JS `.src` swap to the loadPainterly data URL. Background-image would need a CSS custom property + `<style>` injection (Phase 15 path) AND separate per-overlay inset math. `<img>` with `inset: 0; object-fit: cover` is simpler and already works across the tournament codebase |
| 2026-04-18 | Single universal `gameover-hall.png` for all four games, not per-game backdrops | Per-game gameover backdrops would have meant four commissions + a switch in `buildDom` reading `o.gameId`. But the `.gp-gameover-overlay` DOM is shared across all four games, the winner composition is game-agnostic (eyebrow + hero + subline + quip + button), and the host-side Phase 8c race-podium already handles race's per-game visual differentiation on the HOST screen. One universal backdrop on controller + one podium on host is enough. Hill / meteor / escape get their per-game personality from the in-game canvas art, not the post-game stage |
| 2026-04-18 | Gameover + elim dark scrim lifted from 0.92 to 0.55 | The original solid dark-blur scrim was paired with a flat dark overlay — no painted atmosphere to compete with, so max opacity was fine. With painted backdrops under the content, 0.92 buries the painting. 0.55 preserves the blur-separation from live gameplay while letting the painted spotlight and curtain atmospheres read. Text over the spotlight uses existing `text-shadow` (gold hero, red letterpress elim) which stays legible |
| 2026-04-18 | Spectate leader gold-glow replaces `· LEADER` text tag | The painted cream slot strips in standings-scroll can't fit "42 · LEADER" at 220px list width without horizontal overflow. Tournament's own standings already relies on visual emphasis (scale + glow on `.leader`) rather than an inline "LEADER" tag. Controller spectate adopts the same: `.gp-spec-pill.leader .gp-spec-pill-name` gains a gold text-shadow, `.gp-spec-pill-meta` flips to `--accent-gold-hot` with a red letterpress. Meta stripped to just the score string |
| 2026-04-18 | Three backdrop loadPainterly swaps batched into one setTimeout array loop | Phase 12b had one swap (orb `cell-action`). Phase 18 adds three more (spec standings-scroll, gameover hall, elim shadow). Rather than four separate setTimeouts, the Phase 18 change collapses into a single loop over a `swaps` array inside the existing setTimeout. Fewer task-queue tasks, easier to extend when a future overlay gets a backdrop too |
| 2026-04-18 | Phase 19 score plaque reused for score block AND countdown digit | Same Phase 12b discipline — the score plaque frame fits both the persistent 64px score and the ephemeral 180px countdown. One commission, two surfaces, two `::before` rules with different insets. Would have been ~50% more art budget to commission a dedicated countdown-stamp PNG when the score plaque's corner ornaments already frame a big centered letterform correctly |
| 2026-04-18 | Phase 19 HUD chrome uses CSS `::before` + custom property, not `<img>` elements | The score plaque and hintbar stage are DECORATIVE backdrops behind existing text / flex children. `<img>` would require threading DOM changes into three sites (score block, countdown digit, hintbar) and breaking their existing layout. `::before` with `background-image: var(--*-bg, url(raw))` stays in CSS, adds no DOM, and falls back gracefully to the raw PNG on first paint. Phase 18 used `<img>` for its three full-screen overlay backdrops where the backdrop IS the content layer — here the backdrops are chrome, not content |
| 2026-04-18 | Hintbar scrim lightens 0.82 -> 0.45 to let the painted stage read | Original 0.82 solid dark gradient was paired with a transparent flat background; now with a painted theatre stage underneath, 0.82 would bury the proscenium + wooden floor. 0.45 retains the bottom-fade that blends into the safe-area inset, keeps tonal separation from live gameplay behind the overlay, but lets the painted stage dominate the 96px strip's atmosphere |
| 2026-04-18 | Countdown digit plaque uses a bigger `::before` inset than the score block | The 180px countdown letterform is ~2.8x the 64px score. Using the same inset for both would either crowd the score (too much plaque) or shrink around the countdown (plaque ornaments clipping the letterform). Separate per-surface inset rules pair each letterform size with a proportional plaque frame: score block `-18/-36/-10/-36`, countdown digit `-30/-80/-20/-80` |
| 2026-04-18 | `.gp-topbar` intentionally stays CSS-only in Phase 19 | Top-bar is a thin 44px strip holding a small eyebrow (game name small-caps) and a phase icon. Painting it would add a busy top band competing with the score plaque rendered just below, and eyebrow text already reads comfortably against the existing subtle gradient. In-game vertical hierarchy benefits from ONE painted anchor per zone — score plaque is that anchor for the top half, hintbar stage for the bottom half |
| 2026-04-18 | Phase 20 PostGame gets a `backdropMode` option, not per-mode CSS classes on the overlay | The overlay already has a `.pg-backdrop` class shared by the img; adding `.pg-backdrop-podium` / `.pg-backdrop-hall` keeps existing rules intact and lets mode-specific layouts co-exist without touching the existing race flow. The overlay container uses a `[data-backdrop-mode="hall"]` attribute selector for the scrim override so `'podium'` mode stays at 0.92 (race needs the dark bg behind its bottom-anchored podium) and `'hall'` drops to 0.55 (so the full-cover painted atmosphere reads). Default 'podium' preserves the Phase 8c race flow without edits |
| 2026-04-18 | Phase 20 reverses Phase 9's "skip round-intro backdrop" decision | Phase 9 said the curtain-reveal aesthetic would fight a backdrop. Two phases later, painted backdrops have shipped on every other tournament mode (standings scroll, champion throne) + every gameover mode + every lobby + every in-game HUD surface. Not painting round-intro now reads as an inconsistency, not a deliberate restraint. The attraction-poster format (painted signboard with cream inner panel) specifically frames the reveal rather than fighting it — the curtain parts onto the painted poster, which reads as the NEXT attraction being announced |
| 2026-04-18 | Round-intro TOURNAMENT + GET READY absolute-positioned above/below the painted poster | Poster has painted top + bottom ribbon banners that would have competed with the DOM text if TOURNAMENT (top of stack) and GET READY (bottom of stack) landed inside the poster bounds via natural flex flow. Absolute anchors `calc(50% - 230px)` / `calc(50% + 210px)` pull those two rows onto the dark overlay scrim OUTSIDE the poster, where they read cleanly. ROUND X + game name stay in-flex, centered over the painted cream panel |
| 2026-04-18 | Round-intro `mode-round-intro` class scopes layout like Phase 12a `mode-standings` | Tournament overlay renders three modes (standings, round-intro, champion) on the same `#t-content` element. Each mode needs its own layout rules without bleeding into the others. The mode class precedent (Phase 12a for standings) keeps every mode's CSS a self-contained scope. `renderRoundIntro` adds `mode-round-intro` + clears the two others; `renderStandings` + `renderChampion` clear `mode-round-intro` on their own add-class calls. Three modes, three self-contained blocks, no cross-contamination |
| 2026-04-18 | E2E audit: tournament overlay gets full-cover painted hall backdrop | User directive "у всего должен быть фон." The tournament overlay previously rendered mode-specific backdrops (standings-scroll / round-intro poster / champion throne) floating on a plain rgba(47,28,12,0.94) dark void. The void read as a UI dead zone, not a theatrical stage. Reused the Phase 18 `gameover-hall.png` as a prepended `<img id="t-hall-backdrop">` at z-index:0, object-fit:cover — painting the entire viewport. Scrim drops 0.94 → 0.62 so the painted hall shows through while still separating the overlay from live gameplay. Mode backdrops continue to stack inside `#t-content` at z-index:1. Host now paints the theatrical atmosphere under every tournament beat, matching the Phase 10 lobby cadence |
| 2026-04-18 | E2E audit: ornament-corner strict sweep widened chroma 12 → 40 | Phase 7c switched `SpriteLoader.loadPainterly` from two-pass strict+edge to edge-seeded-only because the strict-everywhere pass ate pure-white interior pockets of the race-flag checker. But `ornament-corner.png` has interior checker pockets bounded by the painted flourish's ink outlines — edge-seeded BFS can't reach them. Re-introduced a GLOBAL strict sweep just for the corner asset in host-common.js's post-load step, widening chroma tolerance to 40 so warm-tinted grey pixels (image-gen preview can bake with color cast) also clear. Saturated gold (chroma 75+) and dark ink outlines (brightness <100) both survive |
| 2026-04-18 | E2E audit: painted-backdrop text legibility recipe | Pattern applied to 6 surfaces: `.t-bar`, `.t-final-scores-label`, `.t-next`, `.t-standings-commentary` (tournament), `.pg-narrator`, `.pg-countdown` (PostGame), `.gp-score-context` (controller HUD). All previously used `var(--text-dim)` (55% cream) — invisible on painted cream panels or bright painted sky/floor zones. Standard recipe: flip color to `--accent-gold` or `--text-cream` (or `--text-on-gold` if ON cream panels), add a double text-shadow (`0 1px 0 rgba(0,0,0,0.75), 0 0 12px rgba(0,0,0,0.6)` for light text on bright painted areas, `0 1px 0 rgba(255,221,107,0.3)` gold letterpress for dark text on cream). Round-intro TOURNAMENT + GET READY gain semi-transparent dark pill backgrounds for full contrast regardless of painted tonal zone behind |
| 2026-04-18 | E2E audit: char-glyph default sizing on per-game hosts | Phase 5a animal PNGs (1024x1024 natural) rendered at full resolution inside per-game host lobby pills (escape / hill / meteor / race) because only `client-host/index.html` carried the `.player-pill-icon img.char-glyph { width: 22px }` rule. On every other per-game host `HostCommon.lobbyPlayersHTML` emitted `<img class="char-glyph char-glyph-inline">` with no sizing CSS, so Bob + Carla appeared as screen-dominating giants. Fix: inject base `img.char-glyph { width: 1em }` + `img.char-glyph-inline { width: 1.4em }` rules into host-common.js's module-init `<style>` block so every host inherits glyph defaults. Main lobby's more specific rule still overrides to 22px for pill context |
| 2026-04-18 | Phase 21 ambient particles on a shared canvas layer, not per-surface SVG | A single module with a pool-allocated 120-element array + one RAF loop across all attached layers beats 50+ moving DOM elements per surface (reflow cost + paint). Canvas allows additive `shadowBlur` glow on sparkles/embers that DOM approximations would need expensive `filter` on each element. Zero dependencies — the module fits in 220 lines with the three presets baked in |
| 2026-04-18 | Glint sweeps via CSS gradient `::after` translation, not extra painted asset | Two-layer painting (flourish PNG + glint gradient layer) exists as a Phase 15a pattern for the bunting overlay::before. Extending to `.ornament-corner::after` with `mix-blend-mode: screen` + `transform: translateX()` reuses the pattern with zero new assets. Per-corner staggered `animation-delay` (0 / 1.5 / 3 / 4.5s) makes the sweep travel around the overlay perimeter instead of 4 synchronized flashes |
| 2026-04-18 | Phase 21c reused existing `--ease-bounce` token instead of adding `--ease-spring` | The Phase 21 spec originally proposed a new `--ease-spring` token at `cubic-bezier(0.34, 1.56, 0.64, 1)` overshoot. But that IS the existing `--ease-bounce` token (Phase 14 motion polish). Reusing keeps the design-system tokens deduplicated — one "gentle overshoot" curve used by both hero-title breathing and now overlay entry timing. Consistency over new-name freshness |
| 2026-04-18 | Ambient particles are attach-based, not auto-probing | `AmbientFx.attach(overlayEl, presetName)` requires explicit opt-in per surface — rather than the module scanning the DOM and injecting layers behind every detected overlay. Explicit opt-in keeps the integration traceable (grep for `AmbientFx.attach` to find all active surfaces) and lets each surface choose its preset. Scanning would have coupled the module to specific selectors and been harder to opt OUT from for surfaces that shouldn't have particles (e.g., per-game canvas gameplay — busy visual field already) |
