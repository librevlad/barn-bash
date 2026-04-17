# Tournament Champion Art — Design Spec (Phase 9)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 9 of ?, follow-up to Phase 8 second-layer art
**Scope:** one painterly PNG for the tournament champion moment
(`Tournament.renderChampion` in `client-shared/tournament.js`).
Same integration pattern as Phase 8c's race podium — painterly
backdrop via DOM `<img>` behind existing text + trophy emoji + final
scores layout. **NOT** standings-mid-round art, NOT round-intro
transitions, NOT a tournament overlay redesign.

## Problem

Tournament is the session's biggest arc — three per-game rounds,
running totals, final champion ceremony. The champion moment
(`renderChampion` when `msg.phase === 'champion'`) currently shows:

- "TOURNAMENT COMPLETE" eyebrow (Alfa Slab, gold)
- 🏆 trophy emoji (animated bounce)
- "CHAMPION!" label + winning player name
- Final scores list with colored player dots
- Narrator quip ("{champion} reigns supreme")
- "Returning to lobby..." countdown

Composed cleanly on a dark wood-brown scrim with blur. But the
emoji-only trophy reads flatter than the commissioned art elsewhere
in the product — Phase 5 animals, Phase 6 trees, Phase 7 per-game
hero pieces, Phase 8 race podium. Champion deserves its own
painterly backdrop to match that bar.

## Success criteria

- **1 painterly PNG** at `/assets/tournament-champion.png` — an
  ornate royal throne + gold laurel wreath + red velvet drape
  composition (painterly carnival, not heraldic realism) that
  serves as backdrop behind the tournament-champion text stack.
- **Tournament overlay** (`#tournament-overlay`) renders the
  backdrop behind the existing `#t-content` layout, with the same
  `onerror="this.remove()"` fallback pattern as PostGame.backdrop.
- **Champion text + scores + quip + trophy emoji** stay visible
  above the backdrop via the same z-index rule
  (`position: relative; z-index: 1` on children, `z-index: 0` on
  backdrop) proven in Phase 8c.

## Non-goals (explicitly out of scope for Phase 9)

- Standings backdrop (between-round scoreboard view). Kept
  spartan for information readability; painterly art would
  compete with the scoreboard numbers. Could open a later spec if
  demand justifies.
- Round-intro backdrop (the "AND NOW... GRAND PRIX" beat).
  Already carries a title card aesthetic in existing code; adding
  painterly PNG would fight its own curtain/title design.
- Server shape change for finish-order placement. Tournament
  doesn't need 2nd/3rd place art because the final-scores list
  already surfaces all placements with animal-colored dots.
- Confetti / fireworks / particle-burst art upgrade. Existing
  confetti via `Visual.burstConfetti` reads fine; painterly
  particles are out of the current content pipeline.

## Style guide

Inherits verbatim from Phase 5-8 style guide. Same bg.png anchor,
digital-watercolor + medium dark ink outlines, 1024×1024 master,
edge-seeded `SpriteLoader.loadPainterly` checker-preview stripping.

### Per-piece parameters

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| tournament-champion | an ornate royal throne with a tall carved wooden back, red velvet cushion and armrests, a gold laurel wreath suspended above the throne (as if floating), red velvet curtain drapes behind suggesting a grand stage, and gold-leaf ornamental trim along the throne's edges | painterly carnival register — the throne reads as a children's-storybook "winner's seat" rather than medieval authenticity; laurel wreath floats independent of the throne, like a ceremonial award being presented | warm wooden brown on the throne base, deep ruby red on cushion + curtain, gold leaf on trim + wreath, cream-white subtle highlights on the curtain folds |

### Prompt template (filled per piece)

```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. Clean three-quarter composition,
subject centered, no ground plane, no background scene. Clear
readable silhouette at small sizes. Transparent background, no
scene, no ground, no backdrop. Square composition 1024x1024. No
text, no borders, no watermarks, no human figures, no animals, no
signs beyond what is described. Style: the same "Barnyard Bedlam"
painterly children's-storybook feel as the animal roster and the
biome trees — not vintage sepia, not flat vector, not
photorealistic.
```

## Pipeline

