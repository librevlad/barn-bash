# Environmental Art — Design Spec (Phase 6)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 6 of ?, follow-up to Phase 5 content pass
**Scope:** painterly PNG biome trees for `client-host-escape` (forest /
cave / snow / volcano) with an incidental re-use in
`client-host-race` track-side foliage. **NOT** a procedural renderer
rewrite, NOT new assets for hill / meteor, NOT rock / bush sprite
replacement, NOT animation rigs.

## Problem

Phase 5 proved out the human-in-the-loop image-gen pipeline on
player-identity art (8 animal avatars + 1 narrator portrait) and
anchored that art on `assets/bg.png`'s "Barnyard Bedlam" daylight
children's-storybook hand. The in-product world now contains:

- **Lobby / onboarding** — commissioned painterly art (bg.png,
  ticket-\*.png, animal-\*.png, narrator.png).
- **Per-game canvases** — almost entirely procedural / atlas sprites
  (race uses `sprite-bush-*.png` + `sprite-rock-*.png` for track-side
  foliage, escape draws every tree from canvas primitives with per-
  biome color lerps in `drawTrees`).

The visible seam sits at the transition between the two. A player
leaves the lobby (Phase 5 painterly animals) and lands in escape
(procedural 3-polygon trees whose only biome cue is a
`rgb` lerp). Race bushes are a 60×60 atlas tile that reads as
"stock sprite" next to the rest of the commissioned art.

The existing procedural code in escape is **already good** — layered
canopy, trunk shadow, snow cap in snow biome, three tree types per
scene. It isn't broken; it's just a different grammar from the
painterly lobby. Phase 6 isn't a rewrite — it's a **painterly
overlay** that takes over when the asset loads and falls back to the
existing procedural renderer when it doesn't (captive-portal safe,
no code-path regression for the proven canvas path).

