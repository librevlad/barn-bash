// src/engine/GameDomainAPI.js
// Game Domain API — semantic wrapper over the transport-level `api` plus
// MinigameHost lifecycle context. Mini-games get a single `game` prop:
//
//   game.score.update(byId, meta?)       update leaderboard + broadcast
//   game.turn.set(activeId, options?)    publish whose turn it is
//   game.input.onTap / onSteer / onHoles subscribe to phone inputs
//   game.game.finish(earned)             end the round
//   game.game.quit()                     bail without scoring
//   game.leaderboard.{subscribe,on,getState}  read-only live standings

(function(BB) {
  // TOP LEVEL, singleton — one LeaderboardSystem shared across every
  // mini-game mount. Survives MinigameHost unmounts between rounds.
  const leaderboard = BB.engine.createLeaderboardSystem();

  // Debug trace — surfaces lead swaps to the console for now; AI Host
  // and Chaos Engine will subscribe here later.
  leaderboard.on('leaderChanged', ({ prevId, nextId }) => {
    console.log('LEADER CHANGED:', prevId, '→', nextId);
  });

  function createGameDomainAPI(api, context) {
    return {
      score: {
        update(byId, meta = {}) {
          leaderboard.update(byId);
          api.publishScores({
            byId,
            leader: leaderboard.getState().leaderId,
            ...meta,
          });
        },
      },

      turn: {
        set(activeId, options = {}) {
          api.publishTurn({ activeId, ...options });
        },
      },

      input: {
        onTap(handler)   { return api.inputs.on('tap',   handler); },
        onSteer(handler) { return api.inputs.on('steer', handler); },
        onHoles(handler) { return api.inputs.on('holes', handler); },
      },

      game: {
        finish(result) { context.onFinish(result); },
        quit()         { context.onQuit(); },
      },

      leaderboard: {
        subscribe: leaderboard.subscribe,
        on:        leaderboard.on,
        getState:  leaderboard.getState,
      },

      // Chaos passthrough — the Chaos Engine publishes events; listeners
      // (MinigameHost, LeaderboardOverlay) grab them via game.api.onChaos.
      publishChaos: (data) => api.publishChaos(data),
      chaos: {
        publish: (data) => api.publishChaos(data),
      },
      api: {
        onChaos:      api.onChaos,
        publishChaos: api.publishChaos,
      },
    };
  }

  BB.engine = Object.assign(BB.engine || {}, { createGameDomainAPI });
})(window.BB = window.BB || {});
