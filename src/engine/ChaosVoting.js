// src/engine/ChaosVoting.js
// Three-second "who should be punished?" vote driven by the Chaos Engine.
// Starts with the current leaderboard as candidates, listens for vote
// inputs, tallies + publishes the winner.
//
//   createChaosVoting({ api, leaderboard }) → { startVote, receiveVote }
//
// Spec body verbatim; IIFE wrap because the project has no bundler.

(function(BB) {
  function createChaosVoting({ api, leaderboard }) {
    let activeVote = null;
    let votes = new Map();
    let timer = null;

    function startVote() {
      const state = leaderboard.getState();
      const candidates = state.entries.map(e => e.playerId);

      activeVote = {
        candidates,
        endsAt: Date.now() + 3000,
      };

      votes.clear();

      api.publishChaos({
        type: 'voteStart',
        candidates,
      });

      timer = setTimeout(finishVote, 3000);
    }

    function receiveVote(playerId, targetId) {
      if (!activeVote) return;
      if (!activeVote.candidates.includes(targetId)) return;

      votes.set(playerId, targetId);
    }

    function finishVote() {
      if (!activeVote) return;

      const tally = {};
      for (const target of votes.values()) {
        tally[target] = (tally[target] || 0) + 1;
      }

      let winner = null;
      let max = -1;

      for (const [id, count] of Object.entries(tally)) {
        if (count > max) {
          max = count;
          winner = id;
        }
      }

      api.publishChaos({
        type: 'voteResult',
        targetId: winner,
      });

      activeVote = null;
      votes.clear();
    }

    return {
      startVote,
      receiveVote,
    };
  }

  BB.engine = Object.assign(BB.engine || {}, { createChaosVoting });
})(window.BB = window.BB || {});