`assets/tree-forest.png` is already on disk (digital-watercolor
forest tree, dark ink outlines, painterly canopy, transparent bg —
the pipeline's first commissioned env piece). Phase 6a opens by
integrating it.

## Success criteria

- **4 biome trees** shipped as transparent-bg PNGs in `/assets/`:
  `tree-forest.png`, `tree-cave.png`, `tree-snow.png`,
  `tree-volcano.png`. One cohesive family, same hand as bg.png and
  Phase 5 avatars.
- **Escape renders the PNG tree** on biome-appropriate tiles when the
  asset is loaded. Falls back to the procedural `drawTrees`
  primitives untouched when the sprite is missing — no conditional
  burden on gameplay flow, no blank world on load failure.
- **Race picks up `tree-forest.png`** as a new track-side variant
  alongside `sprite-bush-*.png` / `sprite-rock-*.png`. Appears on
  roughly a third of the foliage slots. Same SpriteLoader code path,
  no new loader machinery.
- **Style consistency** verified side-by-side with the animal roster
  and bg.png. Every tree reads as "drawn by the same hand."

## Non-goals (explicitly out of scope for Phase 6)

- Replacing the escape procedural renderer in full. The procedural
  code stays as the fallback and for the two non-tree tree types
  (pine / bush) that aren't being painted in this pass.
- Per-biome pines and bushes. Only the round tree silhouette gets a
  painterly pass; pine + bush stay procedural — their silhouette is
  already distinctive enough (triangles / ovals) and the art budget
  is spent on the biome-characterizing round tree.
- Replacing `sprite-bush-*.png` or `sprite-rock-*.png` in race. Those
  atlas sprites read fine at the 60×60 track-side size; the
  integration win is incidental re-use of the forest tree, not a
  roster overhaul.
- New hill / meteor environmental assets. Hill's arena is geometry
  (shrinking circle + king zone spotlight); meteor's world is sky +
  safe-zones + telegraphed impact rings. Neither demands trees /
  rocks / flora, and adding illustrated props would compete with the
  gameplay read.
- Character / avatar extensions. Phase 5 closed that layer; further
  portrait work opens its own spec.
- Animation rigs / multi-frame sprites. Trees are static on the
  ground plane; no wind sway, no seasonal variants.

## Style guide

Inherits from the Phase 5 style guide (`2026-04-16-content-pass-
design.md`) verbatim — bg.png anchor, digital watercolor, medium
dark ink outlines, soft washy color fills, bright daylight palette
— with the following env-specific additions:

### Composition

- **Single tree per image**, centered on its own trunk base.
- **Frontal 3/4 view**, matching the lobby bg.png trees. No behind-
  the-tree angle, no branch-spanning horizontal.
- **Full trunk-to-canopy** in frame; crop leaves ~5% alpha padding
  at top and sides so downscaling doesn't clip outlines.

### Silhouette

- Round canopy (not pine — pines stay procedural). Visible trunk.
- **Readable at 120px** tall in-canvas. Dense canopy detail that
  muds at that size is wrong; prefer 3-5 bold light/shadow regions
  over many tiny leaves.

### Biome-specific palette

| Biome | Canopy | Trunk | Ground hint | Style note |
|-------|--------|-------|-------------|-----------|
| forest | bright leaf-green with yellow-green highlights and olive shadow | warm mid-brown with dark-brown knots | none (floating tree) | lush, summer, midday sun |
| cave | desaturated mossy green-grey with deep blue-grey shadow; **pale mushroom-cluster cluster at the trunk base** | dark cool-grey bark, almost stone-like | none | damp, dim, underground — still a tree, not a fungus, but with cave undertones |
| snow | muted blue-green needle-substitute round canopy with **thick snow cap on top and upper branches** | dark cool-brown, frost-dusted at the base | none | frosted, winter, overcast |
| volcano | charred red-brown canopy with ember-orange highlights and blackened shadow; **a few bright orange ember particles clinging to branch tips** | charcoal-black trunk with red crack highlights | none | scorched, high-contrast, cinder-hot |

### Shared constants

- **Format:** PNG, alpha channel, 1024×1024 square master (matches
  animal-\*.png pipeline; downscale at render time).
- **Background:** transparent. No scene, no ground disc, no frame.
- **No:** text, watermarks, borders, crop marks, multiple trees in
  one frame, human / animal figures, roads, signs, weapons, modern
  clothing.

### Prompt template

```
A bright painterly children's storybook illustration of a single
{BIOME_TREE}. Drawn in digital watercolor with medium-thickness dark
ink outlines, soft washy color fills and gentle shading. {BIOME_MOOD}
palette. Frontal three-quarter view, full trunk to canopy in frame,
tree centered, ground invisible. Clear readable silhouette at small
sizes. Transparent background, no scene, no ground, no backdrop.
Square composition 1024x1024. No text, no borders, no watermarks, no
human figures, no animals, no signs, no additional props. Style: the
same "Barnyard Bedlam" painterly children's-storybook feel as the
animal roster (cat / frog / wolf / bear / bunny / pig / chicken /
raccoon) and the narrator portrait — not vintage sepia, not flat
vector, not photorealistic.
```

Per-biome `{BIOME_TREE}` + `{BIOME_MOOD}` slots:

| ID | BIOME_TREE | BIOME_MOOD |
|----|------------|-----------|
| forest | a lush broadleaf forest tree with a dense rounded green canopy and a warm brown trunk | bright saturated summer daylight with yellow-green highlights and olive shadow |
| cave | a dim underground tree with a desaturated mossy canopy and small pale mushroom clusters at the base of its stone-grey trunk | damp cavern half-light with deep blue-grey shadow and muted mossy green |
| snow | a winter tree with a round blue-green canopy carrying a thick cap of snow, with frost dust at the base of its dark cool-brown trunk | cold overcast winter light with muted blue highlights and crisp white snow |
| volcano | a scorched lava-field tree with a charred red-brown canopy glowing with a few ember-orange highlights at branch tips, and a charcoal-black trunk with faint red crack lines | high-contrast volcanic heat with blackened shadows and ember-orange accents |

## Pipeline

Reuses the Phase 5 pipeline verbatim. One-at-a-time generation,
drop in `/assets/`, integrate, screenshot, iterate.

### 1. Generate

User feeds the prompt template (with the per-biome slot filled) to
their image-generation LLM, copies the result into `/assets/`.
Filename convention: `tree-<biome>.png` — matches the already-placed
`tree-forest.png`.

### 2. Integrate — escape

`client-host-escape/render2d.js`:

- Add a `TREE_BIOME_SPRITES = { forest:Image, cave:Image, snow:Image,
  volcano:Image }` map. Each `Image` lazy-loads from
  `/assets/tree-<biome>.png`. Load failure is silently tolerated
  (`Image` fires `onerror` → sprite stays `null`).
- In `drawTrees`, for tree-type 0 (round canopy) tiles only, test
  whether the current biome's sprite is both **loaded** (`complete`
  and `naturalWidth > 0`) and matches the biome being blended **at
  less than 40% blend** (avoid a pop mid-transition). If yes, draw
  the PNG at `t.h * 1.6` height centered on the trunk base. Drop
  shadow mirrors the procedural ellipse-shadow already at
  `drawTrees:308-309` so the sprite shares the ground plane with
  pines and bushes.
- If the sprite isn't ready, fall through to the existing
  procedural round-tree code — unchanged.
- Pines (type 1) and bushes (type 2) stay procedural regardless.

### 3. Integrate — race

`client-host-race/render2d.js`:

- Add a single new variant:
  `TREE_VARIANTS = ['tree-forest']` (room for expansion later; an
  array on purpose).
- Extend the sprite-load list at `render2d.js:68` with `'tree-forest'`
  loading from `/assets/tree-forest.png`. Note the filename already
  matches the shared convention, so one additional line.
- In the `trackObjects` generation loop (`render2d.js:371-382`),
  add a 25% chance that a foliage slot resolves to a tree sprite
  instead of the bush/rock roll. Draw size scales with `sz * 2.2`
  so the tree reads as taller than neighbouring bushes.
