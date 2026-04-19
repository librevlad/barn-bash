# Phase 63C — Gameplay painted register audit + commission roadmap

## Why

Phase 62 shipped 4 painted gameplay **scene backdrops** and
Phase 63a a painted fox sprite. User-visible result on real
gameplay: **register mismatch is still obvious**. Painted
scene + painted fox float against **procedural mid-ground
and foreground** (trees drawn with `ctx.fill`, rocks with
`ctx.ellipse`, gaps with `ctx.fillRect`, etc.). The fox was
the most painterly element on screen so it read as out of
place — not because the fox is wrong, but because everything
around it stayed procedural.

Conclusion: going half-painted in gameplay is worse than
going fully procedural or fully painted. To cash in the
Phase 58-62 register discipline we must finish the interior
of the gameplay surface, not just the edges.

This spec is the **honest audit + commission roadmap** for
every procedural draw function in the 4 gameplay renderers.
Each element gets a priority tier; user decides how deep to
commission.

## Success

- Clear inventory of every procedural gameplay element per
  game (extracted directly from `render2d.js` draw functions).
- Priority tier per element (S / A / B / C) based on
  visibility, frequency, and register-mismatch severity.
- Recommended commission order that maximises register-
  continuity per asset commissioned.
- After the tier-S + tier-A batch ships, the gameplay canvas
  reads as one painted illustration; tier-B adds polish,
  tier-C is overkill.

## Non-goals

- Writing individual Midjourney prompts for every asset in
  this spec. That happens phase-by-phase after user approves
  the tier scope.
- Refactoring the procedural draw functions themselves.
  Painted heros swap in via `ctx.drawImage`; procedural
  code stays as fallback for missing assets.

---

## Procedural inventory per game

Extracted from each `render2d.js` by enumerating `function
draw*` + their `ctx.*` call density. `(N procedural)` flags
raw shape-based rendering; `(painted)` means the function
already uses a commissioned PNG.

### Escape (runner) — 14 draw functions

| # | Function | Role | Register | Tier |
|---|---|---|---|---|
| 1 | drawPaintedScene | Backdrop | painted (Phase 62a) | — |
| 2 | drawSky | Sky gradient + stars + moon | procedural (already alpha-overlay) | — |
| 3 | drawClouds | Drifting cloud blobs | procedural | C |
| 4 | drawHills | Distant hill silhouettes | procedural (painted scene has this) | retire |
| 5 | drawGroundLayer | Ground color + grass streaks | procedural (painted scene covers) | retire |
| 6 | drawTrees | Forest + Phase 6 painterly overlay | partially painted | **A** (commission trees2/obstacles variants) |
| 7 | drawObstacles | gap / overhead branch / rock | procedural | **S** (player-facing hazards) |
| 8 | drawPowerups | icon glyphs + halo | procedural | **A** |
| 9 | drawPlayers | CharSprite painted (Phase 48a) | painted | — |
| 10 | drawFox | painted fox (Phase 63a) | painted | — |
| 11 | drawBiomeCurtain | Red velvet wipe | procedural (fine as FX) | — |
| 12 | drawFoxWarning | Warning glow around edges | procedural (fine as FX) | — |
| 13 | drawDust | Particle dust | procedural (fine as FX) | — |
| 14 | drawLaneMarkers | Lane divider lines | procedural (UI) | — |

**Tier-S for escape**: rocks (boulder), gap pit, overhead
branch/log. These are the obstacles the player READS as
signals.

**Tier-A**: painted-tree overlay pack (Phase 6 has forest/
cave/snow/volcano but obstacles shipping now are still
procedural), painted powerup icons (shield / speed / magnet).

**Retire**: drawHills + drawGroundLayer are redundant with
the painted scene backdrop — delete them when commission
lands.

### Race (circuit) — 13 draw functions

| # | Function | Role | Register | Tier |
|---|---|---|---|---|
| 1 | drawPaintedScene | Grandstand scene | painted (Phase 62b) | — |
| 2 | drawGrass | Radial grass field | procedural (already alpha-overlay) | — |
| 3 | drawGravelTraps | Gravel runoffs | procedural | B |
| 4 | drawTrack / drawTrackPath | Asphalt + stripes | procedural | **A** (painted racing-line overlay or keep procedural) |
| 5 | drawTireMarks | Tire skid marks | procedural (fine as FX) | — |
| 6 | drawTrackObjects | Trackside props | procedural | B |
| 7 | drawItems | Item boxes | existing `sprite-item-*` painted | — |
| 8 | drawOilSlicks | Oil slick hazards | procedural (fine as FX) | — |
| 9 | drawMissiles | Missile projectiles | `sprite-item-missile` painted | — |
| 10 | drawPlayers | Car sprites | painted cartoon cars | **S** (add animal-in-driver detail) |
| 11 | drawMinimap | UI minimap | procedural (UI, OK) | — |
| 12 | drawLapPennant | Lap banner overlay | procedural (fine as FX) | — |

**Tier-S for race**: painted car sprites with animal drivers
(8 variants, user-rejected this is the commission the
register needs most — existing cars are cartoon but no
animal ties them to player identity).

**Tier-A**: track-stripe overlay as painted PNG (optional);
gravel runoff painted detail.

