# Controller Gameplay — Design Spec (Phase 2)

**Date:** 2026-04-15
**Project:** Frantics — party racing / survival / dodger game
**Phase:** 2 of 4 (gameplay controller UI after onboarding)
**Scope:** `client-controller/` post-onboarding states + shared gameplay
HUD components. Server protocol unchanged.

## Problem

Phase 1 shipped a theatrical carnival-themed onboarding for the mobile
controller (`client-controller/onboarding.{js,css}`). After the host starts
a game, the onboarding container hides and `main.js` takes over rendering
raw gameplay feedback. The inline CSS for gameplay was partially migrated
to tokens in Phase 1.5 (score gold, gesture-hint wood pill, cooldown gold
gradient), but the **semantics** of each state remain unconsidered:

1. **Score-only screen feels flat.** A 64px gold number and nothing else.
   No per-game context (what does the number mean in meteor vs race?),
   no visual anchor for the player's avatar, no confirmation that the
   device is connected and registering input.
2. **Gesture hints are a one-line wall of text.** Cutive pill at the
   bottom crammed with "TAP = jump · SWIPE ↑ = high jump · SWIPE ←→ =
   lane · SWIPE ↓ = slide" — 4 gestures in one line is hard to parse
   during play. No visual cue for which action is available right now.
3. **Feedback is abstract.** Swipe arrow (⬆) flashes for 150ms at 60px
   in `--accent-gold-hot`. Tap pulse is a ring. Hold ring is a ring.
   Nothing tells the player *what they just did* in game terms —
   "jumped", "dashed", "boosted" — and whether it registered on the
   server.
4. **No state for death / waiting / spectating.** When the player is
   eliminated mid-round, the controller keeps showing gestures that do
   nothing. No explicit "you're out, watching other contestants"
   moment. `$score.textContent = '💔'` is the only cue.
5. **No connection / error states.** If the WS disconnects during play,
   the gestures keep going silently. Players shake their phones and
   blame the game.

Phase 2 resolves 1–5 with a unified gameplay UI that respects carnival
tokens (Phase 1.5) and feels like a continuation of onboarding's
theatricality rather than a stark gameplay HUD.

## Success criteria

- **Time to first useful gesture**: within 500ms of `game_start`, the
  player sees the current game's primary gesture hint visually,
  accompanied by at least one action-specific icon — not a wall of
  text.
- **Input confirmation**: every successful gesture shows an
  acknowledgement within 100ms (before or without server echo). The
  player never wonders "did that register?"
- **Death clarity**: within 400ms of elimination, the controller
  shifts to a spectator state with a narrator quip, a grayscale
  avatar, and gestures disabled. No ghost inputs.
- **Disconnect handling**: if WS drops for more than 1.5s during
  play, a toast announces reconnection attempts and freezes input.
  If WS returns within 10s, play resumes seamlessly.
- **Fits iPhone SE (320×568) portrait**: every gameplay screen
  renders without horizontal scroll or clipped hitboxes.
- `prefers-reduced-motion`: decorative pulses/breathing disabled;
  action confirmations remain but at 50% duration.

## Non-goals (explicitly out of scope for Phase 2)

- Per-game signature visual effects (fox silhouette, meteor shadow
  approaching, hill arena shrink indicator) — that's Phase 3.
- Character-based input mechanics (cat double-jumps, wolf charges) —
  animal traits stay cosmetic in Phase 2.
- Voice narration or sound effects on the controller (server is the
  authority on sound). Controller uses `navigator.vibrate?.()` only.
- Mid-round character/color re-selection.
- Local replay or input log on the controller.

## Architecture

### Module boundary

Gameplay UI joins onboarding as a sibling module:

```js
// client-controller/gameplay.js
Gameplay.start({
  gameId,       // 'escapeFox' | 'hillKing' | 'meteor' | 'race'
  playerId,
  character,    // 'wolf', 'cat', etc
  carColor,     // 'red', 'blue', etc (race only)
  send,         // (action, payload?) => ws.send(...)
});

Gameplay.setPhase('running' | 'paused' | 'eliminated' | 'spectating' | 'lost-connection');
Gameplay.setScore(value, { delta: +1, reason: 'coin' });
Gameplay.announce({ label: 'DODGED!', variant: 'success' });
Gameplay.onGameOver({ winnerId, ... });
Gameplay.stop();  // removes DOM, returns to onboarding waiting for tournament round
```

The existing `main.js` becomes a thin adapter: reads WS messages,
translates them to `Gameplay.*` calls. The gesture parsing (via
`engine/Input.js`) stays in `main.js` because it owns input context.

