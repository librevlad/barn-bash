# Per-Game Hero Art — Design Spec (Phase 7)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 7 of ?, follow-up to Phase 6 environmental art
**Scope:** three painterly PNG "hero" pieces — one per game that didn't
receive Phase 6 coverage: hill crown, meteor crater, race finish flag.
Each replaces or supplements a single signature visual moment. **NOT**
a full atlas-sprite pass, NOT new mechanics, NOT a second escape /
controller / onboarding art pass.

## Problem

Phase 6 shipped four biome trees into escape's procedural renderer
and reused the forest tree as a race track-side variant. The
remaining per-game canvases still draw every hero visual from canvas
primitives:

- **Hill** draws the king zone as a radial gold spotlight + dashed
  gold ring + emoji `👑` at 22% alpha (`client-host-hill/render2d.js`
  line 237-244). The emoji renders inconsistently across Windows /
  iOS / Android — the same OS-variance that drove Phase 4's SVG
  icon sprite and Phase 5's painterly avatars.
- **Meteor** fires a full-screen red flash on impact
  (`client-host-meteor/render2d.js:drawImpactFlash` at line 366-370).
  Loud but ephemeral; there is no actual mark left on the arena
  after the flash fades. The flash reads as "something happened"
  but not as "a meteor hit THAT spot."
- **Race** has a carnival finish line already (red-velvet procedural
  banners, gold rope, Alfa Slab FINISH label, checker squares on
  ground) as of Phase 3. Strong, but the banners are procedural
  red rectangles — they read as "colour block on pole" rather than
  "hand-painted carnival flag." The same painterly hand that made
  bg.png and the animal roster could elevate the moment.

These are the last three visible "signature" canvas moments without
painterly art. Phase 7 commissions one PNG each, integrated the
same way Phase 6 did — painterly overlay atop the existing
procedural code, graceful fallback when the asset is missing.

## Success criteria

- **3 painterly PNGs** shipped under `/assets/` with the
  per-game-prefix convention: `hill-crown.png`, `meteor-crater.png`,
  `race-flag.png`. Same 1024×1024 master, same "Barnyard Bedlam"
  hand as the animal roster and biome trees.
- **Hill's emoji crown replaced** by `hill-crown.png`, drawn at
  the king-zone center with scale tracking `kingZoneR`. Procedural
  emoji stays as `onerror` fallback.
- **Meteor's impact flash gains a painterly crater**: on
  `meteor_impact`, draw `meteor-crater.png` at the impact world
  position, scaling up from ~0.3× → 1.0× over 180ms and fading
  out 0 → 0 over the following 800ms (~1s total). Red flash
  continues alongside; crater adds the "that spot got hit" read.
  No persistent craters accumulate — each impact's crater fades
  entirely within ~1s of the event.
- **Race finish line gets a painterly flag**: `race-flag.png`
  rendered on each side of the finish line, sitting above or
  replacing the procedural red-velvet banner rectangles. Gold
  rope + FINISH label + checker ground stay procedural.

## Non-goals (explicitly out of scope for Phase 7)

- Procedural renderer rewrites. Each PNG overlays or lightly
  replaces a single decorative element; all hit detection, state,
  and gameplay code stays untouched.
- Escape / controller / onboarding art. Phase 5 and 6 already
  covered those.
- Multi-frame or animated sprite sheets. Each PNG is static; the
  crater's scale-up + fade-out is programmatic canvas animation,
  not frames.
- Hill arena-shrink crowning animation, meteor-zone safe-tile
  painterly art, race podium illustration. Those stay as future
  follow-ups if demand returns.
- New hill / meteor / race gameplay. The PNGs decorate existing
  moments; they don't introduce new rules.

## Style guide

Inherits verbatim from the Phase 5 style guide
(`2026-04-16-content-pass-design.md`) and Phase 6 env-art addendum
(`2026-04-17-environmental-art-design.md`). Same bg.png anchor,
digital-watercolor + medium dark ink outlines, bright daylight
palette, 1024×1024 master, transparent-intent (checker-preview
background gets stripped by `SpriteLoader.loadPainterly`).

### Per-piece parameters

Hand the prompt template to the image-gen LLM with these slots:

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| hill-crown | an ornate royal crown with five gold spires tipped in red velvet, large ruby at the centre and small pearl inlays around the rim | gold leaf detailing with subtle age patina, carnival-poster flourishes (not heraldic realism) | warm gold dominant, ruby-red centrepiece, cream pearl highlights |
| meteor-crater | a circular impact crater with cracked dark-rock rim, glowing orange ember veins radiating from the centre, and a thin smoke plume rising from the middle | painterly crack network in a painterly carnival register — not photoreal volcanic | charred rock browns and blacks, ember orange in the cracks, pale smoke grey at the top |
| race-flag | a black-and-white checker racing flag on a short wooden pole, pole topped with a small gold cap, flag frozen mid-flutter as if caught in a breeze | painterly carnival signage — the flag's checker squares are painted with slight imperfection rather than machine-precise | black and white dominant, warm brown pole, gold cap accent |

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

