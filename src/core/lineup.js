// src/core/lineup.js
// Builds the players[] array for a new game from the live phone roster +
// the host's TWEAKS panel settings. Pure — no React, no DOM — the caller
// feeds it mp.remotePlayers and tweaks, gets back players.
//
// Every joined phone takes a slot; CPU critters fill the rest up to the
// target tweaks.playerCount. If more phones are connected than the target,
// bump the total so nobody who joined gets trimmed. Zero-phone sessions
// fall back to the classic local-you + CPU solo flow.

(function(BB) {
  function buildLineup(remotePlayers, tweaks) {
    const connected = (remotePlayers || []).filter(p => p.character);
    const phoneCount = Math.min(connected.length, 6);
    if (phoneCount > 0) {
      const target = Math.max(Math.min(tweaks.playerCount, 6), phoneCount);
      const used = new Set();
      const players = connected.slice(0, 6).map(p => {
        const char = CHARACTERS.find(c => c.id === p.character) || CHARACTERS[0];
        used.add(char.id);
        return { char, isCPU: false, remoteId: p.id, displayName: p.name || char.name };
      });
      const pool = CHARACTERS.filter(c => !used.has(c.id)).sort(() => Math.random() - .5);
      while (players.length < target && pool.length > 0) {
        players.push({ char: pool.shift(), isCPU: true });
      }
      return players;
    }
    const you = CHARACTERS.find(c => c.id === tweaks.youChar) || CHARACTERS[0];
    const pool = CHARACTERS.filter(c => c.id !== you.id).sort(() => Math.random() - .5);
    const players = [{ char: you, isCPU: false }];
    for (let i = 1; i < tweaks.playerCount; i++) players.push({ char: pool[i-1], isCPU: true });
    return players;
  }

  BB.core = Object.assign(BB.core || {}, { buildLineup });
})(window.BB = window.BB || {});
