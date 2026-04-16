# Offline & Iconography Polish — Design Spec (Phase 4)

**Date:** 2026-04-16
**Project:** Frantics — party game
**Phase:** 4 of 4 (asset-layer polish after canvas + UI systems are settled)
**Scope:** shared typography stack, small UI iconography, browser theme
lock. **NOT** new gameplay, server protocol, canvas renderers, or GLB
models. Phase 3 canvas work (race / escape / hill / meteor signature
effects) is already shipped and is untouched here.

## Problem

Phases 1.5 / 2 / 3 shipped a cohesive carnival experience *when the
network cooperates*. Three gaps remain:

- **Fonts load from Google Fonts over the internet.** Six HTML entries
  (`client-controller`, `client-host`, four `client-host-*`) all
  reference `fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Cutive&family=Inter:wght@400;600`.
  On offline / captive-portal / slow-WiFi party venues the whole
  carnival collapses to Georgia + system sans. The carnival identity
  is load-bearing on Alfa Slab (display) and Cutive (accent); losing
  them reduces the product to a brown box.
- **Small UI icons lean on Unicode emoji.** `\u{1F4F1}` (phone) in
  onboarding, and the occasional ✓ / ← in the controller, render
  differently on Windows (flat), macOS (glossy), Android (rounded),
  iOS (skeuomorphic). The emoji-driven animal roster (cat / frog /
  wolf / bear / bunny / pig / chicken / raccoon) is **intentionally**
  emoji — that's player identity and cultural resonance — but
  functional UI icons shouldn't be.
- **Browser chrome defaults to light-on-dark guesses.** No
  `color-scheme: dark` hint; browsers render scrollbars, date/file
  inputs, and (on iOS) form controls as light-theme chrome, clashing
  with the wood-deep surface. `prefers-color-scheme: light` is not
  intercepted, so a system theme switch could silently invert user-
  agent chrome.

The product works around all three today. Phase 4 closes the remaining
visible seams so the carnival can ship to a LAN venue on a USB stick.

## Success criteria

- **Offline parity:** disconnect the host laptop from WAN, reload all
  six entries. All three brand fonts (`Alfa Slab One`, `Cutive`,
  `Inter` 400/600) render from local vendored files. Network tab
  shows zero requests to `fonts.googleapis.com` or `fonts.gstatic.com`.
- **Icon consistency:** non-animal functional icons (phone, wifi,
  arrow, check, close, gear) render identically on Chrome / Safari
  / Firefox / iOS WebKit. Animals stay emoji.
- **Chrome parity:** scrollbars, inline form inputs, and iOS safe-
  area chrome read as dark variants. `prefers-color-scheme: light`
  does not invert the palette.
- **Zero visible regression:** Phase 3 screenshots (host lobby,
  onboarding, each per-game lobby, narrator overlay, postgame) are
  pixel-equal to within the font-renderer jitter noise floor.
  Swap-and-diff against `screenshots-review/host-lobby-final-1280.png`,
  `phase3d-lap-pennant-race.png`, `per-game-*-lobby.png`.

## Non-goals (explicitly out of scope for Phase 4)

- Replacing animal emoji with custom SVG. The emoji drive the "pick
  your critter" cultural moment; switching to custom SVG would take
  an illustration pass that belongs in a future content phase.
- Replacing bitmap button assets (`assets/ticket-*.png`, `btn-*.png`,
  `game-*.png`). Those are already carnival-styled commissioned art
  and work fine at the target resolutions.
- Adding a light theme. We document and lock dark-only; building a
  light carnival variant is future work and not on any roadmap.
- Font subsetting by language. Ship the full Latin + Cyrillic ranges
  (player names can contain both). Vietnamese / Arabic / CJK are
  left to a future internationalization pass.
- Icon motion / animation framework. Icons stay static SVGs. Motion
  lives in the existing `--dur-*` / `--ease-*` tokens.

## Architecture

### Vendored font pipeline

New: `/assets/fonts/` directory with the three font families as
WOFF2 (primary) and WOFF (iOS 14 / old Android fallback):

