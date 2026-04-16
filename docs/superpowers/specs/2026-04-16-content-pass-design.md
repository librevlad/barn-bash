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

### Shared constants

- **Format:** PNG, alpha channel, 512×512 square master.
- **Aesthetic:** 1930s American carnival, painterly cartoon, soft
  brushwork, warm golden-hour lighting.
- **Palette anchors:** carnival wood browns (`#3d2817`, `#5a3a20`),
  golds (`#f4c542`, `#ffdd6b`), deep reds (`#6b1818`, `#a72d2a`),
  creams (`#f5ead4`). Animal natural fur colors present but
  temperature-graded warm.
- **Composition:** head and shoulders portrait, centered, facing
  three-quarters forward (slight turn, not flat frontal), **looking
  into camera** (friendly eye contact). No hands below chest.
- **Costume:** each animal wears one small carnival accent — e.g.
  red ringmaster bowtie, gold button, tiny striped collar, tiny
  carnival vest. Accents are subtle, not costume-y; animal is still
  the subject.
- **Silhouette:** readable at 48px. Strong head shape, distinct ears,
  distinct face markings. Avoid intricate patterns that mud at small
  sizes.
- **Background:** transparent. No scene, no backdrop, no frame.
- **No:** text, watermarks, borders, cropping artifacts, multiple
  subjects, human hands, weapons, gore, modern clothing or
  accessories outside the 1930s carnival frame.

### Prompt template

Hand this to the image-generation LLM verbatim for each animal,
filling `{ANIMAL}`, `{TRAIT}`, `{ACCENT}`:

```
A 1930s American carnival-style painterly cartoon portrait of
{ANIMAL}, a {TRAIT} character. Wearing {ACCENT}. Head and shoulders,
facing three-quarters forward, friendly direct eye contact, soft
warm brushwork, golden-hour carnival lighting. Palette: warm
carnival browns, gold, deep red, cream — temperature-graded warm.
Readable strong silhouette at small sizes. Transparent background.
Square composition 512x512. No text, no borders, no watermarks,
no hands, no props beyond the listed accent.
```

### Per-animal parameters

| ID | ANIMAL | TRAIT | ACCENT |
|----|--------|-------|--------|
| cat | a house cat (orange tabby, bright green eyes) | agile | a tiny red carnival ringmaster bowtie with gold knot |
| frog | a green tree frog | bouncy | a gold coin pendant on a red ribbon |
| wolf | a grey timber wolf | powerful | a red carnival vest with gold trim |
| bear | a brown bear | tank | a small red-and-gold striped collar |
| bunny | a white-and-tan rabbit | speedy | a tiny gold carnival medallion on the chest |
| pig | a pink pig | endurance | a red bowler hat tilted slightly |
| chicken | a hen with red comb | chaotic | a gold-rim carnival jester collar with small bells |
| raccoon | a raccoon with classic mask markings | trickster | a tiny gold top hat tipped rakishly |

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
