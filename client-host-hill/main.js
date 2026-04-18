// Phase 34 — thin per-game configurator over HostHarness.

Render2D.init();
const pname = HostCommon.pname;
const showMsg = (text, ms) => HostHarness.showMsg(text, ms);

// Phase 40a — painted HUD + live scoreboard update. updateHUD now
// writes to three painted plaques (ALIVE / BANNER / ARENA) and the
// scoreboard panel, instead of the legacy flat text strip.
function updateHUD(s) {
  const $ = id => document.getElementById(id);
  const $hudAlive = $('hud-alive'), $hudPlat = $('hud-plat');
  const $hudSub = $('hud-subbanner');

  // Entries so each row carries its playerId for leader / crown hooks.
  const entries = Object.entries(s.players).map(([id, p]) => Object.assign({ id: id }, p));
  const conn = entries.filter(p => p.connected);
  const alive = conn.filter(p => p.alive).length;
  const total = conn.length;

  if ($hudAlive) $hudAlive.textContent = alive + '/' + total;
  const pct = Math.max(0, Math.round((s.platR / 5) * 100));
  if ($hudPlat) $hudPlat.textContent = pct + '%';
  if ($hudSub) {
    $hudSub.textContent = s.suddenDeath
      ? 'SUDDEN DEATH'
      : pct < 50 ? 'Arena shrinking'
      : 'Push to the centre';
  }

  if (typeof HUD !== 'undefined') {
    HUD.update(s.players, {
      gameName: 'KING OF THE HILL',
      primary: pct < 100 ? 'Arena ' + pct + '%' : '',
      secondary: pct < 50 ? '\u26A0 SHRINKING!' : '',
      secondaryColor: '#ff4422',
    });
  }

  updateScoreboard(s, conn, alive);
}

// Phase 40c — sudden-death timer ring. Local countdown driven by
// setInterval, showing total-seconds-remaining with a conic-gradient
// ring filling down. Server broadcasts the `sudden_death` event once
// at the sudden-death tick; we start a 25-second timer then.
let _sdEndAt = 0, _sdInterval = null;
function startSuddenDeathTimer(seconds) {
  _sdEndAt = Date.now() + seconds * 1000;
  const timer = document.getElementById('sd-timer');
  const numEl = document.getElementById('sd-num');
  if (!timer || !numEl) return;
  timer.classList.add('show');
  clearInterval(_sdInterval);
  _sdInterval = setInterval(() => {
    const remain = Math.max(0, _sdEndAt - Date.now()) / 1000;
    const total = seconds;
    const pct = Math.max(0, Math.min(100, (remain / total) * 100));
    timer.style.setProperty('--pct', pct.toFixed(1));
    const s = Math.ceil(remain);
    numEl.textContent = '0:' + (s < 10 ? '0' + s : s);
    if (remain <= 0) { clearInterval(_sdInterval); timer.classList.remove('show'); }
  }, 100);
}

function updateScoreboard(state, conn, aliveCount) {
  const board = document.getElementById('scoreboard');
  const list = document.getElementById('sb-list');
  if (!board || !list) return;

  // Show board once the game starts rendering; hide on lobby.
  if (aliveCount > 0 || state.phase === 'running' || state.phase === 'result') {
    board.classList.add('show');
  } else {
    board.classList.remove('show');
  }

  const rows = conn.slice().sort((a, b) => (b.score || 0) - (a.score || 0));
  let leaderId = null;
  for (const p of rows) {
    if (p.alive && (p.score || 0) >= 3) { leaderId = p.id; break; }
  }
  // Ensure leader computed by walking the sorted array above; fall back
  // to first-alive when nobody has ≥ 3 yet.
  if (!leaderId && rows.length > 0) leaderId = (rows.find(p => p.alive) || {}).id || null;

  list.innerHTML = '';
  for (const p of rows) {
    const li = document.createElement('li');
    li.className = 'sb-row'
      + (!p.alive ? ' dead' : '')
      + (p.id === leaderId && p.alive ? ' leader' : '')
      + (p.teetering ? ' teetering' : '');

    const dot = document.createElement('span');
    dot.className = 'sb-dot';
    dot.style.color = p.color || '#fff';
    li.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'sb-name';
    name.textContent = p.name || ('Player ' + p.id);
    li.appendChild(name);

    const score = document.createElement('span');
    score.className = 'sb-score';
    score.textContent = (p.score || 0);
    li.appendChild(score);

    if (p.id === leaderId && p.alive) {
      const crown = document.createElement('span');
      crown.className = 'sb-crown';
      crown.textContent = '\uD83D\uDC51';
      li.style.position = 'relative';
      li.appendChild(crown);
    }

    list.appendChild(li);
  }
}