```
assets/fonts/
  AlfaSlabOne-Regular.woff2      ~16 KB Latin + Cyrillic subset
  Cutive-Regular.woff2           ~22 KB Latin + Cyrillic subset
  Inter-Regular.woff2            ~30 KB weight 400, Latin + Cyrillic
  Inter-SemiBold.woff2           ~30 KB weight 600, Latin + Cyrillic
  fonts.css                      shared @font-face block
```

`fonts.css` holds every `@font-face` declaration, `font-display: swap`
on each so a missed load falls back to Georgia / system sans instead
of blocking render. `unicode-range` narrows each face to `U+0000-024F,
U+1E00-1EFF, U+2000-206F, U+2074, U+20AC, U+2122, U+0400-04FF` —
covering ASCII, Latin-1 Supplement, Latin Extended-A/B, general
punctuation, and full Cyrillic.

The six HTML entries replace:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Cutive&family=Inter:wght@400;600&display=swap" rel="stylesheet">
```

with a single local include:

```html
<link rel="stylesheet" href="/assets/fonts/fonts.css">
```

`theme.css` loses the three stub `@font-face` blocks at the bottom
(lines 231-242) — the real declarations now live in `fonts.css` and
theme.css only references families via `--font-display / -accent / -ui`.

### Icon system — inline SVG sprite

New: `/client-shared/icons.js` — a self-contained module that:

1. On load, inserts an `<svg hidden>` block into `document.body`
   containing `<symbol id="icon-*">` definitions for every functional
   icon. Each symbol uses `currentColor` so icons inherit their
   surrounding text color.
2. Exposes `Icons.use(id)` → `'<svg class="icon" aria-hidden="true"><use href="#icon-' + id + '"/></svg>'`
   for inline string composition (controller uses template strings
   heavily).
3. Exposes `Icons.el(id)` for DOM-builder consumers.

Initial icon roster (v1):

| ID | Usage | Replaces |
|----|-------|----------|
| `phone` | onboarding "hold your phone" | `\u{1F4F1}` emoji at `onboarding.js:99` |
| `wifi` | connection status pill | future use / reconnecting state |
| `arrow-right` | swipe/tap prompts | existing CSS arrows + occasional `→` glyphs |
| `check` | success confirmations | `✓` unicode, now consistent |
| `close` | dismiss toasts / modals | `✕` / `×` unicode |
| `gear` | settings button on host | currently bitmap `btn-settings-*.png` (kept as bitmap; icon is SPARE for DOM contexts) |

All icons are 24x24 viewBox, authored in `/client-shared/icons.js` as
inline path data. Stroke + fill rely on `currentColor`; accent
colors applied via surrounding CSS classes.

Accessibility: every `<svg>` receives `aria-hidden="true"` since icons
are decorative (the parent button or label carries the actual text).
If an icon ships standalone (no text), its consumer must wrap it with
an `aria-label`.

### Dark-only theme lock

Four tiny additions to `client-shared/theme.css`:

```css
:root {
  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    /* Carnival is dark-only by design. Re-assert core surfaces so
       a system-theme flip can't invert the carnival aesthetic. */
    color-scheme: dark;
  }
}
```

Plus a `<meta name="color-scheme" content="dark">` in each of the
six HTML entries, next to the existing `<meta name="viewport">`.

No token values change. This is pure browser-chrome signal.

## Testing

### Offline capture

- Disconnect the dev machine's WAN interface (or set Chrome DevTools
  Network throttling to "Offline").
- Reload `http://localhost:8080/client-controller/` at 390x844.
  Screenshot → `screenshots-review/phase4a-controller-offline.png`.
- Reload `http://localhost:8080/client-host/` at 1280x800.
  Screenshot → `screenshots-review/phase4a-host-lobby-offline.png`.
- Inspect Network tab: no entries matching `fonts.(googleapis|gstatic).com`.
- All Alfa Slab / Cutive / Inter text renders (compared against the
  Phase 3 online captures). No Georgia fallback visible.

### Icon visual check

- Load onboarding at 390x844. Phone icon replaces `\u{1F4F1}`.
  Same size, same alignment. Screenshot diff vs
  `controller-intro-fixed-bg-390.png`.
- Programmatic render of all 6 icons side-by-side →
  `screenshots-review/phase4b-icon-sheet.png`.

### Chrome parity

