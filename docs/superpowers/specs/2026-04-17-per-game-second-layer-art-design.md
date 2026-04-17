# Per-Game Second-Layer Art — Design Spec (Phase 8)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 8 of ?, follow-up to Phase 7 per-game hero art
**Scope:** three painterly PNG "moment" pieces — one per game, each
elevates a single signature moment that Phase 7 didn't cover: hill
arena-shrink crown-crest, meteor safe-zone target-mark, race
winner-overlay podium. Same style guide, same `loadPainterly`
pipeline, same one-prompt-at-a-time cadence. **NOT** a mechanics
change, NOT new specs for procedural geometry, NOT a UI overhaul
of the winner flow.

## Problem

Phase 7 covered the primary signature moments: hill's king-zone
centerpiece (`hill-crown.png`), meteor's impact event
(`meteor-crater.png`), race's finish line (`race-flag.png`). A
second tier of per-game signature moments still renders as purely
procedural / canvas-primitive composition:

- **Hill's arena-shrink state** (when `renderPlatR < 3.5`) currently
  flips the pulse ring to danger-red and speeds up the pulse
  frequency. Mechanically clear but visually thin — the "the
  kingdom is closing in" moment reads as "the ring got redder."
- **Meteor's active safe zone** shows a green radial glow + gold-
  bulb core + Alfa Slab "SAFE" label (`drawSafeZone` in
  `render2d.js:267-325`). Legible as "go here," but doesn't tell
  a story — the safe tile is the most important narrative beat of
  the round and it's decorated with a gold dot.
- **Race's winner overlay** (`#winner-overlay` in
  `client-host-race/index.html:78`) is a full-screen brown scrim
  with text-only winner name + quip + ticket button. Wins the
  race, scrolls off into a text card — no ceremony.

Each moment deserves a painterly piece that makes it feel like a
carnival stage reveal rather than a state transition. Phase 8 is
one PNG per game, integrated the same way Phase 7 did — painterly
overlay atop the existing procedural / DOM composition, graceful
fallback when the asset is missing.

## Success criteria

- **3 painterly PNGs** under `/assets/` with the per-game-prefix
  convention: `hill-crest.png`, `meteor-target.png`,
  `race-podium.png`. Same 1024×1024 master, same "Barnyard
  Bedlam" hand.
- **Hill crest** appears at the top center of the arena when
  `renderPlatR < 3.5` (danger / shrinking state). Rendered above
  the arena rim, below HUD. Fades in smoothly over ~400ms as
  the arena enters danger state; persists through the round end.
- **Meteor target-mark** overlays the safe-zone center when
  `showSafe && warnProgress > 0`, anchored on the bulb core.
  Under the "SAFE" Alfa Slab label, above the green radial glow
  — painterly target on a glowing tile, "SAFE" text floating
  above it.
- **Race podium** renders as a centered backdrop in
  `#winner-overlay`, DOM-layered behind the winner-name `.w-text`
  + quip `.w-sub` + LOBBY ticket button. Winner name floats over
  the top pedestal step.

## Non-goals (explicitly out of scope for Phase 8)

- Mechanics changes. Arena-shrink / safe-zone / winner-overlay
  behaviour stays identical; all three PNGs are decorative.
- 2nd and 3rd place podium art. Race's result overlay currently
  only surfaces the winner; expanding to 2nd/3rd is its own flow
  change (server shape, narrator pools) and belongs in a future
  spec if/when multi-placement display is added.
- Hill crest animation (rotation, scale pulse, etc.). Static PNG
  that fades in with alpha ramp; any oscillation is reserved for
  a future polish pass.
- Meteor target-mark per-round color shift. Same PNG for every
  safe zone regardless of warning intensity or player count.
- New onboarding / controller / escape art. Phase 5/6 covered
  those layers; Phase 8 is strictly per-game host decoration.
- `winner-overlay` redesign. Podium is a drop-in backdrop behind
  existing text + button elements; their font / position /
  timing stays untouched.

## Style guide

Inherits verbatim from the Phase 5 style guide
(`2026-04-16-content-pass-design.md`), Phase 6 env-art addendum
(`2026-04-17-environmental-art-design.md`), and Phase 7 hero-art
guide (`2026-04-17-per-game-hero-art-design.md`). Same bg.png
anchor, digital-watercolor + medium dark ink outlines, 1024×1024
master, checker-preview-background acceptable (edge-seeded
`SpriteLoader.loadPainterly` strips it).

### Per-piece parameters

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| hill-crest | an ornate heraldic crest centered on the same gold-and-ruby crown from the hill king-zone, flanked by two green laurel branches curving down from the crown, with a red velvet ribbon banner unfurled beneath bearing three small gold stars | gold leaf and ruby central gem match hill-crown.png exactly; laurel branches are hand-painted with visible individual leaves, not a stylised icon | warm gold dominant, deep ruby-red centrepiece and ribbon, fresh green laurel, small cream-white stars on the ribbon |
| meteor-target | a bold circular bullseye target with four concentric rings — outer dark rim, red band, cream-white band, small gold center dot — painted with slight hand-drawn imperfection so ring edges are not machine-precise | painterly rings with soft wash shading inside each band, no metallic reflection, reads as a hand-painted carnival shooting-gallery target | black outer rim, carnival red band, cream-white inner band, warm gold bullseye |
| race-podium | a classic three-tier race podium with a tall central step, a shorter step on the left, and a shorter-still step on the right; central step adorned with a gold number "1" painted in Alfa-Slab-style lettering, left step with a painted silver "2", right step with a painted bronze "3" — all centered in painterly poster style, with a thin draped red-velvet curtain behind suggesting a stage backdrop | wooden pedestal painted in warm brown with gold-leaf ornamental trim along each step's top edge; red curtain matching bg.png's carnival red | warm wood brown dominant, gold / silver / bronze metallic accents on the step tops, carnival red curtain backdrop, cream-white number outlines |

