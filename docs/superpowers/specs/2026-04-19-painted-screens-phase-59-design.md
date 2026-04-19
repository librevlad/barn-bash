# Phase 59 — Painted screens upgrade (tournament overlays + post-game halls)

## Why

Phase 58 raised the per-game lobby to Hearthstone-tier painted
illustration. Now the tournament overlays (`tournament-round-
intro.png`, `standings-scroll.png`) and the non-race post-game
hall (`gameover-hall.png`) read as lower-register art against
the new hero lobbies, breaking the visual continuity inside a
single session.

This spec extends the Phase 58 painted-hero pattern to:

- **59a** — tournament round intro poster (4 per-game variants,
  shown before each round of a tournament)
- **59b** — tournament between-round standings backdrop (one
  shared painted scroll-stage)
- **59c** — post-game hall per-game (4 variants: escape, race,
  hill, meteor — replacing the single shared `gameover-hall`)

## Success

- All screens inside a tournament session read as one painted
  Hearthstone-tier series. No visual quality drops between
  lobby → round intro → gameplay → standings → post-game →
  next round.
- Every asset respects a UI safe-zone map so HTML overlays
  (titles, scores, narrator quips, countdown timer) land on
  painted-empty regions.
- All new assets share Phase 58's frame + palette vocabulary:
  baroque gold filigree perimeter frame, golden bunting at
  top, red velvet curtains (muted on interior scenes),
  carnival-hall dark backdrop, warm fire embers, cream canvas
  elements for text-bearing areas.

## Non-goals

- Controller mobile screens (gameover, elim, spectate) —
  Phase 60 candidate.
- Main-lobby bg.png upgrade — works with current quality,
  low priority.
- Narrator overlay chrome, hintbar-stage PNG refresh,
  ornamental corner filigree refresh — Phase 61+.

---

## Common anchor across Phase 59

All Phase 59 assets render at **1376×768 native PNG** +
WebP (matches Phase 58 pipeline and per-host CSS cover-fit).
Gold filigree frame + golden bunting are shared across all
new assets; interior content varies per screen.

### Safe-zone reference at 1280×720 viewport (cover-fit scale 0.9375)

Same as Phase 58 per-game-lobby spec (`2026-04-19-lobby-hero-
art-design.md`) with two additional rectangles for overlay
screens:

| Zone | Rect in image (px @ 1376×768) | Use |
|---|---|---|
| Frame (all edges) | 0-180 inset on each edge | Painted gold filigree (constant) |
| Bunting | 0-110 top band | Painted bunting (constant) |
| Title text zone | 300-430 y center 365 | HTML h1/h2 |
| Canvas banner | 500-640 y center 570 | HTML secondary text / round label |
| Primary stage zone | 650-1100 x, 250-600 y | Stage with painted featured content (scoreboard scroll, countdown, podium etc.) |
| Hint / apron | y 900+ | HTML tertiary text |

---

## 59a — Tournament round intro poster

**Use**: 4 per-game variants, shown for ~3 s before each
tournament round starts. Reuses the Phase 58 lobby hero
backbone but swaps the orb-row placeholder zone for a
centered painted **ROUND N** poster.

**Path**: `/assets/tournament-round-intro-<game>-hero.png`
(per-game) + matching `.webp`. Keep existing
`/assets/tournament-round-intro.png` as fallback until all
4 generated, then deprecate.

**Composition** (all 4):
- Phase 58 Frame + bunting + curtains (flavor-per-game exactly
  matches the matching lobby hero)
- Central painted parchment/poster element with empty "ROUND N"
  text zone (HTML overlay writes "ROUND 2 of 5")
- Below the poster: painted "UP NEXT:" marquee label with the
  game title carved (identical to the lobby hero signboard)
- Stage floor matches per-game lobby hero (stone + moss for
  escape, wood plank + yellow track for race, cut-stone +
  hill mound for hill, scorched crater stone for meteor)
- Fire embers / stars / track dust particles per game (same
  as matching lobby)

