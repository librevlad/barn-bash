# Background Ornaments — Design Spec (Phase 15)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 15 of ?, fifth AAA-polish pass after Phase 14 closed motion.
**Scope:** two painterly PNG ornament elements — a horizontal bunting
garland that drapes across the top of every full-screen overlay, and
a single gold-filigree corner flourish reused 4× per overlay (each
corner, mirrored via CSS transform). **NOT** a full painted vignette
border, NOT per-element minor ornaments, NOT any art inside gameplay
canvases. Two assets total.

## Problem

After Phase 10-14, every overlay now carries a commissioned painterly
backdrop (tournament scoreboard, throne champion, per-game lobby
arches, race podium, controller slot-machine HUD). The painted
elements are clean; the DARK SCRIM AROUND THEM is still empty.

A Hearthstone-bar comparison: every full-screen UI has a painted
bunting or garland strip across the top edge of the screen, and
gold-filigree flourishes painted into each of the 4 corners. These
ornaments frame the content, fill the dead-brown zone, and give the
overlay a "proscenium stage" feel rather than "painted island on dark
scrim."

## Success criteria

- **`assets/ornament-bunting.png`** — 1024×256 landscape digital-
  watercolor painted bunting: a line of small triangular red-and-
  white carnival flags strung across a rope cord, with warm-brown
  wooden end-caps hanging at each end and gold-bulb accents
  throughout. Fills the "top edge of overlay" zone so every full-
  screen overlay reads as "tent entrance with attraction banners."
- **`assets/ornament-corner.png`** — 512×512 painted gold-filigree
  corner flourish: ornate gold vine-and-scroll work sized to wrap a
  ~120×120px corner area. Used 4× per overlay (top-left natural,
  top-right mirrored X, bottom-left mirrored Y, bottom-right mirrored
  XY). Single PNG, 4 CSS renders.
- **Three overlay surfaces** gain both ornaments layered below the
  content (z-index 0, content at 1+): `#tournament-overlay`,
  `#postgame-overlay`, per-game `#lobby`. Integration via `::before`
  (bunting) + four CSS elements or four `::after` instances (corners,
  but CSS supports only one each, so 4 `<div>` child elements injected
  at overlay creation).

## Non-goals (explicitly out of scope for Phase 15)

- Full painted vignette border running along all four edges as a
  continuous strip. The ornament-corner + ornament-bunting approach
  provides the same "framed" read at ~20% of the PNG budget.
- Per-element small ornaments (little stars, tassels, bulbs on
  individual cards). Cells already have their Phase 11 frames.
- Vignette tint / darkening of overlay edges. Overlay backdrop-
  filter blur + rgba brown is the existing darkening; ornaments
  layer on top.
- Motion on ornaments (swaying bunting, flickering bulbs). Phase
  14 closed the motion layer; ornament animation opens a future
  polish phase if demand rises.
- Any art inside the four per-game canvases. They have their own
  Phase 3-9 polish chain.

## Style guide

Inherits from Phase 5-14 style guide. "Barnyard Bedlam" painterly
carnival register, digital watercolor, medium dark ink outlines,
edge-seeded `SpriteLoader.loadPainterly` handles baked backgrounds.

### Per-piece parameters

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| ornament-bunting | an ornate carnival bunting strand: a painted rope or twisted cord strung horizontally across the composition, with a dozen small triangular flags hanging from it alternating red-and-white, tiny gold-bulb lights between every pair of flags, two warm-brown carved wooden end-caps at each end of the rope from which the rope loops | painterly hand-drawn imperfections in the flag stitching + rope twist; reads as a handcrafted festival banner | deep carnival red and cream-white flags, warm brown rope + end-caps, warm gold bulbs |
| ornament-corner | a small ornate gold-filigree flourish: a curling gold vine-and-scroll composition with a tiny central gem (red ruby or cream pearl), painted to fill roughly one-quarter of a square crop so that rotations/mirrors around a larger container frame the corner naturally | painterly gold-leaf register with visible tool-work, subtle shadow beneath the filigree so it reads as "painted onto a wooden surface" | warm gold dominant, tiny red ruby or cream pearl at the center, faint brown shadow behind the gold |

### Prompt template

For bunting (landscape composition — use rectangular master):
```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. Clean landscape composition,
subject centered, no ground plane, no background scene.
Transparent background, no scene, no ground, no backdrop. Wide
composition 1024x256 (landscape 4:1). No text anywhere in the
image, no borders, no watermarks, no human figures, no animals,
no signs beyond what is described. Style: the same "Barnyard
Bedlam" painterly children's-storybook feel as the animal roster,
biome trees, lobby backdrops, and cell frames — not vintage sepia,
not flat vector, not photorealistic.
```

