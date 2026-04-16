# Content Pass — Design Spec (Phase 5)

**Date:** 2026-04-16
**Project:** Frantics — party game
**Phase:** 5 of ?, reinstated after Phase 4 closure
**Scope:** custom PNG avatars for the 8-animal roster (selection grid,
player pills, waiting-for-host cards) plus narrator portrait and any
per-game art demand the roster surfaces. **NOT** 3D GLB model
extension, and NOT the in-game procedural blob renderer —
`CharDraw.blob` in `client-shared/characters.js` already draws per-
character features live and stays as the game-world face.

## Problem

The 8-animal roster is the product's **identity layer**. Every
onboarding flow resolves to "I am the cat / frog / wolf / …" and the
host lobby surfaces that identity in top-right player pills. Today the
roster is Unicode emoji (`🐱🐸🐺🐻🐰🐷🐔🦝`):

- **Visual inconsistency:** Windows renders flat, iOS renders glossy-
  skeuomorphic, Android rounded, emoji fonts across browsers differ.
  A party at a venue with mixed devices sees eight different cats.
- **Aesthetic mismatch:** the rest of the product is painterly carnival
  cartoon (`/assets/bg.png`, `/assets/ticket-*.png`, `/assets/btn-*.png`).
  Emoji are a modern pictographic grammar that reads as "default
  clipart" next to that commissioned work.
- **Phase 4 explicitly deferred this** — its spec lists "Replacing
  animal emoji with custom SVG" as a non-goal "belongs in a future
  content phase." This is that phase.

## Success criteria

- **8 animal avatars** shipped as transparent-bg PNGs in `/assets/`:
  one cohesive family, same style, same lighting, same pose discipline,
  scalable 24px → 256px without mud or jaggies.
- **Zero emoji** in the controller onboarding selection grid, host
  player pills, quick-confirm cards, and waiting screens. Emoji
  fallback only as last-ditch unicode in case of asset load failure.
- **1 narrator portrait** — optional stretch, surfaces in the narrator
  overlay as a Game-Master face next to the quip.
- **Style consistency** verified by laying all 8 avatars side-by-side
  and checking nothing looks like a different artist.

## Non-goals (explicitly out of scope for Phase 5)

- 3D GLB model extension (bear / bunny / pig / chicken / raccoon).
  Existing GLBs (cat / fox / frog / wolf) stay; the new PNG avatars
  are 2D UI art only.
- Replacing `CharDraw.blob` procedural in-game renderer. The gameplay
  blob is its own aesthetic and matches the cartoon game world.
- Per-game environmental art (biome trees, track objects, meteor
  debris, hill crown). Existing sprites work; art demand here is
  follow-up Phase 5b if the roster effort proves the pipeline.
- Font / icon / logo illustration. Alfa Slab wordmark and the SVG
  icon sprite are already done in Phase 4.

## Style guide (single source of truth)

The target style is **the existing `assets/bg.png`** — the "Barnyard
Bedlam" lobby scene that already contains six of our eight animals
(fox, pig, chicken, bunny, bear, cat or raccoon). Every avatar must
read as "drawn by the same hand" when laid next to that scene.

### Visual grammar (derived from bg.png)

- **Medium-thickness dark ink outlines** — not thin vector, not thick
  comic; a confident digital-illustrator line that holds together
  at small sizes.
- **Soft digital-watercolor / gouache fills** — flat-ish color areas
  with subtle gradient shading and gentle texture, not fully flat
  vector and not photorealistic.
- **Bright daylight palette** — outdoor-lit, saturated but not neon:
  sky blues, leaf greens, warm oranges, cream whites, carnival reds.
  Temperature is **neutral to cool-warm mix**, NOT vintage warm-only.
- **Rounded friendly anthropomorphic proportions** — slightly chibi
  head-to-body, **large expressive eyes** with white highlights, warm
  soft smile. Animals read humanlike but retain obvious species
  anatomy (ears, snouts, tails, markings).
- **Kind personality** — friendly, approachable, mildly cartoonish,
  reads as a children's-storybook character.

### Shared constants

- **Format:** PNG, alpha channel, 512×512 square master.
- **Composition:** head and shoulders (or head-plus-torso if the
  accent lives on the chest), centered, facing three-quarters forward,
  **looking into camera**. Avatar must sit comfortably inside a
  circular crop at 128px.
- **Accent:** one small carnival-fair accessory per animal — vest,
  cap, scarf, collar, bandana — extending bg.png's vocabulary (fox
  newsboy cap + scarf, pig blue overalls, bear brown vest, raccoon
  railway conductor outfit).
- **Silhouette:** readable at 48px. Strong distinctive head shape,
  species-diagnostic ears/snout/markings, no intricate patterns
  that mud at small sizes.
- **Background:** transparent. No scene, no backdrop, no frame.
- **No:** text, watermarks, borders, crop marks, multiple subjects,
  human hands, weapons, modern clothing, vintage sepia cast.

### Prompt template

Hand this to the image-generation LLM verbatim for each animal,
filling `{ANIMAL}`, `{TRAIT}`, `{ACCENT}`:

```
A bright daylight children's storybook cartoon portrait of
{ANIMAL}, a {TRAIT} character. Wearing {ACCENT}. Drawn in digital
watercolor with medium-thickness dark ink outlines, soft washy
color fills and gentle shading. Rounded friendly anthropomorphic
proportions, large expressive eyes with white highlights, warm
kind smile. Head and shoulders, facing three-quarters forward,
looking directly at the viewer. Vibrant saturated outdoor-daylight
palette: sky-blues and leaf-greens, warm orange and carnival red
accents, cream highlights. Clear readable silhouette at small
sizes. Transparent background, no scene, no backdrop. Square
composition 512x512. No text, no borders, no watermarks, no human
hands, no additional props beyond the listed accent. Style: the
same "Barnyard Bedlam" painterly children's-storybook feel — not
vintage sepia, not flat vector, not photorealistic.
```