### 59a prompts

#### escape round-intro
```
[PHASE 58 STYLE ANCHOR, see 2026-04-19-lobby-hero-art-design.md]
+ tournament round intro specific: the entire center of the
image is a large painted parchment scroll pinned to the arch
by gold studs with a blank cream interior (ready for a "ROUND
N of N" HTML text overlay, the scroll itself is empty), below
the scroll hangs a smaller gold-leafed marquee sign reading
"UP NEXT: ESCAPE THE FOX" carved into wood with a stylized
fox-head silhouette next to the text, NO orb placeholders
this time (scroll replaces the player slot row), velvet
curtains crimson with gold tassels, stage floor painted stone
with green moss, fire ember particles, warm firelit
atmosphere, dark carnival-hall background, rich palette of
deep red + gold + warm brown, painterly Hearthstone card-art,
highly detailed
--ar 16:9 --stylize 750 --v 6
```

#### race round-intro
Same template, subs per Phase 58 race flavor:
```
[STYLE ANCHOR] + tournament round intro specific: large painted
parchment scroll pinned to the arch with gold studs, blank
cream interior (for "ROUND N of N" HTML overlay), below the
scroll a gold-leafed marquee reading "UP NEXT: GRAND PRIX"
with two crossed checkered flags carved next to the text, NO
orb placeholders, curtains deep maroon red with gold tassels,
gold laurel wreaths climbing the posts, wooden plank stage
with yellow track-line painted across, light track-dust
particles and light motes, painterly, highly detailed
--ar 16:9 --stylize 750 --v 6
```

#### hill round-intro
```
[STYLE ANCHOR] + tournament round intro specific: large painted
parchment scroll pinned to the arch with gold studs, blank
cream interior (for "ROUND N of N" HTML overlay), below the
scroll a gold-leafed marquee reading "UP NEXT: KING OF THE
HILL" with a small painted gold crown above the text flanked
by royal banners, NO orb placeholders, curtains deep royal
red with gold braided trim, laurel vines with gold highlights
climbing posts, small cut-stone moss hill mound visible
behind the scroll at stage center, falling gold sparkles and
dust motes, painterly, highly detailed
--ar 16:9 --stylize 750 --v 6
```

#### meteor round-intro
```
[STYLE ANCHOR] + tournament round intro specific: large painted
parchment scroll pinned to the arch with gold studs, blank
cream interior (for "ROUND N of N" HTML overlay), below the
scroll a gold-leafed marquee reading "UP NEXT: METEOR SHOWER"
with a streaking comet with gold tail carved next to the text
and a scatter of constellation stars, NO orb placeholders,
curtains deep cosmic purple-red with gold tassels, dark vines
with starlight highlights on the posts, two hanging brass
lanterns with cool blue-white flame, scorched stone stage with
impact crater marks, cool-white and warm-orange mixed ember
particles, painterly, highly detailed
--ar 16:9 --stylize 750 --v 6
```

### 59a integration

After assets land:

- Each `.t-round-intro-backdrop` element in
  `client-shared/tournament.js` gains a per-game src based on
  `data.gameId` (the message includes `gameId` already — see
  `handleMessage` → `renderRoundIntro`).
- CSS adds per-game classes `.t-round-intro.game-escape`
  etc. that swap the backdrop image.
- HTML title overlay positions at banner y≈32%, "ROUND N of N"
  at scroll center y≈50%.

---

## 59b — Tournament between-round standings

**Use**: shown between rounds, displays running scores,
positional deltas, round-winner delta chips (Phase 53).
~8 s per intermission.

**Path**: `/assets/tournament-standings-hero.png` (single
shared asset; standings are game-agnostic).

**Composition**:
- Phase 58 Frame + bunting + curtains (generic
  tournament-purple — deep royal red)
- Central painted SCOREBOARD: a carved wooden frame holds an
  empty parchment scroll (blank interior, HTML writes the
  player rows). Frame carved with gold-leafed "STANDINGS"
  header centered at top, maybe laurel sprigs flanking.