### Prompt template (filled per piece)

```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. Clean three-quarter composition,
subject centered, no ground plane, no background scene. Clear
readable silhouette at small sizes. Transparent background, no
scene, no ground, no backdrop. Square composition 1024x1024. No
text (except the specific letters / numbers listed in the subject
description), no borders, no watermarks, no human figures, no
animals, no signs beyond what is described. Style: the same
"Barnyard Bedlam" painterly children's-storybook feel as the
animal roster and the biome trees — not vintage sepia, not flat
vector, not photorealistic.
```

Note: podium prompt carries letters ("1" / "2" / "3") as part of the
asset. The template's "no text" clause explicitly excepts the listed
letters — LLMs generally respect this.

## Pipeline

Same as Phase 5 / 6 / 7. One prompt at a time, drop in `/assets/`,
integrate, screenshot, iterate. `SpriteLoader.loadPainterly` (edge-
seeded after Phase 7c fix) handles checker-preview stripping.

## Deliverables

### Phase 8a — hill crest (1 PNG)

1. `hill-crest.png` — heraldic crest.
2. `client-host-hill/render2d.js` — load via `SpriteLoader.loadPainterly`.
   Track a `crestFade` module-scope variable that ramps 0 → 1 over
   400ms when `renderPlatR < 3.5` begins, and ramps back to 0 if the
   arena somehow grows (unlikely mid-round but handles edge case).
   Add `drawHillCrest(ctx)` registered on a new `crest` layer at
   depth 22 (above players=20, below ui=40). Renders the crest
   centered at the top of the arena (`camera.worldToScreen(0, -4)`
   or similar anchor based on arena size) with `globalAlpha = crestFade`.
3. Screenshot: `screenshots-review/phase8a-hill-crest.png` —
   arena in danger state, crest hovering over the shrunken ring.

### Phase 8b — meteor target-mark (1 PNG)

4. `meteor-target.png` — painterly bullseye.
5. `client-host-meteor/render2d.js` — load via
   `SpriteLoader.loadPainterly`. In `drawSafeZone`, after the gold-
   bulb core is drawn and before the "SAFE" label text, draw the
   target PNG centered at `(sx, sy)` scaled to `sr * 1.6` (slightly
   bigger than bulb so rings frame the bulb). Fall back to the
   existing bulb-only composition when sprite isn't loaded.
6. Screenshot: `screenshots-review/phase8b-meteor-target.png` —
   safe-zone tile with target overlay, SAFE label above.

### Phase 8c — race podium (1 PNG)

7. `race-podium.png` — three-tier podium.
8. `client-host-race/index.html` — add an `<img class="w-podium">`
   inside `#winner-overlay`, positioned absolutely with the winner
   text / quip / ticket button layered on top. CSS places the
   podium as a centered backdrop (max-width ~420px), keeps
   `.w-text` floating over the #1 top-tier step. `onerror` on the
   img removes it so the current text-only layout is the fallback.
9. Screenshot: `screenshots-review/phase8c-race-podium.png` —
   winner overlay with podium backdrop behind the winning player
   name.

### Phase 8d — DESIGN.md tenth realization

After 8a + 8b + 8c land:

- Append a tenth-realization block covering Phase 8.
- Mark Phase 8 shipped on the roadmap with date.
- Decisions-log rows for: crest anchor (arena top vs rim-orbit),
  crestFade ramp timing, target-mark stacking order relative to
  SAFE label, podium as DOM `<img>` vs canvas-baked.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Hill crest competes visually with HUD elements at top of screen | Anchor crest at world position (0, -3.5) so it floats inside the arena volume, not on HUD stripe; alpha caps at 0.85 to let the HUD read through at highest crest intensity |
| Meteor target-mark overwhelms the SAFE label | Target draws BEFORE the SAFE text each frame (stacking order), text letterpress + gold color reads on top. Target alpha ≤ 0.8 to let green halo breathe through |
| Race podium competes with winner name readability | Podium as backdrop behind text; `.w-text` already has deep-red letterpress + gold glow — no additional shadow needed. Podium alpha 0.95 for richness but text z-index clearly above |
| Podium #2 and #3 steps are empty in current UI (no silver/bronze winner) | Numbers "2" and "3" are painted ON the pedestal art itself; the EMPTY step simply stands as a decorative "what's possible" visual. No gameplay implication |
| Fade-in on hill crest can flicker if arena radius oscillates around 3.5 | Crest fades by `Math.max(crestFade, target)` — monotonically increases once crossed; no reverse flicker on micro-oscillations |

## Open questions (for implementer)

1. Race podium CSS sizing: use `object-fit: contain` with a fixed
   max-height, or let natural aspect determine? Lean: fixed
   max-height ~360px centered, lets the UI text float above.
2. Hill crest position: truly top-of-arena (above players), or
   hovering above the ring (between ring and HUD)? Lean: above
   ring, at world y ~ -4, so it reads as "heraldic crest at the
   kingdom's gates."
3. Meteor target fade-in: step onto the safe tile the moment it
   activates, or fade in over 200ms? Lean: fade in over 200ms
   matching the safe-zone activation feel.

## Phase handoff

After 8a + 8b + 8c + 8d land, DESIGN.md gains the tenth realization
and roadmap item 9 is marked shipped. Remaining deferred items
(i18n, WebGL performance, GLB extension, second-place / third-place
podium display flow) open their own specs when demand justifies.