Same as Phase 5 / Phase 6. One prompt at a time, drop in `/assets/`,
integrate, screenshot, iterate. `SpriteLoader.loadPainterly` handles
the checker-preview strip.

## Deliverables

### Phase 7a — hill crown (1 PNG)

1. `hill-crown.png` — painterly crown.
2. `client-host-hill/index.html` — add `<script src="/engine/SpriteLoader.js">`
   (hill doesn't currently ship SpriteLoader; escape only adopted
   it in Phase 6a).
3. `client-host-hill/render2d.js` — load the PNG via
   `SpriteLoader.loadPainterly('hill-crown', '/assets/hill-crown.png')`.
   In `drawKingZone`, check for the loaded sprite and draw it centered
   at the king-zone anchor, scaling to `kingR * 0.9` (slightly inside
   the ring). Fall back to the existing `'\uD83D\uDC51'` emoji text
   when sprite missing.
4. Screenshot: `screenshots-review/phase7a-hill-crown.png`.

### Phase 7b — meteor crater (1 PNG)

5. `meteor-crater.png` — painterly crater.
6. `client-host-meteor/index.html` — add SpriteLoader.
7. `client-host-meteor/render2d.js` — new `craterFX` array tracking
   recent impacts (world position + elapsed time). On `meteor_impact`
   message (wired through `main.js`), push `{ x, z, t0: now }` into
   the array. New `drawMeteorCraters(ctx)` layer renders each active
   crater: scale ramps 0.3 → 1.0 over 0-180ms, alpha ramps 1.0 → 0
   over 180-1000ms. Entries expire after 1000ms. Draw the crater at
   the impact point with `ctx.globalAlpha = craterAlpha`. No
   accumulation — all craters are ephemeral.
8. Screenshot: `screenshots-review/phase7b-meteor-crater.png`.

### Phase 7c — race finish flag (1 PNG)

9. `race-flag.png` — painterly checker flag.
10. `client-host-race/render2d.js` — in the finish-line block (around
    `render2d.js:293-313`), replace the procedural red-velvet banner
    rectangles with `SpriteLoader.draw('race-flag', ...)` calls on
    each side. Gold bulb caps + gold rope + FINISH label + checker
    ground stay procedural. Fallback to the existing banner
    rectangles when the sprite isn't loaded yet (same `spritesReady`
    gate as the other race sprites).
11. Screenshot: `screenshots-review/phase7c-race-flag.png`.

### Phase 7d — DESIGN.md ninth realization

After 7a + 7b + 7c land:

- Append a ninth-realization block covering Phase 7.
- Mark Phase 7 shipped on the roadmap with date.
- Decisions-log rows for: ephemeral-crater vs persistent-accumulating
  (chose ephemeral to avoid arena clutter), per-game-prefix filename
  convention (`hill-`, `meteor-`, `race-`) as the new
  environmental-asset naming, SpriteLoader adoption in hill/meteor
  (retrofitting escape's Phase 6a pattern).

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Hill crown PNG competes with player sprites in the king zone | Draw at 0.9× ring radius with `globalAlpha=0.85`; the spotlight glow + ring still frames it; crown reads as zone-icon, not as a player |
| Meteor crater accumulates if event fires faster than fade | Array-indexed entries with `t0 + 1000ms` expiry; stale entries pruned at render start so memory stays bounded |
| Race finish flag pole clashes with existing gold-rope + banner layout | Position flag to REPLACE the banner rectangle, keep rope and bulbs; flag pole aligns with where the bulb was so top-of-pole gold cap reads as the same bulb it replaces |
| Painterly flag texture fights procedural checker-ground squares | Flag is DECORATIVE (poles); ground squares are FUNCTIONAL (start/finish marker). They live at different scales — flag above eye-line, checker at ground — and don't compete for the same visual register |
| Crown / crater / flag PNGs exceed 2MB each | Matches Phase 5 + 6 asset budget. Captive-portal USB-stick target has ~16MB already in content art; 3 more pieces at ~2MB each stays in tolerance |

## Open questions (for implementer)

1. Crown scale at small king-zone radii (mid-game shrink): does 0.9× kingR
   still read as "crown" when the zone is ~2 units wide? Lean: yes,
   test with a ~1.5 worldR shrink in screenshot, bump up to 1.1× if
   silhouette is lost.
2. Crater render order vs impact flash: crater under or over flash?
   Lean: crater UNDER flash — flash is the "moment", crater is the
   "aftermath." Flash fades first, revealing crater.
3. Flag facing direction: flag waves toward the track inside, away, or
   alternates per side? Lean: toward the track inside so both flags
   "greet" the finishers.

## Phase handoff

After 7a + 7b + 7c + 7d land, DESIGN.md gains the ninth realization
and roadmap item 8 is marked shipped. Deferred follow-ups (hill
arena-shrink painterly crown-crest, meteor safe-tile painterly
target-mark, race podium art, plus i18n / WebGL / GLB extension)
open their own specs when demand accumulates.