**Tier-B**: trackside props (barriers, flags, crowd-like
shapes the grandstands don't cover).

### Hill (king-of-the-hill) — 7 draw functions

| # | Function | Role | Register | Tier |
|---|---|---|---|---|
| 1 | drawCarnivalBackdrop | Dark vignette | procedural (already FX) | — |
| 2 | drawPaintedScene | Mountain peak | painted (Phase 62c) | — |
| 3 | drawArena | Wood-disc battle platform | procedural | **S** (the stage where the battle happens) |
| 4 | drawKingZone | Crown target zone | procedural | **A** (painted crown emblem already exists) |
| 5 | drawHazards | Cracks / ice / bumper | procedural | B |
| 6 | drawHillCrest | hill-crest PNG overlay | painted (Phase 8a) | — |
| 7 | drawPlayers | CharSprite painted | painted | — |

**Tier-S for hill**: painted wood-disc arena PNG replacing
the radial-gradient procedural platform. It's the biggest
screen element during hill gameplay.

**Tier-A**: painted crown medallion for the king zone (may
already exist as `hill-crown.png`, just integrate).

**Tier-B**: painted hazard variants (ice patch, crack,
bumper).

### Meteor (survive) — 9 draw functions

| # | Function | Role | Register | Tier |
|---|---|---|---|---|
| 1 | drawPaintedScene | Cosmic backdrop | painted (Phase 62d) | — |
| 2 | drawEmbers | Ambient embers | procedural (fine as FX) | — |
| 3 | drawArena | Scorched stone platform | procedural | **S** (platform is the main play area) |
| 4 | drawDangerOverlay | Red warning wash | procedural (fine as FX) | — |
| 5 | drawSafeZone | Safe green zones | procedural (Phase 8b painted target exists) | **A** |
| 6 | drawMeteorCraters | Impact craters | procedural (Phase 7b painted crater exists) | A |
| 7 | drawPlayers | CharSprite painted | painted | — |
| 8 | drawImpactFlash | Screen flash | procedural (fine as FX) | — |
| 9 | drawTimerBar | UI timer | procedural (UI, OK) | — |

**Tier-S for meteor**: painted scorched-stone platform PNG
replacing procedural arena. Matches painted scene register.

**Tier-A**: painted safe-zone halo + painted impact-crater
variants with ember cracks.

---

## Priority tiers summary

### Tier S (commission first — biggest visible register gap)

1. **race — painted cars with animal drivers** (8 variants).
   Existing cars are cartoon-painted but have no animal
   identity. Drivers are the player identity signal.
2. **escape — painted obstacle set** (gap / branch / rock,
   3 variants). Biggest gameplay-critical procedural
   elements.
3. **hill — painted arena disc**. The stage the whole fight
   happens on.
4. **meteor — painted arena platform**. Same as hill.

Total tier-S: **13 assets** (8 cars + 3 obstacles + 2 arenas)

### Tier A (commission second — noticeable polish)

5. escape — painted powerup icons (shield / speed / magnet).
6. escape — painted tree overlay variants for each biome
   (already started in Phase 6 — finish the set with
   painted-tree-obstacle variants).
7. hill — wire existing `hill-crown.png` into drawKingZone
   (zero commission, just integration).
8. meteor — painted safe-zone halo + painted crater variants
   (some exist — Phase 7b / 8b).

### Tier B (polish — only if tier-S + tier-A doesn't close
the register gap)

9. race — painted track-stripe overlay, trackside barriers.
10. hill — painted hazards (cracks / ice / bumper).

### Tier C (skip unless user specifically wants)

11. escape — painted clouds, painted ground detail tiles
    (but painted scene covers these already).

---

## Recommended commission batch

**Batch 1 (Phase 63b)**: Race cars × 8 — biggest visible
gap, clearest commission scope, most-watched screen in a
tournament (3-min race rounds).

**Batch 2 (Phase 63c)**: Escape obstacles × 3 (rock, gap,
branch). Smallest commission with highest gameplay-signal
impact.

**Batch 3 (Phase 63d)**: Hill + meteor arenas × 2. Biggest
screen elements for those 2 games.

**Batch 4 (Phase 63e)**: Tier-A pack — powerups, tree
variants, integration-only hill-crown. Mixed commission +
integration.

---

## Integration cost per asset

All painted gameplay assets follow the **same integration
pattern shipped in Phase 63a**:

1. `const img = new Image(); img.src = '/assets/X.png';`
2. `let ready = false; img.onload = () => ready = true;`
3. In the draw function: `if (ready) { ctx.drawImage(img,
   ...) } else { /* procedural fallback */ }`.
4. Add motion via canvas transforms (squash / roll / bob)
   in the same pattern as CharSprite for animated targets.

Each painted asset requires ~15 min CC integration + test.
4 batches × ~5 assets = ~20 integrations + per-batch docs
closure.

---

## Open questions

- **User taste on animal-driver cars**: painted car-plus-
  animal or animal-replaces-car (just a painted animal in
  a cart)? Existing `sprite-car-*` PNGs are cars only, no
  driver. Recommendation: **animal visible in driver seat**,
  top-down 3/4 view so head / paws / upper body reads
  clearly. Retains the existing 8-color car palette for
  identity continuity.

- **Obstacle size consistency**: escape obstacles currently
  scale with Z-distance (`scale = 1 - relZ / W*0.8`). Painted
  sprite must hold detail at smallest rendered size (~20-30
  px). Commissioned PNG at 256×256 downscales cleanly.

- **Performance**: adding 8-13 more painted-sprite
  `drawImage` calls per frame per game. Bench on low-end
  Android; if it hits, move to offscreen-canvas pre-composed
  sheet.

## Phase handoff

Phase 63C spec = roadmap. **User picks batch**, I write
per-asset prompt(s) + integrate + screenshot. Rinse per
batch. Final Phase 63X (X=letter after last batch) closes
docs(design) with realization block.

The painted register arc properly CLOSES when gameplay
reads as one illustration — no procedural shapes visible
against painted backdrops. Tier-S batch alone should close
90% of the perceived gap.
