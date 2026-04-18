# In-game HUD Chrome Paint — Design Spec (Phase 19)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 19 of ?, after Phase 18 (controller gameplay overlay
backdrops) closed 2026-04-18
**Scope:** paint the in-game HUD chrome that sits BEHIND active play
— the big score/countdown numbers and the bottom action-hintbar —
closing the controller gameplay AAA arc started in Phase 12b (orb).
**NOT** the top-bar eyebrow strip (low-impact 44px line, eyebrow text
already reads), the meteor warning flash (ephemeral beat), or the
connection-lost toast (functional state, not emotional beat).

## Problem

Phase 12b painted the controller's avatar orb (reused Phase 11b
`cell-action.png`). Phase 18 painted the three full-screen
end-of-game overlays (gameover / elim / spectate). But the two
surfaces that *dominate active play* — the **score block** (big
gold number, always visible) and the **hintbar** (3 action cards on
the bottom 96px) — still render on flat CSS chrome:

- `.gp-score-block` — a 64px Alfa Slab number with `text-shadow:
  0 3px 0 var(--accent-red-deep)` letterpress, sitting on the wood-
  plank gameplay-root bg. No painted anchor. The single number the
  contestant is chasing renders as text on brown.
- `.gp-countdown-digit` — 180px version of the same Alfa Slab gold
  letterpress. Appears during the 3-2-1 pre-game beat, disappears
  once the round starts.
- `.gp-hintbar` — flat `linear-gradient(0deg, rgba(47,28,12,0.82)
  0%, transparent 100%)` scrim holding the three painted action
  cards from Phase 11b. The cards are slot-machine painted frames,
  but they float on a raw gradient — no theatre stage underneath.

The aesthetic gap is: Phase 12b + 18 delivered "painted moments";
Phase 19 delivers the **painted stage itself**. When the round is
live, the player should feel like they're watching a carnival
attraction, not pressing buttons on a brown rectangle.

## Success criteria

- Every big centered number the contestant sees during a round — the
  persistent score AND the 3-2-1 countdown — renders inside a
  painterly wooden scoreboard plaque (`score-plaque.png`). Single
  asset, two surfaces (Phase 12b-style reuse).
- The bottom hintbar renders against a painterly theatre-stage
  backdrop (`hintbar-stage.png`) — wide wooden proscenium / stage
  floor — with the three Phase 11b action cards sitting on the
  stage like attractions on a carnival row. The flat dark-gradient
  scrim drops or becomes a light tint so the painted stage reads.
- Text legibility over the painted plaque holds without reworking
  shadows; if the plaque commission renders a saturated cream
  center, the existing gold letterpress + red-deep shadow on the
  score/countdown numbers still reads.
- Both assets get WebP siblings via Phase 17c pipeline post-drop.
- DESIGN.md gains a **twentieth realization**, roadmap item 19
  shipped, decisions-log rows for the new reuse + stage patterns.

## Non-goals (explicitly out of scope for Phase 19)

- `.gp-topbar` eyebrow strip paint — 44px thin line, game name +
  phase icon reads fine on the subtle gradient. Painting it would
  add a busy top band that fights the painted plaque just below.
- `.gp-item-pill` (race held-item pill, 44px gold-bordered circle) —
  race-only, small, already reads as a discrete gold medallion
  thanks to `box-shadow: 0 0 14px rgba(244,197,66,0.35)`. Phase
  11b-grade ornament would be overkill.
- `.gp-meteor-warn-flash` / `.gp-meteor-warn-label` — ephemeral
  beats (~1.5s), amber alarm is the communication. Adding paint
  would slow the read.
- `.gp-lost-toast` / `.gp-lost-stall` — functional states. Phase 19
  is visual-depth polish on the durable surfaces, not the error
  flow.
- Gameplay canvas overlays (per-game painted signatures) — Phase 3
  + 6 + 7 + 8 already handled.
- New tokens. Plaque + stage consume existing tokens only.

## Architecture

### Shared CSS pattern (applied twice)

The score plaque is a **painted backdrop BEHIND a centered number**.
CSS `::before` with `background-image: var(--score-plaque-bg,
url('/assets/score-plaque.png'))` sits behind the text layer.
Plaque `background-size: 100% 100%` stretches to the block
dimensions; `z-index: -1` pushes it under the text. Same rule applies
to `.gp-score-block` AND `.gp-countdown-digit`.

