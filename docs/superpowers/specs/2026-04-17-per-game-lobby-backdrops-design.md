# Per-Game Lobby Backdrops — Design Spec (Phase 10)

**Date:** 2026-04-17
**Project:** Frantics — party game
**Phase:** 10 of ?, first AAA-polish pass after the audit raised the bar
from "cohesive token-based UI" to "Hearthstone pixel-for-pixel."
**Scope:** four painterly PNG lobby backdrops — one per per-game host —
that replace the current flat wood-plank gradient behind the game-title
stack (`GRAND PRIX`, `ESCAPE THE FOX`, `KING OF THE HILL`, `METEOR
SHOWER`) with a commissioned carnival stage composition. **NOT** a
rewrite of the lobby layout code; **NOT** selection-grid frames, not
tournament scoreboard art, not controller gameplay orb — those are
Phase 11+ if demand continues.

## Problem

The audit (2026-04-17) surfaced that per-game lobby screens are the
LARGEST single AAA gap between Frantics and the benchmark
(Hearthstone). Every per-game lobby currently looks like this:

- Full-screen `var(--bg-wood-deep)` background with
  `var(--bg-wood-plank)` vertical-stripe texture.
- Centered stack: small "FRANTICS" eyebrow, large Alfa Slab game
  title (e.g. "GRAND PRIX") with red letterpress + gold glow,
  italic "Waiting for players..." caption.

No painterly frame. No carnival ornament. No banner, arch, drapery,
or spotlight. The game title floats over empty gradient like a
placeholder. Players see this screen 1-3 times per session — it's
one of the most-viewed surfaces. Right now it reads as
"half-finished dev UI" next to the commissioned `bg.png` main
lobby.

Phase 10 commissions a painterly carnival stage composition per
game, renders it as a DOM backdrop behind the existing title stack.
The lobby screen becomes a framed theatrical reveal: "Tonight's
attraction: GRAND PRIX."

## Success criteria

- **4 painterly PNGs** under `/assets/` using the per-game-prefix
  convention: `lobby-race.png`, `lobby-escape.png`, `lobby-hill.png`,
  `lobby-meteor.png`. Each depicts an ornate carnival archway /
  banner / tent entrance with a cream-white center panel sized to
  host the existing Alfa Slab title overlay text.
- **Each per-game lobby** (`#lobby` element in the four host
  HTMLs) gets an `<img class="lobby-backdrop">` element as first
  child, positioned absolute centered behind the title stack.
- **Text stack stays readable**: FRANTICS eyebrow + game title +
  Waiting copy render ABOVE the backdrop's cream center panel;
  no text overlaps painted ornament.
- **Style consistency** verified by laying all 4 backdrops +
  `bg.png` + animal roster side-by-side — all read as the same
  commissioned hand.

## Non-goals (explicitly out of scope for Phase 10)

- Selection-grid cell frames (animal / color / game modal
  medallions getting painted ticket frames). Phase 11.
- Tournament standings painterly scoreboard (the between-round
  display still looks like flat cards). Phase 12.
- Controller gameplay avatar orb (still rendering raw emoji in
  the in-game HUD). Phase 12.
- Pixel-sprite cars getting painterly replacements. Phase 13 at
  earliest; deferred as large content undertaking.
- Motion polish (idle breathing, hover lift, selection pulse
  tightening). Phase 14.
- Background ornaments (garlands / bulb strings / stars around
  overlays). Phase 14.
- In-game HUD polish during gameplay (the running HUD composition
  is separate from the lobby frame).
- Lobby layout code rewrite. Add one `<img>` child per host; no
  changes to title / caption / countdown logic.

## Style guide

Inherits from Phase 5-9 style guide. Same "Barnyard Bedlam"
painterly carnival register, 1024×1024 master, digital watercolor,
medium dark ink outlines. Edge-seeded `SpriteLoader.loadPainterly`
strips baked backgrounds (bright checker, dark solid, or tinted
transitions).

### Composition rubric

Each lobby backdrop follows the same structural language so the
four read as a series:

1. **Symmetric archway / banner frame** — two ornate wooden posts
   or tent poles on each side, connected at top by a curved
   banner / drape / rope.
2. **Cream-white center panel** — the visible "banner interior"
   where the game title text will overlay. Cream with subtle
   wash, not pure white; reads as "blank canvas for the poster."
3. **Per-game silhouette ornaments** — small painted relief
   elements along the top edge or base that identify the game
   (race cars for GRAND PRIX, fox tails for ESCAPE, crowns for
   HILL, shooting stars for METEOR).
4. **Warm wooden base** — posts / poles in painterly weathered
   brown, gold-leaf trim at key junctions.
5. **Accent drape color** — per-game mood: deep ruby red (race,
   hill), forest green vine (escape), deep navy blue (meteor).

### Prompt template

```
A bright painterly children's storybook illustration of a single
{HERO_SUBJECT}. Drawn in digital watercolor with medium-thickness
dark ink outlines, soft washy color fills and gentle shading.
{CARNIVAL_DETAIL}. {PALETTE_MOOD}. Clean symmetric composition,
subject centered, no ground plane, no background scene. The
cream-white center panel must be unmarked — no text, no logo, no
drawn letters; it serves as a blank banner for overlay text.
Transparent background, no scene, no ground, no backdrop. Square
composition 1024x1024. No text anywhere in the image, no borders,
no watermarks, no human figures, no animals beyond the silhouette
ornaments described, no signs beyond what is described. Style:
the same "Barnyard Bedlam" painterly children's-storybook feel
as the animal roster and the biome trees — not vintage sepia,
not flat vector, not photorealistic.
```

