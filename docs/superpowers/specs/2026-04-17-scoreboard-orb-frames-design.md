# Tournament Scoreboard + Controller Avatar Orb — Design Spec (Phase 12)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 12 of ?, third AAA-polish pass after Phase 11 closed the
selection-grid cell frames.
**Scope:** two painterly PNG backdrops — one behind the tournament
standings player rack (seen between rounds), one around the
controller gameplay avatar orb (always-on during play). Plus: the
controller gameplay orb switches from raw emoji to the
loadPainterly-processed animal avatar that Phase 5a+audit-fix
already built for onboarding.

## Problem

Audit-flagged gaps that remain after Phase 10-11:

1. **Tournament standings scoreboard** — between-round display is
   4 flat brown rounded rectangles with player colour dots + names
   + score numbers. Looks like a CSS card layout, not a hand-
   painted scoreboard. Shown twice per tournament (after rounds
   1 and 2) — both are key narrative beats.
2. **Controller gameplay avatar orb** — bottom-left of the
   controller HUD during play. Renders the player's chosen animal
   as a RAW EMOJI (🐱 / 🐸 / etc) inside a green-tinted circle.
   Two gaps: (a) no painterly frame around the orb (plain CSS
   circle with a border), (b) the emoji avatar ignores the
   loadPainterly-processed animal PNG pipeline that all other
   UI surfaces adopted in Phase 5a + audit fix.

## Success criteria

- **`assets/standings-scroll.png`** — 1024×1024 digital-watercolor
  carnival scoreboard / announcement scroll: wooden plank
  background with gold-leaf trim, curling rope edges at top and
  bottom, four cream-white slot strips stacked vertically
  (canvas for the four player rows to overlay). Central gold
  "TOURNAMENT" emblem at the top, small carnival-flag
  silhouettes at the corners.
- **`assets/orb-frame.png`** — 1024×1024 digital-watercolor
  ornate circular medallion: gold-gilded rim with carved wooden
  bezel, cream-white center hosting the avatar, small gold
  finial at the top of the rim, subtle ribbon details at the
  base. Identical style-register to Phase 5 animal medallion
  grid cells.
- **`client-shared/tournament.js`** — `renderStandings` prepends
  `<img class="t-scroll-backdrop" src="/assets/standings-scroll.png"
  onerror="this.remove()">` inside `#t-content` before the
  existing 4-card stack. CSS positions it absolute-centered
  with max-height 500px. loadPainterly async-swap at module init
  caches the data URL; the next renderStandings call uses the
  processed version. Existing 4-card stack renders over the
  painted slot strips.
- **`client-controller/gameplay.js`** — `buildDom` replaces the
  orb's current `<span class="gp-avatar">{emoji}</span>` with
  `<img class="gp-avatar" src="{processed data URL or /assets/
  animal-{id}.png}" data-animal="{id}">` inside an `<div
  class="gp-orb">` that gets an `::before` backdrop with
  `--orb-frame-bg` CSS custom property set at runtime (same
  pattern as Phase 11a/b for cell-car / cell-action).

## Non-goals (explicitly out of scope for Phase 12)

- Score-card-per-player painterly frames (the 4 slot strips on
  the scroll are painted into the scroll PNG; individual card
  backdrops inside each slot are not separately commissioned).
