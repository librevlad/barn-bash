# Controller Onboarding + Carnival Theme — Design Spec

**Date:** 2026-04-15
**Project:** Frantics — party racing game
**Phase:** 1 of 3 (Onboarding + visual theme foundation)
**Scope:** `client-controller/` + minimal server color-assignment change + DESIGN.md

## Problem

The phone controller at `client-controller/` currently ships with a minimal dark-bg UI (`#222`) that does not match the carnival/wood/gold host aesthetic established in `client-host/` over the last 15+ commits. Players type a name, pick one of 8 emoji animals, connect, and immediately stare at a blank score screen until the host starts a game.

Three gaps:
1. **Visual dissonance** — the controller feels like a different product than the lobby modal.
2. **Ownership missing** — players cannot choose their car color (server auto-assigns). In a racing game where the car IS the avatar, this is flat.
3. **Dead waiting state** — after onboarding, the player sees `Connecting...` then a bare `0` score with no social context.

Phase 1 fixes all three: a theatrical 3-step onboarding (name, animal, color) in carnival theme, ending in a rich waiting room that shows the player's card and other contestants. Total 5 screens counting the intro splash and waiting room.

## Success criteria

- Returning players can quick-join in < 2 seconds (one tap).
- New players complete onboarding in < 20 seconds (name + animal + color + auto-waiting).
- Every screen is visually recognizable as Frantics (shared palette, typography, motif with host lobby).
- Carnival theme works on iPhone SE (320×568) without horizontal scroll or hidden buttons.
- `prefers-reduced-motion` users get functional onboarding in < 2s total (no theatrical delays).

## Non-goals (explicitly out of scope for Phase 1)

- Gameplay controller UI (score display, gesture feedback during play) — Phase 2.
- Game-specific controller screens for Race/Escape/Hill/Meteor — Phase 3.
- Character-based gameplay mechanics (animal traits are cosmetic only).
- Multiplayer lobby chat or emotes.
- Avatar customization beyond animal + car color (hats, decals, nicknames).
- Tournament flow, stats, progression.

## Architecture

### Module boundary

Onboarding becomes a self-contained module with a clean API:

```js
// client-controller/onboarding.js
Onboarding.start({
  onDone: (playerData) => connectWS(playerData)  // passes {name, character, carColor}
});
```

The module owns its DOM (`#onboarding-container`), state machine, curtain transitions, and localStorage persistence. It knows nothing about WebSocket or gameplay. `main.js` delegates to it on page load and connects the WS only after `onDone` fires.

### State machine

```
intro (1.2s splash)
  ├─ [returning player] ──fade──→ quick-confirm ──fade──→ waiting
  └─ [new player] ──curtain──→ name ──curtain──→ animal ──curtain──→ color ──curtain──→ waiting
                                                                                          └─curtain─→ gameplay (handoff)
```

- `intro` auto-advances after 1.2s; tap skips.
- `quick-confirm` shows the saved player's card with a `PLAY AS VLADIMIR` button and a subtle `change` link. Transitions into/out of `quick-confirm` use a 200ms fade, not the full curtain (the returning-player path is deliberately fast).
- Each transition between screens in the new-player path plays a 700ms curtain reveal with a Game Master title card.
- `back` button on screens 2-4 goes to previous (localStorage preserves partial state).
- `waiting` is the terminal onboarding state. It receives `player_joined` events over WS and renders pills. When the host starts a game, a final curtain transitions into `gameplay` — owned by `main.js`, not onboarding.

### File changes

| File | Change | Size |
|------|--------|------|
| `client-controller/index.html` | Remove inline onboarding overlay, add Google Fonts links, add `#onboarding-container` | −60 lines, +15 lines |
| `client-controller/main.js` | Remove inline onboarding logic (lines 47-127), delegate to `Onboarding.start` | −80 lines, +10 lines |
| `client-controller/onboarding.js` | NEW — state machine, 5 screens, curtain, persistence | +250 lines |
| `server/players.js` | Accept `preferredColor`, prefer it if available, otherwise next free | +8 lines |
| `server/index.js` | Pass `msg.carColor` to `players.add`, include assigned color in `init` msg | +3 lines |
| `DESIGN.md` (root) | NEW — theme tokens (colors, fonts, spacing, motion) | +80 lines |
| `assets/onboarding/` | NEW folder — `curtain-top.png`, `curtain-bottom.png`, `bg-wood-warm.png` | 3 PNG |
| `assets/sprite-animal-*.png` | NEW — 8 pixel-art animal sprites, 64×64 each | 8 PNG (art task) |

### Data flow

**Client → Server (join):**
```json
{ "type": "join", "name": "vladimir", "character": "wolf", "carColor": "red" }
```

**Server → Client (init):**
```json
{ "type": "init", "playerId": 3, "name": "vladimir", "character": "wolf", "color": "red" }
```