### Per-animal parameters

Accents extend the vocabulary already present in bg.png.

| ID | ANIMAL | TRAIT | ACCENT |
|----|--------|-------|--------|
| cat | an orange tabby cat with bright green eyes | agile | a red neckerchief tied loosely |
| frog | a bright green tree frog | bouncy | a small red-and-yellow jester collar |
| wolf | a grey timber wolf with lighter muzzle | powerful | a dark-blue rolled-sleeve shirt with red suspenders |
| bear | a friendly brown bear | tank | a brown-and-red carnival vest over a cream shirt |
| bunny | a white-and-tan rabbit | speedy | a blue-striped racing jersey |
| pig | a rosy pink pig | endurance | blue denim farmer overalls matching bg.png |
| chicken | a white hen with red comb and wattle | chaotic | a tiny red apron with a gold button |
| raccoon | a classic-mask raccoon | trickster | a grey-blue railway conductor's cap |

## Pipeline

### 1. Generate

User writes prompt to their image-generation LLM, copies the generated
PNG. Filename convention: `animal-<id>.png` (e.g. `animal-cat.png`).

### 2. Drop in `/assets/`

Each PNG lands at `/assets/animal-<id>.png`. The existing `/assets/`
directory is already served by `server/index.js:62-68` with `image/png`
MIME. No server change needed.

### 3. Integrate

Update `client-controller/onboarding.js` ANIMALS array to add an
`avatar` field:

```js
{ id: 'cat', name: 'Cat', trait: 'Agile', emoji: '\u{1F431}',
  avatar: '/assets/animal-cat.png' },
```

The consumer sites that render an avatar (selection grid at line 327,
quick-confirm card, waiting-screen contestant list) switch from
`a.emoji` text to `<img src="${a.avatar}" ...>` with the emoji kept
as the `alt` attribute for accessibility and as a last-ditch fallback.

Host-side player pills in `client-host/main.js` render via shared
helper — same avatar field added to shared character mapping.

### 4. Capture

Screenshot the onboarding selection grid at 390×844 (iPhone 14),
check all 8 avatars render cleanly, style consistency holds. Drop
into `screenshots-review/phase5a-animal-roster.png`.

### 5. Iterate

If any avatar feels off (too cartoonish / too realistic / wrong
palette / silhouette fails at 24px / costume clashes), regenerate
with adjusted prompt. Prefer one-word prompt tweaks over rewrites.

## Deliverables

### Phase 5a — animal roster (8 PNGs)

One avatar at a time, in priority order (most recognizable silhouettes
first, so style calibrates on easy subjects before the tricky ones):

1. `animal-cat.png` — calibration piece; set the look.
2. `animal-wolf.png` — stark silhouette, tests dark-fur palette.
3. `animal-chicken.png` — tests red-comb accent + palette stretch.
4. `animal-frog.png` — green palette, tests non-warm temperature.
5. `animal-bear.png` — tests "tank" scale and round silhouette.
6. `animal-raccoon.png` — tests mask-marking readability at small size.
7. `animal-pig.png` — pastel palette tests.
8. `animal-bunny.png` — pale fur; hardest on transparent bg.

After each drop, integrate + screenshot before moving to the next.
If style drifts on any, regenerate with tighter prompt before
advancing.

### Phase 5b — narrator portrait (1 PNG, optional)

Same style guide, but full-torso Game-Master figure (top hat,
handlebar moustache, red tailcoat, gold buttons). Goes into
`/assets/narrator.png`. Consumer: `client-shared/narrator.js`
overlay as a floating portrait next to the quip.

### Phase 5c — DESIGN.md realization

After 5a + 5b land:

- Add a sixth-realization block covering the content pipeline.
- Mark Phase 5 shipped on the roadmap with date.
- Decisions-log rows for: one-at-a-time generation cadence, style
  guide as prompt template, 512×512 master / responsive downscale.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Image-gen LLM style drifts between prompts | Calibration on `animal-cat.png` first; only advance when that piece is accepted. Prompt template is the source of truth; don't customize beyond the three variable slots |
| Transparent-bg output comes with a white/grey halo | Call out "transparent background" AND "no border, no matte"; post-process with alpha cleanup only if the LLM consistently fails |
| Costume detail crowds the silhouette at 24px | Accent list is intentionally single-piece. If a render adds more, regenerate |
| Palette temperature drifts cool | The prompt anchors on "warm temperature-graded". Regenerate if cool cast appears |
| User's image LLM capacity limits number of iterations | The cadence is one-at-a-time and we accept the output on first good attempt; don't chase pixel-perfect |
| Avatars make emoji fallback stale | Keep emoji in ANIMALS array as `alt` and fallback; code never assumes avatar is mandatory |

## Open questions (for implementer)

1. Do we ship the narrator portrait (5b) before or after 5a closes?
   Lean **after** — the roster is the hot path; narrator is stretch.
2. Does host-side ALREADY have a shared characters mapping, or is
   each host entry (race / escape / hill / meteor) reading the
   ANIMALS list directly? Check before integrating to avoid duplicate
   edits.
3. PNG size budget — 8 × ~80 KB = ~640 KB of avatar assets. Still
   tolerable on USB-stick offline target. No need to compress past
   "reasonable default" output quality.

## Phase handoff

After 5a + 5b land, DESIGN.md gains the sixth realization and roadmap
item 6 is marked shipped. No Phase 6 currently scheduled; the next
content push (per-game environmental art, GLB extension, new games)
opens its own spec when art demand accumulates again.
