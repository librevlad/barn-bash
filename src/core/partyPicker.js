// src/core/partyPicker.js
// Rule-based AI picker for Party Mode — chooses the next minigame from the
// registry based on coverage (prefer unplayed), recency (never pick the
// last one back-to-back), and per-game play count (mild penalty stacks).
//
// Pure function: takes gameIds + session history + optional injected rand,
// returns one gameId. The weighted-random skeleton is enough for the MVP
// playtest; LLM-driven picks land only after paying-user demand is proven.

(function(BB) {
  function pickNextPartyGame({ gameIds, playedGameIds = [], lastGameId = null, rand = Math.random } = {}) {
    if (!gameIds || gameIds.length === 0) return null;
    if (gameIds.length === 1) return gameIds[0];

    const playCount = {};
    for (const id of playedGameIds) playCount[id] = (playCount[id] || 0) + 1;

    // Weighting:
    //   lastGameId → 0 (never pick the same game twice in a row)
    //   never played → 3 (strong bias toward coverage)
    //   played N times → max(0.3, 1 - (N-1) * 0.25) — gentle decay so deep
    //     sessions eventually start repeating favourites instead of starving.
    const weights = gameIds.map(id => {
      if (id === lastGameId) return 0;
      const played = playCount[id] || 0;
      if (played === 0) return 3;
      return Math.max(0.3, 1 - (played - 1) * 0.25);
    });

    const sum = weights.reduce((a, b) => a + b, 0);
    if (sum === 0) {
      // Defensive: only the lastGameId is in the list, or all weights
      // collapsed. Prefer the first non-last id, else just return the
      // single option we have.
      return gameIds.find(id => id !== lastGameId) || gameIds[0];
    }

    let r = rand() * sum;
    for (let i = 0; i < gameIds.length; i++) {
      // Skip zero-weight buckets (e.g., lastGameId) so they can never be
      // selected even when r is exactly 0 after a non-random stub.
      if (weights[i] === 0) continue;
      r -= weights[i];
      if (r <= 0) return gameIds[i];
    }
    // Fallback: return the last non-zero-weight id (handles float drift).
    for (let i = gameIds.length - 1; i >= 0; i--) {
      if (weights[i] > 0) return gameIds[i];
    }
    return gameIds[gameIds.length - 1];
  }

  BB.core = Object.assign(BB.core || {}, { pickNextPartyGame });
})(window.BB = window.BB || {});
