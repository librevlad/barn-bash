# Post-Audit Polish — Design Spec (Phase 17)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 17 of ?, after Phase 16 (ornament motion) closed 2026-04-17
**Scope:** ship the fixes surfaced by the 2026-04-17 AAA design audit
(F-01..F-16), vendor **Pretext** for DOM-text measurement, and roll out
**WebP content-negotiation** across the whole `/assets/` tree.
**NOT** new art, new gameplay, new tokens beyond `--color-player-unknown`.

## Problem

After Phase 16 closed the last AAA-polish dimension (ornament motion),
a full design audit ran against localhost:3000 with both host and
controller surfaces. The audit produced:

- 16 labelled findings (F-01..F-16) covering a11y, content, hierarchy,
  motion, performance, responsive, typography, and interaction.
- A separate subagent pass that added F-14, F-15, F-16 to the triage.
- A "WRONG SHOW / WRONG SCREEN" gate pair needed on host and controller
  to politely redirect mis-opens (phone opening /host/, laptop opening /).
- A wire-weight problem — the BARNYARD BEDLAM backdrop alone is 2.77MB
  PNG, pushing host load to ~1.7s on localhost and worse on LAN.
- A text-layout problem — narrator quips, elimination copy, winner hero
  + subline, and game-modal rules tooltips all relied on CSS
  approximation (`line-height × rough-line-count`) for their container
  heights, producing inconsistent ledges across phrases.

The audit doc lives at
`.gstack/design-audit-20260417/design-audit-frantics.md` and is the
canonical record of findings, triage, and verification tables. This
spec is the phase-level companion that packages the audit's fixes
alongside two structural additions (Pretext + WebP) into a coherent
Phase 17 arc.

One follow-up finding, **F-17**, surfaced after the audit closed: the
controller's "PLEASE ROTATE" gate fires inside the `/test/` dev helper
whenever the controller iframe drops below ~400px tall — any standard
laptop height makes it unusable. Included here because it's the same
category of pattern (media-query gate needs device-aware qualification)
as F-08 and F-09.

## Success criteria

- All 14 fixable findings (F-01, F-02, F-03, F-04, F-05-partial, F-07,
  F-08, F-09, F-11, F-12, F-13, F-14, F-15, F-16) closed on master,
  each with its own commit message referencing the finding ID.
- F-06 and F-10 marked **not-applicable** (false positives on initial
  pass — see triage).
- F-17 fixed, rotate-gate qualified by `(pointer: coarse)`.
- Pretext vendored at `client-shared/pretext.js` + `pretext-hooks.js`,
  wired into the four live text sites (elim-quip, game-over hero,
  game-over subline, game-over quip, narrator body, standings
  commentary, modal card-desc + tip-body).
- WebP sibling exists for every `.png` in `/assets/` that the host or
  controller fetches. Server performs content negotiation on `Accept:
  image/webp`. Cold-load payload budget drops ≥80% for image traffic.
- DESIGN.md gains an **eighteenth realization** block describing the
  audit pass, Pretext, and WebP, plus new decisions-log rows.
- Design score delta: **B (2.99) → A+ (3.84)** per the audit's own
  verification matrix (documented in the audit file, not re-derived
  here).

## Non-goals (explicitly out of scope for Phase 17)

- New art commissions. The only new asset family is WebP re-encoding of
  existing PNGs — byte-identical rendering, smaller wire.
- New game modes, new narrator voice, new sound effects.
- F-05's `<main>` landmark — deferred; `<h1>` + `aria-label` on the
  background image is the 80%-value partial fix and the audit accepts
  it.
- A global "test mode" bypass that silences all gates inside /test.
  F-17's pointer-qualified fix is the conservative, per-gate approach;
  mobile-gate (F-09) intentionally stays width-only because its intent
  is layout-based, not device-based.
- Per-game-host AAA polish beyond what Phase 10-16 already shipped.

## Architecture

### 17a — Audit findings pass

Each finding is its own focused commit. The triage in the audit doc
tags each one HIGH / MEDIUM / LOW and maps fix commits:

| ID | Category | Fix commit | Touched |
|----|----------|-----------|---------|
| F-01 | content | 5eeac75 | `client-shared/tournament.js` — guard `state.totalRounds` fallback |
| F-02 | a11y | 1f0572e | host sprite-btn trio gets `aria-label` per button |
| F-03 | a11y | b64b82c | controller `<meta viewport>` drops `maximum-scale=1, user-scalable=no` |
| F-04 | a11y | 2e03ba1 + b64b82c | `<html lang="en">` added to host + controller |
| F-05 | hierarchy | 367a31e | host gains `<h1>` (sr-only) + `role="img"` + `aria-label` on `#bg`; `<main>` deferred |
| F-07 | join-flow | 68ead5a | QR code rendered on host `#join-card` via vendored `qrcode-generator` (MIT, ~20KB) |
| F-08 | responsive | b5032dd | controller `#ob-desktop-gate` shown at `(min-width: 1024px) and (hover: hover) and (pointer: fine)` |
| F-09 | responsive | 10ad10d | host `#host-mobile-gate` with inline SVG TV icon, shown at `(max-width: 768px)` |
| F-11 | hierarchy | d45d688 | "TAP TO SKIP" lifts from ~33% / 10px to ~85% / 13px + breathing anim |
| F-12 | typography | daeae48 | `font-family` hoisted to `html`, form controls inherit |
| F-13 | performance | cb9ebbc | host `bg.png` (2.77MB) → `bg.webp` (298KB, -89%) via `image-set()` + server MIME |
| F-14 | color | b571da9 | `#888` inline fallback → `var(--color-player-unknown)` |
| F-15 | motion | 922d28a | 8 hardcoded `0.15s/0.2s/0.3s/0.4s` → `var(--dur-*)` tokens |
| F-16 | timing | abd4389 | controller intro dwell 1200ms → 2800ms so skip-hint is readable |
| F-17 | responsive | b30ec41 | controller rotate-gate qualified by `(pointer: coarse)` — stops firing inside `/test/` iframes |

F-06 (36-px gamepad buttons) and F-10 (bulb row static) were
investigated live and found already satisfied — F-06 is a desktop
dev helper hidden behind `@media (hover: none)` on touch, F-10 is
already wired to `obBulbPulse`. Tagged **not-applicable**.

### 17b — Pretext integration

Pretext (kazuhikoarase/pretext.js, MIT, ~30KB) is a pure-JS text
layout engine. Vendored under `client-shared/pretext.js` so both host
and controller can import it directly from `/shared/`. A thin
imperative wrapper at `client-shared/pretext-hooks.js` exposes:

```
PretextHooks.measure(el)     — prepare+layout, applies minHeight
PretextHooks.release(el)     — stop tracking
PretextHooks.relayoutAll()   — re-run layout on every tracked element
PretextHooks.whenReady(fn)   — defer until Pretext + fonts resolve
PretextHooks.isReady         — boolean flag
```

The hooks script is loaded from both `client-host/index.html` and
`client-controller/index.html`. It gates measurement on
`import('/shared/pretext.js')` + `document.fonts.ready` so the first
`prepare()` always uses real Inter/Alfa Slab/Cutive metrics, not
fallbacks. A body-scoped `ResizeObserver` drives `relayoutAll()` so
elements re-flow when the viewport width changes.

Consumer sites:

- `client-controller/gameplay.js` — elim-quip on
  `phase('eliminated')`, hero + subline + quip on `onGameOver()`.
- `client-host/main.js` — the game-select modal's `.card-desc` and
  `.tip-body` at the moment the modal opens. Each card's description
  and rules tooltip gets measured once per open, so the frames sit
  tightly against their text without CSS approximation.
- `client-shared/narrator.js` — quip body re-measured on every
  `Narrator.show` call, so the overlay pill sizes to the real
  wrapped content.
- `client-shared/tournament.js` — standings-mode commentary line
  re-measured on each standings render, so the cream plank row
  doesn't over-reserve height when the commentary is short.

Fallback: if the dynamic import fails or
`document.fonts.ready` rejects, `PretextHooks.measure` is a no-op
and elements keep their CSS-defined heights. The pattern is additive,
never load-bearing.

### 17c — WebP content-negotiation

WebP gives 70-90% smaller payloads than PNG at visually identical
quality for our painterly / illustration asset profile. Two commits:

1. **535b56e** — 45 WebP siblings for every `.png` over 500KB (86.4MB
   PNG → 6.3MB WebP, -93%). `server/index.js` gains `preferWebp()`:
   when a request for `/assets/foo.png` carries
   `Accept: image/webp` AND a sibling `.webp` exists, the server
   serves the WebP with `Content-Type: image/webp`. Response carries
   `Vary: Accept` so proxies cache the two representations separately.
2. **b1b201d** — 57 more WebP siblings to complete the 102-asset
   sweep. Every path referenced in HTML/JS/CSS/canvas code gets the
   WebP automatically; every existing `.png` URL keeps working.
   Ancient clients that don't advertise `image/webp` still receive
   the PNG transparently.

Totals after sweep: `.png` 89MB (unchanged — source canonical),
`.webp` 7.1MB (-92% of PNG). Mobile controllers on LAN Wi-Fi stop
paying the 250KB-per-ticket tax on cold load.

### 17d — DESIGN.md realization

After 17a + 17b + 17c land, DESIGN.md gains:

- **Eighteenth realization** — narrates the audit pass, Pretext wiring,
  and WebP rollout. Points to the audit doc and this spec.
- Roadmap item **17** marked shipped with 2026-04-18 date.
- Decisions-log rows for:
  - Pointer-qualified rotate-gate (F-17) as a general pattern.
  - Pretext gating on `document.fonts.ready` + dynamic import.
  - Pretext hooks as additive / never load-bearing.
  - WebP negotiation via server-side MIME swap + `Vary: Accept` (keeps
    all asset URLs unchanged).
  - PNG retained as source-canonical (canvas renderers sample from
    WebP-decoded data uniformly; no art-pipeline flip).

## Testing

- **Audit doc verification matrix** — 12 checks across host desktop
  1440×900, host mobile 375×812, controller mobile 390×844, controller
  desktop 1280×720, escape host, all pass (no regression, no new
  console errors).
- **Screenshots-review/** — F-17 fix verified at 1440×900 and
  1440×650 standard laptop heights. At 1024×500 the controllers
  render WELCOME BACK without rotate-gate.
- **matchMedia probes** at 1024×500 confirm the media-query fix:
  ```
  (orientation: landscape) and (max-height: 500px)              → true
  (orientation: landscape) and (max-height: 500px) and (pointer: coarse) → false
  ```

## Deliverables

### Phase 17a — audit findings fixes (14 commits)

Already landed on master between 2e03ba1 and cb9ebbc (2026-04-17),
plus F-17 fix b30ec41 (2026-04-18). One commit per finding, each
referencing the finding ID. See table in Architecture §17a.

### Phase 17b — Pretext (3 commits)

- `e1642ad` — vendor Pretext to `client-shared/`.
- `cc0531c` — wire hooks into live gameplay + host.
- `20f0018` — host game-select modal card-desc + tooltip.
- `4b4d5e0` — narrator quip measurement.
- `82c5cb1` — tournament standings commentary measurement.

### Phase 17c — WebP (2 commits)

- `535b56e` — 45 WebP siblings + server content negotiation.
- `b1b201d` — 57 more WebP siblings (full 102-asset coverage).

### Phase 17d — realization + spec

- This spec (`docs/superpowers/specs/2026-04-18-post-audit-polish-design.md`).
- `docs(spec): Phase 17 — post-audit polish + Pretext + WebP` commit.
- `docs(design): Phase 17d — eighteenth realization + close Phase 17`
  commit adds the realization block and decisions-log rows.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| `(pointer: coarse)` is not supported in some older browsers | Gracefully degrades: gate doesn't show on unsupported browsers, which matches the intent (unsupported browsers are probably desktops anyway). Target modern browsers (Safari 13+, Chrome 41+, Firefox 64+) — all supported |
| Pretext import fails → elements render without computed minHeight | Hooks are additive; falling back to CSS-defined heights is the existing behavior. No load-bearing dependency |
| WebP `Accept` negotiation gets cached by an intermediate proxy that strips `Accept` | `Vary: Accept` is set on every response so well-behaved proxies split caches. Misbehaving proxies would also break any other Accept-negotiated content, not Frantics-specific |
| Audit doc and this spec go out of sync | Audit doc is the canonical finding log. This spec cites it rather than duplicating the triage table verbatim. Future audit passes open a new audit doc |
| Pretext metrics drift if fonts hot-swap | `document.fonts.ready` covers the first paint. Any post-load font change triggers a resize event; `relayoutAll()` re-runs layout. FOUT-induced reflow matches the existing CSS behavior |

## Open questions

1. Should `/test/` gain a `?test=1` query param forwarded to host +
   controller iframes, so both `host-mobile-gate` (F-09) and
   `controller-desktop-gate` (F-08) also disable inside the dev
   helper? Not scoped into 17 — F-17's per-gate pointer qualifier
   covers the reported user bug without restructuring `/test/`.
2. F-05's `<main>` landmark — defer to a future a11y pass or close
   now with a quick DOM wrap? Leaning defer — host layout uses
   absolute-positioned children and wrapping with `<main>` requires
   a z-index review.

## Phase handoff

After 17d lands, the polish + perf + text-layout arc is complete.
The project sits at audit grade **A+ (3.84 / 4.3)**. Next phase
candidates:

- i18n (Cyrillic / Latin Extended) — would exercise Pretext's
  break-iterator support and the multi-subset font split.
- WebGL offload for the canvas renderers — Phase 3's palette
  scaffold is the hook.
- GLB model extension for the four animals that currently fall back
  to `CharDraw.blob` (bear, bunny, pig, chicken, raccoon).
- Per-game second-hero-art (e.g. escape's fox predator, hill's
  defender crest, meteor's safe-zone trophy).

None of these are scheduled — each opens its own spec when demand
justifies.