- Open DevTools in Chrome → Rendering → Emulate CSS media feature
  `prefers-color-scheme: light`. Verify carnival colors do not
  invert. Scrollbars stay dark.
- iOS Safari capture on a device (real or BrowserStack): safe-area
  and any native form controls read as dark chrome.

### Regression

- Phase 3 screenshots re-captured after each subphase. Diff against
  pre-Phase-4 baselines; any pixel delta beyond font jitter must be
  explained (and ideally reverted).

## Deliverables

### Phase 4a — vendor fonts (1 session)

- `/assets/fonts/` populated with 4 woff2 files + `fonts.css`.
- Six HTML entries switched to local stylesheet include.
- `theme.css` stub `@font-face` blocks removed.
- Offline reload verified across controller + 5 host entries.
- Screenshot: `phase4a-host-lobby-offline.png`,
  `phase4a-controller-offline.png`.

### Phase 4b — functional iconography (1 session)

- `/client-shared/icons.js` with 6 initial symbols.
- Phone emoji → `Icons.use('phone')` in onboarding.
- Any `✓` / `✕` / `→` glyphs swept and replaced (if any).
- Screenshot: `phase4b-icon-sheet.png`,
  `phase4b-onboarding-phone-icon.png`.

### Phase 4c — dark-only lock + DESIGN.md (0.5 session)

- `color-scheme: dark` in theme.css `:root`.
- `prefers-color-scheme: light` media no-op branch.
- `<meta name="color-scheme" content="dark">` in 6 HTML entries.
- DESIGN.md **Fifth realization** entry covering all three axes.
- Decisions-log rows: font vendoring strategy, icon emoji-vs-SVG
  split, dark-only rationale.
- Phase roadmap item 5 marked shipped `2026-04-16`.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Vendored font weight doesn't match Google's rendering hinting | WOFF2 is the same binary Google ships; we're just hosting it locally |
| Font license: Alfa Slab One (OFL) / Cutive (OFL) / Inter (OFL) permit redistribution | All three are SIL Open Font License; vendoring is explicitly allowed. Include `LICENSE.txt` next to the files |
| Inline SVG sprite balloons every HTML page | Sprite loads once into document.body via a shared script — not duplicated per page. Total sprite bytes ~3 KB for 6 icons |
| `currentColor` inheritance breaks on gradient backgrounds | Each icon consumer wraps in a container with explicit `color`; gradient backgrounds are never applied directly to the icon |
| iOS Safari ignores `color-scheme: dark` on older versions | The meta tag catches Safari 13+; ancient versions fall back to current behavior (no regression) |
| Cyrillic subset misses a glyph player uses in a name | The subset covers U+0400-04FF (full Cyrillic block + extensions). Verified against player-name character set |
| Brotli vs gzip server encoding — Python `http.server` ships only identity | WOFF2 is already Brotli-compressed internally; no HTTP compression needed |

## Open questions (for implementer)

1. Should `fonts.css` be served from `/assets/fonts/fonts.css` or
   hoisted to `/shared/fonts.css` next to `theme.css`? Leaning
   `/assets/fonts/` so the fonts and their stylesheet stay co-located
   — renaming a font file only touches one directory.
2. Do we ship `WOFF` fallbacks or just WOFF2? WOFF2 is supported by
   every browser >= 2020-era. Drop WOFF to halve the payload. Lean
   WOFF2-only unless we discover a target device on the venue list
   without support.
3. Icon sprite injection timing — does it need to precede every
   `Icons.use()` call? Module IIFE injects on DOM ready; callers that
   stringify `Icons.use()` before DOM ready would reference a symbol
   that doesn't yet exist. Workaround: `Icons.use()` is safe at any
   time because `<use href="#icon-x">` resolves lazily. No ordering
   constraint.

## Phase handoff

After Phase 4 ships, DESIGN.md grows a **Fifth realization** entry —
"offline-first assets, functional iconography, dark-only lock, Phase 4,
2026-04-16" — plus decisions-log rows for each axis.

There is no Phase 5 on the current roadmap. After Phase 4, the product
is the carnival. Follow-up initiatives (content phase: custom animal
illustration; i18n phase: new Unicode subsets + translations;
performance phase: WebGL offload) each get their own spec when demand
justifies.