If the server could not honor `carColor` (taken), `color` in `init` differs from the requested one. The controller shows a 2s toast on the waiting screen: `"Red was taken — you got blue instead."` and updates the displayed car.

**localStorage schema:**
```json
{ "name": "vladimir", "character": "wolf", "carColor": "red" }
```

All three fields must be present for `quick-confirm` to trigger. Partial saves (just name) fall back to standard flow with the name pre-filled.

## Visual design

### Design tokens (DESIGN.md)

**Colors:**

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-wood-deep` | `#3d2817` | Primary background (dark polished wood) |
| `--bg-wood-warm` | `#5a3a20` | Secondary background, cards, buttons base |
| `--bg-wood-lite` | `#7a5030` | Elevated surfaces (medallion inner, card bg) |
| `--accent-gold` | `#f4c542` | Primary accent: buttons, medallions, progress |
| `--accent-gold-hot` | `#ffdd6b` | Hover / active states |
| `--accent-red-curtain` | `#a72d2a` | Curtain face |
| `--accent-red-deep` | `#6b1818` | Curtain shadow / deep folds |
| `--text-cream` | `#f5ead4` | Primary text |
| `--text-dim` | `rgba(245,234,212,0.55)` | Secondary text |
| `--success-green` | `#7bc950` | Confirmations, "you're in" |
| `--danger-red` | `#d9534f` | Error states |

**Typography** (Google Fonts, vendored):

- **Display / headlines:** `Alfa Slab One` — carnival poster slab. Sizes: 28, 32, 40, 48px.
- **Accents / micro-copy:** `Cutive` — typewriter, "old ticket" feel. Sizes: 10, 12, 14, 16, 18px.
- **UI / input:** `Inter` — legibility on small screens. Weights: 400, 600. Sizes: 14, 16px.

**Spacing** (8px base grid):

- Screen edge padding: 24px default, 16px on narrow screens (`max-width: 360px`).
- Minimum tap area: 44×44px (Apple HIG).
- Animal medallion: 72×72 circle, 8px inner ring, emoji/sprite 32-40px center.
- Color tile: 56×56 square, 4px inset, car sprite 48×48 inside.

**Motion:**

- Curtain reveal: 700ms `cubic-bezier(0.5, 0, 0.3, 1)`, simultaneous top-down + bottom-up, meeting at center.
- Game Master title card: fades in at 400ms into curtain, holds 250ms, fades with reopening.
- Tap feedback: 120ms `scale(0.94) → scale(1.0)`.
- Selection pulse: 400ms golden radial glow around selected cell.
- `prefers-reduced-motion: reduce`: curtain → crossfade 150ms; title card still appears but instantly.

### Screen-by-screen

#### Screen 0 — Intro splash (1.2s auto-advance)

Dark wood bg. Centered:
- Row of 5 gold light bulbs (CSS), staggered glow animation (0.1s stagger per bulb).
- `FRANTICS!` in Alfa Slab 48px, color `--accent-gold`, text-shadow `0 2px 0 var(--accent-red-deep)`.
- `A GAME MASTER PRODUCTION` in Cutive 10px, letter-spacing 3, color `--text-dim`.
- Tap anywhere → skip to next screen immediately.

#### Screen 1 — Name

- Top: 3-dot progress indicator (● ○ ○) — only choice screens get dots; intro and waiting are outside the sequence.
- Center: `Your name, hero:` in Cutive italic 16px cream.
- Input: 280×56px, `--bg-wood-warm` background, 2px `--accent-gold` border, Inter 18px, centered text. Placeholder `enter your name...` in Cutive dim.
- Below input: `NEXT` button — ticket-shaped, gold fill, Alfa Slab 18px. Disabled until input has 1+ chars.
- Bottom: random quip from array of 8 in Cutive italic 12px dim (e.g., `"Make it memorable. You won't be here long."`).
- Enter key = NEXT.

#### Screen 2 — Animal

- Top: 3-dot (● ● ○) + BACK link.
- Center: `Choose your fighter.` in Alfa Slab 22px gold.
- Grid: 4 columns × 2 rows. 8 animal medallions. Each medallion:
  - 72×72 circle, `--bg-wood-lite` inside, 3px `--accent-gold` outer ring.
  - Emoji (Phase 1 placeholder) or pixel sprite (Phase 1c) 36×36 centered.
  - Below medallion: animal name in Cutive 11px cream, trait below it in Cutive 9px dim (e.g., `Cat` / `Agile`).
  - Sizing: default 72×72 cell with 8px gap. On narrow screens (≤360px), cell shrinks to 64×64 with 8px gap — fits inside 320px viewport with 16px edge padding.