### State machine

```
lobby  (inherited from onboarding waiting state)
  └─ game_start ──→ countdown (3, 2, 1, GO)
                      └─ running
                           ├─ stumbling (temporary, auto-recovers)
                           ├─ powered (shield / speed / coin - temporary)
                           ├─ eliminated ──→ spectating
                           ├─ connection-lost ──→ running (if reconnect within 10s)
                           │                  └─ controller-dead
                           └─ game_over ──→ result (winner / loser / no-winner)
                                             └─ round-break (tournament) or lobby
```

### File changes

| File | Change | Size |
|------|--------|------|
| `client-controller/gameplay.js` | NEW — gameplay module | +~450 lines |
| `client-controller/gameplay.css` | NEW — gameplay tokens | +~300 lines |
| `client-controller/main.js` | Delegate WS→UI to `Gameplay`; keep gesture manager | −60, +40 |
| `client-controller/index.html` | Remove inline gameplay CSS, add `<link>` for gameplay.css | −100, +2 |
| `assets/controller/icons/` | NEW — 10 action icons 32×32 (tap / swipe / hold + arrows) | 10 PNG or inline SVG |

## Screen-by-screen

### 1 — Countdown (inherits from Phase 2 of onboarding)

When `game_start` arrives:

- Full-screen `--bg-wood-deep` + `--bg-wood-plank`.
- Top: 40px Alfa Slab gold game name (`GAME_NAMES[gameId]`) with
  `--text-shadow-stack`, fading in over 300ms.
- Center: 140px Alfa Slab digits 3 → 2 → 1 with `--ease-bounce`
  stamp animation (each digit: scale 2 → 1 over 300ms, holds 700ms).
- On "GO": digits replaced with "GO!" in `--accent-gold-hot` for 250ms,
  then transition to the running state.
- Reduced motion: no stamp animation; each digit just fades 150ms.

### 2 — Running — shared frame

All four games share this chrome:

- **Top bar** (44px tall, `--scrim-light` gradient fade):
  - Left: game name eyebrow label, Cutive 10px `--accent-gold`
    `--tracking-widest` uppercase ("ESCAPE THE FOX").
  - Right: current phase icon (see below), 20×20 pixel sprite.
- **Avatar orb** (bottom-left, 56×56 circle):
  - Inner: wood-lite background, animal emoji or sprite centered.
  - Outer: 3px ring tinted with the player's `--color-from-palette`
    (e.g. red/blue/yellow). Pulses at 1.2s cycle while alive.
- **Score readout** (top-right of main area, or center if no HUD
  chrome):
  - Alfa Slab 48px gold with `--text-shadow-stack`.
  - On increment: scale 1.2 for 120ms, emit a small particle of the
    delta value (`+1` in `--success-green` Cutive 14px) that drifts up
    and fades over 600ms.
- **Score context** (below score, Cutive 11px `--text-dim`, letter
  spacing 2px):
  - `escapeFox`: "meters dodged"
  - `race`: "laps"
  - `hillKing`: "time alive"
  - `meteor`: "waves survived"
- **Action hint bar** (bottom, 80px tall, covers full width):
  - Horizontal carousel of 3–4 **action cards**, each 64×80,
    showing icon + label.
  - Active (primary) action scaled 1.1 with gold border; others
    at 0.85 opacity in wood-warm.
  - Swipe gestures on the hint bar cycle which action is primary
    (useful for hill/race where multiple actions are equally valid).
- **Center canvas** (300×300 invisible hit area):
  - Receives gestures via `engine/Input.js`. Never visible as a
    box, but all input gestures dispatch from inside it.

### 3 — Running — per-game variants

#### escapeFox (running)
- Primary action: TAP = jump. Icon: 🦘 (or pixel art later).
- Secondary actions cycle: SWIPE ↑ = high jump (🆙), SWIPE ←/→ =
  lane change (⬅️/➡️), SWIPE ↓ = slide (🔽).
- Score context: "meters dodged". Score counts up continuously
  during run; every 50m, the narrator cue `fox_close` triggers
  briefly (but narration is server-authored, not controller-local).

#### race
- Primary action: SWIPE ← / → = steer (↔️).
- Secondary: TAP = boost (⚡), HOLD = drift (🏎️).
- Current held item overlay: if the player has an item, show a
  30×30 pill at top-right with the item sprite (`🛡️`, `🚀`,
  `🪙`). Clears on use.
- Score context: `Lap N/3`.

