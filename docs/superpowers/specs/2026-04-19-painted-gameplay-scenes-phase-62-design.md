# Phase 62 — Painted gameplay scene backdrops

## Why

Phase 58-61 raised every **meta screen** (lobby / round-intro /
standings / post-game / champion / narrator / controller
overlays) to Hearthstone-tier painted register. But once the
tournament countdown hits zero and gameplay starts, the player
drops back into procedural / sprite-tier rendering:

- **Escape** draws sky via procedural gradient + code-drawn
  stars and moon, with biome-specific painterly tree overlays
  (Phase 6) as the only commissioned art in-scene.
- **Race** draws the track, grandstand stripes, and sky via
  code. Pixel-art car sprites (Phase 3 decision to keep pixels)
  live on a procedural surface.
- **Hill** renders the arena with code-drawn hill silhouette +
  Phase 7a painted crown overlay + Phase 8a hill-crest, but
  the sky, mountains, atmosphere are procedural.
- **Meteor** draws a procedural cosmic gradient with Phase 7b
  painted crater art, Phase 8b safe-zone target art. Sky +
  stars are code.

The register mismatch is most visible at the TRANSITION —
round-intro painted-hero poster cuts to gameplay with
procedural sky, and the player feels the drop.

## Success

Each of the 4 games gains a dedicated **painted scene backdrop**
(1376×768 PNG + WebP) that renders as the FIRST canvas layer
behind all procedural / sprite rendering. Procedural code stays
in place (gameplay logic / obstacles / characters move on top
of the painted static scene). Only the atmospheric layer —
sky, distant mountains, horizon, ambient haze, distant
painted props — moves to the painted PNG.

After Phase 62 the player looking at an escape biome sees a
painted forest horizon with moonlight + hill silhouettes + soft
cloud bank behind the procedural fox / trees / path that still
animates on top. Same register as the lobby hero.

## Non-goals

- Replacing gameplay sprites (cars, players, obstacles) — those
  stay procedural / pixel-sprite. Only backdrop / sky / distant
  atmosphere changes.
- Biome-specific backdrops for escape — one painted scene
  covers all 4 biomes (forest/cave/snow/volcano); biome
  transitions handled by the existing Phase 6 tree overlays +
  procedural color shift layered ON TOP of the painted sky.
- Replacing race podium / hill crest / meteor crater — Phase
  7-8 painted gameplay props stay.
- Per-game HUD chrome — Phase 48-50 painted plaques already
  at register.

---

## Common anchor

All Phase 62 assets render at **1376×768 native PNG** (16:9,
cover-fit the gameplay canvas at 1280×720 or 1920×1080 host
viewports). sRGB 8-bit, WebP via `cwebp -q 82`.

### Integration layer map (shared across 4 games)

The painted scene sits as the FIRST canvas layer each frame.
The existing procedural / sprite render code draws OVER it:

```
  LAYER 0: painted scene backdrop (Phase 62 — NEW)
  LAYER 1: procedural mid-ground (sky gradient overlay on
           top for biome tint, sprite trees, track stripe,
           etc.)
  LAYER 2: gameplay sprites (players, obstacles, items)
  LAYER 3: effects (explosions, trails, pennants)
  LAYER 4: HUD (DOM, not canvas — Phase 48-50 brass plaques)
```

Each game's `render2d.js` adds a new FIRST layer
`drawPaintedScene(ctx)` that `ctx.drawImage`s the scene PNG
cover-fit and returns. Existing sky / terrain draw fns become
atmospheric overlay (drawn at lower alpha on top of the painted
scene) or are gated off entirely when the painted scene is
available.

### Safe-zones (avoid painted content in these rects)

Gameplay content needs clear regions for sprites + procedural:

| Zone | Rect in image (px @ 1376×768) | Use |
|---|---|---|
| Gameplay action zone | y 320-720 (lower 52%) | Procedural terrain + sprites animate here — painted content in this band should be atmospheric (ground texture, distant details), not foreground objects that would compete with sprites |
| HUD bar | y 0-90 top | Phase 48-50 brass HUD plaques overlay — painted content here can be sky continued under HUD, but obscured by plaque |

### Palette discipline

Each scene carries Phase 58 vocabulary: gold + deep red + warm
brown + cream accents where appropriate (fire embers, painted
atmospheric haze). Per-game hero-motif colors bleed into the
scene atmosphere:
- escape → warm sunset-to-dusk pine forest register
- race → daylight racing circuit with gold accents on
  grandstands