// Phase 41a — painted lobby-slot renderer. Fires on every `state`
// message while phase === 'lobby'. Replaces the default inline-pill
// list (set by HostHarness._showLobby) with fixed-width painted
// cards carrying the player's avatar + colour rim + name.
function renderLobbyCards(state) {
  const host = document.getElementById('lobby-players');
  if (!host) return;

  const MAX_SLOTS = 8;
  const conn = Object.entries(state.players || {}).filter(([, p]) => p.connected);
  const filled = conn.length;

  const nodes = [];
  conn.forEach(([id, p], idx) => {
    const slot = document.createElement('div');
    slot.className = 'player-slot';
    slot.style.setProperty('--slot-rim', p.color || 'rgba(216,152,45,0.85)');

    const avatar = document.createElement('div');
    avatar.className = 'slot-avatar';
    avatar.style.setProperty('--slot-rim', p.color || 'rgba(216,152,45,0.85)');

    if (p.character && HostCommon.charAvatars[p.character]) {
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

    nodes.push(slot);
  });

  // Empty skeleton slots up to 4 minimum (so the row doesn't look
  // lonely with 1-2 players).
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
    nodes.push(slot);
  }

  // Bulk replace to minimise DOM churn.
  host.innerHTML = '';
  nodes.forEach(n => host.appendChild(n));
}

HostHarness.boot({
  gameId: 'hillKing',
  lobbyAsset: 'lobby-hill',
  musicKey: 'hillKing',
  introKey: 'hillKing',
  countdownFinal: 'FIGHT!',
  lobbyReadyMsg: 'Ready to fight!',
  onLobby: renderLobbyCards,
  onStateRunning: updateHUD,
  buildPostGameOpts: (state, msg) => {
    const w = msg.winnerId ? state.players[msg.winnerId] : null;

    // Phase 41b — build the per-player final standings leaderboard
    // from state.players + stats. Sort by score desc, tie-break by
    // kingTicks. Each row carries up to 3 chip stats (bumps / king /
    // combo). Eliminated players included but greyed via CSS .dead if
    // ever added (currently all rows shown identically, winner
    // highlighted by .winner class auto-detected from winnerId).
    const entries = Object.entries(state.players || {}).map(([id, p]) => ({
      id: id,
      name: p.name || ('Player ' + id),
      color: p.color || '#fff',
      character: p.character,
      score: p.score || 0,
      stats: p.stats || {},
    }));
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.stats.kingTicks || 0) - (a.stats.kingTicks || 0);
    });
    const leaderboard = entries.map(e => ({
      id: e.id,
      name: e.name,
      color: e.color,
      character: e.character,
      score: e.score,
      chips: [
        { label: 'Bumps', value: e.stats.bumpsDealt || 0 },
        { label: 'King', value: Math.round((e.stats.kingTicks || 0) / 20) + 's' },
        { label: 'Combo', value: 'x' + (e.stats.maxCombo || 0) },
      ],
    }));

    return {
      winnerId: msg.winnerId,
      winnerName: w ? (w.name || 'Player ' + msg.winnerId) : null,
      winnerColor: w ? w.color : '#fff',
      winnerCharacter: w ? w.character : null,
      winLabel: 'IS KING!',
      loseIcon: '💀', loseText: 'NOBODY SURVIVED!',
      loseQuote: 'The hill claims all...',
      stats: [],
      leaderboard: leaderboard,
      // Phase 20a — reuse Phase 18 universal gameover-hall
      backdrop: '/assets/gameover-hall.png',
      backdropMode: 'hall',
      onPlayAgain: () => HostHarness.send(Protocol.makeRestart()),
      onLobby: () => { HostHarness.send(Protocol.makeRestart()); setTimeout(() => window.location.href = '/host/', 200); },
    };
  },
});

