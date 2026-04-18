# Host-side Painted Polish — Design Spec (Phase 20)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 20 of ?, after Phase 19 (in-game HUD chrome paint) closed
2026-04-18
**Scope:** close two remaining host-side painted gaps — (a) host
PostGame overlay for the three non-race games (hill / meteor /
escape), which currently render on a plain dark-blur scrim while
race uses the Phase 8c podium composition; (b) tournament
round-intro, which was explicitly skipped in Phase 9 but now
fits a painted attraction-poster read.
**NOT** corner ornaments on tournament + postgame — already shipped
in Phase 15b via `HostCommon.addCornerOrnaments(overlay)` on both
surfaces.

## Problem

Two host-side surfaces lag the painted aesthetic arc:

1. **Host PostGame for non-race** — `PostGame.show({...})` is a
   shared overlay called by all four per-game hosts. Race passes
   `backdrop: '/assets/race-podium.png'` (Phase 8c) which
   anchors a painted three-tier podium at the bottom of the
   overlay. Hill, meteor, and escape pass no backdrop — the
   overlay falls through to `rgba(47, 28, 12, 0.92) +
   backdrop-filter: blur(8px)` and shows winner text on a plain
   dark scrim. Controller's Phase 18 gameover-hall is already
   commissioned and fits this surface without new art.
2. **Tournament round-intro** — `Tournament.renderRoundIntro`
   paints the "TOURNAMENT / ROUND X / Game Name / GET READY"
   stack on a transparent `#t-content` container with a wooden
   surface visible behind through the tournament overlay's bg
   (`rgba(47, 28, 12, 0.92)`). Phase 9 explicitly skipped a
   round-intro backdrop because "curtain-reveal aesthetic would
   compete." Two phases later, with painted backdrops now
   firmly established across every other lobby / end-of-game
   surface, the lack of paint on round-intro reads as a gap, not
   a deliberate restraint.

## Success criteria

- `PostGame.show({...})` accepts a new `backdropMode` option
  distinguishing `'podium'` (Phase 8c race layout, anchored
  bottom-center, bounded size) from `'hall'` (Phase 18
  gameover-hall cover-fit, full-overlay atmospheric). Default
  stays `'podium'` so existing calls don't change semantics.
- Hill, meteor, and escape per-game `main.js` files call
  `PostGame.show({..., backdrop: '/assets/gameover-hall.png',
  backdropMode: 'hall'})`. Universal gameover-hall reused from
  Phase 18 — zero new art.
- PostGame overlay scrim drops from 0.92 to 0.55 when
  `backdropMode === 'hall'` (Phase 18 precedent) so the painted
  hall reads through; for `'podium'` mode scrim stays as-is so
  race's bottom-anchored podium doesn't fight a competing
  atmosphere.
- `Tournament.renderRoundIntro` prepends a painted
  `tournament-round-intro.png` attraction-poster behind the
  TOURNAMENT / ROUND / game-name stack. Follows the Phase 9
  champion backdrop pattern: `<img>` element inside
  `#t-content.innerHTML` so prior modes' backdrops don't
  persist across switches.
- Both assets get WebP siblings via the Phase 17c pipeline.
- DESIGN.md gains a **twenty-first realization**, roadmap item
  20 shipped, decisions-log rows for the reuse decisions.

## Non-goals (explicitly out of scope for Phase 20)

- Per-game gameover-hall variants (hill-throne, meteor-comet,
  escape-safehouse). Single universal hall is cheaper and
  matches the controller's Phase 18 decision.
- Replacing race's Phase 8c `race-podium.png` — race keeps its
  existing composition. Only hill/meteor/escape gain the hall
  backdrop.
- Corner ornaments on tournament + postgame — already shipped in
  Phase 15b (`HostCommon.addCornerOrnaments` called on both).
- Round-intro title typography rework. The new backdrop frames
  existing text; no copy or layout changes.
- Tournament standings backdrop — already handled by Phase 12a
  `standings-scroll.png`.
- Tournament champion backdrop — already handled by Phase 9a
  `tournament-champion.png`.

## Architecture

### 20a — PostGame `backdropMode` extension

`client-shared/postgame.js`:

- `show(opts)` reads `opts.backdropMode` (default `'podium'`).
- The backdrop `<img>` gets `class="pg-backdrop pg-backdrop-${mode}"`.
- The overlay container applies `data-backdrop-mode="${mode}"`
  attribute so scrim rules can match.