- hill → warm mountaintop battlefield with royal-red banners
- meteor → deep cosmic purple-red night sky with ember
  fragments

---

## 62a — Gameplay escape scene

**Use**: rendered behind escape gameplay (forest path, fox
chase). Existing procedural sky + biome tint + Phase 6 tree
overlays animate on top.

**Path**: `/assets/gameplay-escape-scene.png`

**Composition**:
- Painted forest horizon at mid-height: distant pine silhouettes
  receding into mist, warm sunset-into-dusk sky gradient above
  with painted moon rising on the right.
- Ground zone (lower 40%) is painted dark earth-and-grass
  texture at cover-all level — procedural path + obstacles
  render on top.
- Fire embers drift across the scene (matching the lobby hero
  fire-ember register).
- Two faint painted silhouettes of hills in the distance.

### 62a prompt

```
Hearthstone card-art style painted landscape scene in
landscape orientation 16:9, painterly digital illustration,
warm sunset-into-dusk atmospheric lighting, painted dark
pine forest horizon receding into warm misty haze with
distant pine silhouettes at mid-height, large painted moon
rising in the upper right corner with warm amber glow,
warm orange-to-deep-purple sky gradient from horizon to
top, scattered painted stars becoming visible in the upper
sky, two distant rolling hill silhouettes in deep purple-
grey at the horizon line, painted dark forest ground
texture with moss and fallen pine needles in the lower
40% of the image ready for procedural path and obstacles
to render on top, warm fire ember particles drifting
through the sky and mid-ground, subtle atmospheric haze,
rich saturated palette of deep red and warm orange and
gold accents against dark green-brown forest, painterly
brush strokes, cinematic cinematic atmospheric lighting,
highly detailed, no humans, no animals, no text, no
foreground trees that would compete with procedural tree
sprites
--ar 16:9 --stylize 750 --v 6
```

### 62a integration

`client-host-escape/render2d.js`:
- Preload `/assets/gameplay-escape-scene.png` via SpriteLoader
  at render init.
- Add `drawPaintedScene(ctx)` as first render layer (before
  `drawSky`). Cover-fit the image to canvas width/height.
- `drawSky` keeps its biome-colored gradient but reduces alpha
  to ~0.4 so the biome tint overlays the painted scene without
  replacing it.
- `drawStars` / `drawMoon` (code-drawn) gated off when
  painted scene loaded (painted moon + stars already there).

---

## 62b — Gameplay race scene

**Use**: behind race gameplay (track scrolls vertically,
cars race).

**Path**: `/assets/gameplay-race-scene.png`

**Composition**:
- Painted grandstands on left and right edges with painted
  spectator silhouettes (tiny dots of heads, no faces) and
  tiered wooden benches, gold-trim signage above.
- Painted distant mountain / tree line at the top above the
  grandstands.
- Sky with warm daylight gradient, painted clouds.
- Ground (lower 60%) is painted asphalt track with darker
  tone; procedural track stripe animates on top.
- Warm checkered-flag bunting painted across the very top.

### 62b prompt

```
Hearthstone card-art style painted race-circuit scene in
landscape orientation 16:9, painterly digital illustration,
warm daylight racing atmosphere, painted grandstands on
both left and right edges receding in slight perspective
with painted tiny silhouetted audience figures (no faces,
just head shapes), tiered wooden benches under gold-trim
signage with checkered flag bunting across the top of the
grandstands, painted distant tree line and rolling hills
behind the grandstands, warm clear daylight sky with a few
painted white clouds, painted asphalt race track surface
in the lower 60% of the image with darker tone ready for
procedural track stripe and car sprites to render on top,
scattered warm track-dust motes drifting, rich palette of
warm gold and cream and deep red grandstand accents against
warm blue sky, painterly brush strokes, highly detailed, no
cars, no foreground figures, no text
--ar 16:9 --stylize 750 --v 6
```

---

## 62c — Gameplay hill scene

**Use**: behind hill gameplay (players battle around a
mountain peak, king-of-the-hill).

**Path**: `/assets/gameplay-hill-scene.png`

**Composition**:
- Painted distant mountain range receding into warm dusk
  haze.
- Dramatic painted warm golden-hour sky with gold streaks
  and painted clouds.
- Painted distant castle tower or beacon silhouette on a
  far peak (royal-red banner motif continues from hill
  lobby).
- Ground zone (lower 50%) is painted rocky plateau with
  moss, where procedural hill mound + sprites render.
- Scattered painted ember + dust particles.

### 62c prompt

