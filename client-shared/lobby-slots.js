// Phase 51a — shared lobby player-slot renderer. Extracted from the
// hill per-game main.js so escape / meteor / race pick up the same
// painted-card lobby without duplicating the DOM builder per game.
//
// Usage:
//   HostHarness.boot({
//     onLobby: (state) => LobbySlots.render(state),
//     ...
//   });
//
// CSS lives in theme.css under .player-slot / .slot-avatar / etc.
// Host containers expected: #lobby-players (row container).
(function (global) {
  'use strict';

  const MAX_SLOTS = 8;

  function render(state) {
    const host = document.getElementById('lobby-players');
    if (!host) return;

    const conn = Object.entries((state && state.players) || {}).filter(([, p]) => p.connected);
    const filled = conn.length;
    const frag = document.createDocumentFragment();

    conn.forEach(([id, p], idx) => {
      const slot = document.createElement('div');
      slot.className = 'player-slot';
      slot.style.setProperty('--slot-rim', p.color || 'rgba(216,152,45,0.85)');

      const avatar = document.createElement('div');
      avatar.className = 'slot-avatar';
      avatar.style.setProperty('--slot-rim', p.color || 'rgba(216,152,45,0.85)');
      if (p.character && typeof HostCommon !== 'undefined' && HostCommon.charAvatars[p.character]) {
        const img = document.createElement('img');
        img.src = HostCommon.charAvatars[p.character];
        img.alt = p.character;
        img.setAttribute('data-char', p.character);
        img.onerror = function () { this.remove(); };
        avatar.appendChild(img);
      } else {
        avatar.textContent = '?';
      }
      slot.appendChild(avatar);

      const name = document.createElement('div');
      name.className = 'slot-name';
      name.textContent = p.name || ('Player ' + id);
      name.style.color = p.color || 'var(--text-cream)';
      slot.appendChild(name);

      const badge = document.createElement('div');
      badge.className = 'slot-badge';
      badge.textContent = String(idx + 1);
      slot.appendChild(badge);

      frag.appendChild(slot);
    });

    const empties = Math.max(0, Math.min(MAX_SLOTS, Math.max(4, filled + 1)) - filled);
    for (let i = 0; i < empties; i++) {
      const slot = document.createElement('div');
      slot.className = 'player-slot empty';
      const avatar = document.createElement('div');
      avatar.className = 'slot-avatar';
      avatar.textContent = '?';
      slot.appendChild(avatar);
      const name = document.createElement('div');
      name.className = 'slot-name';
      name.textContent = 'Open slot';
      slot.appendChild(name);
      frag.appendChild(slot);
    }

    host.innerHTML = '';
    host.appendChild(frag);
  }

  const LobbySlots = { render: render, MAX_SLOTS: MAX_SLOTS };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LobbySlots;
  } else {
    global.LobbySlots = LobbySlots;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