- New CSS:
  ```css
  /* Hall mode — full-cover backdrop, reduced scrim */
  #postgame-overlay[data-backdrop-mode="hall"] {
    background: rgba(47, 28, 12, 0.55);
  }
  #postgame-overlay .pg-backdrop-hall {
    position: absolute;
    inset: 0;
    width: 100%; height: 100%;
    max-width: none; max-height: none;
    object-fit: cover;
    object-position: center;
    bottom: auto; left: auto; transform: none;
    opacity: 0.95;
    z-index: 0;
  }
  /* Podium mode — existing Phase 8c rules, unchanged */
  #postgame-overlay .pg-backdrop-podium {
    /* default inherits from .pg-backdrop existing rule */
  }
  ```

`client-host-hill/main.js`, `client-host-meteor/main.js`,
`client-host-escape/main.js`:

Each `PostGame.show({...})` gains two options:
```js
backdrop: '/assets/gameover-hall.png',
backdropMode: 'hall',
```

`client-host-race/main.js` unchanged — keeps `backdrop:
'/assets/race-podium.png'` with default mode (`'podium'`).

### 20b — tournament round-intro backdrop

`client-shared/tournament.js` `renderRoundIntro(data)`:

```js
var html = '<img class="t-round-intro-backdrop" src="/assets/tournament-round-intro.png" onerror="this.remove()">';
html += '<div class="t-bar" ...>TOURNAMENT</div>';
html += '<div class="t-round-intro-number">ROUND ' + ... + '</div>';
// ... rest unchanged
content.innerHTML = html;
```

Matches Phase 9a tournament-champion pattern (prepend `<img>`
inside `content.innerHTML`). Mode-switching cleanup is automatic:
`renderStandings` and `renderChampion` overwrite `content.innerHTML`
with their own backdrop img, so the round-intro backdrop never
persists across mode changes.

CSS additions (merged into the existing `style.textContent`):

```css
/* Phase 20b — painted attraction-announce poster behind
   ROUND X / game name stack. Anchored at natural aspect ratio,
   centered on the content container. Follows Phase 9a
   champion backdrop sizing. */
#t-content .t-round-intro-backdrop {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  max-height: 560px; max-width: 480px;
  width: auto; height: auto;
  opacity: 0.95;
  z-index: 0;
  pointer-events: none;
}
/* Stack existing round-intro children above the backdrop */
#t-content.mode-round-intro .t-bar,
#t-content.mode-round-intro .t-round-intro-number,
#t-content.mode-round-intro .t-round-intro-game,
#t-content.mode-round-intro .t-round-intro-ready {
  position: relative;
  z-index: 1;
}
```

`renderRoundIntro` also adds `content.classList.add('mode-round-intro')`
(with the standings + non-standings cleanup that already happens —
`content.classList.remove('mode-standings')` at top of the fn).
This scopes the round-intro CSS so it doesn't bleed into other
modes.

### 20c — WebP siblings

Only ONE new PNG lands (`tournament-round-intro.png`). Generate
WebP via `npx cwebp-bin -q 85 assets/tournament-round-intro.png
-o assets/tournament-round-intro.webp`. The gameover-hall.webp
already exists from Phase 18.

### 20d — DESIGN.md close

Twenty-first realization. Roadmap item 20 shipped 2026-04-18.
Decisions-log rows for `backdropMode` extension + round-intro
paint.

## Sub-phase breakdown

- **20a — host PostGame reuse** (zero art, implement immediately).
  1. Extend `PostGame.show` with `backdropMode` option.
  2. Add `.pg-backdrop-hall` + scrim rule.
  3. Pass `backdrop + backdropMode` in hill / meteor / escape
     per-game main.js calls.
  4. Screenshot each game's postgame overlay.
  5. Commit: `feat(content): Phase 20a — host PostGame reuses
     gameover-hall for non-race`.
- **20b — tournament round-intro** (needs one new PNG).
  1. User commissions `tournament-round-intro.png`.
  2. Wire `<img class="t-round-intro-backdrop">` into
     `renderRoundIntro`.
  3. Add CSS rules scoped under `#t-content.mode-round-intro`.
  4. Add `content.classList.add('mode-round-intro')` inside
     `renderRoundIntro`.
  5. Screenshot live round-intro.
  6. Commit: `feat(content): Phase 20b — tournament-round-intro
     painted attraction poster`.
  7. WebP sibling: `perf(content): WebP sibling for Phase 20
     round-intro`.
- **20c — DESIGN.md**
  `docs(design): Phase 20c — twenty-first realization + close
  Phase 20`.

## Asset prompt

### `tournament-round-intro.png` (1024×1024, transparent bg)

