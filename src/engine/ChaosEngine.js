// src/engine/ChaosEngine.js
// Infrastructure-level chaos injector: every 8-15 seconds picks one of
// three random events driven by the current leaderboard standings and
// publishes it through the game's chaos channel. The minigames don't
// know or care; listeners on the host TV + overlay do.
//
//   createChaosEngine({ leaderboard, api }) → { start, stop }
//
// Spec-verbatim body wrapped in an IIFE because the project has no
// bundler — factory lands on BB.engine.createChaosEngine.

(function(BB) {
  function createChaosEngine({ leaderboard, api }) {
    let timer = null;
    let active = false;

    // Voting engine rides alongside. Spec STEP 2.2 — instance created
    // immediately, votes flow in via api.input.onVote → receiveVote.
    const voting = BB.engine.createChaosVoting({ api, leaderboard });

    // Subscribe to phone 'vote' inputs so the voting engine can tally.
    // Kept inside the Chaos Engine so the whole chaos subsystem cleans
    // up together on stop().
    let unsubVote = null;
    if (api && api.input && typeof api.input.onVote === 'function') {
      unsubVote = api.input.onVote((playerId, data) => {
        if (!data || !data.targetId) return;
        voting.receiveVote(playerId, data.targetId);
      });
    }

    function start() {
      if (active) return;
      active = true;
      schedule();
    }

    function stop() {
      active = false;
      if (timer) clearTimeout(timer);
      if (unsubVote) { try { unsubVote(); } catch (_) {} unsubVote = null; }
    }

    function schedule() {
      timer = setTimeout(() => {
        triggerRandomEvent();
        if (active) schedule();
      }, randomDelay());
    }

    function randomDelay() {
      return 8000 + Math.random() * 7000; // 8-15 sec
    }

    function triggerRandomEvent() {
      const roll = Math.random();

      if (roll < 0.4) {
        voting.startVote();
      } else if (roll < 0.7) {
        antiLeader();
      } else {
        underdogBoost();
      }
    }

    function antiLeader() {
      const state = leaderboard.getState();
      const leader = state.leaderId;
      if (!leader) return;

      api.publishChaos({
        type: 'antiLeader',
        targetId: leader,
      });

      console.log('CHAOS: antiLeader →', leader);
    }

    function underdogBoost() {
      const state = leaderboard.getState();
      const last = state.lastId;
      if (!last) return;

      api.publishChaos({
        type: 'underdogBoost',
        targetId: last,
      });

      console.log('CHAOS: underdogBoost →', last);
    }

    function chaosSwap() {
      const state = leaderboard.getState();
      if (state.entries.length < 2) return;

      const a = state.entries[0].playerId;
      const b = state.entries[state.entries.length - 1].playerId;

      api.publishChaos({
        type: 'swap',
        a,
        b,
      });

      console.log('CHAOS: swap →', a, b);
    }

    return {
      start,
      stop,
    };
  }

  BB.engine = Object.assign(BB.engine || {}, { createChaosEngine });
})(window.BB = window.BB || {});
