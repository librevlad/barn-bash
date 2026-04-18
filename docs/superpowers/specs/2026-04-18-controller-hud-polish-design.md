# Controller Gameplay Overlay Backdrops — Design Spec (Phase 18)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 18 of ?, after Phase 17 (post-audit polish) closed 2026-04-18
**Scope:** painterly backdrops behind the three controller-side
full-screen overlays — `.gp-eliminated-overlay`, `.gp-spectate-block`,
`.gp-gameover-overlay` — bringing the controller gameplay HUD in line
with the painted aesthetic established by Phases 8c (race podium on
host PostGame) and 10 (per-game lobby backdrops).
**NOT** the in-game HUD chrome (top-bar, score, hintbar background,
item-pill) — those stay CSS-only; a separate phase if demand
justifies.

## Problem

Phase 12b retrofitted the controller gameplay avatar orb with a
painterly medallion frame (reused `cell-action.png`), unifying the
bottom-HUD row under one ornament language. But the three
*full-screen* overlays that stack on top of gameplay — eliminated,
spectating, game-over — remain flat CSS chrome: dark scrim +
gold letterpress text + circular bordered avatar. These are the
emotional high-beats of the contestant experience:

- **Eliminated** — "you're out" moment, the player stops interacting.
- **Spectating** — ~minutes of watching the remaining players.
- **Game-over** — session's visual peak for the winner.

Each beat currently lands on a **plain wood-deep scrim**. The
product's main lobby (`BARNYARD BEDLAM`), per-game lobbies (Phase 10
painterly backdrops), tournament champion (Phase 9), and even the
HOST-side race postgame (Phase 8c podium) all read as painted
theatrical compositions. The controller's equivalent moments lag
one aesthetic generation behind. This spec closes that gap.

## Success criteria

- `.gp-gameover-overlay` renders against a painted
  hall-of-fame/theatre-stage backdrop (`gameover-hall.png`) on all
  four games' controller game-over screens.
- `.gp-eliminated-overlay` renders against a painted
  "curtain-down / after-the-act" scene (`elim-shadow.png`). Red
  `ELIMINATED` text and grayscale avatar remain legible over the
  painted atmosphere.
- `.gp-spectate-block` renders its player pill list inside the
  Phase 12a `standings-scroll.png` wooden scoreboard (asset
  **reused**, no new commission). Pill text flips to
  `--text-on-gold` so cream-on-cream doesn't vanish — mirrors the
  Phase 12a standings decision.
- All three overlays keep working pre-asset-load (CSS fallback to
  raw `url('/assets/*.png')`) and swap to `loadPainterly`-processed
  data URLs once ready, without content reflow.
- DESIGN.md gains a **nineteenth realization** block, roadmap item
  18 marked shipped, decisions-log rows for the three design choices
  made here.

## Non-goals (explicitly out of scope for Phase 18)

- Per-game gameover backdrops (decided single universal
  `gameover-hall.png` — race's HOST-side Phase 8c podium continues
  to fire on the HOST screen; untouched).
- New `spectate-scroll.png` or `spectate-parchment.png` asset —
  reuse Phase 12a `standings-scroll.png` instead, one ornament
  language across standings + spectate.
- In-game HUD chrome paint (top-bar banner, score plaque, hintbar
  stage, item-pill medallion). That's a natural Phase 19+ target if
  product demand accumulates; this phase stays focused on the three
  overlay surfaces.
- Elimination overlay narrator portrait — Phase 5b portrait already
  appears in the narrator overlay layer; duplicating it inside elim
  would compete for attention.
- Connection-lost toast styling — functional state, not an emotional
  beat.

## Architecture

### Backdrop injection pattern

Mirrors the Phase 10 lobby-backdrops + Phase 8c race-podium pattern:
each overlay gains a first-child `<div class="gp-overlay-backdrop">`
positioned `absolute; inset: 0; z-index: 0`. All other flex siblings
inside the overlay get `position: relative; z-index: 1` so they
stack above the backdrop.

`SpriteLoader.loadPainterly` (shared helper — Phase 6a, refactored
in Phase 7c to edge-seeded-only) strips image-gen-tool
checker-preview fills. Processed data URL is injected via
`<style>` tag (Phase 15 decision — `setProperty` silently drops
large base64 values in Chrome) setting a CSS custom property:

```css
:root { --gameover-hall-bg: url(data:image/png;base64,...); }
:root { --elim-shadow-bg:   url(data:image/png;base64,...); }
```

Each backdrop's CSS reads its property with a raw-PNG fallback so
the overlay renders correctly from the first paint, with no
content reflow when the processed image lands.

### CSS (new block in `client-controller/gameplay.css`)

