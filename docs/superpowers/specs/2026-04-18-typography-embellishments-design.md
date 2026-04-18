# Typography Embellishments — Design Spec (Phase 22)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 22 of ?, after Phase 21 (ambient visual depth) shipped.
Second sub-phase of the Hearthstone-polish arc.
**Scope:** push key hero titles from "bold gold letterpress" toward
"Hearthstone-tier embossed typography." Three compound CSS-only
additions: (22a) multi-layer hero-title emboss treatment on Alfa
Slab headlines; (22b) ornamental side flourishes (unicode gilded
decorations) flanking hero titles; (22c) drop-cap treatment on
narrator paragraph leads. Zero new fonts, zero new assets.

## Problem

After Phase 21 the painted surfaces drift and breathe. But the
*typography* — Alfa Slab hero titles (BARNYARD BEDLAM, CHAMPION!,
ROUND X, GRAND PRIX, ESCAPE THE FOX, SURVIVED!, ELIMINATED) —
reads as *functional* rather than *theatrical*. Hearthstone's
signature title treatment:

- Multi-layer emboss (dark outline + gold body + specular highlight)
- Framed by ornamental flourishes (acanthus curls, fleur-de-lis)
- Drop-cap or illuminated-letter treatment on narrative text

Our current hero-title stack: `text-shadow: 0 Npx 0 var(--accent-
red-deep)` letterpress + sometimes a soft gold glow. Functional
but flat — the shadow is a single planar drop without depth
articulation.

## Success criteria

- Every Alfa Slab hero title (BARNYARD BEDLAM, ESCAPE THE FOX,
  CHAMPION!, ROUND N, GRAND PRIX, SURVIVED!, ELIMINATED) gains
  a multi-layer emboss treatment: inner gold body + thin dark
  outer stroke + warm highlight + deeper drop shadow.
- Key hero titles also gain a pair of flanking unicode ornaments
  (e.g., `✦ TITLE ✦` or `❖ TITLE ❖`) styled in accent-gold with
  subtle drop-shadow. Applied via CSS `::before` / `::after` so
  DOM markup stays semantic.
- Narrator paragraph text (`.pg-narrator`, `.t-standings-
  commentary`, narrator overlay) gains an optional drop-cap
  treatment — the first letter rendered in Alfa Slab gold-
  embossed at 1.8x size, floated left.
- New tokens:
  - `--text-emboss-hero` — the multi-layer text-shadow stack
  - `--text-emboss-strong` — stronger variant for game-start
    beats (CHAMPION!, GRAND PRIX)
- No new font families, no new font weights. Leverage existing
  Alfa Slab / Cutive / Inter stack (Phase 4a vendored).

## Non-goals (explicitly out of scope for Phase 22)

- Commissioned illuminated letter PNGs (Hearthstone has these;
  we don't need them for Phase 22's "CSS emboss" scope —
  future phase if demand justifies).
- New font families. Alfa Slab + Cutive + Inter cover the
  product's voice completely; adding a fourth adds download
  weight without clear win.
- Variable font weight axes. Our vendored fonts are fixed-
  weight; Phase 4a preserved that choice.
- Typography on FORM inputs (name input placeholder) — the
  onboarding voice is casual/quick; embossed hero treatment
  would make the text-input beat feel like a title card.
- Controller gameplay hintbar labels (TAP · JUMP, etc.) —
  these are small functional labels, not hero titles.

## Architecture

### 22a — Multi-layer hero-title emboss

New tokens in `client-shared/theme.css`:

```css
--text-emboss-hero:
  -1px -1px 0 rgba(0, 0, 0, 0.85),
   1px  1px 0 rgba(0, 0, 0, 0.85),
  -1px  1px 0 rgba(0, 0, 0, 0.85),
   1px -1px 0 rgba(0, 0, 0, 0.85),   /* hairline outer stroke */
   0  1px 0 rgba(255, 248, 200, 0.4),  /* specular highlight (top) */
   0  3px 0 var(--accent-red-deep),     /* core letterpress */
   0  6px 14px rgba(0, 0, 0, 0.6),      /* deep drop shadow */
   0  0  28px rgba(244, 197, 66, 0.25); /* soft gold halo */

--text-emboss-strong:
  -1px -1px 0 rgba(0, 0, 0, 0.9),
   1px  1px 0 rgba(0, 0, 0, 0.9),
  -1px  1px 0 rgba(0, 0, 0, 0.9),
   1px -1px 0 rgba(0, 0, 0, 0.9),
   0  1px 0 rgba(255, 248, 200, 0.55),
   0  4px 0 var(--accent-red-deep),
   0  8px 20px rgba(0, 0, 0, 0.7),
   0  0  36px rgba(255, 221, 107, 0.4);
```

Applied via selector rewrite — hero titles currently use
`var(--text-shadow-stack)` or inline shadows. Swap to new tokens:

- `#lobby h1` (per-game host titles, main lobby FRANTICS-eyebrow)
- `.gp-go-hero` (controller gameover hero)
- `#postgame-overlay .pg-winner-name` (host postgame winner)
- `.t-title` (tournament STANDINGS / ROUND / CHAMPION! titles)
- `.t-round-intro-number` (ROUND 2 etc.)

### 22b — Side flourish ornaments

For the tournament champion CHAMPION! moment (peak beat), the
tournament round-intro, and the PostGame winner-name, add
flanking ornaments via `::before` / `::after`:

```css
.t-title.champion::before,
.t-title.champion::after {
  content: '\2756';  /* ❖ six pointed black diamond */
  color: var(--accent-gold);
  font-size: 0.5em;
  vertical-align: middle;
  margin: 0 0.3em;
  text-shadow: 0 1px 0 var(--accent-red-deep),
               0 0 8px rgba(255, 221, 107, 0.5);
  opacity: 0;
  animation: flourishFadeIn 0.8s ease-out 0.6s forwards;
}
```

Applied to:
- `.t-title.champion` (CHAMPION!)
- `.pg-winner-name` (host winner)
- `.t-round-intro-number` (ROUND 2)
- `.gp-go-hero` (controller gameover hero title)

The `flourishFadeIn` keyframe scales the ornament in from 0.6x
alongside the title. Sequenced so the title pops first, then
the flourishes bloom.

### 22c — Drop-cap on narrator paragraphs

Selector: `.pg-narrator`, `.t-standings-commentary`, `.gp-go-quip`,
`.gp-elim-quip` (all italic-Cutive narrator paragraph lines).

```css
.pg-narrator::first-letter,
.t-standings-commentary::first-letter,
.gp-go-quip::first-letter,
.gp-elim-quip::first-letter {
  font-family: var(--font-display);
  font-size: 1.8em;
  line-height: 0.9;
  color: var(--accent-gold);
  text-shadow: 0 1px 0 var(--accent-red-deep),
               0 0 8px rgba(244, 197, 66, 0.4);
  padding-right: 0.1em;
  float: left;
  margin-top: 0.05em;
  font-style: normal;
}
```

Respects the italic narrator voice (rest of paragraph stays
italic Cutive) while the drop-cap reads as decorative
illumination.

### Tokens + selector updates

- Add `--text-emboss-hero` + `--text-emboss-strong` to `:root`
  token block in `client-shared/theme.css`.
- Retrofit 5 hero-title selectors to consume the new tokens.
- Add `@keyframes flourishFadeIn` alongside existing
  `tGoldGlow` etc.
- Add `::before` / `::after` flourish rules for 4 surfaces.
- Add `::first-letter` drop-cap rules for 4 narrator surfaces.

No DOM changes. Pure CSS layer.

## Sub-phase breakdown

Phase 22 lands as a single commit covering 22a + 22b + 22c since
all three are CSS-only in the same file(s). No art handoff. 22d
DESIGN.md close.

- **22a + 22b + 22c** — one commit touching
  `client-shared/theme.css` (tokens + keyframe + drop-cap
  rules), `client-shared/tournament.js` (flourishes on champion
  / round-intro), `client-shared/postgame.js` (flourish on
  winner-name), `client-controller/gameplay.css` (gameover
  hero flourish + drop-cap on elim/gameover quips),
  `client-host-*/index.html` (hero-title token swap).

- **22d — DESIGN.md** — twenty-third realization + decisions-log.

## Testing

- Visual diff on main lobby (BARNYARD BEDLAM unchanged — main
  lobby's h1 is inside `assets/bg.png` painted scene, not a
  DOM element — verify no regression).
- Per-game lobby (ESCAPE THE FOX, GRAND PRIX, etc.) — verify
  embossed emboss reads clearly on painted banners.
- Tournament standings (TOURNAMENT / ROUND N OF N label above
  scroll) + champion (CHAMPION! with ❖ flourishes).
- PostGame winner-name with flourishes.
- Controller gameover hero with flourishes + quip drop-cap.
- Reduced-motion — flourish fade-in collapses to instant
  appearance; drop-cap + emboss are static, unaffected.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Emboss token too heavy on small mid-game HUD titles | New token applies ONLY to hero titles (listed selectors). Mid-game HUD (`.hud-title`, `.gp-eyebrow`) stays untouched — they keep their existing lightweight shadow |
| Unicode flourish ornament `\2756` renders inconsistently across browsers/fonts | Fall through to OS symbol font; if rendering is inconsistent at scale, swap to `\2726` (✦) or `\2605` (★). Selected `\2756` after testing: Inter covers it cleanly as monochrome gold glyph |
| `::first-letter` drop-cap breaks line-height on 2-line italic quips | Float:left + line-height:0.9 keeps the first letter inline with the rest. Existing paragraph line-height is 1.4-1.5 which absorbs the 1.8em cap height. Tested with a 2-line "Bob survived. Barely." quip — first "B" reads as illumination, rest flows below without jump |
| Multi-layer text-shadow compounds with existing inline shadows on `.pg-winner-name` | Token REPLACES the inline shadow, not stacks. All sites switching to the token drop their prior text-shadow line |
| Flourish `::before` / `::after` conflicts with existing pseudo-elements (e.g., breathing keyframe targets) | Checked: `.t-title` has no existing pseudo; `.pg-winner-name` has no pseudo; `.gp-go-hero` has no pseudo; `.t-round-intro-number` has no pseudo. Safe |

## Phase handoff

After Phase 22 lands, hero titles read as ornately-embossed
theatrical plaques with flanking flourishes — Hearthstone-tier
typography. Remaining Hearthstone-polish arc: Phase 23 ornate
object frames v2 (QR card, controller intro bulb holder,
progress dots, countdown plaque edges), Phase 24 parallax
backgrounds, Phase 25 sound design, Phase 26 animation polish.

Audit grade stays at A+ (3.84) — Phase 22 is internal typographic
polish, not a new scored dimension.
