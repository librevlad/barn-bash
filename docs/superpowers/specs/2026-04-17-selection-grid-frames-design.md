# Selection-Grid Cell Frames — Design Spec (Phase 11)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 11 of ?, second AAA-polish pass after Phase 10 closed the
per-game lobby backdrops. **Scope:** two painterly PNG cell-frames
that replace the flat brown rectangles currently hosting the car
color cells (10 per grid) in onboarding and the action cards
(3 per HUD) in gameplay. One frame asset per cell type, used
multiple times via CSS. **NOT** the animal-medallion frame
(already decent via gold-ring CSS post-Phase 5), **NOT** the
host game-select modal (ticket-*.png already commissioned),
**NOT** scoreboard or gameplay orb (Phase 12).

## Problem

The Phase 10 audit surfaced two selection surfaces where cells
render as flat brown rectangles:

- **Car color selection** (`client-controller/onboarding.js` — the
  "And your ride?" grid of 10 pixel-car sprites). Each cell is a
  wood-warm rectangular button with no frame ornament. The cars
  themselves are pixel-art sprites from `sprite-cars.png`
  (Phase 3 atlas). Against Hearthstone's hand-painted card
  frames, this reads as "placeholder button grid."
- **Controller gameplay action cards** (SWIPE-STEER / BOOST /
  DRIFT chip-row at the bottom of the gameplay HUD). Each is a
  flat brown rectangle with an emoji icon + Alfa Slab label.
  Again, no painted frame; reads as "CSS pill" rather than
  "carnival slot-machine face."

Both surfaces are seen MANY times per session (car grid once per
onboarding, action cards always-on during gameplay). A painted
frame PNG behind each cell transforms them into tangible carnival
objects.

## Success criteria

- **`assets/cell-car.png`** — 1024×1024 digital-watercolor painted
  carnival ticket / wooden plaque frame sized to host the 60×60
  pixel-car sprite within its cream-white interior. Ornate
  gold-trim border, wood-grain interior, subtle rope or gold
  tassel accents at the corners.
- **`assets/cell-action.png`** — 1024×1024 digital-watercolor
  painted action-button frame with a chunkier slot-machine face:
  wooden outer ring, gold-rim inner bezel, cream-white center
  for the emoji icon, small ornate curls at the top and bottom
  edges where the Alfa Slab label can sit on top.
- Both frames **render as absolute-positioned backdrops behind
  existing cell content** via CSS — no layout changes, no
  per-cell code. `.color-cell` gets `cell-car.png` via a
  `::before` pseudo-element sized to the cell and pointing at
  the PNG. `.gp-action` gets `cell-action.png` similarly.
- **loadPainterly-processed data URLs** injected into a single
  hidden `<img>` preloader; CSS references the cached URL via
  CSS custom property set at runtime. Raw PNG paints first;
  processed version swaps via a `document.documentElement.style.
  setProperty('--cell-car-bg', 'url(' + dataUrl + ')')` once
  loadPainterly resolves.

## Non-goals (explicitly out of scope for Phase 11)

- Animal-medallion frame upgrade. Post-Phase 5 + audit fix, the
  gold-ring CSS + processed PNG inside reads at the right polish
  bar. Optional future polish.
- Host game-select modal ticket-button polish. Already commissioned
  via `ticket-*.png` in Phase 1.5; polish is cosmetic at most.
- Pixel-car sprite replacement (the cars INSIDE the cells are
  still pixel-art from Phase 3 atlas). Phase 13 if demand
  persists — big content ask.
- Tournament scoreboard, gameplay avatar orb, background
  ornaments — all Phase 12+.

## Style guide

Inherits from Phase 5-10 style guide. Same "Barnyard Bedlam"
painterly carnival register, 1024×1024 master, digital
watercolor, medium dark ink outlines, edge-seeded
`SpriteLoader.loadPainterly` handles baked backgrounds.

### Per-piece parameters

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| cell-car | an ornate carnival carnival-ticket frame: a rectangular wooden plaque with a cream-white center panel and gold-leaf ornamental trim along the edges, two small gold tassels hanging from the top corners, painted rope twist along the bottom edge | painterly ornament with slight hand-drawn imperfection; reads as a handcrafted auction-house tag | warm brown wood frame, gold-leaf trim, cream-white panel interior, small red accents on the tassels |
| cell-action | a chunkier carnival slot-machine button face: a rounded wooden outer ring holding a gold-rim bezel around a cream-white center circle, small ornate gold curls at the top and bottom of the ring, tiny gold rivet bulbs at the four compass points | painterly thick wood + gilded metal register; reads as a fairground prize-machine button | warm brown wood ring, gold bezel + rivets, cream-white center |

