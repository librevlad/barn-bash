// src/engine/LeaderboardSystem.js
// Persistent, real-time leaderboard state machine + event bus. Fed from
// GameDomainAPI.score.update and consumed by the LeaderboardOverlay and
// future AI Host / Chaos Engine integrations.
//
// Exactly the factory shape specified:
//   createLeaderboardSystem() → { update, subscribe, getState, on }
//
// Emits:
//   'leaderChanged' { prevId, nextId }
//   'rankChanged'   { playerId, from, to }

(function(BB) {
  function createLeaderboardSystem() {
    let state = {
      entries: [],
      leaderId: null,
      lastId: null,
      lastUpdateAt: Date.now(),
    };

    let prevRanks = new Map();
    const listeners = new Set();
    const eventListeners = new Map();

    function emit(event, payload) {
      const set = eventListeners.get(event);
      if (!set) return;
      set.forEach(cb => cb(payload));
    }

    function on(event, cb) {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event).add(cb);
      return () => eventListeners.get(event).delete(cb);
    }

    function subscribe(cb) {
      listeners.add(cb);
      cb(state);
      return () => listeners.delete(cb);
    }

    function notify() {
      listeners.forEach(cb => cb(state));
    }

    function update(byId) {
      const entries = Object.entries(byId).map(([playerId, score]) => ({
        playerId,
        score,
      }));

      entries.sort((a, b) => b.score - a.score);

      entries.forEach((e, i) => {
        e.rank = i + 1;
        const prev = prevRanks.get(e.playerId);
        if (prev !== undefined && prev !== e.rank) {
          emit('rankChanged', { playerId: e.playerId, from: prev, to: e.rank });
        }
        prevRanks.set(e.playerId, e.rank);
      });

      const newLeader = entries[0] && entries[0].playerId ? entries[0].playerId : null;
      if (state.leaderId && newLeader !== state.leaderId) {
        emit('leaderChanged', { prevId: state.leaderId, nextId: newLeader });
      }

      state = {
        entries,
        leaderId: newLeader,
        lastId: entries[entries.length - 1] ? entries[entries.length - 1].playerId : null,
        lastUpdateAt: Date.now(),
      };

      notify();
    }

    function getState() {
      return state;
    }

    return {
      update,
      subscribe,
      getState,
      on,
    };
  }

  BB.engine = Object.assign(BB.engine || {}, { createLeaderboardSystem });
})(window.BB = window.BB || {});