- Stage floor painted stone
- Muted ember particles (standings is a calmer beat than
  round-intro)
- Small painted tournament-trophy silhouette in a corner as
  atmosphere (not blocking HTML overlay)

### 59b prompt

```
[PHASE 58 STYLE ANCHOR] + tournament standings specific:
the center of the image is a large ornate wooden scoreboard
frame carved with baroque gold filigree, containing a blank
cream parchment interior (ready for HTML-rendered player rows
overlay — 2-8 rows with colored dots + names + points each;
the parchment itself is blank), a gold-leafed carved "STANDINGS"
header at the top of the frame flanked by painted laurel
sprigs, a small carved gold tournament trophy silhouette in
the upper left of the scoreboard frame as decoration, deep
royal red velvet curtains with gold tassels on both sides,
painted stone stage floor below the scoreboard, subtle warm
ember particles in the background, dark carnival-hall backdrop,
rich palette of royal red + deep gold + warm brown, painterly
Hearthstone card-art quality, no text inside the parchment,
highly detailed
--ar 16:9 --stylize 750 --v 6
```

### 59b integration

- `renderStandings()` in `tournament.js` swaps
  `#t-content .t-scroll-backdrop` image src to
  `/assets/tournament-standings-hero.png`.
- Current `standings-scroll.png` stays as CSS fallback.
- HTML player-row list positions inside the painted parchment
  scroll area (y≈30-75%, x-centered, max-width 480).
- "STANDINGS" title hidden in HTML (painted in the hero header).

---

## 59c — Post-game hall per-game variants

**Use**: non-race post-game screens (escape, hill, meteor) —
shown ~15 s after each round with winner portrait + stats +
leaderboard + narrator quip. Race has its own `race-podium`.
Currently all three non-race games share `gameover-hall.png`
which is generic.

**Path**: `/assets/gameover-hall-<game>-hero.png` + `.webp`.
(Match pattern: `gameover-hall-escape-hero.png`,
`gameover-hall-hill-hero.png`, `gameover-hall-meteor-hero.png`.)

**Composition**:
- Phase 58 Frame + bunting + curtains (flavor per-game)
- Raised painted STAGE/PLATFORM where the winner stands —
  painted empty spotlight pool at center-stage (HTML
  overlay writes `#postgame-overlay .pg-winner-portrait`
  on top)
- Per-game atmospheric backdrop specific to the winning
  moment:
  - **escape**: fox silhouette retreating into painted woods
    in the background, warm sunset lighting, distant forest
    still ember-glowing
  - **hill**: painted cut-stone throne on the hill crest with
    a carved crown above, painted moss + cracked boulders,
    warm dusk
  - **meteor**: painted safe zone platform on scorched ground,
    painted meteor fragments still glowing nearby, cosmic
    starfield behind, cool-cold atmosphere
- Stage apron at the bottom for leaderboard + hint text
  overlay

### 59c prompts

#### escape post-game
```
[PHASE 58 STYLE ANCHOR] + post-game escape hall specific: painted
raised wooden platform at stage center with a warm spotlight
pool (empty, ready for winner-avatar HTML overlay), painted
fox silhouette retreating into distant dark painted pine
woods in the background with warm sunset/dusk light breaking
through, distant faint forest-fire ember glow on the horizon,
velvet curtains crimson with gold tassels, warm fire ember
particles floating, stone stage apron below, no humans, no
text, painterly Hearthstone card-art, highly detailed,
--ar 16:9 --stylize 750 --v 6
```

#### hill post-game
```
[PHASE 58 STYLE ANCHOR] + post-game hill hall specific: painted
cut-stone throne platform at stage center on a cracked
boulder plateau with green moss, empty warm spotlight on
the throne (ready for winner-avatar HTML overlay), a large
gold crown floating above the throne carved and painted, two
painted royal banners flanking, deep royal red velvet curtains
with gold braids on both sides, warm dusk lighting, falling
gold sparkles + dust motes, stone stage apron below, no humans,
no text, painterly Hearthstone card-art, highly detailed
--ar 16:9 --stylize 750 --v 6
```