### Prompt template (filled per piece)

```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. Clean symmetric composition,
subject centered, no ground plane, no background scene. The
cream-white center panel must be unmarked — no text, no logo, no
drawn letters, no icons inside the panel; it serves as a blank
slot for overlay content. Transparent background, no scene, no
ground, no backdrop. Square composition 1024x1024. No text
anywhere in the image, no borders, no watermarks, no human
figures, no animals, no signs beyond what is described. Style:
the same "Barnyard Bedlam" painterly children's-storybook feel
as the animal roster, biome trees, and lobby backdrops — not
vintage sepia, not flat vector, not photorealistic.
```

## Pipeline

Same as Phase 5-10. One prompt, drop in `/assets/`, integrate,
screenshot, commit.

## Deliverables

### Phase 11a — cell-car frame (1 PNG)

1. `cell-car.png` — carnival ticket frame.
2. `client-controller/onboarding.js` — preload the PNG via
   `SpriteLoader.loadPainterly('cell-car', ...)` at module init
   (same setTimeout(0) pattern as Phase 10). On resolve, set
   `document.documentElement.style.setProperty('--cell-car-bg',
   'url(' + canvas.toDataURL('image/png') + ')')`.
3. `client-controller/onboarding.css` — `.color-cell` gets
   `position: relative`. A new `.color-cell::before` renders
   absolute-positioned, covers the cell, with
   `background-image: var(--cell-car-bg)`, `background-size:
   contain`, `background-repeat: no-repeat`, `z-index: -1`
   (so the car sprite sits above it). Fallback: when
   `--cell-car-bg` is unset, `::before` collapses
   (`background-image: none` → empty pseudo, no visual).
4. Screenshot: `screenshots-review/phase11a-car-frame.png`.

### Phase 11b — cell-action frame (1 PNG)

5. `cell-action.png` — slot-machine action button face.
6. `client-controller/gameplay.js` or `gameplay.css` — same
   pattern. `.gp-action` gets `::before` with
   `--cell-action-bg` CSS custom property.
7. Screenshot: `screenshots-review/phase11b-action-frame.png`.

### Phase 11c — DESIGN.md thirteenth realization

After 11a + 11b land:

- Append a thirteenth-realization block covering Phase 11.
- Mark Phase 11 shipped on the roadmap with date.
- Decisions-log rows for: `::before` background-image pattern
  (vs inline `<img>` per-cell), CSS custom property for
  processed data URL (document.documentElement scope), two
  frames for two cell types (not one generic frame for both
  because aspect ratios differ).

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| `::before` covering cell hides the car sprite or action icon | `z-index: -1` on the pseudo vs default `0` on cell content. Cell content reads above frame via stacking context established by `position: relative` on cell |
| Frame aspect ratio doesn't match cell aspect ratio | Generate as ~square (matches .color-cell 48×48 and .gp-action 72×72 approximately); `background-size: contain` preserves aspect without stretching. If a cell shape is non-square, accept the painted frame crops to the smaller dimension |
| Data URL is large (~1.5MB per PNG for 1024×1024); two frames = 3MB in CSS custom props | Acceptable — frames are loaded once per session, cached. The runtime memory cost is trivial vs the visual uplift |
| CSS custom property setter races with initial cell render | Initial cells render with raw PNG url (slow load) OR transparent fallback (no frame). LoadPainterly typically completes <300ms; the brief unframed state is acceptable on first-visit |

## Open questions (for implementer)

1. Should `.color-cell::before` render ALSO when the car sprite
   fails to load? Lean: yes — the frame alone is visually valid,
   car sprite renders on top when ready. No broken-image state.
2. Scale of the cell-action frame vs the 72×72 .gp-action box:
   use the frame as a FULL-cell background (fills the cell) or
   as a SMALL centered badge under the icon (badge style)?
   Lean: full-cell background; action cards get a tangible
   slot-machine face as their root element.
3. Preload timing: two frames + two data URL conversions at
   onboarding init. Risk of UI-thread stall if the PNGs are
   heavy? loadPainterly with 1024×1024 PNG typically runs <100ms
   each on modest hardware; accept the one-time cost.

## Phase handoff

After 11a + 11b + 11c land, DESIGN.md gains the thirteenth
realization, roadmap item 12 is marked shipped. Phase 12 opens
next for tournament standings scoreboard + controller gameplay
avatar orb. The cell-frame PNGs' style set the register for
any future cell-like composition (contestant pill expansions,
leaderboard rows, etc.).
