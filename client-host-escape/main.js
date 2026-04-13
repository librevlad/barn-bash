const ws = new WebSocket('ws://' + location.host);
let state = { players: {}, phase: 'lobby' };
let gameStarted = false;

const $ = id => document.getElementById(id);
const $lobby = $('lobby'), $lobbyInfo = $('lobby-info'), $lobbyPlayers = $('lobby-players');
const $btnStart = $('btn-start');
const $hud = $('hud'), $hudDist = $('hud-distance'), $hudAlive = $('hud-alive'), $hudSpeed = $('hud-speed');
const $countdown = $('countdown'), $message = $('message');
const $winOverlay = $('winner-overlay'), $controls = $('controls');

Render2D.init();
function pname(id) { const p = window._lastPlayers && window._lastPlayers[id]; return p ? (p.name || 'Player ' + id) : 'Player ' + id; }

ws.onopen = () => ws.send(JSON.stringify({ type: 'host' }));

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (typeof Tournament !== 'undefined' && Tournament.handleMessage(msg)) return;

  switch (msg.type) {
    case 'state':
      window._lastPlayers = msg.gameState ? msg.gameState.players : {};
      if (msg.gameId && msg.gameId !== 'escapeFox') {
        if (msg.gameId === 'hillKing') window.location.href = '/host-hill/';
        else if (msg.gameId === 'meteor') window.location.href = '/host-meteor/';
        else (typeof Transitions !== 'undefined' ? Transitions.navigateTo('/host/') : window.location.href = '/host/');
        return;
      }
      state = msg.gameState;
      if (state.phase === 'lobby') {
        gameStarted = false;
        showLobby(state);
      } else if (state.phase === 'running') {
        if (!gameStarted) {
          gameStarted = true;
          $lobby.classList.add('hidden');
          if (typeof HUD !== 'undefined') HUD.init();
          $controls.style.display = 'none';
          $winOverlay.classList.remove('show');
          Sound.startMusic('escapeFox');
          Narrator.gameIntro('escapeFox');
          runCountdown();
        }
        Render2D.updateState(state);
        updateHUD(state);
      } else if (state.phase === 'result') {
        Render2D.updateState(state);
      }
      break;
    case 'eliminated':
      Sound.play('eliminated');
      Render2D.triggerElim();
      if (typeof FX !== 'undefined') { FX.shake(12); FX.screenFlash('#ff2200', 0.3); FX.elimBurst(640, 400, state.players[msg.playerId]?.color || '#f44'); }
      Narrator.elimination(pname(msg.playerId));
      break;
    case 'fox_caught':
      Sound.play('eliminated');
      Render2D.triggerElim();
      if (typeof FX !== 'undefined') { FX.shake(18); FX.screenFlash('#ff0000', 0.5); FX.setVignette(0.8); }
      Narrator.custom('The fox feasts tonight.');
      break;
    case 'speed_burst':
      Narrator.speedBurst();
      break;
    case 'stumble':
      Sound.play('stumble');
      Render2D.triggerElim();
      showMsg(pname(msg.playerId) + ' stumbled!', 1500);
      break;
    case 'near_miss':
      Sound.play('nearMiss');
      if (typeof FX !== 'undefined') { FX.nearMissSpark(640, 380); FX.comboPopup(640, 360, msg.combo || 1); }
      break;
    case 'powerup_collected': {
      const labels = { shield: 'SHIELD', speedBoost: 'SPEED BOOST', coin: 'COIN' };
      const sounds = { shield: 'shieldPickup', speedBoost: 'speedPickup', coin: 'coinPickup' };
      const colors = { shield: '#4488ff', speedBoost: '#ffdd44', coin: '#FFD700' };
      Sound.play(sounds[msg.powerup]);
      showMsg(pname(msg.playerId) + ' got ' + (labels[msg.powerup] || ''), 1200);
      if (typeof FX !== 'undefined') { FX.powerupBurst(640, 380, colors[msg.powerup] || '#fff'); FX.textPopup(640, 350, labels[msg.powerup], colors[msg.powerup]); }
      break;
    }
    case 'shield_break':
      Sound.play('shieldBreak');
      Render2D.triggerElim();
      showMsg(pname(msg.playerId) + "'s shield shattered!", 1500);
      break;
    case 'fox_growl':
      Sound.play('foxGrowl');
      Render2D.triggerElim();
      Narrator.custom('The fox is angry!');
      break;
    case 'fox_sprint':
      Sound.play('foxSprint');
      Narrator.custom('Fox is sprinting!');
      break;
    case 'fox_leap':
      Sound.play('foxLeap');
      Render2D.triggerElim();
      Narrator.custom('The fox LEAPS forward!');
      break;
    case 'dramatic_finish':
      Render2D.triggerDramatic();
      if (typeof FX !== 'undefined') { FX.setVignette(0.3); FX.triggerSlowMo(0.6, 2.0); }
      Narrator.custom("It's down to two!");
      break;
    case 'game_over':
      Sound.stopMusic();
      Sound.play(msg.winnerId ? 'winner' : 'eliminated');
      if (typeof FX !== 'undefined') { FX.screenFlash('#fff', 0.4); FX.triggerSlowMo(0.3, 1.5); }
      if (msg.winnerId) Narrator.winner(pname(msg.winnerId));
      else Narrator.noWinner();
      if (typeof Tournament !== 'undefined' && Tournament.isActive()) break;
      showWinner(msg.winnerId);
      break;
    case 'gameSelected':
      if (msg.gameId !== 'escapeFox') (typeof Transitions !== 'undefined' ? Transitions.navigateTo('/host/') : window.location.href = '/host/');
      break;
  }
};

