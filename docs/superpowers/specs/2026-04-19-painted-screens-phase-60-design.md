# Phase 60 — Painted controller mobile screens

## Why

Phase 58-59 upgraded all host-side screens to Hearthstone-tier
painted heros. The controller (mobile phone client) still paints
its overlays against the generic `gameover-hall.png` (landscape,
shared with host) and the existing `elim-shadow.png`. At a
portrait aspect (typical 390×844 iPhone viewport) the landscape
heros crop awkwardly — either letterboxed with bars or showing
only the center slice.

Every player stares at their phone for the winner reveal,
elimination beat, and spectator wait. These are the highest-
frequency painted surfaces in the product. They deserve
dedicated portrait heros that match the host painted register.

## Success

- Three new mobile-portrait painted heros land:
  controller-gameover / controller-elim / controller-spectate.
- Aspect 720×1280 (9:16) PNG + WebP, safe-zones respect
  existing HTML overlay anchors (winner avatar, label, narrator
  quip, BACK-TO-LOBBY button).
- Controller flow on the phone reads as a painted series with
  the host Phase 58-59 work: when a player sees "you won this
  round" on their phone it's the same painted register as the
  host screen they just watched.

## Non-goals

- Controller onboarding (animal/color/name-pick) — its grid UI
  is already well-chromed with Phase 11a ticket frames.
- In-game HUD / joystick chrome — player is focused on gameplay
  input, not aesthetics.
- Hintbar-stage PNG refresh — assess later; low priority.

---

## Common anchor

All Phase 60 assets render at **720×1280 native PNG**
(9:16 mobile portrait), sRGB 8-bit, WebP via `cwebp -q 82`.

Safe-zones on a 390×844 iPhone viewport (scale 0.542):

| Zone | Rect in image (px @ 720×1280) | Use |
|---|---|---|
| Frame (all edges) | 0-60 px inset | Painted gold filigree |
| Top status band | 0-160 y | Painted header / bunting |
| Winner avatar pool | y 220-460 x-center | 132 px winner-portrait disc overlay |
| Label text zone | y 480-640 center | HTML hero-name + sub-label |
| Narrator quip zone | y 680-820 center | HTML narrator quote |
| Action button zone | y 960-1180 center | HTML BACK-TO-LOBBY button |

### Common vocabulary (shared across 3 assets)

- Gold filigree frame on all edges (portrait version of the
  Phase 58 landscape frame).
- Painted red velvet curtain folds on left+right edges (narrower
  than landscape version).
- Painted bunting arc across the top.
- Dark carnival-hall background.
- Fire ember particles.
- Painted cream canvas banner or plaque in the middle-upper
  region for text overlay.

---

## 60a — Controller gameover (winner announcement on phone)

**Use**: shown after each round to every player. Peak emotional
beat: "who won this round". Current HTML overlay renders the
winner's Phase 54 portrait disc + name + narrator quip + BACK
button.

**Path**: `/assets/gameover-hall-mobile-hero.png`

**Composition**:
- Portrait version of the Phase 58 proscenium theatrical stage.
- Empty painted spotlight pool center-upper (y~340) where the
  132 px winner-portrait disc sits.
- Painted cream canvas banner below spotlight for hero-name
  + "WINS!" label overlay.
- Painted "narrator pedestal" or small scroll lower for quip
  text.
- Painted stone stage apron at bottom for BACK button.

### 60a prompt

```
Hearthstone card-art style theatrical sideshow stage in
portrait orientation, painted digital illustration, dark
carnival-hall backdrop, thick baroque gold filigree frame
around the entire image, painted red velvet curtains with
gold tassels on left and right edges, golden pennant bunting
arc across the top inside the frame, painted wooden
proscenium arch with a carved gold-leafed signboard at the
top reading "FRANTICS" small and "WINNER" large, an empty
warm spotlight pool at stage center-upper ready for a
circular brass-framed portrait overlay, below the spotlight
a blank cream canvas banner pinned with gold studs (empty,
ready for HTML winner-name text overlay), below the banner a
smaller gold-leafed carved pedestal or scroll (empty, ready
for HTML narrator quip text), painted stone stage apron at
the bottom, fire ember particles floating throughout, warm
firelit atmosphere, rich palette of deep red + gold + warm
brown, painterly brush strokes, highly detailed, no humans,
no text except on the top signboard
--ar 9:16 --stylize 750 --v 6
```

### 60a integration

- `gameplay.js` line 284 swaps
  `gameover-hall.png` → `gameover-hall-mobile-hero.png` in
  the SpriteLoader preload list.
- `els.goBackdrop.src` at line 327 updates accordingly.
- Existing `.gp-gameover-backdrop` CSS (`position: absolute;
  inset: 0; object-fit: cover`) unchanged.

---

## 60b — Controller eliminated (ouch moment on phone)

**Use**: shown when the player themselves gets eliminated. Peak
negative emotional beat. Current HTML renders an animal-emoji
avatar + "ELIMINATED" label + narrator quip.

**Path**: `/assets/elim-shadow-hero.png`

**Composition**:
- Darker, colder palette than gameover.
- Painted cracked stone archway or doorway metaphor (player
  "exits the stage").
- Cold moonlight or ember-ash atmosphere instead of warm
  firelight.
- Empty 96 px disc pool for the player's own animal avatar
  overlay (same position as HTML `.gp-elim-avatar`).
