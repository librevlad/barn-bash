// src/core/score.js
// Ranking + phone-facing payload helpers. Pure functions over GameState;
// no React, no side effects — easy to unit-test.

(function(BB) {
  // Returns an array of ranks (1-indexed) parallel to players[]. Ties share
  // the same rank — standard competition ranking (1, 2, 2, 4).
  function rankByValue(players, values) {
    const sorted = players.map((_, i) => ({ i, v: values[i] || 0 })).sort((a, b) => b.v - a.v);
    const rankOf = new Array(players.length);
    let lastV = null, lastRank = 0;
    sorted.forEach((row, idx) => {
      if (row.v !== lastV) { lastRank = idx + 1; lastV = row.v; }
      rankOf[row.i] = lastRank;
    });
    return rankOf;
  }

  // Payload broadcast to phones when the host lands on Scoreboard. Each
  // phone-owned slot gets its own rank / earned / running total so the
  // per-phone RoundSummary overlay can show a personalised celebration.
  function buildRoundEndPayload(state) {
    const rankOf = rankByValue(state.players, state.lastEarned);
    const byId = {};
    state.players.forEach((p, i) => {
      if (!p.remoteId) return;
      byId[p.remoteId] = {
        rank: rankOf[i],
        earned: state.lastEarned[i] || 0,
        total: (state.scores[i] || 0) + (state.lastEarned[i] || 0),
      };
    });
    return { minigame: state.lastMinigame || 'Mini-game', byId };
  }

  // Payload broadcast to phones on Podium transition: final rank + total
  // so the FinaleScreen can flash the right champion / silver / bronze
  // splash even if the phone isn't looking at the host TV.
  function buildGameOverPayload(state) {
    const rankOf = rankByValue(state.players, state.scores);
    const byId = {};
    state.players.forEach((p, i) => {
      if (!p.remoteId) return;
      byId[p.remoteId] = { rank: rankOf[i], total: state.scores[i] || 0 };
    });
    return { byId };
  }

  BB.core = Object.assign(BB.core || {}, { rankByValue, buildRoundEndPayload, buildGameOverPayload });
})(window.BB = window.BB || {});