```
A bright daylight children's storybook cartoon painting of a
carnival attraction-announce poster / bulletin-board stage.
Square composition (1024x1024). Central vertical wooden
signboard with ornate carved ribbon banners at top and bottom —
the top banner reads nothing (text will render in DOM), the
bottom banner likewise. Cream-white painted inner panel spans
about 60% of the canvas — this is where ROUND X + game name +
GET READY text will render, so keep this central cream zone
relatively calm and uncrowded. Weathered warm-brown wooden frame
around the cream panel with carved groove details. Small
gold-leaf stars or flourishes at each corner of the frame.
Flanking the central signboard: small carnival elements — a
string of pennant flags to the left, a tall striped circus-tent
pole or banner spire to the right — painted at a smaller scale
so the central cream panel dominates. Painted wooden fair-ground
floor at the very bottom, a hint of sky at the very top. No
text, no numbers, no characters, no borders past the outermost
frame. Medium-thickness dark ink outlines, soft washy color
fills, gentle shading. Vibrant saturated outdoor-daylight
palette matching assets/bg.png: warm wood browns, cream panel,
carnival red pennants, gold accents, sky blue hint. Transparent
background, no bleed past the canvas edge. Square composition
1024x1024. Style: the same "Barnyard Bedlam" painterly
children's-storybook feel — not vintage sepia, not flat vector,
not photorealistic.
```

## Testing

- **PostGame hall mode** — fake-trigger hill / meteor / escape
  game-over on `/test/`, verify `gameover-hall.png` covers the
  overlay with text readable over the painted spotlight zone.
- **PostGame podium mode (regression)** — fake-trigger race
  game-over, verify `race-podium.png` still anchors at bottom
  with the same composition as before — no visual regression.
- **Round-intro backdrop** — simulate `renderRoundIntro({round: 2,
  gameId: 'escapeFox'})`, verify the painted poster sits behind
  TOURNAMENT / ROUND 2 / Escape the Fox / GET READY without
  clobbering the fade-slide-up animations on the text.
- **Mode switching regression** — flow through `renderStandings`
  → `renderRoundIntro` → `renderChampion` and confirm each
  mode's backdrop paints/unpaints cleanly via the
  `content.innerHTML` overwrite pattern.
- **Corner ornaments coexistence** — verify Phase 15b corner
  filigree on postgame + tournament still paints on the 4
  corners without conflict with the new backdrops.
- **prefers-reduced-motion** — backdrops are static images; no
  motion concern. Existing entry animations (fade-slide-up on
  .t-bar, etc.) unaffected.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| `backdropMode` option name collision with future API | New opt is namespaced to PostGame's internal API. Default 'podium' preserves existing race behavior. Plain string enum; easy to extend |
| Hall mode scrim lightening affects race podium legibility | Scrim change gated on `data-backdrop-mode="hall"` attribute; race stays at 0.92. Tested via regression screenshot |
| Round-intro backdrop competes with narrator quip firing at the same time | Narrator overlay (Phase 5b) is positioned on a separate z-index stack (`Narrator.js` owns `#narrator-overlay` at higher z). The round-intro painted poster sits INSIDE `#t-content` at z-index:0; narrator still floats on top |
| `mode-round-intro` CSS class accidentally persists after round-intro | `renderStandings` explicitly `content.classList.remove('mode-round-intro', 'mode-standings', ...)` at top (follows existing mode-standings cleanup pattern). Add to that cleanup list |
| Attraction-poster art reads too busy for the centered text | Prompt specifies "central cream zone relatively calm and uncrowded"; flanking decoration stays at smaller scale. Text also carries its own letterpress + scale emphasis (42px ROUND, 28px game name) |

## Phase handoff

After Phase 20 lands, the host-side painted surfaces are:

- Main lobby (`bg.png`, Phase 0 original commissioned art)
- Per-game lobbies (Phase 10, 4 backdrops)
- Tournament standings (Phase 12a `standings-scroll.png`)
- **Tournament round-intro** (Phase 20b `tournament-round-intro.png`)
- Tournament champion (Phase 9a `tournament-champion.png`)
- PostGame race (Phase 8c `race-podium.png`)
- **PostGame non-race** (Phase 20a `gameover-hall.png` reused)
- Ornaments: Phase 15b bunting + corners on every overlay

The visible host flow end-to-end is now painted. Remaining
candidates (none active): per-game-specific postgame variants
(hill-throne / meteor-comet / escape-safehouse) if a future audit
demands per-game differentiation over universal hall; host in-game
canvas layers (painted mid-ground environments for escape /
meteor / hill — Phase 6 precedent).

Audit grade stays at A+ (3.84) — internal visual-depth polish.