- Painted "shadow" banner below for "ELIMINATED" label
  overlay.

### 60b prompt

```
Hearthstone card-art style theatrical stage in portrait
orientation, dark painted digital illustration, dramatic
somber atmosphere, dark cold palette of deep blue-grey +
muted red + dim gold, thick baroque gold filigree frame
around the entire image, painted dark red velvet curtains
closing inward with gold tassels on left and right edges,
painted cracked stone archway in the center with dark
silhouetted trees beyond suggesting the player's exit,
faint cold moonlight breaking through the archway, distant
ember particles drifting, an empty dim circular pool in
the upper third of the archway ready for a circular avatar
overlay, below the archway a blank dark banner or stone
plaque (empty, ready for HTML "ELIMINATED" text overlay),
below the banner an empty space for narrator quip text,
painted stone stage apron at the bottom, painterly brush
strokes, highly detailed, somber cinematic lighting,
no humans, no text
--ar 9:16 --stylize 750 --v 6
```

### 60b integration

- `gameplay.js` line 285 swaps
  `elim-shadow.png` → `elim-shadow-hero.png` in SpriteLoader
  preload.
- `els.elimBackdrop.src` line 306 updates accordingly.
- Existing `.gp-elim-backdrop` CSS unchanged.

---

## 60c — Controller spectate (watching after elimination)

**Use**: shown to eliminated player for the rest of the round
while they spectate. Calmer register than elim; player is
"sitting in the audience" now.

**Path**: `/assets/gp-spec-backdrop-hero.png`

**Composition**:
- Same painted stage vocabulary but viewed from the audience
  perspective (slight downward tilt, painted audience chairs
  or balcony rail silhouettes at the bottom foreground).
- Dimmed warm atmosphere — not somber like elim, not peak
  like gameover.
- Painted cream banner / scroll for spectate title overlay.
- List area below banner for HTML spectator-list rows.

### 60c prompt

```
Hearthstone card-art style theatrical stage in portrait
orientation viewed from an audience perspective, dark
painted digital illustration, thick baroque gold filigree
frame around the entire image, painted red velvet curtains
partially drawn on left and right edges, painted wooden
proscenium arch visible in the distance with the painted
stage beyond it dimly lit, bunting with warm glowing bulbs
across the top inside the frame, in the bottom foreground
painted silhouette of a balcony rail with a small gold
brass lantern on each side, below the balcony a blank
cream canvas banner pinned with gold studs (empty, ready
for HTML "STILL IN" or "SPECTATING" text overlay), painted
vacant audience-chair shapes in silhouette just inside the
balcony rail, dim warm firelit atmosphere, scattered ember
particles, rich palette of deep red + gold + warm brown,
painterly brush strokes, highly detailed, no humans,
no text
--ar 9:16 --stylize 750 --v 6
```

### 60c integration

- `gameplay.js` line 284 SpriteLoader preload adds new entry
  `{ el: els.specBackdrop, key: 'gp-spec-backdrop-hero',
     src: '/assets/gp-spec-backdrop-hero.png' }`.
- `els.specBackdrop.src` assignment (currently unset — check
  around gameplay.js:260) wires the new src.
- Existing `.gp-spec-backdrop` CSS unchanged.

---

## Delivery format

- PNG 720×1280 native sRGB 8-bit.
- WebP production via `cwebp -q 82 src.png -o out.webp`.
- Size budget: PNG ≤ 4 MB, WebP ≤ 300 KB.
- Filenames match paths in this spec.

---

## Integration phasing

- **Phase 60a** — 1 × gameover mobile hero, swap in
  `gameplay.js` preload + backdrop src. HTML overlay anchors
  already pointing roughly right — verify visually on 390×844,
  tune with per-image anchor overrides if painted spotlight
  drifts from HTML avatar center.
- **Phase 60b** — 1 × elim hero, swap in preload + src. Verify
  `.gp-elim-avatar` (96 px disc) aligns with painted pool.
- **Phase 60c** — 1 × spectate hero, wire into preload + src
  (new entry). Verify `.gp-spec-title` + list position on
  painted banner.
- **Phase 60d** — DESIGN.md realization block + close-out.

---

## Risks

- Mobile viewports vary (iPhone 14 390×844, iPhone SE
  375×667, Android 360×640, wide foldables). Hero at 720×1280
  covers 9:16 ratio cleanly; shorter/taller phones crop at
  top/bottom — keep painted content within the central 9:16
  safe zone.
- HTML overlay anchors currently tuned for the generic
  landscape `gameover-hall.png` center crop. Portrait hero
  may shift painted spotlight / banner positions; budget a
  per-hero anchor tuning pass (mirror Phase 58d).

## Open questions

- Does the controller need separate per-game (escape/race/
  hill/meteor) gameover/elim variants, or does one shared
  portrait hero suffice? **Recommendation**: one shared
  portrait hero per state. Per-game branching on mobile adds
  12 new assets (3 states × 4 games) without a proportional
  emotional payoff — the host-side painted round-intro +
  post-game already establish the per-game atmosphere.

## Phase handoff

Phase 60 closes → every painted surface in a tournament
session (host + controller) matches the Hearthstone-tier
register. Phase 61+ candidates: narrator overlay chrome,
hintbar-stage PNG refresh, onboarding polish, main lobby
bg.png refresh (if it still reads lower register against
the painted heros).
