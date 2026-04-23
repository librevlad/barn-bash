// src/engine/ChaosEngine.js
// Infrastructure-level chaos injector: every 4-15 seconds picks one of
// four random events driven by the current leaderboard standings and
// publishes it through the game's chaos channel. The minigames don't
// know or care; listeners on the host TV + overlay do.
//
//   createChaosEngine({ leaderboard, api, intensity? }) → { start, stop }
//
// `intensity` is 0..1 and comes from BB.core.intensityFromRound in
// party mode — higher intensity shortens the delay window AND enables
// the disruptive "swap" event in the random roll. At intensity=0 the
// behaviour matches the pre-P7 pacing (8-15s delay, three events).
//
// Spec-verbatim body wrapped in an IIFE because the project has no
// bundler — factory lands on BB.engine.createChaosEngine.

(function(BB) {
  function createChaosEngine({ leaderboard, api, intensity = 0 } = {}) {
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
      // Delay window shortens smoothly with intensity. At intensity=0
      // the 8000/7000 baseline reproduces the pre-P7 cadence verbatim.
      const range = BB.core && BB.core.chaosDelayRange
        ? BB.core.chaosDelayRange(intensity)
        : { minMs: 8000, spanMs: 7000 };
      return range.minMs + Math.random() * range.spanMs;
    }

    function triggerRandomEvent() {
      // Swap is a high-disruption event — weight it in only when the
      // party has warmed up. Remaining 1 - swap weight is split among
      // the three base events in the original 0.4 / 0.3 / 0.3 ratio.
      const swapW = BB.core && BB.core.swapWeight
        ? BB.core.swapWeight(intensity)
        : 0;
      const roll = Math.random();

      if (roll < swapW) {
        chaosSwap();
        return;
      }
      const rest = 1 - swapW;
      const rescaled = (roll - swapW) / rest; // 0..1 across the remaining bucket
      if (rescaled < 0.4) {
        voting.startVote();
      } else if (rescaled < 0.7) {
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
