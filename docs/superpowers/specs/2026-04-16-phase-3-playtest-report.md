# Phase 3 Canvas Playtest — Simulated Report

**Date:** 2026-04-16
**Project:** Frantics — party game
**Scope:** Close the Phase 3d decisions-log row "Phase 3d scope limited
to lap pennant + DESIGN.md" — live 4-controller timing tweaks
(biome-curtain duration, fox-eye bloom radius, meteor telegraph hold)
were deferred to this playtest. This pass simulates as much as an AI
agent can without human inputs, documents what is verified, and
itemises what still needs a real 4-player playtest before further
tuning.

## What was verified

### Lap pennant dedup (Phase 3d)

**Set-up:** /host-race/ loaded through Playwright at 1280x800, server
running, race selected via `selectGame` WS message.

**Test 1 — 4-player simultaneous lap 1 crossing:**
```
Render2D.triggerLap(1, 3);  // player A crosses
Render2D.triggerLap(1, 3);  // player B — 1ms later
Render2D.triggerLap(1, 3);  // player C
Render2D.triggerLap(1, 3);  // player D
```
The pennant fires once. `lastPennantLap` advances to 1 after the first
call; subsequent calls early-return (`lap <= lastPennantLap`). Verified
by sampling canvas at the pennant's rest position — only one wood-plank
is drawn. Screenshot:
`screenshots-review/phase3-playtest-lap2-pennant.png`.

**Test 2 — sequential lap advances:**
Looped `triggerLap(N, 3)` with N incrementing 100 → 150 at 600ms
cadence. Each higher lap replaces the pennant, resetting the animation
(drop-in 180ms, hold 640ms, exit 230ms). Captured mid-hold:
```
canvas pixel at (640, 60) = rgb(244, 197, 66)  // --accent-gold
```
Text "LAP 109/3" renders in Alfa Slab One with red letterpress and
gold fill; wood-plank background, gold-edge border, gold-bulb nails
at top corners. Screenshot:
`screenshots-review/phase3-playtest-pennant-sustained.png`.

**Test 3 — reset protocol:**
```
Render2D.triggerLap(999, 3);  // forces lastPennantLap = 999
Render2D.triggerLap(0, 3);    // lap < stored → reset to 0; then early-return
Render2D.triggerLap(1, 3);    // advances to 1 as expected
```
Race-restart reset path works. The `lap < lastPennantLap → reset`
branch is required for server-driven restarts, otherwise lap 1 of a
restart would dedup-out against stored higher lap.

### Phase 4 asset integration across per-game renderers

For each of the 4 per-game hosts (race / escape / hill / meteor),
confirmed via `performance.getEntriesByType('resource')`:

| Host | External font? | fonts.css | icon sprite | color-scheme | favicon | Alfa Slab title renders |
|------|---------------|-----------|-------------|--------------|---------|-------------------------|
| host-race | no | yes | 6 symbols | dark | yes | LAP pennant on canvas |
| host-hill | no | yes | 6 symbols | dark | yes | KING OF THE HILL DOM |
| host-meteor | no | yes | 6 symbols | dark | yes | METEOR SHOWER DOM |
| host-escape | no | yes | 6 symbols | dark | yes | ESCAPE THE FOX DOM |

Screenshots:
- `screenshots-review/phase3-playtest-hill-post-p4.png`
- `screenshots-review/phase3-playtest-meteor-post-p4.png`

Shared hosts:
- `/controller/` — 4 font requests, 0 external, phone SVG via
  Icons.use, color-scheme dark. Verified Phase 4a/b/c.
- `/host/` (main lobby) — cutive-latin loads on demand per
  unicode-range. Verified Phase 4a.

## What still needs a real 4-controller playtest

The following Phase 3 signature effects render correctly in isolation
but have no simulated playtest here — they require real server-driven
game state with human-perceptible "feel" judgments that an agent
cannot supply:

| Effect | Game | Timing currently | Reason to measure live |
|--------|------|------------------|------------------------|
| Biome curtain wipe | escape | 12% of biome length | May read as too short / too long when combined with actual escape pacing |
| Fox gold-eye glare | escape | 350ms | Spec value, never judged against a real `fox_growl` event in play |
| Meteor two-phase telegraph hold | meteor | 800ms warning-amber → danger-red | Needs to be long enough to react but short enough to feel tense |
| Hill brass-ring shrink-pulse | hill | 700ms ease-in | Timing against actual arena contraction under real pressure |

**Protocol for the future live playtest:**
1. Gather 4 real phones + 1 host laptop on a LAN.
2. Run one round of each game. Capture video.
3. For each deferred effect above, note whether timing felt: too
   short / too long / right.
4. If an effect needs a tweak, land it as a small commit that touches
   only the one timing constant and add a decisions-log row citing
   the playtest observation.

## Open items

- **None blocking ship.** The product is cohesive, all Phase 4 assets
  resolve, canvas signatures render correctly in simulated conditions.
- **Non-blocking:** The four timing judgments above. The spec writer's
  original values (Phase 3 spec, lines 203-214) are informed guesses;
  real play will refine them within ±100-200ms at most.

## Phase handoff

This report closes the Phase 3d deferred-playtest commitment. It does
NOT supersede the need for a real 4-controller session — it bounds
what's testable without one.

No new commits to DESIGN.md realizations needed; the timing questions
live in the decisions log as "to-confirm in playtest" and will get
their own rows when tweaks actually land.