- Selected state: outer ring becomes `--accent-gold-hot`, 4 small gold stars orbit (CSS `@keyframes`), `navigator.vibrate?.([15])`.
- Below grid: selected character's quip fades in (Cutive italic 13px dim). Empty by default.
- Bottom: `CONFIRM` ticket button — disabled until a selection exists.

#### Screen 3 — Color

- Top: 3-dot (● ● ●) + BACK link.
- Center: `And your ride?` in Alfa Slab 22px gold.
- Grid: 5 columns × 2 rows. 10 color tiles:
  - Order: red, blue, yellow, green, pink, lightblue, purple, magenta, orange, greenalt.
  - Each tile: 56×56 square (48×48 on narrow ≤360px to fit iPhone SE 320px), `--bg-wood-warm` background, 2px border, car sprite scaled to fill tile minus 4px inset.
  - Selected: 3px `--accent-gold` border, small glowing lightbulb top-right.
- Below grid: selected color name in Cutive 14px gold (e.g., `RED`).
- Bottom: `STEP RIGHT UP!` — the grand finale button, largest version of ticket button, Alfa Slab 22px.

#### Screen 4 — Waiting room

- Top-right: ⚙ icon (28×28), tap → confirm dialog "Leave the show?" → resets localStorage + restarts intro.
- Center top: `YOU'RE IN!` in Alfa Slab 28px gold, with a subtle golden pulse on mount.
- Player card (large, central, ~240×200):
  - Red banner at top holds the player name: 32px tall ribbon in `--accent-red-curtain` with `--accent-red-deep` shadow beneath, gold text in Alfa Slab 18px (`--accent-gold`).
  - Animal emoji/sprite 48×48 inside a small gold medallion, pinned top-right of the card, partially overlapping the banner.
  - Car sprite 120×96 centered in the body of the card.
  - Card background: `--bg-wood-warm` with 16px rounded corners and a 2px `--accent-gold` border.
- Below card: `Other contestants:` in Cutive 12px dim, left-aligned.
- Vertical list of pills (max height 40% of viewport, scrolls if needed):
  - Each pill: `● alice · 🐱  red` — small colored dot + name + animal emoji + color word. Cutive 13px.
  - On new `player_joined` event: pill slides in from right with 300ms ease.
- Bottom: `· · · awaiting the host` in Cutive italic 14px dim, dots pulse with 1.2s cycle.

### Curtain transition

**Assets:**
- `assets/onboarding/curtain-top.png` — red velvet curtain attached at the top, hanging down. Fabric folds, gold rope trim along the bottom hem. Rendered to cover 60vh at full extension.
- `assets/onboarding/curtain-bottom.png` — vertical flip of the top asset (attached at the bottom, rising up). Same fabric and gold rope hem, now on the top edge.

**Sequence (total 700ms, reduced-motion: 150ms crossfade):**

```
t=0ms      Old screen visible. Curtains at -60vh (top) and +60vh (bottom).
t=100ms    Curtains start sliding toward center.
t=350ms    Curtains meet at center. Gold Game Master text fades in:
           "AND NOW... THE ANIMAL!" (Alfa Slab 24px, gold, centered).
t=450ms    Text holds, faint sparkle animation on text.
t=600ms    Text fades, new screen mounts invisibly behind curtains.
t=650ms    Curtains start separating.
t=700ms    Curtains offscreen. New screen visible.
```

**Title card phrases (by destination):**

- → `name`: `"FIRST — WHO ARE YOU?"`
- → `animal`: `"NOW — CHOOSE YOUR FIGHTER!"`
- → `color`: `"AND FINALLY — YOUR CHARIOT!"`
- → `waiting`: `"THE SHOW BEGINS!"`
- → `gameplay` (Phase 2 handoff): `"LET THE GAMES BEGIN!"`

Reduced-motion fallback: 150ms crossfade between screens, title card appears instantly at midpoint for 250ms then dismisses.

## Server changes

### `server/players.js`

Current (~line 17):
```js
color: COLORS[(id - 1) % COLORS.length]
```

New:
```js
add(ws, name, character, preferredColor) {
  const id = this.nextId++;
  const taken = new Set(this.all.map(p => p.color));
  const color = (preferredColor && COLORS.includes(preferredColor) && !taken.has(preferredColor))
    ? preferredColor
    : (COLORS.find(c => !taken.has(c)) || COLORS[(id - 1) % COLORS.length]);
  const p = { id, ws, name, character, color };
  this.all.push(p);
  return p;
}
```

### `server/index.js` (handleJoin, ~line 335)

Current:
```js
playerId = players.add(ws, msg.name, msg.character);
```

New:
```js
playerId = players.add(ws, msg.name, msg.character, msg.carColor);
```

The `init` message already includes `color` — no change needed there, client picks up the actual assignment.

## Error handling