- Controller gameplay score card frame (the "284 / POSITION" at
  the top of the HUD — Phase 14's number-foil polish layer).
- Tournament round-intro overlay polish (still spartan title-
  card register; acceptable as its own moment).
- Pixel-car replacement (Phase 13).
- Motion polish across the board (Phase 14).

## Style guide

Inherits from Phase 5-11 style guide. "Barnyard Bedlam" painterly
carnival register, 1024×1024 master, digital watercolor, medium
dark ink outlines, edge-seeded `SpriteLoader.loadPainterly`
handles baked backgrounds.

### Per-piece parameters

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| standings-scroll | an ornate carnival scoreboard: a tall wooden plank with gold-leaf trim along the edges, curling rope cords draping the top and bottom, four cream-white horizontal slot strips stacked vertically down the center (clearly separated by thin gold dividers), a central gold circular emblem at the top with painted carnival flag silhouettes at each corner of the plank | painterly hand-carved wood register with visible grain, gold-leaf trim showing wear, rope cords with slight fray | warm brown wooden plank, gold-leaf accents, cream-white slot strips, small red accents on the corner flags |
| orb-frame | an ornate circular medallion: gold-gilded outer rim with a carved warm-brown wooden bezel inside, cream-white center circle hosting the avatar (blank for overlay), small gold finial or crown-point at the top, a small ribbon detail curling at the bottom | painterly ornate register matching the hill-crown Phase 7a style, visible gold tool-work on the rim, wood grain on the bezel | warm brown wood, gold-leaf outer rim, cream-white center panel, red accents on the ribbon |

### Prompt template (reuse exact wording from Phase 10/11)

```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. Clean symmetric composition,
subject centered, no ground plane, no background scene. The
cream-white center panels must be unmarked — no text, no logo,
no drawn letters, no icons inside the panels; they serve as
blank slots for overlay content. Transparent background, no
scene, no ground, no backdrop. Square composition 1024x1024. No
text anywhere in the image, no borders, no watermarks, no human
figures, no animals, no signs beyond what is described. Style:
the same "Barnyard Bedlam" painterly children's-storybook feel
as the animal roster, biome trees, lobby backdrops, and cell
frames — not vintage sepia, not flat vector, not photorealistic.
```

## Pipeline

Same as Phase 5-11. User feeds prompt, drops PNG, I integrate +
screenshot + commit + next.

## Deliverables

### Phase 12a — standings-scroll backdrop (1 PNG)

1. `standings-scroll.png`.
2. `client-shared/tournament.js` — in `renderStandings`, prepend
   `<img class="t-scroll-backdrop" src="/assets/standings-scroll.png"
   onerror="this.remove()">` to `#t-content.innerHTML` before
   the existing scoreboard build. loadPainterly async-swap at
   module init + cache data URL, use for renderStandings injection.
3. CSS: `.t-scroll-backdrop` absolute-positioned centered inside
   `#t-content`, max-height 500px, z-index 0, opacity 0.95.
   `#t-content > *:not(.t-scroll-backdrop)` gets z-index 1
   (mirror of Phase 8c/9a pattern). Existing 4-card player
   stack renders above the painted slot strips.
4. Screenshot: `screenshots-review/phase12a-standings.png`.

### Phase 12b — controller gameplay avatar orb (1 PNG + PNG avatar pipe)

5. `orb-frame.png`.
6. `client-controller/gameplay.js` — `buildDom` replaces the
   emoji `<span class="gp-avatar">` with `<img class="gp-avatar"
   data-animal="{id}" src="{raw-or-processed avatar URL}"
   onerror="this.replaceWith(document.createTextNode('{emoji}'))">`.
   Module-init loadPainterly swap for the specific animal the
   controller is playing. Graceful emoji fallback.
7. `client-controller/gameplay.css` — `.gp-orb` wrapper gets
   `position: relative`. `.gp-orb::before` renders the orb-frame
   via `--orb-frame-bg` CSS custom property (same pattern as
   Phase 11). `.gp-avatar` img: circle-clip via border-radius +
   object-fit: cover, positioned inside the frame's cream center.
8. Screenshot: `screenshots-review/phase12b-orb.png`.

### Phase 12c — DESIGN.md fourteenth realization

After 12a + 12b land:

- Append a fourteenth-realization block.
- Mark Phase 12 shipped on the roadmap with date.
- Decisions-log rows for: slot strips as part of scroll PNG
  (not separate card frames), orb-frame reuse of Phase 11
  custom-property pattern, controller gameplay FINALLY
  consuming the animal avatar pipeline that the rest of the UI
  uses (closes the audit-loop on that specific Phase 5 gap).

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Scroll PNG's 4 painted slot strips misalign with the 4 flex-laid player cards | Strips are cream-white rectangles with gold dividers; existing cards render inside them. Minor positional drift acceptable — the cards' own content (dot+name+score) still reads correctly; the scroll is decoration, not a functional grid |
| Orb frame's round shape + cream center don't accommodate small avatar at 44×44px viewport | Orb currently sits bottom-left of HUD at ~60-80px. Frame + avatar scale to match; painterly ornament survives the small size because it's symmetric (gold rim + bezel + ribbon) |
| Frame swap from emoji to PNG breaks controller layouts on first-time assets-missing state | `<img>` has `onerror="this.replaceWith(document.createTextNode(emoji))"` — same pattern as onboarding avatars. Emoji fallback is the resilience mechanism |
| loadPainterly on orb-frame fires per controller session, ~100ms cost | Acceptable — one-time cost at gameplay start, async, invisible to user |

## Open questions (for implementer)

1. Standings-scroll anchor: bottom-of-overlay or center? Lean:
   center — tournament overlay centers its content stack, the
   scroll backdrop should center with it.
2. Orb size: current orb is ~64px with emoji inside. Painted
   frame scales to same 64-80px box, or bigger? Lean: same
   64-80px; bigger would crowd the bottom HUD row.
3. CSS custom property naming: `--orb-frame-bg` or reuse
   `--cell-action-bg` since it's similar? Lean: separate property.
   Different dimensions + aspect; forcing reuse cross-phase
   creates drift risk.

## Phase handoff

After 12a + 12b + 12c land, DESIGN.md gains the fourteenth
realization, roadmap item 13 marked shipped. Phase 13+ open for
pixel-car replacement, motion polish, background ornaments, and
engineering items.
