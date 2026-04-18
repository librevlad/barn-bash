# Sound Design Extensions — Design Spec (Phase 25)

**Date:** 2026-04-18
**Project:** Frantics — party game
**Phase:** 25 of ?, after Phase 24 (parallax + torchlight).
Fifth sub-phase of the Hearthstone-polish arc.
**Scope:** extend the existing `client-shared/sound.js` (WebAudio
synthesis, 384 lines, ~30 SFX + 5 game-themed music loops) with
tournament theme music, postgame victory fanfare, and UI click
SFX for button press feedback. Zero audio files; all procedural.
**NOT** a new sound.js rewrite, not a vendored audio layer, not
per-game biome ambiences.

## Problem

sound.js already covers:
- 5 game-themed music loops (escapeFox, hill, meteor, race,
  lobby)
- ~30 SFX (jumps, pickups, fox growls, countdown, elimination,
  winner, champion)

But there are gaps in the sound coverage:

1. **Tournament overlays are silent** — standings, round-intro,
   champion all render without music despite being the longest-
   held full-screen beats in the product.
2. **No victory fanfare sting** — when PostGame fires with a
   winner, the music stops but there's no triumphal sting
   highlighting the moment.
3. **UI buttons are silent** — clicking PLAY / CUSTOMIZE /
   SETTINGS, game-select cards, etc. gives no auditory feedback.

Hearthstone's signature is rich audio feedback on every
interaction. Phase 25 closes those three gaps.

## Success criteria

- `sound.js` gains:
  - `THEMES.tournament` — slower bass-heavy theme with gilded
    arpeggio, fitting the between-round + champion moment
  - `effects.fanfare` — 5-note triumphal fanfare (C-E-G-C-E
    ascending, 150ms each, trumpet-like sawtooth)
  - `effects.uiClick` — short tick (1200Hz sine, 60ms, low
    volume) for button presses
  - `effects.uiHover` — even shorter tick (880Hz sine, 30ms,
    very low volume) for hover feedback
- Tournament.show() calls `Sound.startMusic('tournament')` when
  an overlay activates; Tournament.hide() calls stopMusic with
  a fade transition that hands off to the per-game music if
  still running.
- PostGame.show() with winner calls `Sound.play('fanfare')` as
  a 0.5s-delayed layer (so "you survived" + fanfare stack
  musically).
- `.ticket-btn`, `.modal-btn`, `.sprite-btn`, `.gp-go-btn`,
  `.pg-btn` pointerdown handlers call `Sound.play('uiClick')`.
- Zero regressions on existing SFX + music.

## Non-goals (explicitly out of scope for Phase 25)

- Vendored audio files (music loops, voice acting, crowd
  cheers, etc.). Synthesis-only keeps the project offline-
  first and zero-byte-on-wire.
- Controller haptics beyond existing vibrate patterns.
- Per-player voice lines / character-specific SFX.
- Audio ducking / mixer logic. A single `Sound.play` stack is
  simpler; amplitude tuned per-effect to avoid clipping.

## Architecture

### 25a — Tournament theme

Add to `THEMES` object in `sound.js`:

```js
tournament: {
  bpm: 90, vol: 0.045,
  bass: [N.C3, N.C3, N.G2, N.C3, N.F3, N.F3, N.C3, N.G2],
  melody: [N.E5, N.G5, N.C6, N.G5, N.E5, N.F5, N.E5, N.C5],
  arp: [N.C4, N.E4, N.G4, N.C5, N.E5, N.C5, N.G4, N.E4],
  bassType: 'sawtooth', melType: 'triangle', arpType: 'sine',
  filterFreq: 700,
},
```

Slower (90 BPM vs 160 for race), richer arpeggio (8-note
ascending-descending), quieter volume so narrator quips read
over it.

Wire in `client-shared/tournament.js` `show()`:

```js
function show() {
  createOverlay();
  overlay.classList.add('show');
  if (typeof Sound !== 'undefined') {
    try { Sound.startMusic('tournament'); } catch (e) {}
  }
}
function hide() {
  if (overlay) overlay.classList.remove('show');
  if (typeof Sound !== 'undefined') {
    try { Sound.stopMusic(); } catch (e) {}
  }
}
```

### 25b — Victory fanfare sting

Add to `effects`:

```js
fanfare() {
  tone(523, 0.15, 'sawtooth', 0.15);                          // C5
  setTimeout(() => tone(659, 0.15, 'sawtooth', 0.15), 120);  // E5
  setTimeout(() => tone(784, 0.15, 'sawtooth', 0.15), 240);  // G5
  setTimeout(() => tone(1047, 0.25, 'sawtooth', 0.18), 360); // C6
  setTimeout(() => tone(1319, 0.4, 'sawtooth', 0.22, 0.02), 540); // E6 sustain
},
```

Wire in `postgame.js` `show()` when winner is present:

```js
if (hasWinner && typeof Sound !== 'undefined') {
  setTimeout(() => { try { Sound.play('fanfare'); } catch (e) {} }, 400);
}
```

Delayed 400ms so the overlay fade-in finishes before the fanfare
stings — the ear reads them as "the overlay settles, then the
horn celebrates."

### 25c — UI click SFX

Add to `effects`:

```js
uiClick() {
  tone(1200, 0.06, 'sine', 0.12, 0.005);
  setTimeout(() => tone(1800, 0.04, 'sine', 0.08, 0.005), 20);
},
uiHover() {
  tone(880, 0.03, 'sine', 0.06, 0.005);
},
```

Wire via a single global listener in `sound.js` that watches
`pointerdown` on eligible selectors:

```js
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest(
    '.ticket-btn, .modal-btn, .sprite-btn, .gp-go-btn, .pg-btn, .btn-start, .back-link'
  );
  if (t && !t.disabled) play('uiClick');
});
```

Hover SFX is optional and skip for touch devices. Gate on
`(hover: hover)` media query via a one-time listener check.

### Stagger + ducking

Tournament theme at vol 0.045 layers alongside narrator quips at
full volume (Narrator uses its own pill; voice stays text-only).
Fanfare at 0.22 peak rings louder than music — ear centers on it
naturally. uiClick at 0.12 is quiet enough not to dominate.

## Sub-phase breakdown

Phase 25 lands as one implementation commit covering 25a + 25b
+ 25c (all in sound.js + 2 wire-points). 25d DESIGN.md close.

## Testing

- Open tournament standings overlay — verify theme starts
  (slow bass + melody + arp).
- Wait for round-intro → champion transitions — verify theme
  continues smoothly across modes.
- Close tournament — verify music fades out.
- Trigger PostGame with winner — verify fanfare at 400ms after
  show.
- Click PLAY button on main lobby — verify click tick.
- Click game-select card — verify click tick.
- Verify existing SFX still fire (countdown, jumps, etc.) — no
  regression.

## Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| Tournament theme drowns narrator quips | Theme volume 0.045 is well below the 0.12 SFX baseline. Narrator quips are text-only; their "audio" is the narrator overlay showing |
| Fanfare steps on existing `winner`/`champion` SFX | Both existing SFX are game-specific — they fire DURING gameplay ending. Fanfare is on PostGame overlay open, which fires AFTER gameplay stops. Sequence: game ends → winner SFX → PostGame show → fanfare. Clean separation |
| UI click SFX fires on unintended elements | Selector is a narrow `.closest()` list of known button classes. Disabled buttons excluded. No accidental fires |
| Mobile Safari needs gesture-unlock | Existing `ensure()` + click-unlock logic in sound.js handles this; new effects inherit the unlocked context |

## Phase handoff

After Phase 25, the product has full audio feedback coverage:
game music during play, tournament music during overlays,
fanfare on victory, click ticks on buttons, rich per-action
SFX. Remaining Hearthstone-polish arc: Phase 26 animation polish.

Audit grade stays at A+ (3.84).
