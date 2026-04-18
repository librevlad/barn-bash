// Phase 34 — thin per-game configurator over HostHarness.

Render2D.init();
const pname = HostCommon.pname;
const showMsg = (text, ms) => HostHarness.showMsg(text, ms);

// Phase 49 — match-start bell + ambient crowd.
let _matchStarted = false;

function updateHUD(s) {
  const $ = id => document.getElementById(id);
  const $hudWave = $('hud-wave'), $hudAlive = $('hud-alive'), $hudWarn = $('hud-warn');

  if (!_matchStarted) {
    _matchStarted = true;
    try { Sound.play('matchBell'); } catch (_) {}
    try { Sound.startCrowd(); } catch (_) {}
  }

  $hudWave.textContent = String(s.wave || 1);
  const alive = Object.values(s.players).filter(p => p.connected && p.alive).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = alive + '/' + total;
  $hudWarn.textContent = s.subPhase === 'warning' ? 'METEORS INCOMING' : 'Stay sharp';

  // Phase 49 — painted #hud replaces the legacy shared HUD bar.
}

HostHarness.boot({
  gameId: 'meteor',
  lobbyAsset: 'lobby-meteor',
  musicKey: 'meteor',
  introKey: 'meteor',
  countdownFinal: 'DODGE!',
  lobbyReadyMsg: 'Ready to dodge!',
  onLobby: (state) => {
    _matchStarted = false;
    try { Sound.stopCrowd(); } catch (_) {}
    LobbySlots.render(state);
  },
  onStateRunning: updateHUD,
  buildPostGameOpts: (state, msg) => {
    const w = msg.winnerId ? state.players[msg.winnerId] : null;

    // Phase 52c — per-player leaderboard. Sort by (alive desc →
    // wavesSurvived desc → dodges desc). Value column shows the
    // highest wave each player reached.
    const entries = Object.entries(state.players || {}).map(([id, p]) => ({
      id: id,
      name: p.name || ('Player ' + id),
      color: p.color || '#fff',
      character: p.character,
      alive: p.alive,
      stats: p.stats || {},
    }));
    entries.sort((a, b) => {
      if (a.alive && !b.alive) return -1;
      if (!a.alive && b.alive) return 1;
      if ((b.stats.wavesSurvived || 0) !== (a.stats.wavesSurvived || 0))
        return (b.stats.wavesSurvived || 0) - (a.stats.wavesSurvived || 0);
      return (b.stats.dodges || 0) - (a.stats.dodges || 0);
    });
    const leaderboard = entries.map(e => ({
      id: e.id,
      name: e.name,
      color: e.color,
      character: e.character,
      score: 'W' + (e.stats.wavesSurvived || 0),
      chips: [
        { label: 'Dodges', value: e.stats.dodges || 0 },
        { label: 'Sprints', value: e.stats.sprints || 0 },
        { label: 'Pickups', value: e.stats.powerupsGrabbed || 0 },
      ],
    }));

    return {
      winnerId: msg.winnerId,
      winnerName: w ? (w.name || 'Player ' + msg.winnerId) : null,
      winnerColor: w ? w.color : '#fff',
      winnerCharacter: w ? w.character : null,
      winLabel: 'DODGED THEM ALL!',
      loseIcon: '☄️', loseText: 'EVERYONE GOT BURNED!',
      loseQuote: 'Total annihilation. Beautiful.',
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
  meteor_warning: (msg) => {
    Sound.play('meteorWarn');
    Render2D.onWarning(msg);
    showMsg('GET TO SAFETY!', 1800);
  },

  meteor_impact: () => {
    Sound.play('meteorImpact');
    Render2D.onImpact();
    if (typeof FX !== 'undefined') {
      FX.shake(20); FX.screenFlash('#ff3300', 0.5);
      FX.burst(640, 360, 40, { color: '#ff6600', speed: 8, glow: true, life: 0.8, size: 5 });
      FX.burst(640, 360, 20, { color: '#ffcc00', speed: 4, glow: true, life: 0.5, size: 3 });
      FX.burst(640, 360, 10, { color: '#fff', speed: 10, life: 0.3, size: 2 });
    }
  },

  eliminated: (msg) => {
    Sound.play('eliminated');
    if (typeof FX !== 'undefined') { FX.shake(10); FX.elimBurst(640, 360, '#ff4444'); }
    Narrator.elimination(pname(msg.playerId));
  },

  singed: (msg) => {
    Sound.play('stumble');
    showMsg(pname(msg.playerId) + ' is SINGED! One more and out.', 1800);
  },

  shield_break: (msg) => {
    Sound.play('shieldBreak');
    showMsg(pname(msg.playerId) + "'s shield absorbed the impact!", 1500);
  },

  powerup_collected: (msg) => {
    const labels = { radar: 'RADAR', shield: 'SHIELD', sprintBoost: 'SPRINT BOOST' };
    Sound.play('shieldPickup');
    showMsg(pname(msg.playerId) + ' got ' + (labels[msg.powerup] || ''), 1200);
  },

  push: (msg) => {
    Sound.play('bump');
    showMsg(pname(msg.from) + ' pushed ' + pname(msg.to) + '!', 1000);
  },

  fire_zone: () => {
    Sound.play('foxSprint');
    Narrator.custom('Fire on the ground! Watch where you step.');
  },

  dramatic_finish: () => {
    if (typeof FX !== 'undefined') { FX.setVignette(0.3); FX.triggerSlowMo(0.6, 2.0); }
    Narrator.custom("It's down to two!");
  },

  platform_shrink: () => {
    Sound.play('shrink');
    showMsg('Arena shrinking!', 1200);
  },
});