Same as Phase 5-8. One prompt, drop in `/assets/`, integrate,
screenshot, iterate. Edge-seeded `loadPainterly` handles checker
strip — ornate throne has plenty of saturated brown/red/gold that
won't trip the strict chroma threshold; any bright-neutral gold
highlights on the laurel / curtain that happen to be disconnected
from the image boundary survive the flood fill.

## Deliverables

### Phase 9a — champion backdrop (1 PNG)

1. `tournament-champion.png` — painterly throne + laurel + curtain.
2. `client-shared/tournament.js` — in `renderChampion(data)`, after
   building `html` with the existing trophy/name/scores/quip, inject
   an `<img class="t-backdrop" src="/assets/tournament-champion.png"
   onerror="this.remove()">` as the FIRST child of `#t-content`.
   Alternative integration: add as a child of `#tournament-overlay`
   (parallel to `#t-content`) — depends on which positioning is
   cleanest for the existing flex layout. First pass: inside
   `#t-content` with absolute positioning.
3. CSS additions in `createOverlay()`'s style block:
   - `#tournament-overlay .t-backdrop { position:absolute; bottom:0;
     left:50%; transform: translate(-50%, 0); max-height: 440px;
     max-width: 480px; opacity: 0.95; z-index: 0; pointer-events:
     none; }`
   - `#tournament-overlay > * > *:not(.t-backdrop), #t-content >
     *:not(.t-backdrop) { position: relative; z-index: 1; }`
     (mirror the PostGame fix; scope to overlay children only so
     body-level layout isn't affected)
4. Screenshot: `screenshots-review/phase9a-tournament-champion.png`
   — champion overlay with painterly throne backdrop behind the
   trophy + CHAMPION! + name + scores stack.

### Phase 9b — DESIGN.md eleventh realization

After 9a lands:

- Append an eleventh-realization block covering Phase 9.
- Mark Phase 9 shipped on the roadmap with date.
- Decisions-log rows for: scope narrowed to champion only (not
  standings / round-intro), throne + laurel + curtain composition
  as the "winner's seat" language, shared z-index rule pattern
  re-used from Phase 8c.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Throne composition competes with existing trophy emoji + confetti | Throne is low in the overlay (anchored at bottom), trophy emoji stays centered above. Laurel wreath floats in the upper-middle of the throne image, won't overlap the emoji vertical position. Confetti bursts from `Visual.burstConfetti` at screen-center and drifts down — they'll scatter across the backdrop naturally |
| Red curtain + deep ruby cushion fight carnival-red text colors | Tournament overlay uses cream-white body text + gold accent text on the dark-brown scrim. No red body text. Throne's red areas are saturated enough to read distinctly from cream-white name text |
| Backdrop clips at narrow viewports | Max-height + max-width constraints + centered positioning; CSS `width: auto; height: auto` preserves aspect ratio as the overlay rescales. If the throne gets too small to read at mobile-width, accept the degradation — tournament host is always on desktop/TV |
| Existing `.t-backdrop` class name collision | Prefix is `t-` per existing tournament-overlay convention; verified no other `.t-backdrop` selector exists in the codebase |

## Open questions (for implementer)

1. Backdrop injection: inside `#t-content` or as a sibling of
   `#t-content` inside `#tournament-overlay`? Lean: sibling of
   `#t-content` — the overlay is the flex container that already
   centers `#t-content`, and keeping backdrop at the overlay level
   keeps `#t-content` pure layout.
2. Backdrop fade-in: match the overlay's 0.6s opacity transition
   or fade separately? Lean: inherit overlay's transition (no
   extra CSS) — backdrop appears with the rest of the champion
   reveal.
3. Backdrop opacity: full 0.95 like the podium, or lower (0.7)
   for subtle presence given the tournament's higher text density?
   Lean: 0.85 as compromise.

## Phase handoff

After 9a + 9b land, DESIGN.md gains the eleventh realization and
roadmap item 10 is marked shipped. Remaining follow-ups (i18n,
WebGL perf, GLB extension for bear/bunny/pig/chicken/raccoon,
standings / round-intro backdrop polish, race 2nd/3rd place flow)
each open their own spec when demand justifies.
