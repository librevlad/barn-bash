// src/engine/GameDomainAPI.js
// Game Domain API — a semantic, game-concept-shaped wrapper over the
// transport-level `api` (raw scores / turns / inputs) plus MinigameHost
// lifecycle context (onFinish / onQuit). Minigames receive the product
// of this factory as a single `game` prop:
//
//   game.score.update(byId, meta?)     publish a per-phone score map
//   game.turn.set(activeId, options?)  publish whose turn it is
//   game.input.onTap(cb)               subscribe to phone tap events
//   game.input.onSteer(cb)             subscribe to phone steer events
//   game.input.onHoles(cb)             subscribe to phone holes events
//   game.game.finish(earned)           end the round, bubble earned[]
//   game.game.quit()                   bail without scoring
//
// Two deliberate pieces of sugar vs the raw transport `api`:
//
//   - score.update auto-computes `leader` as max(byId values) when the
//     caller doesn't pass meta.leader explicitly. Games that include
//     CPU-only lanes in the leader (historical behaviour) pass meta.leader.
//   - input.on<Kind> replaces the stringly-typed api.inputs.on(kind, cb)
//     with semantic methods so a game says what it listens to, not how.
//
// The factory is intentionally functional (no classes), stateless
// (takes api + context each time), and pure wrt. transport — it forwards,
// renames, and occasionally defaults. All game rules stay in the games.

(function(BB) {
  function createGameDomainAPI(api, context) {
    return {
      score: {
        update(byId, meta = {}) {
          const fallback = Math.max(0, ...Object.values(byId || {}));
          api.publishScores({
            byId,
            leader: meta.leader != null ? meta.leader : fallback,
            label: meta.label,
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
    };
  }

  BB.engine = Object.assign(BB.engine || {}, { createGameDomainAPI });
})(window.BB = window.BB || {});