### Per-piece parameters

| ID | HERO_SUBJECT | CARNIVAL_DETAIL | PALETTE_MOOD |
|----|--------------|-----------------|--------------|
| lobby-race | an ornate carnival race-starting arch: two carved wooden posts topped with gold finial bulbs, a deep-red velvet banner draped between them with a wide cream-white center panel, checker-flag bunting hanging along the base of the banner | painted toy race-car silhouette ornaments in relief on the wood posts, small gold-leaf ornaments at the post bases | warm brown wood, deep ruby red banner, gold accents, cream-white banner interior |
| lobby-escape | an ornate carnival forest gateway: two weathered wooden posts with small carved lanterns hanging on each side, a rope banner strung between them with a wide cream-white drape in the center, painted leafy vines curling up the posts | painted fox-tail silhouette ornaments along the top edge of the rope banner, small gold-lit lanterns glowing softly on the posts | weathered warm brown wood, forest-green vine accents, cream-white drape interior, soft gold lantern glow |
| lobby-hill | an ornate carnival king's-arena banner: two carved wooden posts with gold-gilded tops holding up a wide deep-red velvet banner with a cream-white center panel, carved wooden chess-king-piece ornaments standing at each post base | painted crown silhouette ornaments in relief along the top edge of the banner, gold-leaf trim running along the banner edges | warm wooden brown, deep ruby red banner, gold crown and gilding accents, cream-white banner interior |
| lobby-meteor | an ornate carnival cosmic tent entrance: two wooden tent posts topped with gold star-finials, a deep-navy-blue banner draped between with a wide cream-white center panel, subtle painted meteor trails tapering down the posts | painted shooting-star silhouette ornaments along the top edge, small ember-orange glint spots on the blue banner | warm wooden brown posts, deep navy-blue banner, gold star finials, cream-white banner interior, occasional ember-orange highlights |

## Pipeline

Same as Phase 5-9. User feeds the filled prompt to their image-gen
LLM, drops the PNG at `/assets/lobby-<game>.png`, I integrate,
screenshot the lobby, commit sub-phase, repeat for the next game.

## Deliverables

### Phase 10a — lobby-race (1 PNG)

1. `lobby-race.png` — carnival race arch.
2. `client-host-race/index.html` — prepend `<img
   class="lobby-backdrop" src="/assets/lobby-race.png"
   onerror="this.remove()">` as the first child of `#lobby`.
3. `client-host-race/index.html` — add `.lobby-backdrop` CSS
   rules to the inline `<style>`: absolute centered, max-height
   500px, max-width 700px, z-index 0, opacity 0.95. Add
   `#lobby > *:not(.lobby-backdrop) { position: relative; z-index: 1; }`.
4. Raw img src is the PNG path; after paint, pipe through
   `SpriteLoader.loadPainterly` and swap src to the processed
   data URL (same pattern as Phase 9a tournament-champion).
5. Screenshot: `screenshots-review/phase10a-race-lobby.png`.

### Phase 10b — lobby-escape (1 PNG, same pattern)

### Phase 10c — lobby-hill (1 PNG, same pattern)

### Phase 10d — lobby-meteor (1 PNG, same pattern)

### Phase 10e — DESIGN.md twelfth realization

After 10a-d land:

- Append a twelfth-realization block covering Phase 10.
- Mark Phase 10 shipped on the roadmap with date.
- Decisions-log rows for: backdrop-first-child pattern for per-game
  lobby (reuse of Phase 9a tournament approach), cream-white center
  panel as a placeholder for overlay text (not drawn text in the
  PNG), four-lobby series as style-consistency anchor for later
  Phase 11+ frame work.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Painted cream panel is wider/taller than the title stack and exposes painted edges around text | Text stack is ~180px tall total (eyebrow + title + caption); panel targets min 280px tall. Generate with a comfortable margin; if a piece renders too tight, regenerate with "wider center panel" tweak |
| Backdrop opacity 0.95 competes with the plank bg for attention | Lobby layer already has `background-color: --bg-wood-deep` at z-index:0 — backdrop sits ABOVE the gradient but behind text. Net effect is "painted banner over wood stage floor" — intentional layering |
| Per-game banner colors clash with the game's canvas palette | Banner color matches the primary accent of the per-game canvas (ruby red = race+hill, forest green = escape, navy = meteor). Lobby → canvas transition stays in same mood |
| 4 × ~2MB lobby assets bloat the captive-portal payload | Budget: +8MB on top of existing ~30MB content art. Captive-portal target can accept; re-compress only if load times exceed 2s on a 10Mbit wifi |

## Open questions (for implementer)

1. Backdrop sizing: fixed max-height 500px, or viewport-relative
   (e.g. `40vh`)? Lean: fixed 500px; lobbies always render on
   desktop / TV where 500px is ~60% of 720px viewport.
2. Add a soft fade-in on page load? Backdrop enters with the
   lobby display; using the existing lobby-overlay opacity
   transition means the backdrop inherits the fade for free.
3. Where does "FRANTICS" eyebrow sit relative to the painted
   banner TOP? If the banner's top edge crowns the title, the
   eyebrow should sit ABOVE the banner (floating on the wood
   plank). If the banner center panel is wide enough, eyebrow
   sits INSIDE the cream with the title. Lean: inside the cream;
   reads as "attraction billboard."

## Phase handoff

After 10a-e land, DESIGN.md gains the twelfth realization and
roadmap item 11 is marked shipped. Phase 11 opens next for
selection-grid cell frames (animal / color / game modal). The
lobby PNGs' style consistency is the reference for all Phase 11+
frame commissions.
