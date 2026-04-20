// src/engine/ChaosEffects.js
// Tiny effect applier: re-publishes a chaos event so downstream listeners
// (overlay, sound fx, future minigame-side reactors) pick it up through
// the same api.onChaos channel. Gives STEP 4 of the voting spec a place
// to land — chaosEffects.apply({ type, targetId }).

(function(BB) {
  function createChaosEffects({ api }) {
    function apply(effect) {
      if (!effect || !effect.type) return;
      api.publishChaos(effect);
    }
    return { apply };
  }

  BB.engine = Object.assign(BB.engine || {}, { createChaosEffects });
})(window.BB = window.BB || {});
