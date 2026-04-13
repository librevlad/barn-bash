const ws = new WebSocket('ws://' + location.host);
let state = { players: {}, phase: 'lobby' };
let gameStarted = false;

const $ = id => document.getElementById(id);
const $lobby = $('lobby'), $lobbyInfo = $('lobby-info'), $lobbyPlayers = $('lobby-players');
const $btnStart = $('btn-start');
const $hud = $('hud'), $hudWave = $('hud-wave'), $hudAlive = $('hud-alive'), $hudWarn = $('hud-warn');
const $countdown = $('countdown'), $message = $('message');
const $winOverlay = $('winner-overlay'), $controls = $('controls');

// No model loading needed — instant start!
Render2D.init();
function pname(id) { const p = window._lastPlayers && window._lastPlayers[id]; return p ? (p.name || 'Player ' + id) : 'Player ' + id; }

ws.onopen = () => ws.send(JSON.stringify({ type: 'host' }));

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (typeof Tournament !== 'undefined' && Tournament.handleMessage(msg)) return;
  switch (msg.type) {
    case 'state':
      window._lastPlayers = msg.gameState ? msg.gameState.players : {};
      if (msg.gameId && msg.gameId !== 'meteor') {
        if (msg.gameId === 'escapeFox') window.location.href = '/host-escape/';
        else if (msg.gameId === 'hillKing') window.location.href = '/host-hill/';
        else window.location.href = '/host/';
        return;
      }
      state = msg.gameState;
      if (state.phase === 'lobby') { gameStarted = false; showLobby(state); }
      else if (state.phase === 'running') {
        if (!gameStarted) {
          gameStarted = true;
          $lobby.classList.add('hidden');
          if (typeof HUD !== 'undefined') HUD.init();
          $controls.style.display = 'none';
          $winOverlay.classList.remove('show');
          Sound.startMusic('meteor');
          Narrator.gameIntro('meteor');
          runCountdown();
        }
        Render2D.updateState(state);
        updateHUD(state);
      } else if (state.phase === 'result') {
        Render2D.updateState(state);
      }
      break;
    case 'meteor_warning':
      Sound.play('meteorWarn');
      Render2D.onWarning(msg);
      showMsg('GET TO SAFETY!', 1800);
      break;
    case 'meteor_impact':
      Sound.play('meteorImpact');
      Render2D.onImpact();
      if (typeof FX !== 'undefined') {
        FX.shake(20); FX.screenFlash('#ff3300', 0.5);
        FX.burst(640, 360, 40, { color: '#ff6600', speed: 8, glow: true, life: 0.8, size: 5 });
        FX.burst(640, 360, 20, { color: '#ffcc00', speed: 4, glow: true, life: 0.5, size: 3 });
        FX.burst(640, 360, 10, { color: '#fff', speed: 10, life: 0.3, size: 2 });
      }
      break;
    case 'eliminated':
      Sound.play('eliminated');
      if (typeof FX !== 'undefined') { FX.shake(10); FX.elimBurst(640, 360, '#ff4444'); }
      Narrator.elimination(pname(msg.playerId));
      break;
    case 'singed':
      Sound.play('stumble');
      showMsg(pname(msg.playerId) + ' is SINGED! One more and out.', 1800);
      break;
    case 'shield_break':
      Sound.play('shieldBreak');
      showMsg(pname(msg.playerId) + "'s shield absorbed the impact!", 1500);
      break;
    case 'powerup_collected': {
      const labels = { radar: 'RADAR', shield: 'SHIELD', sprintBoost: 'SPRINT BOOST' };
      Sound.play('shieldPickup');
      showMsg(pname(msg.playerId) + ' got ' + (labels[msg.powerup] || ''), 1200);
      break;
    }
    case 'push':
      Sound.play('bump');
      showMsg('Player ' + msg.from + ' pushed Player ' + msg.to + '!', 1000);
      break;
    case 'fire_zone':
      Sound.play('foxSprint');
      Narrator.custom('Fire on the ground! Watch where you step.');
      break;
    case 'dramatic_finish':
      if (typeof FX !== 'undefined') { FX.setVignette(0.3); FX.triggerSlowMo(0.6, 2.0); }
      Narrator.custom("It's down to two!");
      break;
    case 'platform_shrink':
      Sound.play('shrink');
      showMsg('Arena shrinking!', 1200);
      break;
    case 'game_over':
      Sound.stopMusic();
      Sound.play(msg.winnerId ? 'winner' : 'eliminated');
      if (typeof FX !== 'undefined') { FX.screenFlash('#fff', 0.4); FX.triggerSlowMo(0.3, 1.5); }
      if (typeof Visual !== 'undefined') Visual.triggerWinner();
      if (msg.winnerId) Narrator.winner(pname(msg.winnerId));
      else Narrator.noWinner();
      if (typeof Tournament !== 'undefined' && Tournament.isActive()) break;
      showWinner(msg.winnerId);
      break;
    case 'gameSelected':
      if (msg.gameId !== 'meteor') {
        if (msg.gameId === 'escapeFox') window.location.href = '/host-escape/';
        else if (msg.gameId === 'hillKing') window.location.href = '/host-hill/';
        else window.location.href = '/host/';
      }
      break;
  }
};

function runCountdown() {
  $hud.style.display = 'none';
  const steps = ['3', '2', '1', 'DODGE!'];
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
  $lobbyInfo.textContent = conn.length >= 2 ? 'Ready to dodge!' : 'Waiting for players...';
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
  $hudWave.textContent = 'Wave ' + (s.wave || 1);
  const alive = Object.values(s.players).filter(p => p.connected && p.alive).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = alive + '/' + total + ' alive';
  $hudWarn.textContent = s.subPhase === 'warning' ? '⚠ METEORS INCOMING' : '';
  if (typeof HUD !== 'undefined') {
    const warn = s.subPhase === 'warning' ? '⚠ METEORS INCOMING' : '';
    HUD.update(s.players, {
      gameName: 'METEOR SHOWER',
      primary: 'Wave ' + (s.wave || 1),
      secondary: warn,
      secondaryColor: '#ff4422',
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
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };
  const p = winnerId ? state.players[winnerId] : null;
  if (p) {
    const icon = charIcons[p.character] || '';
    $winOverlay.innerHTML = `
      <div style="font-size:60px;margin-bottom:8px;filter:drop-shadow(0 0 20px ${p.color})">${icon}</div>
      <div class="w-text" style="color:${p.color};text-shadow:0 0 30px ${p.color}">${pname(winnerId)}</div>
      <div style="font-size:22px;font-weight:800;color:#fff;margin-top:4px;letter-spacing:3px">DODGED THEM ALL!</div>
      <div class="w-sub" style="margin-top:12px">Survived ${state.wave || 0} waves</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">LOBBY</button>
      </div>`;
  } else {
    $winOverlay.innerHTML = `
      <div style="font-size:50px;margin-bottom:8px">☄️</div>
      <div class="w-text" style="color:#ff6633;text-shadow:0 0 20px rgba(255,102,51,0.5)">EVERYONE GOT BURNED!</div>
      <div style="font-size:14px;color:#888;margin-top:8px;font-style:italic">"Total annihilation. Beautiful."</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">LOBBY</button>
      </div>`;
  }
  $winOverlay.classList.add('show');
}

$btnStart.onclick = () => ws.send(JSON.stringify({ type: 'start' }));
$('btn-again').onclick = () => ws.send(JSON.stringify({ type: 'restart' }));
$('btn-lobby').onclick = () => {
  ws.send(JSON.stringify({ type: 'restart' }));
  setTimeout(() => { window.location.href = '/host/'; }, 200);
};