```css
/* ============================================================
   Phase 18 — painterly backdrops for the three full-screen overlays
   ============================================================ */
.gameplay-root .gp-overlay-backdrop {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
}

/* Gameover + eliminated: cover-fit painterly scene backdrop */
.gameplay-root .gp-gameover-overlay   .gp-overlay-backdrop {
  background-image: var(--gameover-hall-bg, url('/assets/gameover-hall.png'));
}
.gameplay-root .gp-eliminated-overlay .gp-overlay-backdrop {
  background-image: var(--elim-shadow-bg, url('/assets/elim-shadow.png'));
}

/* Spectate: reuse Phase 12a standings-scroll strip-fit inside the
   pill-list bounding box. Follows the Phase 12a decision that
   standings layout follows the painted slot positions, not the
   other way around. */
.gameplay-root .gp-spectate-block .gp-overlay-backdrop {
  position: absolute;
  top: 60px; bottom: 80px; left: 20px; right: 20px;
  background-image: var(--standings-scroll-bg, url('/assets/standings-scroll.png'));
  background-size: 100% 100%;
  background-position: center;
}

/* Stack children above the backdrop. */
.gameplay-root .gp-gameover-overlay   > :not(.gp-overlay-backdrop),
.gameplay-root .gp-eliminated-overlay > :not(.gp-overlay-backdrop),
.gameplay-root .gp-spectate-block     > :not(.gp-overlay-backdrop) {
  position: relative; z-index: 1;
}

/* Spectate pill color flip per Phase 12a: painted cream slot
   demands dark-text. Falls back gracefully if standings-scroll
   hasn't loaded yet. */
.gameplay-root .gp-spectate-block .gp-spec-pill {
  background: transparent;
  border: none;
}
.gameplay-root .gp-spectate-block .gp-spec-pill-name {
  color: var(--text-on-gold);
}
.gameplay-root .gp-spectate-block .gp-spec-pill-meta {
  color: var(--accent-red-deep);
}
```

### JS (new block in `client-controller/gameplay.js`)

One helper, invoked once per controller at `DOMContentLoaded`:

```js
function ensureOverlayBackdrops() {
  const ASSETS = {
    '--gameover-hall-bg': '/assets/gameover-hall.png',
    '--elim-shadow-bg':   '/assets/elim-shadow.png',
    '--standings-scroll-bg': '/assets/standings-scroll.png',
  };
  if (typeof SpriteLoader === 'undefined' || !SpriteLoader.loadPainterly) return;
  const css = [];
  const pending = Object.entries(ASSETS).map(([prop, url]) =>
    SpriteLoader.loadPainterly(url).then(dataUrl => {
      if (dataUrl) css.push(`:root { ${prop}: url('${dataUrl}'); }`);
    }).catch(() => {})
  );
  Promise.all(pending).then(() => {
    if (!css.length) return;
    const style = document.createElement('style');
    style.textContent = css.join('\n');
    document.head.appendChild(style);
  });
}
```

`Gameplay.buildDom()` prepends `<div class="gp-overlay-backdrop"></div>`
to each of the three overlay element templates. No other Gameplay.*
API change; the backdrops are structural, not state-bearing.

### Asset coordination

`gameover-hall.png` and `elim-shadow.png` are new 1024×1024 PNG
commissions through the established Phase 5 + 10 + 15 image-gen
pipeline (human-in-the-loop, style guide anchored on
`assets/bg.png`). Drop at `/assets/` path. Prompt templates in
the "Asset prompts" section below.

`standings-scroll.png` is **reused** from Phase 12a — no new
asset. Spectate simply points its CSS `background-image` at the
existing file.

## Sub-phase breakdown

- **18a — `gameover-hall.png`**
  Commission asset, drop in `/assets/`, wire CSS + JS. Live-verify
  on all four games via `/test/`. Screenshot
  `screenshots-review/phase18a-gameover-*.png`.
- **18b — `elim-shadow.png`**
  Commission asset, drop in `/assets/`, wire CSS. Live-verify via
  elim state on `/test/`. Screenshot
  `screenshots-review/phase18b-elim-*.png`.
- **18c — spectate reuse**
  No new asset. Wire CSS (`.gp-spectate-block .gp-overlay-backdrop`
  + pill color flip). Verify pill list sits inside painted slots
  at controller 390×844. Screenshot
  `screenshots-review/phase18c-spectate.png`.
  **Can ship independently** — asset-reuse only, no art dependency.
- **18d — DESIGN.md + roadmap close**
  Nineteenth realization block, roadmap item 18 shipped, decisions-
  log rows (one backdrop = one decision × 3-4 rows).

## Asset prompts

