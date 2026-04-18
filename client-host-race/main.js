// Phase 34 — thin per-game configurator over HostHarness. Boot, state,
// countdown, lobby, game-over, and button wiring live in the harness
// (client-shared/host-harness.js). Race-specific message handlers +
// HUD updates are wired in here.

Render2D.init();
const pname = HostCommon.pname;
const showMsg = (text, ms) => HostHarness.showMsg(text, ms);

// Phase 50 — match-start bell + ambient crowd.
let _matchStarted = false;

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function updateHUD(s) {
  const $ = id => document.getElementById(id);
  const $hudLap = $('hud-lap'), $hudPos = $('hud-pos'), $hudAlive = $('hud-alive');

  if (!_matchStarted) {
    _matchStarted = true;
    try { Sound.play('matchBell'); } catch (_) {}
    try { Sound.startCrowd(); } catch (_) {}
  }

  const conn = Object.entries(s.players).filter(([, p]) => p.connected);
  if (conn.length > 0) {
    let maxLap = 1;
    conn.forEach(([, p]) => { if (p.lap > maxLap) maxLap = p.lap; });
    $hudLap.textContent = Math.min(maxLap, s.totalLaps) + '/' + s.totalLaps;
  }

  const finished = Object.values(s.players).filter(p => p.connected && p.finished).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = finished + '/' + total;

  const sorted = conn.sort((a, b) => {
    const ga = a[1], gb = b[1];
    if (ga.finished && !gb.finished) return -1;
    if (!ga.finished && gb.finished) return 1;
    return (gb.waypoint || 0) - (ga.waypoint || 0);
  });
  const posTexts = sorted.slice(0, 3).map(([id, p], i) => ordinal(i + 1) + ' ' + (p.name || 'P' + id));
  $hudPos.textContent = posTexts[0] || '\u2014';

  // Phase 51b — painted standings panel. Row value = 'FIN' for
  // finished racers or 'Lap N' for the others. Leader = 1st place
  // (finished first OR currently furthest along).
  const leaderId = sorted[0] ? sorted[0][0] : null;
  const rows = sorted.map(([id, p]) => ({
    id: id,
    color: p.color,
    name: p.name || ('Player ' + id),
    value: p.finished
      ? ('FIN ' + (s.finishOrder ? s.finishOrder.indexOf(Number(id)) + 1 : '?'))
      : ('Lap ' + Math.min(p.lap || 1, s.totalLaps || 3)),
    leader: String(id) === String(leaderId),
    dead: false,
    warn: false,
  }));
  Scoreboard.render(rows, { title: 'Standings' });

  // Phase 50 — painted #hud replaces the legacy shared HUD bar.
}

HostHarness.boot({
  gameId: 'race',
  lobbyAsset: 'lobby-race',
  musicKey: 'escapeFox', // reuse escape music for now
  introKey: 'race',
  countdownFinal: 'GO!',
  lobbyReadyMsg: 'Ready to race!',
  onLobby: (state) => {
    _matchStarted = false;
    try { Sound.stopCrowd(); } catch (_) {}
    LobbySlots.render(state);
  },
  onStateRunning: updateHUD,
  buildPostGameOpts: (state, msg) => {
    const w = msg.winnerId ? state.players[msg.winnerId] : null;
    return {
      winnerId: msg.winnerId,
      winnerName: w ? (w.name || 'Player ' + msg.winnerId) : null,
      winnerColor: w ? w.color : '#fff',
      winnerCharacter: w ? w.character : null,
      winLabel: 'WINS THE RACE!',
      loseIcon: '🏁', loseText: 'RACE OVER!',
      loseQuote: 'Nobody crossed the line...',
      // Phase 8c — painterly three-tier podium as overlay backdrop
      backdrop: '/assets/race-podium.png',
      stats: [
        { label: 'Finished', value: (state.finishOrder ? state.finishOrder.length : 0) + '/' + Object.keys(state.players).length },
      ],
      onPlayAgain: () => HostHarness.send(Protocol.makeRestart()),
      onLobby: () => { HostHarness.send(Protocol.makeRestart()); setTimeout(() => window.location.href = '/host/', 200); },
    };
  },
});

HostHarness.on({
  lap_complete: (msg) => {
    Sound.play('coinPickup');
    Render2D.triggerLap(msg.lap, HostHarness.getState().totalLaps);
    showMsg(pname(msg.playerId) + ' — Lap ' + msg.lap + '!', 1500);
  },

  race_finish: (msg) => {
    Sound.play('winner');
    if (typeof FX !== 'undefined') FX.screenFlash('#fff', 0.3);
    showMsg(pname(msg.playerId) + ' finishes ' + ordinal(msg.position) + '!', 2000);
  },

  item_pickup: () => { Sound.play('coinPickup'); },

  item_used: (msg) => {
    if (msg.item === 'boost') Sound.play('speedPickup');
    else if (msg.item === 'oil') Sound.play('slide');
    else if (msg.item === 'missile') Sound.play('foxSprint');
  },

  drift_boost: () => {
    Sound.play('nearMiss');
    if (typeof FX !== 'undefined') FX.textPopup(640, 340, 'DRIFT BOOST!', '#44ff44');
  },

  player_stunned: (msg) => {
    Sound.play('stumble');
    Render2D.triggerElim();
    if (typeof FX !== 'undefined') { FX.shake(8); FX.screenFlash('#ff4400', 0.2); }
    const reason = msg.reason === 'oil' ? 'slipped on oil!'
      : msg.reason === 'missile' ? 'got hit by a missile!'
      : 'crashed!';
    showMsg(pname(msg.playerId) + ' ' + reason, 1500);
  },

  bump: () => {
    Sound.play('bump');
    if (typeof FX !== 'undefined') FX.shake(4);
  },
});