| Scenario | Behavior |
|----------|----------|
| Empty name | `NEXT` disabled, input shake animation on tap |
| Name > 16 chars | `maxlength=16` prevents typing more |
| Duplicate name | Allowed (existing behavior — names aren't unique) |
| Requested color taken | Server silently assigns another; client shows a 2s toast (non-blocking banner at top of the waiting screen, dismisses automatically) |
| > 10 players | Server falls back to mod-assignment; client shows a persistent "show is crowded — car colors may repeat" banner on the waiting screen until game start |
| WS fails during `connectWS` | Retry 3× with backoff 1s/2s/4s; then error screen with RETRY button |
| WS disconnects on waiting | Toast "Lost connection...", after 2s redirect to intro → quick-join with saved data |
| `localStorage` JSON corrupted | `try/catch`, treat as new user, clear key |
| `navigator.vibrate` unavailable | Silent fallback (optional chaining) |
| Landscape orientation | Overlay: "Please rotate your phone vertically" blocks interaction |
| Hardware back on Android | Steps 2-4: go to previous step; Step 1: default browser behavior |
| Tab hidden (visibility) | WS ping paused, no-op on resume |

## Testing

### Unit tests

- State machine transitions: `goTo('animal')` from `name` works; `goTo('color')` from `name` throws.
- `back()` decrements state; at `name`, no-op.
- `reset()` clears localStorage, returns to intro.
- localStorage corruption: invalid JSON handled gracefully.

### Visual tests (via `browse` skill)

Capture at 3 viewports:

- iPhone SE 320×568 — all elements visible, no clipping on animal grid (4×2 must fit).
- iPhone 14 390×844 — standard rendering.
- iPhone Pro Max 430×932 — no wasted space, waiting card scales up.
- iPad portrait 768×1024 — container max-width 460px, centered.
- Landscape — rotation overlay must appear.

Compare to approved mockup pixel-by-pixel for color fidelity.

### Integration tests

- Returning player with full `localStorage` → quick-confirm card appears instead of intro.
- Returning player with partial `{name}` only → name pre-filled on screen 1, animal/color still need selection.
- 3 concurrent clients pick `red` → first wins, others get different assignments via toast.
- 11th player joins → gets wrapped color with warning.
- Disconnect on waiting → redirects to intro → quick-join → back to waiting with same state.

### Accessibility

- All tap targets ≥ 44×44px.
- Contrast ratio text-on-background ≥ 4.5:1 (WCAG AA) — verify each screen.
- `prefers-reduced-motion: reduce` → instant transitions, curtain replaced with crossfade.
- Keyboard nav: Tab through inputs/buttons, Enter submits, Esc goes back.
- `<input autocomplete="off">` prevents browser name suggestions.

## Deliverables

### Phase 1a — Prototype (this spec → /design-html)

- `DESIGN.md` in repo root.
- `~/.gstack/projects/frantics/designs/controller-onboarding-20260415/finalized.html` — standalone prototype with mock data, all 5 screens, curtain, reduced-motion path, responsive to 320-430px widths.

### Phase 1b — Production integration (separate writing-plans / executing-plans task)

- `client-controller/onboarding.js` — new module (~250 lines).
- `client-controller/main.js` — delegate to Onboarding module, remove inline logic.
- `client-controller/index.html` — cleanup, Google Fonts, root onboarding container.
- `server/players.js` + `server/index.js` — ~11 lines total.

### Phase 1c — Art (parallel, unblocks gradual)

- `assets/onboarding/curtain-top.png` (~400×600, ~60KB).
- `assets/onboarding/curtain-bottom.png` (mirror).
- `assets/onboarding/bg-wood-warm.png` (~800×1400 for 2x retina, tile-able vertically).
- `assets/sprite-animal-*.png` × 8 (64×64 each) — via Gemini pipeline, same as ticket sprites.

Emoji placeholders used in Phase 1a/b. Phase 1c swap is one-line change per sprite.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Theatrical curtain feels slow on repeat plays | `prefers-reduced-motion` + quick-join for returning players + skip tap on intro |
| iPhone SE cannot fit 4×2 animal grid | Grid cell shrinks to 64×64 with media query at 360px |
| Color race condition feels abrupt | Server always honors first request; toast on waiting is descriptive, not scary |
| Art pipeline late → placeholder emojis ship | Emojis remain valid fallback inside medallion; swap is 1 line per animal |
| 3 fonts load slowly on cold cache | `font-display: swap` + preload hints + first paint uses system font gracefully |
| Google Fonts blocked in some regions | Vendor fonts locally as `.woff2` files |

## Open questions (for implementer)

None at spec time. Visual and behavioral decisions are locked. Implementation order is:

1. Create `DESIGN.md` and prototype HTML.
2. Review prototype visually across viewports.
3. Integrate into `client-controller/` and `server/`.
4. Art pipeline runs in parallel; swap emojis for sprites as they arrive.
5. Ship Phase 1. Phase 2 (gameplay theming) opens separate spec.
