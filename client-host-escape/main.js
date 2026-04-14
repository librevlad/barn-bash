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
const pname = HostCommon.pname;

ws.onopen = () => ws.send(JSON.stringify({ type: 'host' }));

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (typeof Tournament !== 'undefined' && Tournament.handleMessage(msg)) return;

  switch (msg.type) {
    case 'state':
      window._lastPlayers = msg.gameState ? msg.gameState.players : {};
      if (HostCommon.redirectIfWrongGame('escapeFox', msg.gameId)) return;
      state = msg.gameState;
      if (state.phase === 'lobby') {
        gameStarted = false;
        showLobby(state);
      } else if (state.phase === 'running') {
        if (!gameStarted) {
          gameStarted = true;
          $lobby.classList.add('hidden');
          if (typeof HUD !== 'undefined') { HUD.init(); $hud.style.display = 'none'; }
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
    case 'speed_burst':
      Narrator.speedBurst();
      if (typeof FX !== 'undefined') { FX.screenFlash('#ff6600', 0.1); FX.textPopup(640, 200, 'SPEED UP!', '#ff6600'); }
      if (typeof Visual !== 'undefined') Visual.drawSpeedLines(document.getElementById('game-canvas')?.getContext('2d'), 640, 360, 0.5);
      break;
    case 'stumble':
      Sound.play('stumble');
      Render2D.triggerElim();
      if (typeof FX !== 'undefined') { FX.shake(6); FX.screenFlash('#ffaa00', 0.15); FX.burst(640, 400, 12, { color: '#ffaa00', speed: 3, life: 0.4 }); FX.textPopup(640, 370, 'STUMBLE!', '#ffaa00'); }
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
      if (typeof Visual !== 'undefined') Visual.triggerWinner();
      if (msg.winnerId) Narrator.winner(pname(msg.winnerId));
      else Narrator.noWinner();
      if (typeof Tournament !== 'undefined' && Tournament.isActive()) break;
      if (typeof PostGame !== 'undefined') {
        const w = msg.winnerId ? state.players[msg.winnerId] : null;
        PostGame.show({
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
          onPlayAgain: () => ws.send(JSON.stringify({ type: 'restart' })),
          onLobby: () => { ws.send(JSON.stringify({ type: 'restart' })); setTimeout(() => window.location.href = '/host/', 200); },
        });
      } else {
        showWinner(msg.winnerId);
      }
      break;
    case 'gameSelected':
      if (msg.gameId !== 'escapeFox') {
        const url = HostCommon.gameUrls[msg.gameId] || '/host/';
        typeof Transitions !== 'undefined' ? Transitions.navigateTo(url) : window.location.href = url;
      }
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
  const { connected } = HostCommon.countPlayers(s.players);
  $lobbyInfo.textContent = connected >= 2 ? 'Ready to run!' : 'Waiting for players...';
  $btnStart.style.display = connected >= 2 ? '' : 'none';
  $lobbyPlayers.innerHTML = HostCommon.lobbyPlayersHTML(s.players);
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

function showMsg(text, ms) { HostCommon.showMsg($message, text, ms);
}

function showWinner(winnerId) {
  if (typeof HUD !== 'undefined') HUD.hide();
  $hud.style.display = 'none';
  $message.classList.remove('show');
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };
  const p = winnerId ? state.players[winnerId] : null;
  if (p) {
    const icon = charIcons[p.character] || '';
    $winOverlay.innerHTML = `
      <div style="font-size:60px;margin-bottom:8px;filter:drop-shadow(0 0 20px ${p.color})">${icon}</div>
      <div class="w-text" style="color:${p.color};text-shadow:0 0 30px ${p.color}">${pname(winnerId)}</div>
      <div style="font-size:22px;font-weight:800;color:#fff;margin-top:4px;letter-spacing:3px">SURVIVED!</div>
      <div class="w-sub" style="margin-top:12px">${Math.floor(state.worldDist)}m distance</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">LOBBY</button>
      </div>`;
  } else {
    $winOverlay.innerHTML = `
      <div style="font-size:50px;margin-bottom:8px">🦊</div>
      <div class="w-text" style="color:#ff4422;text-shadow:0 0 20px rgba(255,68,34,0.5)">THE FOX WINS</div>
      <div style="font-size:16px;color:#888;margin-top:8px;font-style:italic">"Nobody survived. I love it when that happens."</div>
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
  setTimeout(() => {
    if (typeof Transitions !== 'undefined') Transitions.navigateTo('/host/');
    else window.location.href = '/host/';
  }, 200);
};