function runCountdown() {
  $hud.style.display = 'none';
  const steps = ['3', '2', '1', 'RUN!'];
  let i = 0;
  $countdown.style.display = 'block';
  function next() {
    if (i >= steps.length) { $countdown.style.display = 'none'; $hud.style.display = ''; return; }
    $countdown.textContent = steps[i];
    $countdown.style.transform = 'translate(-50%, -50%) scale(1.6)';
    $countdown.style.opacity = '1';
    Sound.play(i < 3 ? 'countdownTick' : 'countdownGo');
    setTimeout(() => { $countdown.style.transform = 'translate(-50%, -50%) scale(0.7)'; $countdown.style.opacity = '0'; }, 500);
    i++; setTimeout(next, 750);
  }
  next();
}

function showLobby(s) {
  $lobby.classList.remove('hidden');
  $hud.style.display = 'none';
  $controls.style.display = 'none';
  $winOverlay.classList.remove('show');
  $countdown.style.display = 'none';
  const conn = Object.entries(s.players).filter(([, p]) => p.connected);
  $lobbyInfo.textContent = conn.length >= 2 ? 'Ready to run!' : 'Waiting for players...';
  $btnStart.style.display = conn.length >= 2 ? '' : 'none';
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };
  $lobbyPlayers.innerHTML = conn
    .map(([id, p]) => {
      const name = p.name || ('P' + id);
      const icon = p.character ? (charIcons[p.character] || '') : '';
      return `<span style="color:${p.color};margin:0 12px;font-weight:700;font-size:16px;">${icon} ${name}</span>`;
    }).join('');
}

function updateHUD(s) {
  // Legacy HUD (keep for backward compat)
  $hudDist.textContent = Math.floor(s.worldDist) + 'm';
  const alive = Object.values(s.players).filter(p => p.connected && p.alive).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = alive + '/' + total + ' alive';
  const prox = s.foxProximity || 0;
  if (prox > 0.7) { $hudSpeed.textContent = '🦊 FOX IS CATCHING UP!'; $hudSpeed.style.color = '#FF4422'; }
  else if (prox > 0.4) { $hudSpeed.textContent = '🦊 Fox getting close...'; $hudSpeed.style.color = '#FFAA44'; }
  else { const sp = Math.round((s.speed / 0.3 - 1) * 100); $hudSpeed.textContent = sp > 0 ? '+' + sp + '% speed' : ''; $hudSpeed.style.color = ''; }

  // Shared HUD with player avatars
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

let msgTimer = null;
function showMsg(text, ms) {
  clearTimeout(msgTimer);
  $message.textContent = text;
  $message.classList.add('show');
  msgTimer = setTimeout(() => $message.classList.remove('show'), ms);
}

function showWinner(winnerId) {
  $hud.style.display = 'none';
  $message.classList.remove('show');
  const p = winnerId ? state.players[winnerId] : null;
  if (p) {
    $winOverlay.innerHTML = `<div class="w-text" style="color:${p.color}">${pname(winnerId)} SURVIVED!</div>
      <div class="w-sub">${Math.floor(state.worldDist)}m distance</div>`;
  } else {
    $winOverlay.innerHTML = `<div class="w-text">NOBODY SURVIVED!</div><div class="w-sub">The fox wins this time...</div>`;
  }
  $winOverlay.classList.add('show');
  $controls.style.display = 'flex';
}

$btnStart.onclick = () => ws.send(JSON.stringify({ type: 'start' }));
$('btn-again').onclick = () => ws.send(JSON.stringify({ type: 'restart' }));
$('btn-lobby').onclick = () => {
  ws.send(JSON.stringify({ type: 'selectGame', gameId: 'escapeFox' }));
  (typeof Transitions !== 'undefined' ? Transitions.navigateTo('/host/') : window.location.href = '/host/');
};
