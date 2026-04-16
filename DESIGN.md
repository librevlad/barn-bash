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

Sixth realization: custom animal avatars replace the Unicode-emoji
roster (Phase 5a, 2026-04-16).

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
- Screenshots: `screenshots-review/phase5a-parade-complete.png` —
  all eight avatars in the "Choose your fighter" grid as a single
  consistent family.

Phase 5a closes the player-identity layer. Animals no longer render
differently across Windows / iOS / Android / Chrome versions; every
venue sees the same eight characters.

---

## Phase roadmap

1. **Phase 1** (shipped 2026-04-15): controller onboarding + initial theme tokens.
2. **Phase 1.5** (shipped 2026-04-15, this pass): shared `theme.css`, host
   lobby migration, all 4 per-game host UIs, shared overlays (narrator,
   postgame, tournament, hud, transitions), component library, narrator
   voice guide, sound catalogue, accessibility baseline, decisions log.
3. **Phase 2**: controller gameplay screens — score, gesture feedback, swipe
   arrow, cooldown — themed through tokens. Open its own spec.
4. **Phase 3** (shipped 2026-04-16): per-game canvas polish — `engine/palette.js`
   scaffold (3a), race brass track + meteor carnival telegraph (3b), escape +
   hill carnival signatures (3c), wood-plank lap pennant + DESIGN.md update
   (3d). Spec: `docs/superpowers/specs/2026-04-15-per-game-canvas-polish-design.md`.
5. **Phase 4** (shipped 2026-04-16): offline & iconography polish —
   vendored Alfa Slab / Cutive / Inter (4a), `/client-shared/icons.js`
   functional-SVG sprite (4b), dark-only `color-scheme` lock + DESIGN.md
   fifth realization (4c). Spec:
   `docs/superpowers/specs/2026-04-16-offline-and-iconography-design.md`.

6. **Phase 5a** (shipped 2026-04-16): content pass — 8 custom animal
   PNG avatars (cat / frog / wolf / bear / bunny / pig / chicken /
   raccoon) replacing Unicode emoji on the selection grid, pills,
   quick-confirm, waiting-screen, and lobby. Human-in-the-loop
   image-gen pipeline; style guide + prompt template in the spec.
   Spec: `docs/superpowers/specs/2026-04-16-content-pass-design.md`.
   Phase 5b (narrator portrait) + further content (per-game
   environmental art, GLB extension) remain open as future stretch.

After Phase 5 follow-ups (internationalization, WebGL performance,
GLB extension, per-game environmental art) each open their own spec
when demand justifies.

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