The hintbar stage is a **painted backdrop INSIDE the hintbar
container**, behind the three action cards. Also CSS `::before` with
`background-image: var(--hintbar-stage-bg, url('/assets/hintbar-
stage.png'))` stretched `100% 100%`, `z-index: 0` (above the
gradient, below the flex children). The existing `linear-gradient`
drops or lightens.

Both assets follow the established Phase 11b / 12b / 18c pattern:
CSS custom property with raw-PNG `url()` fallback, JS-side
`SpriteLoader.loadPainterly` swaps to processed data URL via
`setProperty` (short URLs, Phase 15 limit doesn't apply) OR
`<style>` injection (if data URL exceeds the Chrome setProperty
silent-drop threshold — Phase 15 decision).

Both assets can be loaded at module-init time (no per-build-dom
hook needed), matching how Phase 11b's `cell-action` loads: once
per page, CSS fallback renders from first paint.

### CSS (new blocks in `client-controller/gameplay.css`)

```css
/* ============================================================
   Phase 19a — score plaque: painterly wooden scoreboard behind
   the big centered number. Reused for countdown and score.
   ============================================================ */
.gameplay-root .gp-score-block::before,
.gameplay-root .gp-countdown-digit::before {
  content: '';
  position: absolute;
  inset: -14px -32px -6px -32px;  /* bleed past text bounds so plaque frames the digit */
  background-image: var(--score-plaque-bg, url('/assets/score-plaque.png'));
  background-size: 100% 100%;
  background-repeat: no-repeat;
  z-index: -1;
  pointer-events: none;
}
/* Countdown digit needs a bigger plaque because 180px digits are huge */
.gameplay-root .gp-countdown-digit {
  position: absolute;  /* already positioned — retained */
}
.gameplay-root .gp-countdown-digit::before {
  inset: -40px -80px -20px -80px;
}
.gameplay-root .gp-score-block {
  /* Enable absolutely-positioned ::before to paint behind the
     flex children without breaking their layout */
  position: relative;
  z-index: 1;
  padding: 6px 18px 2px;
}

/* ============================================================
   Phase 19b — hintbar stage: painterly theatre stage floor +
   proscenium behind the three Phase 11b action cards.
   ============================================================ */
.gameplay-root .gp-hintbar {
  /* Flat gradient drops to a light tint — the painted stage is
     now the atmosphere. Slight bottom fade retained for
     safe-area-inset scrim. */
  background: linear-gradient(0deg, rgba(47, 28, 12, 0.45) 0%, transparent 60%);
}
.gameplay-root .gp-hintbar::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--hintbar-stage-bg, url('/assets/hintbar-stage.png'));
  background-size: 100% 100%;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
}
.gameplay-root .gp-hintbar > * { position: relative; z-index: 1; }
```

### JS (extend existing setTimeout block in `client-controller/gameplay.js`)

The module-init `setTimeout(0)` that loads `cell-action` for Phase
11b/12b extends to also load `score-plaque` and `hintbar-stage`. No
per-buildDom hook — both assets are once-per-page loads and set
`--score-plaque-bg` / `--hintbar-stage-bg` custom properties via
`setProperty` (raw PNG + processed PNG data URLs both fit under
Chrome's setProperty limit; if either exceeds it we fall back to
the `<style>` injection pattern from Phase 15).

```js
setTimeout(function () {
  if (typeof SpriteLoader === 'undefined') return;
  [
    ['cell-action',    '--cell-action-bg',    '/assets/cell-action.png'],
    ['score-plaque',   '--score-plaque-bg',   '/assets/score-plaque.png'],
    ['hintbar-stage',  '--hintbar-stage-bg',  '/assets/hintbar-stage.png'],
  ].forEach(function (t) {
    SpriteLoader.loadPainterly(t[0], t[2])
      .then(function (canvas) {
        if (canvas) document.documentElement.style.setProperty(
          t[1], 'url(' + canvas.toDataURL('image/png') + ')');
      })
      .catch(function () {});
  });
}, 0);
```

### Asset coordination

Two new PNG commissions through the established Phase 5 + 10 + 15 +
18 pipeline: user runs the image-gen prompt, drops result at
`/assets/score-plaque.png` and `/assets/hintbar-stage.png`. WebP
siblings generated post-drop via `npx cwebp-bin` (Phase 17c
precedent). No existing asset is being reused in Phase 19.

## Sub-phase breakdown

- **19a — `score-plaque.png`**
  Commission asset, drop in `/assets/`, wire CSS `::before` on both
  `.gp-score-block` AND `.gp-countdown-digit`, verify the score
  sits inside the plaque center AND the 180px countdown digit
  scales up inside the bigger-inset plaque. Screenshot
  `screenshots-review/phase19a-score-plaque-*.png`.
- **19b — `hintbar-stage.png`**
  Commission asset, drop in `/assets/`, wire CSS `::before` on
  `.gp-hintbar`, lighten the gradient scrim, verify the three
  action cards sit on the painted stage. Screenshot
  `screenshots-review/phase19b-hintbar-stage.png`.
- **19c — WebP siblings**
  `npx cwebp-bin -q 85` on both new PNGs, commit separately as a
  `perf(content)` matching Phase 17c / 18d cadence.
- **19d — DESIGN.md + roadmap close**
  Twentieth realization block, roadmap item 19 shipped, decisions-
  log rows for the reuse pattern + stage paint.

## Asset prompts

Per Phase 5 style guide (DESIGN.md §"Style guide — visual grammar
derived from bg.png"), both prompts anchor on the same painterly
children's-storybook register.

### `score-plaque.png` (1024×1024, transparent bg)

```
A bright daylight children's storybook cartoon painting of an ornate
carnival scoreboard plaque on a wooden board. Rectangular horizontal
composition (the painted plaque frame spans roughly 80% of the canvas
width, centered, with empty transparent space above and below).
Weathered painted wood in warm brown with gold-leaf ornamental
corners and a scrolling ribbon along the top. Thick dark-brown
ornamental frame with carved grooves. Cream-painted inner panel
with faint vertical wood grain — this inner cream zone is where the
big number will render, so keep it relatively clean and calm.
Carnival-red paint accents in the top and bottom ornaments. Small
gold stars or flourishes at each corner. No numbers, no text, no
characters, no borders past the plaque outline. Medium-thickness
dark ink outlines, soft washy color fills, gentle shading. Vibrant
saturated outdoor-daylight palette matching assets/bg.png: warm
browns, cream highlights, carnival red, gold accents. Transparent
background, no bleed past the canvas edge. Square composition
1024x1024. Style: the same "Barnyard Bedlam" painterly
children's-storybook feel — not vintage sepia, not flat vector, not
photorealistic.
```

### `hintbar-stage.png` (1024×384, transparent bg — wide aspect)

```
A bright daylight children's storybook cartoon painting of a wide
carnival theatre stage floor. Long horizontal composition (canvas
is 1024 wide by 384 tall). Wooden stage floorboards in warm brown,
seen in slight perspective so planks recede toward the horizon.
Red-and-gold draped valance curtain along the very top edge of the
canvas — a shallow proscenium arch running the full width, about
15% of canvas height. The stage floor fills the remaining 85% of
the canvas. Painted carnival bunting hint tucked under the valance.
Warm amber footlights glow subtly along the stage floor's front
edge. No text, no borders, no characters, no stage props (the
action cards will sit on top of the stage in DOM — leave the stage
floor relatively uncrowded). Medium-thickness dark ink outlines,
soft washy color fills, gentle shading. Vibrant saturated outdoor-
daylight palette matching assets/bg.png: warm wood browns, carnival
red curtain, gold accents, cream proscenium trim. Transparent
background on the top + bottom, no bleed past the canvas edge.
Horizontal composition 1024x384. Style: the same "Barnyard Bedlam"
painterly children's-storybook feel — not vintage sepia, not flat
vector, not photorealistic.
```

## Testing

- **Score plaque — idle + running** — launch `/test/`, run a
  fake round where Gameplay emits `setScore(42, {delta: +10})`
  and verify the plaque paints under the number, the number
  letterpress reads, and the green `+10` delta floats up through
  the top of the plaque without visual collision.
- **Countdown plaque** — force `setCountdown('3', 'get ready')`
  / `setCountdown('2')` / `setCountdown('1')` and verify each
  180px digit sits centered inside a proportionally-scaled
  plaque (bigger `inset` rule) without the plaque's corner
  ornaments crowding the number.
- **Hintbar stage** — verify all 4 games' hintbars render
  correctly — each game has 3-4 action cards; each card is a
  Phase 11b `cell-action` painted frame. Cards must appear to
  sit ON the stage, not float above it. Stage shouldn't cover
  any action icon or label text.
- **Safe-area inset** — iPhone 14 (390×844) has bottom safe-area
  inset. Stage bottom should blend into the remaining dark tint
  without a sharp cut.
- **`prefers-reduced-motion`** — both backdrops are static
  images. No motion concern. Existing HUD reduced-motion rules
  (score bump transform disable, countdown entry) unaffected.
- **Per-game class modifiers** — `.gameplay-root.game-race
  .gp-score { color: var(--accent-gold-hot) }` and `.game-meteor
  .gp-score { color: var(--warning-amber) }` must keep working;
  the plaque is behind-text and shouldn't interfere with color
  tint rules.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Plaque cream center is too saturated, fights the gold letterpress number | Prompt specifies "cream inner panel" and "relatively clean and calm". If the first render is too busy, regenerate with "plainer cream interior" tweak. Existing text-shadow (red-deep 3px letterpress + 28px gold glow) should cut through cream |
| Countdown digit is 180px — the plaque inset padding needs to scale too | Separate CSS rule per surface: `.gp-score-block::before` uses smaller inset (-14px/-32px), `.gp-countdown-digit::before` uses larger (-40px/-80px). Pair asset + inset together |
| Hintbar stage floor art doesn't match the cell-action slot-machine ornament register | Both prompts anchor on bg.png — same painterly hand. Stage "empty" by design so action cards don't fight painted props |
| Painted stage + painted action cards = too much wood-on-wood visual noise | Hintbar existing gradient scrim lightens but doesn't remove, providing tonal separation between the stage plane and the action-card painted frames. If still noisy, action cards' `.gp-action::before` `cell-action-bg` opacity can drop to 0.92 for better layering |
| setProperty silent-drop if data URL > Chrome's threshold | Plaque is 1024x1024 (similar to cell-action — works via setProperty). Hintbar is 1024x384 (smaller, fits easily). If setProperty drops silently, fall through to `<style>` injection (Phase 15 pattern). Test with real processed data URLs post-commission |
| Per-game `.gp-score` color tint gets occluded by the plaque | Plaque is at `z-index: -1` relative to the score block's positioned context; text renders on top. Color tint applies to text, not the plaque. Verified against Phase 11b/12b where `cell-action-bg` sits behind the action icon without affecting icon color |

## Open questions

1. **Stage aspect ratio** — 1024×384 (2.67:1) chosen to match the
   controller hintbar's 390×96 display box (~4:1). The slight
   mismatch bakes in mild art-floor compression but keeps the
   proscenium from dominating vertically. If the first render
   reads wrong, regenerate at 1024×256 (4:1, exact match).
2. **Score-plaque vs hintbar-stage tonal balance** — both wooden-
   warm. In the live HUD they stack vertically (score top,
   hintbar bottom) with the avatar-orb cell-action frame between.
   Three warm browns could gel or could monotonize; visual
   verification needed post-commission.
3. **Top-bar paint as a Phase 20 candidate?** — intentionally
   excluded here, but a thin carnival banner strip (reusing Phase
   15 `ornament-bunting`?) could close the last un-painted in-game
   surface. Deferred until demand demonstrates; this phase aims for
   the biggest-impact two.

## Phase handoff

After 19a + 19b + 19c + 19d land, the controller gameplay HUD sits
entirely inside painted chrome: orb on cell-action (Phase 12b),
action cards on cell-action (Phase 11b), hintbar container on
hintbar-stage (19b), score block + countdown digit on score-plaque
(19a), end-of-game overlays on Phase 18 backdrops. The only CSS-only
surfaces left are `.gp-topbar` (thin eyebrow strip) and a handful of
ephemeral/functional overlays (item-pill, meteor-warn, lost-toast) —
each with deliberate out-of-scope rationale in this spec.

Audit grade stays at A+ (3.84). Phase 19 is internal visual-depth
polish. The next candidate would be a fresh audit pass against
live gameplay (first-hand contestant experience) rather than an
additional chrome surface.
