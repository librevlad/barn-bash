// src/core/players.js
// Player-shape helpers. Keeps display-name logic in one place so screens +
// mini-games don't re-implement the "phone-owned but isCPU-while-dropped"
// label quirk.

// A real phone-owned slot keeps its entered name even while isCPU is
// temporarily true (phone mid-reconnect, AI is standing in). Pure CPU
// slots fall back to the critter name.
function playerLabel(p) {
  if (!p) return '';
  if (p.displayName) return p.displayName.toUpperCase();
  return (p.char && p.char.name ? p.char.name : '').toUpperCase();
}

Object.assign(window, { playerLabel });
