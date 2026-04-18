// Phase 34 — thin per-game configurator over HostHarness. Boot, state,
// countdown, lobby, game-over, and button wiring live in the harness
// (client-shared/host-harness.js). Escape-specific message handlers +
// HUD updates are wired in here.

Render2D.init();
const pname = HostCommon.pname;
const showMsg = (text, ms) => HostHarness.showMsg(text, ms);

function updateHUD(s) {
  const $ = id => document.getElementById(id);
  const $hudDist = $('hud-distance'), $hudAlive = $('hud-alive'), $hudSpeed = $('hud-speed');

  $hudDist.textContent = Math.floor(s.worldDist) + 'm';
  const alive = Object.values(s.players).filter(p => p.connected && p.alive).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = alive + '/' + total + ' alive';
  const prox = s.foxProximity || 0;
  if (prox > 0.7) { $hudSpeed.textContent = '🦊 FOX IS CATCHING UP!'; $hudSpeed.style.color = '#FF4422'; }
  else if (prox > 0.4) { $hudSpeed.textContent = '🦊 Fox getting close...'; $hudSpeed.style.color = '#FFAA44'; }
  else { const sp = Math.round((s.speed / 0.3 - 1) * 100); $hudSpeed.textContent = sp > 0 ? '+' + sp + '% speed' : ''; $hudSpeed.style.color = ''; }

  if (typeof HUD !== 'undefined') {
    const foxWarn = prox > 0.7 ? '🦊 FOX IS CATCHING UP!' : (prox > 0.4 ? '🦊 Fox getting close...' : '');
    HUD.update(s.players, {
      gameName: 'ESCAPE THE FOX',
      primary: Math.floor(s.worldDist) + 'm',
      secondary: foxWarn,
      secondaryColor: prox > 0.7 ? '#FF4422' : '#FFAA44',
    });
  }
}

HostHarness.boot({
  gameId: 'escapeFox',
  lobbyAsset: 'lobby-escape',
  musicKey: 'escapeFox',
  introKey: 'escapeFox',
  countdownFinal: 'RUN!',
  lobbyReadyMsg: 'Ready to run!',
  onStateRunning: updateHUD,
  buildPostGameOpts: (state, msg) => {
    const w = msg.winnerId ? state.players[msg.winnerId] : null;
    return {
      winnerId: msg.winnerId,
      winnerName: w ? (w.name || 'Player ' + msg.winnerId) : null,
      winnerColor: w ? w.color : '#fff',
      winnerCharacter: w ? w.character : null,
      winLabel: 'SURVIVED!',
      loseIcon: '🦊', loseText: 'THE FOX WINS!',
      loseQuote: 'Nobody survived. I love it when that happens.',
      stats: [
        { label: 'Distance', value: Math.floor(state.worldDist || 0) + 'm' },
      ],
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
    Render2D.triggerElim();
    const state = HostHarness.getState();
    if (typeof FX !== 'undefined') { FX.shake(12); FX.screenFlash('#ff2200', 0.3); FX.elimBurst(640, 400, state.players[msg.playerId]?.color || '#f44'); }
    Narrator.elimination(pname(msg.playerId));
  },

  speed_burst: () => {
    Narrator.speedBurst();
    if (typeof FX !== 'undefined') { FX.screenFlash('#ff6600', 0.1); FX.textPopup(640, 200, 'SPEED UP!', '#ff6600'); }
    if (typeof Visual !== 'undefined') Visual.drawSpeedLines(document.getElementById('game-canvas')?.getContext('2d'), 640, 360, 0.5);
  },

  stumble: (msg) => {
    Sound.play('stumble');
    Render2D.triggerElim();
    if (typeof FX !== 'undefined') { FX.shake(6); FX.screenFlash('#ffaa00', 0.15); FX.burst(640, 400, 12, { color: '#ffaa00', speed: 3, life: 0.4 }); FX.textPopup(640, 370, 'STUMBLE!', '#ffaa00'); }
    showMsg(pname(msg.playerId) + ' stumbled!', 1500);
  },

  near_miss: (msg) => {
    Sound.play('nearMiss');
    if (typeof FX !== 'undefined') { FX.nearMissSpark(640, 380); FX.comboPopup(640, 360, msg.combo || 1); }
  },

  powerup_collected: (msg) => {
    const labels = { shield: 'SHIELD', speedBoost: 'SPEED BOOST', coin: 'COIN' };
    const sounds = { shield: 'shieldPickup', speedBoost: 'speedPickup', coin: 'coinPickup' };
    const colors = { shield: '#4488ff', speedBoost: '#ffdd44', coin: '#FFD700' };
    Sound.play(sounds[msg.powerup]);
    showMsg(pname(msg.playerId) + ' got ' + (labels[msg.powerup] || ''), 1200);
    if (typeof FX !== 'undefined') { FX.powerupBurst(640, 380, colors[msg.powerup] || '#fff'); FX.textPopup(640, 350, labels[msg.powerup], colors[msg.powerup]); }
  },

  shield_break: (msg) => {
    Sound.play('shieldBreak');
    Render2D.triggerElim();
    showMsg(pname(msg.playerId) + "'s shield shattered!", 1500);
  },

  fox_growl: () => {
    Sound.play('foxGrowl');
    Render2D.triggerElim();
    Narrator.custom('The fox is angry!');
  },

  fox_sprint: () => {
    Sound.play('foxSprint');
    Narrator.custom('Fox is sprinting!');
  },

  fox_leap: () => {
    Sound.play('foxLeap');
    Render2D.triggerElim();
    Narrator.custom('The fox LEAPS forward!');
  },

  dramatic_finish: () => {
    Render2D.triggerDramatic();
    if (typeof FX !== 'undefined') { FX.setVignette(0.3); FX.triggerSlowMo(0.6, 2.0); }
    Narrator.custom("It's down to two!");
  },
});