```
Hearthstone card-art style painted mountain-peak battlefield
in landscape orientation 16:9, painterly digital
illustration, dramatic warm golden-hour dusk atmosphere,
painted distant mountain range receding into warm purple-
orange haze, painted painted golden-hour sky with long
gold streaks through warm-orange clouds and a painted sun
low on the horizon right, painted distant castle tower
silhouette on a far peak with a tiny royal-red pennant
banner flying from it, painted rocky cut-stone plateau
with green moss and scattered boulders in the lower 50%
of the image ready for procedural hill mound and gameplay
sprites to render on top, warm dust and ember particles
drifting, rich palette of deep red and gold and warm
brown with dusk-purple atmosphere, painterly brush strokes,
cinematic royal atmosphere, highly detailed, no humans,
no foreground figures, no text
--ar 16:9 --stylize 750 --v 6
```

---

## 62d — Gameplay meteor scene

**Use**: behind meteor gameplay (players dodge meteors on
a platform).

**Path**: `/assets/gameplay-meteor-scene.png`

**Composition**:
- Deep cosmic purple-red night sky covering upper 60%, with
  painted constellations + stars + a couple distant meteor
  streaks arcing through.
- Large painted moon or planet in the upper distance.
- Distant painted city / village silhouette on the horizon
  with warm amber window lights (contrast against the cold
  sky).
- Ground zone (lower 40%) is painted scorched rocky platform
  with ember cracks in the stone.
- Cool blue-white ember particles mixed with warm-orange
  ember fragments drifting.

### 62d prompt

```
Hearthstone card-art style painted cosmic meteor battlefield
in landscape orientation 16:9, painterly digital
illustration, dramatic cosmic night sky atmosphere, deep
purple-red night sky in the upper 60% with painted
constellations and scattered stars and two or three painted
meteor streaks with gold trails arcing across the sky, a
large painted moon or alien planet in the upper distant
right with cool blue-white glow, painted distant low city
or village silhouette on the horizon with tiny warm amber
window lights contrasting the cold sky, painted scorched
rocky platform with deep ember cracks and glowing orange
veins in the lower 40% of the image ready for procedural
gameplay sprites to render on top, cool blue-white ember
particles mixed with warm-orange fire embers drifting
through the scene, rich palette of deep purple-red and gold
and cool white accents, painterly brush strokes, dramatic
cinematic cosmic lighting, highly detailed, no humans, no
foreground figures, no text
--ar 16:9 --stylize 750 --v 6
```

---

## Delivery format

- PNG 1376×768 native sRGB 8-bit.
- WebP via `cwebp -q 82`. PNG ≤ 6 MB, WebP ≤ 400 KB.
- Filenames per spec above.

---

## Integration phasing

- **Phase 62a** — escape scene landed + render2d.js picks it up
  as first canvas layer, biome tint reduced to overlay.
- **Phase 62b** — race scene landed + render.
- **Phase 62c** — hill scene landed + render.
- **Phase 62d** — meteor scene landed + render.
- **Phase 62e** — DESIGN.md realization + close.

Each sub-phase independent — user generates in any order, I
integrate as they land.

## Risks

- **Painted ground content vs procedural sprites** — if the
  painted ground has foreground objects (rocks, debris)
  they'll clash with moving sprites. Prompt discipline: paint
  only cover-level texture in the lower 40-50%, no foreground
  objects that would sit in gameplay-action space.
- **Performance** — adding a full-viewport PNG render per
  frame at 60fps — benchmark on low-end Android. If the
  `drawImage` cost is high, consider rendering to an
  offscreen canvas once at load and using that as the tile
  source.
- **Biome variation in escape** — one painted scene for all 4
  biomes may look wrong in snow biome (warm palette vs white
  snow). Mitigation: painted scene stays the "dusk forest"
  register; biome tint overlay handles snow via
  additive-white wash on top. Re-eval after landing.

## Open questions

- Should `prefers-reduced-motion` disable the painted scene
  (heavy asset on low-bandwidth / reduced-motion users)?
  Recommendation: no — painted scene is static, not motion.
  Respect `prefers-reduced-data` instead if the media query
  applies to asset loading decisions.

## Phase handoff

After Phase 62 the visual register is continuous across EVERY
surface, including the gameplay canvas itself. Remaining
speculative work (Phase 63+): painted character sprite pass
(replace pixel cars / procedural figures with painted sprites
— significant commission), audio register pass, micro-
interaction passes on gameplay sprites (pennants, particles).