HostHarness.on({
  eliminated: (msg) => {
    Sound.play('eliminated');
    if (typeof FX !== 'undefined') { FX.shake(10); FX.screenFlash('#ff2200', 0.3); FX.elimBurst(640, 360, '#f44'); }
    Narrator.elimination(pname(msg.playerId));
  },

  bump: (msg) => {
    Sound.play('bump');
    if (typeof FX !== 'undefined') FX.screenFlash('#fff', 0.15);
    if (msg.to) Render2D.triggerBump(msg.to, msg.from);
    showMsg(pname(msg.from) + ' bumped ' + pname(msg.to) + '!', 1200);
  },

  shieldBlock: (msg) => {
    Narrator.shieldBlock(pname(msg.playerId));
  },

  shrink_warning: () => {
    Sound.play('foxGrowl');
    if (typeof FX !== 'undefined') FX.screenFlash('#ff4400', 0.15);
    // Phase 40c — full-width shrink warning banner.
    const w = document.getElementById('shrink-warn');
    if (w) {
      w.classList.add('show');
      clearTimeout(w._t);
      w._t = setTimeout(() => w.classList.remove('show'), 1400);
    }
  },

  platform_shrink: () => {
    Sound.play('shrink');
    if (typeof FX !== 'undefined') FX.shake(4);
    showMsg('Arena shrinking!', 1500);
  },

  teetering: (msg) => {
    Sound.play('stumble');
    showMsg(pname(msg.playerId) + ' is teetering!', 1500);
  },

  near_miss: () => {
    Sound.play('nearMiss');
  },

  ground_pound: (msg) => {
    Sound.play('meteorImpact');
    if (typeof FX !== 'undefined') { FX.screenFlash('#B070FF', 0.2); FX.textPopup(640, 320, 'GROUND POUND!', '#B070FF'); }
    if (msg.playerId) Render2D.triggerGroundPound(msg.playerId);
    showMsg(pname(msg.playerId) + ' GROUND POUND!', 1200);
  },

  gravity_bomb: (msg) => {
    Sound.play('foxLeap');
    if (typeof FX !== 'undefined') { FX.screenFlash('#ff8800', 0.3); FX.textPopup(640, 300, 'GRAVITY BOMB!', '#ff8800'); }
    if (msg.playerId) Render2D.triggerGravityBomb(msg.playerId);
    showMsg('GRAVITY BOMB!', 1500);
  },

  anchor_block: (msg) => {
    showMsg(pname(msg.playerId) + ' is ANCHORED!', 1000);
  },

  powerup_spawned: () => {
    Sound.play('coinPickup');
  },

  powerup_collected: (msg) => {
    const labels = { anchor: 'ANCHOR', superDash: 'SUPER DASH', gravityBomb: 'GRAVITY BOMB' };
    Sound.play('shieldPickup');
    if (msg.playerId) Render2D.triggerPowerupCollected(msg.playerId, msg.powerup);
    showMsg(pname(msg.playerId) + ' got ' + (labels[msg.powerup] || ''), 1200);
  },

  hazard_cracks: () => {
    Sound.play('shrink');
    Narrator.custom('Cracks forming! Watch your step.');
  },

  hazard_bumper: () => {
    Sound.play('foxGrowl');
    Narrator.custom('A bumper appears in the center!');
  },

  hazard_ice: () => {
    Narrator.custom('Ice zone! Slippery when deadly.');
  },

  sudden_death: () => {
    Sound.play('foxGrowl');
    if (typeof FX !== 'undefined') { FX.shake(12); FX.screenFlash('#ff0000', 0.3); FX.setVignette(0.4); }
    Narrator.custom('SUDDEN DEATH! No more second chances!');
    showMsg('SUDDEN DEATH!', 3000);
    // Phase 40c — start local 25-second sudden-death countdown ring.
    startSuddenDeathTimer(25);
  },

  dramatic_finish: () => {
    if (typeof FX !== 'undefined') { FX.setVignette(0.3); FX.triggerSlowMo(0.6, 2.0); }
    Narrator.custom("It's down to two!");
  },
});
