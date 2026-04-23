// src/core/chaosPacing.js
// Pure helpers that translate a Party Mode session's progress into a
// chaos "intensity" number the ChaosEngine can use to shorten gaps
// between events and weight the swap event into the roll. Classic mode
// keeps the original fixed pacing (intensity=0 always) — it has a hard
// 5-round cap so intra-session escalation has nowhere to go.
//
// intensity is plain 0..1:
//   0   → base behaviour (long 8-15s delays, no swap events)
//   0.5 → mid-session party (delays ~6-11s, mild swap chance)
//   1   → deep party (delays ~4-8s, swap ~15% of rolls)
//
// The exact curve stays an implementation detail so unit tests can lock
// just the contract: monotonic non-decreasing in round, capped at [0, 1],
// and 0 in classic mode.

(function(BB) {
  // Party-mode ramp: first minigame feels normal, by game 9 we're at
  // max. Deliberately linear, not exponential — real sessions rarely go
  // past 10-12 rounds before the "ХВАТИТ" exit, so an 8-step ramp hits
  // most of its range when anyone is paying attention.
  function intensityFromRound({ round = 1, mode = 'classic' } = {}) {
    if (mode !== 'party') return 0;
    const r = Math.max(1, Math.floor(round));
    const raw = (r - 1) / 8;
    if (raw <= 0) return 0;
    if (raw >= 1) return 1;
    return raw;
  }

  // Lerp between a "base" delay window (intensity=0) and a "max chaos"
  // window (intensity=1). Used by ChaosEngine.randomDelay() so the mid-
  // session tempo picks up smoothly rather than snapping at a threshold.
  function chaosDelayRange(intensity = 0) {
    const i = Math.max(0, Math.min(1, intensity));
    const minMs = 8000 - 4000 * i;   // 8000 → 4000
    const spanMs = 7000 - 3000 * i;  // 7000 → 4000  (so max = 15000 → 8000)
    return { minMs, spanMs };
  }

  // Weight for the swap event in the random-event roll. At intensity=0
  // swap is disabled entirely (0). Scales linearly up to 0.15 at max.
  // Kept low because swap is the most disruptive event — we want it to
  // be a surprise, not the house style.
  function swapWeight(intensity = 0) {
    const i = Math.max(0, Math.min(1, intensity));
    return 0.15 * i;
  }

  BB.core = Object.assign(BB.core || {}, {
    intensityFromRound,
    chaosDelayRange,
    swapWeight,
  });
})(window.BB = window.BB || {});
