const ws = new WebSocket('ws://' + location.host);
let state = { players: {}, phase: 'lobby' };
let gameStarted = false;

const $ = id => document.getElementById(id);
const $lobby = $('lobby'), $lobbyInfo = $('lobby-info'), $lobbyPlayers = $('lobby-players');
const $btnStart = $('btn-start');
const $hud = $('hud'), $hudAlive = $('hud-alive'), $hudPlat = $('hud-plat');
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
      if (HostCommon.redirectIfWrongGame('hillKing', msg.gameId)) return;
      state = msg.gameState;
      if (state.phase === 'lobby') { gameStarted = false; showLobby(state); }
      else if (state.phase === 'running') {
        if (!gameStarted) {
          gameStarted = true;
          $lobby.classList.add('hidden');
          $controls.style.display = 'none';
          if (typeof HUD !== 'undefined') { HUD.init(); $hud.style.display = 'none'; }
          $winOverlay.classList.remove('show');
          Sound.startMusic('hillKing');
          Narrator.gameIntro('hillKing');
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
      if (typeof FX !== 'undefined') { FX.shake(10); FX.screenFlash('#ff2200', 0.3); FX.elimBurst(640, 360, '#f44'); }
      Narrator.elimination(pname(msg.playerId));
      break;
    case 'bump':
      Sound.play('bump');
      if (typeof FX !== 'undefined') { FX.shake(8); FX.screenFlash('#fff', 0.2); FX.burst(640, 360, 15, { color: '#B070FF', speed: 4, life: 0.3, glow: true }); }
      showMsg(pname(msg.from) + ' bumped ' + pname(msg.to) + '!', 1200);
      break;
    case 'shieldBlock':
      Narrator.shieldBlock(pname(msg.playerId));
      break;
    case 'platform_shrink':
      Sound.play('shrink');
      showMsg('Arena shrinking!', 1500);
      break;
    case 'teetering':
      Sound.play('stumble');
      showMsg(pname(msg.playerId) + ' is teetering!', 1500);
      break;
    case 'near_miss':
      Sound.play('nearMiss');
      break;
    case 'ground_pound':
      Sound.play('meteorImpact');
      if (typeof FX !== 'undefined') { FX.shake(14); FX.screenFlash('#B070FF', 0.2); FX.burst(640, 360, 20, { color: '#B070FF', speed: 5, glow: true }); FX.textPopup(640, 320, 'GROUND POUND!', '#B070FF'); }
      showMsg(pname(msg.playerId) + ' GROUND POUND!', 1200);
      break;
    case 'gravity_bomb':
      Sound.play('foxLeap');
      if (typeof FX !== 'undefined') { FX.shake(16); FX.screenFlash('#ff8800', 0.3); FX.burst(640, 360, 35, { color: '#ff8800', speed: 8, glow: true, life: 0.8 }); FX.textPopup(640, 300, 'GRAVITY BOMB!', '#ff8800'); }
      showMsg('GRAVITY BOMB!', 1500);
      break;
    case 'anchor_block':
      showMsg(pname(msg.playerId) + ' is ANCHORED!', 1000);
      break;
    case 'powerup_collected': {
      const labels = { anchor: 'ANCHOR', superDash: 'SUPER DASH', gravityBomb: 'GRAVITY BOMB' };
      Sound.play('shieldPickup');
      showMsg(pname(msg.playerId) + ' got ' + (labels[msg.powerup] || ''), 1200);
      break;
    }
    case 'hazard_cracks':
      Sound.play('shrink');
      Narrator.custom('Cracks forming! Watch your step.');
      break;
    case 'hazard_bumper':
      Sound.play('foxGrowl');
      Narrator.custom('A bumper appears in the center!');
      break;
    case 'hazard_ice':
      Narrator.custom('Ice zone! Slippery when deadly.');
      break;
    case 'sudden_death':
      Sound.play('foxGrowl');
      if (typeof FX !== 'undefined') { FX.shake(12); FX.screenFlash('#ff0000', 0.3); FX.setVignette(0.4); }
      Narrator.custom('SUDDEN DEATH! No more second chances!');
      showMsg('SUDDEN DEATH!', 3000);
      break;
    case 'dramatic_finish':
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
          winLabel: 'IS KING!',
          loseIcon: '💀', loseText: 'NOBODY SURVIVED!',
          loseQuote: 'The hill claims all...',
          stats: [],
          onPlayAgain: () => ws.send(JSON.stringify({ type: 'restart' })),
          onLobby: () => { ws.send(JSON.stringify({ type: 'restart' })); setTimeout(() => window.location.href = '/host/', 200); },
        });
      } else { showWinner(msg.winnerId); }
      break;
    case 'gameSelected':
      if (msg.gameId !== 'hillKing') window.location.href = '/host/';
      break;
  }
};

function runCountdown() {
  $hud.style.display = 'none';
  const steps = ['3', '2', '1', 'FIGHT!'];
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
  $lobbyInfo.textContent = connected >= 2 ? 'Ready to fight!' : 'Waiting for players...';
  $btnStart.style.display = connected >= 2 ? '' : 'none';
  $lobbyPlayers.innerHTML = HostCommon.lobbyPlayersHTML(s.players);
}

function updateHUD(s) {
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
      <div style="font-size:50px;margin-bottom:8px">👑</div>
      <div style="font-size:60px;filter:drop-shadow(0 0 20px ${p.color})">${icon}</div>
      <div class="w-text" style="color:${p.color};text-shadow:0 0 30px ${p.color}">${pname(winnerId)}</div>
      <div style="font-size:22px;font-weight:800;color:#B070FF;margin-top:4px;letter-spacing:3px">IS KING!</div>
      <div class="w-sub" style="margin-top:12px">Last one standing</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">LOBBY</button>
      </div>`;
  } else {
    $winOverlay.innerHTML = `
      <div class="w-text" style="color:#B070FF">NOBODY SURVIVED!</div>
      <div class="w-sub">The hill claims all...</div>
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
