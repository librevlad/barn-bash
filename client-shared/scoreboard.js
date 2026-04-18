// Phase 51b — shared painted live scoreboard. Extracted from the
// hill per-game main.js so escape / meteor / race can pin the same
// right-edge standings panel.
//
// Usage:
//   // Each per-game main.js computes rows + calls render.
//   Scoreboard.render([
//     { id: 2, color: '#e84393', name: 'Alice', value: 42,
//       leader: true, dead: false, warn: false },
//     ...
//   ], { title: 'STANDINGS' });
//
// Container (#scoreboard with .sb-head + ul#sb-list inside) lives in
// the per-game HTML. Row row classes:
//   .leader   — gold wash + inset border + crown badge
//   .dead     — grey + faded
//   .warn     — red blink (teeter/stumble/etc.)
(function (global) {
  'use strict';

  function render(rows, opts) {
    const board = document.getElementById('scoreboard');
    const list = document.getElementById('sb-list');
    if (!board || !list) return;
    opts = opts || {};

    if ((rows || []).length > 0) board.classList.add('show');
    else board.classList.remove('show');

    const head = board.querySelector('.sb-head');
    if (head && opts.title) head.textContent = opts.title;

    const frag = document.createDocumentFragment();
    (rows || []).forEach(r => {
      const li = document.createElement('li');
      li.className = 'sb-row'
        + (r.dead ? ' dead' : '')
        + (r.leader && !r.dead ? ' leader' : '')
        + (r.warn ? ' teetering' : '');
      if (r.leader && !r.dead) li.style.position = 'relative';

      const dot = document.createElement('span');
      dot.className = 'sb-dot';
      dot.style.color = r.color || '#fff';
      li.appendChild(dot);

      const name = document.createElement('span');
      name.className = 'sb-name';
      name.textContent = r.name || ('Player ' + r.id);
      li.appendChild(name);

      const score = document.createElement('span');
      score.className = 'sb-score';
      score.textContent = (r.value !== undefined && r.value !== null) ? String(r.value) : '';
      li.appendChild(score);

      if (r.leader && !r.dead) {
        const crown = document.createElement('span');
        crown.className = 'sb-crown';
        crown.textContent = '\uD83D\uDC51';
        li.appendChild(crown);
      }
      frag.appendChild(li);
    });
    list.innerHTML = '';
    list.appendChild(frag);
  }

  function hide() {
    const board = document.getElementById('scoreboard');
    if (board) board.classList.remove('show');
  }

  const Scoreboard = { render: render, hide: hide };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Scoreboard;
  } else {
    global.Scoreboard = Scoreboard;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