- Sprite-missing case: the existing `spritesReady` gate already
  skips sprite rendering and falls into procedural; one more entry
  in the loader list uses that same fallback without new code.

### 4. Capture

Screenshot pairs for each integration:

- Escape: `screenshots-review/phase6a-escape-<biome>.png`. Capture
  the moment the camera is fully inside that biome.
- Race: `screenshots-review/phase6a-race-forest-tree.png`. Capture
  a track-side tree plainly visible in the corner of the frame.

### 5. Iterate

Same rule as Phase 5: accept the first render that reads as
consistent family. Only regenerate if silhouette is unclear at
120px tall, if palette drifts toward modern / photorealistic /
vintage sepia, or if the biome mood is obviously wrong (volcano
reads as forest etc.). Don't chase pixel-perfect.

## Deliverables

### Phase 6a — forest (1 PNG, already staged)

1. `tree-forest.png` — already on disk.
2. Escape integration: load forest sprite, overlay round trees in
   forest biome only.
3. Race integration: add as new track-side variant.
4. Screenshot: `phase6a-escape-forest.png` + `phase6a-race-forest-tree.png`.

This slice proves the integration pattern on the most common biome
(forest is the starting biome in escape; race has no biomes so
forest-themed foliage fits universally).

### Phase 6b — cave / snow / volcano (3 PNGs, one at a time)

5. `tree-cave.png` → escape integration for cave biome.
6. `tree-snow.png` → escape integration for snow biome (careful —
   existing procedural pine in snow biome already has a snow cap; the
   PNG should coexist, not overlap, because the snow tree is a
   separate type-0 tile).
7. `tree-volcano.png` → escape integration for volcano biome.

Each drop = one prompt, one integration, one screenshot (`phase6b-
escape-<biome>.png`).

### Phase 6c — DESIGN.md seventh realization

After 6a + 6b land:

- Append a seventh-realization block covering Phase 6. Mention the
  painterly-overlay-atop-procedural pattern explicitly — it's a new
  integration grammar that deserves documentation.
- Mark Phase 6 shipped on the roadmap with date.
- Decisions-log rows for: painterly overlay over procedural (not
  replacement), round-tree-only painterly scope (pines / bushes
  stay procedural), tree-forest borrowed by race without a dedicated
  race-only variant, biome-match gating during blend transitions.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Tree silhouette hard to read at 120px in-canvas | Style guide prescribes bold 3-5 light/shadow regions, not fine leaf detail. Accept only renders that pass a 120px squint test |
| Procedural + painterly coexist in the same frame and clash | Painterly PNG only replaces tree-type 0 tiles; pines / bushes stay procedural at smaller sizes and different silhouettes. The difference reads as "painterly feature trees + procedural filler" rather than mismatch |
| Biome blend transitions pop when the sprite switches | Gate sprite draw on blend < 40% of next biome, so during active transitions the procedural canvas renders and the painterly trees enter only after blend settles |
| Ember-orange branches in volcano tree fight HUD gold | Accept only renders where the ember accents sit on canopy tips (top half of the tree, well above UI HUD band) |
| Mushroom-cluster in cave tree reads as gameplay powerup | Call out in the cave prompt "cluster of small pale mushrooms at trunk base, decorative, not a pickup" — regenerate if they read as collectible |
| Race adds a tree that overwhelms the 60×60 bush silhouettes | Draw tree at `sz * 2.2` vs bush's `sz * 2.0`; bushes stay smaller and lower. Tree reads as taller "tall foliage" slot |
| 4 × ~2MB tree assets (tree-forest.png is 2MB+) bloats the captive-portal payload | Accept the payload growth — commissioned art is the product's face; the 8-avatar roster already established ~16MB of content-art budget, 8MB more is tolerable on a USB stick |

## Open questions (for implementer)

1. Do we re-compress 1024×1024 masters down to 512×512 for
   `/assets/` shipping? Animal-\*.png stayed at 1024 — follow that
   pattern unless payload starts hurting. **Lean: keep 1024.**
2. Does escape's snow biome already render a procedural pine-with-
   snow-cap that the snow tree PNG would double up with? Confirm
   before integrating tree-snow.png — if yes, gate painterly snow
   tree to tree-type-0 (round) tiles only, leave pines procedural
   so the snow cap effect stays.
3. Should race's 25% tree probability be configurable, or fixed?
   **Lean: fixed 25% for simplicity.** If playtest shows too many
   / too few trees, tweak and log the decision.
4. Do we backport `tree-forest.png` to escape's **race-adjacent**
   lobby screens (if any)? Race's lobby uses ticket PNGs; no tree
   slot. Skip.

## Phase handoff

After 6a + 6b + 6c land, DESIGN.md gains the seventh realization
and roadmap item 7 is marked shipped. No Phase 7 currently scheduled.
Further content pushes (hill crown, meteor crater, race finish-line
flag art, escape biome creature sprites) open their own specs when
art demand accumulates again.