#### hillKing
- Primary action: SWIPE = move (↔️).
- Secondary: SWIPE ↓ = slam (⬇️), TAP = dash (⚡), HOLD =
  shield (🛡️).
- Score context: "on the hill" (string, not a number — reflects
  hill state which is server-state).

#### meteor
- Primary action: TAP = dodge (🤸).
- Secondary: SWIPE = move (↔️), HOLD = sprint (🏃).
- Warning indicator: when server sends `meteor_warn`, the top of
  the screen flashes `--danger-red` at 0.4 alpha for 800ms.
- Score context: `Wave N`.

### 4 — Running — feedback overlays

Every gesture the player commits triggers *immediate* local
acknowledgement, before server response:

- **Tap confirm**: existing `#tap-pulse` ring (Phase 1.5 already
  gold). Adds a tiny label in the center of the ring: the action
  name in Alfa Slab 12px gold, appearing for 300ms then fading
  ("JUMP!", "DODGE!", "DASH!").
- **Swipe confirm**: existing `#swipe-arrow`. Adds the word below
  ("UP!", "LANE!", "SLAM!") in Cutive 12px matching color.
- **Hold confirm**: existing `#hold-ring` charges. On release: a
  soft "ka-chunk" style scale bounce + label ("DRIFT!",
  "SHIELD!") fades over 400ms.
- Every confirmation: `navigator.vibrate?.([15])`.

Server echo (`action_confirmed`) does nothing visual on success —
we already did the local ack. On **rejection** (cooldown, wrong
phase), the label briefly tints `--danger-red` for 300ms.

### 5 — Running — state modifiers

- **Stumbling** (server sends `stumbling: true`): avatar orb tilts
  ±8° every 200ms, gestures soft-disabled (registered on server but
  no-op). Duration is server-controlled, usually ~1s.
- **Powered** (server sends `shield: true` / `speedBoost: true`):
  avatar orb gains a ring overlay in `--info-blue` (shield) or
  `--accent-gold-hot` (speed), glows at 0.8s cycle until expiry.
- **Near-miss**: server sends `near_miss` event; the whole screen
  flashes `--warning-amber` at 0.3 alpha for 250ms, vibrate
  `[8, 40, 8]`. Purely feedback; no input.

### 6 — Eliminated

Server sends `eliminated: true` on this player.

- 300ms fade to `--scrim-dark` overlay.
- Avatar orb scales to 1.5× at center, turns grayscale (`filter:
  grayscale(1)`), with a slow drop animation (translateY +20px).
- Above avatar: "ELIMINATED" in Alfa Slab 28px `--danger-red` with
  `--text-shadow-stack`, letter-spacing 3px.
- Below avatar: random eliminated quip from pool, Cutive 13px
  italic `--text-cream` (e.g., "You tried. That's... something.").
  (Quips are deterministic per `playerId + round` to avoid flicker
  on rejoin.)
- After 1.5s: overlay fades to 0.7, transitioning to spectating.

### 7 — Spectating

Player is out but round continues.

- Top: "SPECTATING" eyebrow in `--accent-gold` Cutive 11px,
  `--tracking-widest`.
- Center (replaces score readout): a reduced contestant list —
  each still-alive player as a small pill (dot + name + status
  icon). Scrolls if >4 alive.
- Gestures hidden. Hint bar replaced with "waiting for the show
  to end..." Cutive italic dim.
- No vibration, no input echo.

### 8 — Game over (round result)

Server sends `game_over { winnerId }`. Controller shifts to:

- If `playerId === winnerId`: full-screen celebration — avatar orb
  centered at 2×, bouncing (Alfa Slab "YOU SURVIVED!" / "YOU
  WIN!" over it, ticket-btn "BACK TO LOBBY" bottom). Narrator
  quip drawn from the Phase 1.5 WINNER pool via server-pushed
  `narratorText` field.
- Else: wood-deep overlay with "[winnerName] WINS" in gold Alfa
  Slab, avatar of winner small at top, Cutive italic GM quip,
  auto-dismiss after 4s into tournament break or lobby.

### 9 — Connection lost

WS `onclose` fires or no heartbeat for 1.5s:

- Toast banner at top (reuse Phase 1.5 toast) in `--warning-amber`
  border: "Lost the line — trying to reconnect..."
- Input disabled (all gestures no-op on client).
- Reconnection attempts: 1s, 2s, 4s, 8s (4 tries total).
- On success: toast flashes green for 600ms, then fades.
- On final failure: full screen `--scrim-heavy` overlay, "Show
  ended without you." Alfa Slab 24px `--danger-red`, RETRY ticket
  button that triggers full page reload.

## Motion

All durations reference Phase 1.5 tokens. No new values needed.

| Moment | Token | Notes |
|--------|-------|-------|
| Countdown stamp | `--dur-pulse` (400ms) | `--ease-bounce` |
| Action confirm label | `--dur-short` (200ms) in, 100ms out | |
| Score bump | `--dur-tap` (120ms) | `--ease-bounce` |
| Score delta particle | 600ms total | `--ease-out`, translateY −20px |
| Stumble wobble | 200ms × N | server-controlled count |
| Powered glow cycle | 800ms × ∞ | `--ease-out` in, `--ease-out` out |
| Elimination drop | `--dur-medium` (500ms) | `--ease-out` |
| Near-miss flash | 250ms | linear |
| Toast slide | `--dur-short` | from Phase 1.5 toast recipe |
| Game-over fade | 600ms | Phase 1.5 curtain or reduced-motion crossfade |

Reduced-motion rules:

- All scale animations on score / countdown become opacity
  fades at half duration.
- Action confirm labels still render, but without scale pop.
- Avatar stumble wobble disabled.
- Near-miss flash disabled (or reduced to a single frame).

## Components (gameplay.css)

New CSS classes (all in `.gameplay-root`):

- `.gp-topbar` — 44px gradient scrim, holds eyebrow + phase icon.
- `.gp-eyebrow` — Cutive uppercase game name.
- `.gp-avatar-orb` — 56×56 circle with color-tinted ring.
- `.gp-avatar-orb.stumbling` — wobble keyframes.
- `.gp-avatar-orb.shielded`, `.gp-avatar-orb.speeding` — glow overlay.
- `.gp-avatar-orb.dead` — grayscale filter + translate.
- `.gp-score` — Alfa Slab 48px gold.
- `.gp-score-context` — Cutive 11px dim.
- `.gp-score-delta` — ephemeral particle, emitted on `setScore`.
- `.gp-hintbar` — 80px carousel of action cards.
- `.gp-action` — 64×80 card, icon + label.
- `.gp-action.primary` — scaled 1.1, gold border.
- `.gp-action.secondary` — 0.85 opacity.
- `.gp-confirm` — center overlay for tap/swipe/hold ack label.
- `.gp-eliminated-overlay` — full-screen elim frame.
- `.gp-spectator-list` — stack of contestant pills.
- `.gp-gameover` — winner/loser panel.
- `.gp-toast-warning` — warning-amber toast variant.

## Data flow

### Server → controller (WS messages reused from existing protocol)

No new message types required. The controller extracts these
fields from existing messages:

- `state` message carries `players[playerId]` with: `score`,
  `alive`, `stumbling`, `shield`, `speedBoost`, `combo`, `color`,
  `character`.
- `game_start` / `game_over` / `eliminated` / `near_miss` /
  `meteor_warn` — already broadcast by servers.
- `init` on join provides `playerId`, `character`, `color`,
  `gameId`.
- `narratorText` field (if server wants): new optional field on
  `game_over` payload — passes the exact quip from
  `narrator.js` pool so controller can show the same text the
  host is displaying. Server change: ~3 lines in
  `escapeFoxGame.js` / `raceGame.js` / `hillGame.js` /
  `meteorGame.js`.

### Controller → server (actions)

Unchanged. Gesture → action mapping remains in `main.js`. Actions
by game:

- `escapeFox`: `jump`, `jumpStart`, `jumpEnd`, `slide`, `lane`,
  `groundPound`, `useItem`.
- `race`: `steer`, `boost`, `driftStart`, `driftEnd`, `useItem`,
  `dropItem`.
- `hillKing`: `move`, `dash`, `shield`, `slam`.
- `meteor`: `move`, `dodge`, `sprint`.

### Input → local feedback (new)

Every `send(action, ...)` also dispatches `Gameplay.onLocalAction(action)`
so the confirm overlay fires immediately without waiting for server echo.

## Error handling

| Scenario | Behavior |
|----------|----------|
| Gesture during countdown | Ignored silently, no confirm label |
| Gesture while `phase !== 'running'` | Ignored silently |
| Gesture while eliminated | Ignored silently |
| Server rejects action (cooldown) | Confirm label turns `--danger-red` for 300ms |
| WS closes during play | 1.5s grace, then connection-lost overlay |
| WS reconnects mid-play | Pull latest state, resume without transition |
| WS heartbeat stale | Toast "connection weak" at 3s; no input lock |
| Browser tab backgrounded | Pause visual animations; input accepted but label not shown |
| Landscape orientation | Reuse Phase 1 rotation gate |
| iPhone notch | Respect `safe-area-inset-*` (inherits from body) |
| Rapid gesture spam | Debounce to 100ms minimum between same-type actions on client |

## Testing

### Unit

- `Gameplay.setScore(10, {delta:+3})` emits a `+3` particle.
- `Gameplay.setPhase('eliminated')` disables gesture dispatch
  (`Gameplay.onLocalAction` returns early).
- `Gameplay.start({gameId:'race'})` renders race-specific hint
  bar with SWIPE ← / → primary.
- State machine: `running → eliminated → spectating` transitions
  correctly; `eliminated → running` throws.

### Visual (via `browse` skill)

Capture at 3 viewports per game (12 total):

- iPhone SE 320×568: running, eliminated, spectating, game-over.
- iPhone 14 390×844: same four states.
- iPhone Pro Max 430×932: same four states.
- Landscape: rotation gate visible.

Compare against approved mockups for color and spacing fidelity.

### Integration

- Play through all 4 games to game-over. Confirm scores, deltas,
  eliminations, and game-over rendering.
- Mid-game: kill server process. Within 1.5s, connection-lost
  toast appears. Restart server within 10s; play resumes.
- Tournament flow: win round 1, round-break announcement shows,
  round 2 starts automatically with correct gameId.
- 11-player game: 11th player gets wrapped color (inherited from
  Phase 1), HUD renders all avatars without clipping.

### Accessibility

- Contrast: all text ≥ 4.5:1 (verify each state).
- Reduced motion: verify every animation has a fallback.
- Keyboard (desktop dev): arrow keys trigger `move`, Space =
  primary action, Enter = confirm game-over dismiss.

## Deliverables

### Phase 2a — Prototype (this spec → /design-html or /design-shotgun)

- Standalone HTML prototype showing all 8 screens (countdown,
  running-each-game, eliminated, spectating, game-over-winner,
  game-over-loser, connection-lost) at 390×844.
- Visual verification pass.

### Phase 2b — Production integration

- `client-controller/gameplay.js` — new module.
- `client-controller/gameplay.css` — new stylesheet.
- `client-controller/main.js` — delegate WS → `Gameplay.*`.
- `client-controller/index.html` — remove inline gameplay CSS,
  link `gameplay.css`.
- Server: optional `narratorText` field on `game_over` broadcasts
  (~3 lines × 4 games).
- Assets: 10 action icons (placeholders acceptable; custom icons
  are Phase 4).

### Phase 2c — Polish

- Add `navigator.vibrate` patterns per action.
- Tune cadence of stumble / powered animations after playtest.
- Verify tournament round-break UX (round intro handoff).

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Action carousel feels fiddly on small screens | Limit to 3 visible actions; auto-cycle based on gameplay phase, not user swipe |
| Label clutter during rapid input | Coalesce 2+ confirms within 100ms into one label |
| Near-miss flash nauseates some players | Respect `prefers-reduced-motion`; cap flash intensity |
| Emoji icons look off-theme | Phase 4 replaces with carnival pixel sprites; emoji placeholder valid |
| Too much info on 320px viewport | Score context, eyebrow, and hintbar stack vertically below 360px |
| Local action confirm desyncs from server | Treat server rejection as authoritative; tint label red to show the mismatch |
| Vibrate API blocked on iOS Safari | Optional chaining; vibration is nice-to-have, not critical |

## Open questions (for implementer)

1. Should the **action hint bar** auto-cycle (show the most likely
   next action) or stay static? Playtest will decide.
2. Is the **score-delta particle** worth the cost of scoring every
   tick? Alternative: only emit on whole-second milestones or
   significant scoring events (coin, kill).
3. Should eliminated players see the **full spectator list** or
   just the remaining leader? Minimalist version shows leader only.
4. On **reconnect**, do we reset score + phase from latest
   `state`, or trust the client's pre-disconnect snapshot?
   Server-authoritative is safer — reset from `state`.

## Phase handoff

After Phase 2 ships, DESIGN.md appends a new realization
("Fourth realization: controller gameplay, Phase 2, <date>") and
decisions log entries for any non-obvious calls made during
implementation (e.g., action carousel vs static hint, particle
emission frequency).

Phase 3 (per-game canvas polish) can start in parallel once
Phase 2a prototype is approved — the two phases don't block each
other because Phase 3 touches host canvas, Phase 2 touches
controller DOM.