#### meteor post-game
```
[PHASE 58 STYLE ANCHOR] + post-game meteor hall specific: painted
safe-zone platform at stage center made of fused scorched
stone, painted meteor fragments still glowing around the
platform base (warm-orange ember cracks), cosmic starfield
and faint meteor streaks in the dark purple-red sky
background, deep purple-red velvet curtains with gold tassels,
cool-cold palette mixed with warm ember accents, brass lanterns
with cool blue-white flame flanking, empty warm spotlight pool
on the platform ready for winner-avatar HTML overlay, no humans,
no text, painterly Hearthstone card-art, highly detailed
--ar 16:9 --stylize 750 --v 6
```

### 59c integration

- `PostGame.show({ backdrop: '/assets/gameover-hall-escape-hero.png', backdropMode: 'hall' })` per-game wiring in each of the 4 per-host `main.js` (race already uses `race-podium.png` via `backdropMode: 'podium'`).
- Existing `.pg-backdrop-hall` CSS class works cover-fit; no
  CSS changes needed beyond swapping the src.
- Optional: deprecate the generic `gameover-hall.png` after all
  3 new heros land.

---

## Delivery format (shared)

- PNG 1376×768 native sRGB 8-bit.
- WebP production via `cwebp -q 82 src.png -o out.webp`.
- Size budget: PNG ≤ 6 MB, WebP ≤ 400 KB.
- Filenames match paths in this spec.

---

## Integration phasing

- **Phase 59a** — 4 × tournament-round-intro-<game>-hero
  generated, backdrop swap per `data.gameId` in
  `tournament.js:renderRoundIntro`, HTML overlay anchors.
- **Phase 59b** — single tournament-standings-hero,
  `renderStandings` swap, HTML row positioning.
- **Phase 59c** — 3 × gameover-hall-<game>-hero,
  `buildPostGameOpts` in per-host main.js writes new backdrop
  path.
- **Phase 59d** — DESIGN.md realization block + close-out.

Each sub-phase is independent; user can generate + ship assets
in any order. CSS changes stay minimal (src swaps + optional
per-game overrides where HTML anchors drift).

---

## Deliverables

- 4 × round-intro heros (per game)
- 1 × standings hero
- 3 × post-game hall heros (per non-race game)
- Total: 8 new painted assets (1376×768)

## Risks

- **Round-intro scroll text overlay alignment** — painted
  scroll center may drift between per-game variants similar
  to Phase 58d slot-row tuning. Budget a 58d-style anchor
  pass.
- **Standings row count varies** — tournament supports 2-8
  players, HTML player-row list height varies. Painted
  scoreboard frame must be tall enough for max 8 rows
  without HTML overflowing painted region.
- **Post-game stage spotlight size** — painted spotlight pool
  should match the existing 132 px winner-portrait disc
  (Phase 54). If painted pool is too small or too big, HTML
  disc reads as floating over or eating into the painted.

## Open questions

- Should the tournament round-intro "ROUND N of N" text be
  painted on the scroll or stay HTML overlay? Painted is
  prettier but locks the asset to a specific round count.
  HTML overlay is flexible but reads less "painted". **Recommendation**: HTML overlay, painted scroll stays generic.
- Post-game hall is shown for EVERY round, not just final.
  Per-game variants are per-GAME not per-TOURNAMENT-STATE.
  "You won round 2 of escape" uses escape-hall, not a
  tournament-finals art. OK for this phase.

## Phase handoff

Phase 59 lands → continuity restored across the full
tournament session (lobby → round-intro → gameplay →
standings → post-game → next round). Next candidates:
Phase 60 controller mobile screens (gameover, elim,
spectate on phone); Phase 61 narrator overlay + hintbar +
corner ornaments refresh if they still read as lower
register.