Per Phase 5 style guide (DESIGN.md §"Style guide — visual grammar
derived from bg.png"), both prompts anchor on the same painterly
children's-storybook register: medium ink outlines, soft watercolor
fills, bright daylight palette, rounded friendly proportions.

### `gameover-hall.png` (1024×1024, transparent bg)

```
A bright daylight children's storybook cartoon painting of a grand
carnival hall-of-fame stage. Wide red velvet curtains parted at the
sides, gold-braided rope tiebacks. Raised wooden proscenium with
ornate gold-leaf carvings. Empty warm spotlight pool center-stage
(for the winner composition to sit inside). Painted wooden floor
with faint stage-marking lines. Carnival bunting hint along the top
curtain rail. No text, no borders, no characters. Medium-thickness
dark ink outlines, soft washy color fills, gentle shading. Vibrant
saturated outdoor-daylight palette matching assets/bg.png: sky-blues
in the far backdrop, leaf-greens, warm orange and carnival-red
accents, cream highlights on the curtain gold. Transparent
background, no scene floor bleed past the canvas edge. Square
composition 1024x1024. Style: the same "Barnyard Bedlam" painterly
children's-storybook feel — not vintage sepia, not flat vector, not
photorealistic.
```

### `elim-shadow.png` (1024×1024, transparent bg)

```
A bright daylight children's storybook cartoon painting of an
after-the-act carnival sideshow tent — the moment a performer has
just exited. Lowered red-velvet stage curtain closed at center,
with a thin gold seam of light peeking between the panels. A dim
warm spotlight pool on the empty wooden stage floor. An upturned
theatre mask or fallen jester hat resting near the curtain hem.
Painted wooden floorboards. Muted warm atmosphere — the scene is
dimmer than the hall-of-fame composition but still daylight-pastel,
never sinister or horror. A few stage-dust motes floating in the
light. No text, no borders, no characters. Medium-thickness dark
ink outlines, soft washy color fills, gentle shading. Palette leans
toward deep carnival-red and worn brown with a single warm amber
spotlight; muted compared to the product's brighter scenes.
Transparent background, no bleed past the canvas edge. Square
composition 1024x1024. Style: the same "Barnyard Bedlam" painterly
children's-storybook feel — not vintage sepia, not flat vector, not
photorealistic.
```

## Testing

- **Per-overlay visual verification** — force each of the three
  overlay states in `/test/` via JS evaluate
  (`Gameplay.phase('eliminated')`, `phase('spectating')`,
  `onGameOver({...})`) and screenshot.
- **All four games on gameover** — fake-select each game, trigger
  `onGameOver`, verify `.gp-gameover-overlay .gp-overlay-backdrop`
  renders and winner composition stays legible.
- **Legibility check** — red `ELIMINATED` text, cream game-over
  hero, winner subline, quip — all must sit above the painted
  backdrop with no contrast collapse. If the painted gameover-hall
  spotlight zone is bright-cream, the cream text may need
  a `text-shadow` enforcement pass.
- **`prefers-reduced-motion`** — backdrops are static images, no
  motion concern. Existing overlay-entry animations already honor
  reduced-motion.
- **WebP content-negotiation (Phase 17c)** — both new PNGs get
  WebP siblings post-commission (the Phase 17 pipeline). No
  separate test; the server handles negotiation transparently.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Painted backdrop crowds the winner/eliminated text | Gameover-hall prompt specifies "empty spotlight pool center-stage" — keeps the text zone visually calm. Elim-shadow prompt keeps the center floor empty. If a generated PNG crowds the center, regenerate with "quieter center, activity at edges" tweak |
| Reduced-motion users lose the painted atmosphere | Backdrops are static — no motion to disable. Reduced-motion path already collapses entry animations, so the painted scene fades in with the overlay's existing opacity transition |
| Spectate pill list overflows painted slots (5+ players) | Existing `gp-spec-list` has `overflow-y: auto`. Standings-scroll has 4 visible slots; additional players scroll inside the painted frame. Matches Phase 12a behavior (tournament supports 2-8 players with the same asset) |
| `SpriteLoader` undefined at `DOMContentLoaded` | Helper early-returns if `SpriteLoader.loadPainterly` is absent. Raw-PNG fallback keeps the visual correct, just without the checker-strip pass (invisible on assets commissioned with clean alpha) |
| Large base64 data URLs fail `setProperty` | `<style>` tag injection avoids the limit (Phase 15 decision). Helper uses `<style>` injection by default |
| Gameover-hall backdrop duplicates race host-side podium | Different surfaces: Phase 8c podium is on HOST `PostGame.show`. Phase 18a gameover-hall is on CONTROLLER `.gp-gameover-overlay`. Both surfaces fire on game end and the player sees their phone (controller) while watching the host (TV) — one painterly composition per surface is intentional |

## Open questions

1. **Elim-shadow spotlight** — should the painted amber pool be
   centered (under the grayscale avatar) or offset (avatar stands
   "in the wings")? Lean centered — the avatar is the subject.
2. **Spectate inset** — `top: 60px; bottom: 80px; left: 20px;
   right: 20px` matches current spec-list padding. If the standings-
   scroll illustration proportions don't match the resulting
   aspect ratio, we may need to adjust the inset — one-line fix
   tracked in 18c live-verify.
3. **Should `gameover-hall` also back the HOST-side PostGame
   overlay?** — No; host already has Phase 8c race podium (race)
   and plain scrim (others). Extending is a Phase 19 question, not
   Phase 18 scope.

## Phase handoff

After 18a + 18b + 18c + 18d land, the controller's three emotional-
beat overlays are brought up to the painted-aesthetic register
established by Phases 8c and 10. Controller gameplay HUD chrome
(top-bar, score, hintbar, item-pill) remains CSS-only — a candidate
for Phase 19 if demand accumulates.

Audit grade stays at A+ (3.84) — Phase 18 is visual-depth polish,
not an additional dimension beyond what the 2026-04-17 audit scored.
A follow-up audit would exercise the new painted overlays under
live-game conditions.