For corner (square master, meant to be rotated/mirrored 4×):
```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. The flourish should OCCUPY
ONLY THE TOP-LEFT QUARTER of the square composition — the
remaining three-quarters are transparent so CSS rotation/mirroring
can compose a symmetric frame around a container. Clean composition
anchored in the top-left, facing into the center. Transparent
background, no scene, no ground, no backdrop. Square composition
1024x1024. No text anywhere in the image, no borders, no
watermarks, no human figures, no animals, no signs beyond what is
described. Style: the same "Barnyard Bedlam" painterly children's-
storybook feel as the animal roster, biome trees, lobby backdrops,
and cell frames — not vintage sepia, not flat vector, not
photorealistic.
```

## Pipeline

Same as Phase 5-14. One prompt, drop in `/assets/`, integrate via
CSS, screenshot, commit.

## Deliverables

### Phase 15a — ornament-bunting (1 PNG)

1. `ornament-bunting.png` — landscape carnival bunting.
2. `client-shared/theme.css` — new CSS utility:
   ```css
   .ornament-bunting-top::before {
     content: '';
     position: absolute; top: -10px; left: 0; right: 0;
     height: 100px;
     background: var(--ornament-bunting-bg, url('/assets/ornament-bunting.png'));
     background-size: contain; background-repeat: repeat-x;
     background-position: center top;
     z-index: 0;
     pointer-events: none;
   }
   ```
3. Apply class `ornament-bunting-top` to `#tournament-overlay`,
   `#postgame-overlay`, and each per-game `#lobby` in main.js
   or via CSS-direct selectors.
4. loadPainterly swap at module init sets --ornament-bunting-bg
   CSS custom property on `document.documentElement`.
5. Screenshot: `screenshots-review/phase15a-bunting.png`.

### Phase 15b — ornament-corner (1 PNG, 4 renders per overlay)

6. `ornament-corner.png` — gold filigree quarter-composed.
7. `client-shared/theme.css` — four CSS rules, one per corner:
   ```css
   .ornament-corner-tl,
   .ornament-corner-tr,
   .ornament-corner-bl,
   .ornament-corner-br {
     position: absolute;
     width: 120px; height: 120px;
     background: var(--ornament-corner-bg, url('/assets/ornament-corner.png'));
     background-size: cover;
     pointer-events: none;
     z-index: 0;
   }
   .ornament-corner-tl { top: 0;    left: 0; }
   .ornament-corner-tr { top: 0;    right: 0; transform: scaleX(-1); }
   .ornament-corner-bl { bottom: 0; left: 0; transform: scaleY(-1); }
   .ornament-corner-br { bottom: 0; right: 0; transform: scale(-1, -1); }
   ```
8. Inject four `<div>` children into `#tournament-overlay`,
   `#postgame-overlay`, per-game `#lobby` at overlay-create time.
9. loadPainterly swap at module init sets --ornament-corner-bg.
10. Screenshot: `screenshots-review/phase15b-corners.png`.

### Phase 15c — DESIGN.md sixteenth realization

After 15a + 15b land:

- Append a sixteenth-realization block.
- Mark Phase 15 shipped on the roadmap with date.
- Decisions-log rows for: landscape bunting repeat-x pattern, single
  corner PNG mirrored 4× (asset economy), overlay-scope application
  (not per-surface variants).

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Bunting across top edge competes with existing overlay top content (eyebrows, titles) | Bunting height 100px at top:-10px — sits above the viewport edge slightly, flags drape downward. Title content starts at ~120px from top typically; any overlap is decorative only (banner above, title below) |
| Corner flourishes clip content if overlay has corner UI (buttons in corners) | Corners sized 120×120, targeting empty dark-scrim zones. None of the current overlays have corner UI; future additions would need awareness |
| Single corner PNG + 4 CSS mirrors reads as asymmetric due to painted asymmetry in gold filigree | Prompt explicitly asks for "occupy only top-left quarter, anchored into the center" so mirrors compose symmetrically. If asymmetry shows, regenerate with tighter "symmetric-when-mirrored" guidance |
| Bunting `background-repeat: repeat-x` shows hard seams where copies tile | Accept seams if visible; the painterly register is loose enough that mild discontinuity reads as "hand-stitched banner" not "broken tile." Can later switch to `background-size: 100% auto` (no repeat) if desired |

## Open questions (for implementer)

1. Should corners also appear on `#lobby` (per-game lobby) — where
   the painted arch backdrop already visually frames the content?
   Lean: yes, for consistency across all overlays, even if less
   needed visually.
2. Should bunting animate (subtle sway via Phase 14 motion)? Lean:
   no, static for Phase 15; a separate follow-up phase can add
   motion if desired.
3. Corner size 120×120 or viewport-relative? Lean: fixed 120 for
   desktop hosts; controller 390px viewport would want smaller
   corners — add a media-query override if controller overlays
   ever use this ornament (today they don't).

## Phase handoff

After 15a + 15b + 15c land, DESIGN.md gains the sixteenth
realization, roadmap item 15 marked shipped. Remaining follow-ups
(painterly pixel-car replacement, bunting motion, further
engineering tasks) each open their own spec.
