// Phase 34 — thin per-game configurator over HostHarness.

Render2D.init();
const pname = HostCommon.pname;
const showMsg = (text, ms) => HostHarness.showMsg(text, ms);

function updateHUD(s) {
  const $ = id => document.getElementById(id);
  const $hudAlive = $('hud-alive'), $hudPlat = $('hud-plat');

  const alive = Object.values(s.players).filter(p => p.connected && p.alive).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = alive + '/' + total + ' alive';
  const pct = Math.round((s.platR / 5) * 100);
  $hudPlat.textContent = pct < 100 ? 'Arena: ' + pct + '%' : '';

  if (typeof HUD !== 'undefined') {
    HUD.update(s.players, {
      gameName: 'KING OF THE HILL',
      primary: pct < 100 ? 'Arena ' + pct + '%' : '',
      secondary: pct < 50 ? '⚠ SHRINKING!' : '',
      secondaryColor: '#ff4422',
    });
  }
}

HostHarness.boot({
  gameId: 'hillKing',
  lobbyAsset: 'lobby-hill',
  musicKey: 'hillKing',
  introKey: 'hillKing',
  countdownFinal: 'FIGHT!',
  lobbyReadyMsg: 'Ready to fight!',
  onStateRunning: updateHUD,
  buildPostGameOpts: (state, msg) => {
    const w = msg.winnerId ? state.players[msg.winnerId] : null;
    return {
      winnerId: msg.winnerId,
      winnerName: w ? (w.name || 'Player ' + msg.winnerId) : null,
      winnerColor: w ? w.color : '#fff',
      winnerCharacter: w ? w.character : null,
      winLabel: 'IS KING!',
      loseIcon: '💀', loseText: 'NOBODY SURVIVED!',
      loseQuote: 'The hill claims all...',
      stats: [],
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
    showMsg('Arena about to shrink!', 1200);
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
  },

  dramatic_finish: () => {
    if (typeof FX !== 'undefined') { FX.setVignette(0.3); FX.triggerSlowMo(0.6, 2.0); }
    Narrator.custom("It's down to two!");
  },
});
