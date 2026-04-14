const ws = new WebSocket('ws://' + location.host);
let state = { players: {}, phase: 'lobby' };
let gameStarted = false;

const $ = id => document.getElementById(id);
const $lobby = $('lobby'), $lobbyInfo = $('lobby-info'), $lobbyPlayers = $('lobby-players');
const $btnStart = $('btn-start');
const $hud = $('hud'), $hudLap = $('hud-lap'), $hudPos = $('hud-pos'), $hudAlive = $('hud-alive');
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
      if (HostCommon.redirectIfWrongGame('race', msg.gameId)) return;
      state = msg.gameState;
      if (state.phase === 'lobby') { gameStarted = false; showLobby(state); }
      else if (state.phase === 'running') {
        if (!gameStarted) {
          gameStarted = true;
          $lobby.classList.add('hidden');
          $controls.style.display = 'none';
          $winOverlay.classList.remove('show');
          if (typeof HUD !== 'undefined') { HUD.init(); $hud.style.display = 'none'; }
          Sound.startMusic('escapeFox'); // reuse escape music for now
          Narrator.gameIntro('race');
          runCountdown();
        }
        Render2D.updateState(state);
        updateHUD(state);
      } else if (state.phase === 'result') {
        Render2D.updateState(state);
      }
      break;

    case 'lap_complete':
      Sound.play('coinPickup');
      showMsg(pname(msg.playerId) + ' — Lap ' + msg.lap + '!', 1500);
      break;

    case 'race_finish':
      Sound.play('winner');
      if (typeof FX !== 'undefined') FX.screenFlash('#fff', 0.3);
      showMsg(pname(msg.playerId) + ' finishes ' + ordinal(msg.position) + '!', 2000);
      break;

    case 'item_pickup':
      Sound.play('coinPickup');
      break;

    case 'item_used':
      if (msg.item === 'boost') Sound.play('speedPickup');
      else if (msg.item === 'oil') Sound.play('slide');
      else if (msg.item === 'missile') Sound.play('foxSprint');
      break;

    case 'drift_boost':
      Sound.play('nearMiss');
      if (typeof FX !== 'undefined') FX.textPopup(640, 340, 'DRIFT BOOST!', '#44ff44');
      break;

    case 'player_stunned': {
      Sound.play('stumble');
      Render2D.triggerElim();
      if (typeof FX !== 'undefined') { FX.shake(8); FX.screenFlash('#ff4400', 0.2); }
      const reason = msg.reason === 'oil' ? 'slipped on oil!' : msg.reason === 'missile' ? 'got hit by a missile!' : 'crashed!';
      showMsg(pname(msg.playerId) + ' ' + reason, 1500);
      break;
    }

    case 'bump':
      Sound.play('bump');
      if (typeof FX !== 'undefined') FX.shake(4);
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
          winLabel: 'WINS THE RACE!',
          loseIcon: '🏁', loseText: 'RACE OVER!',
          loseQuote: 'Nobody crossed the line...',
          stats: [
            { label: 'Finished', value: (state.finishOrder ? state.finishOrder.length : 0) + '/' + Object.keys(state.players).length },
          ],
          onPlayAgain: () => ws.send(JSON.stringify({ type: 'restart' })),
          onLobby: () => { ws.send(JSON.stringify({ type: 'restart' })); setTimeout(() => window.location.href = '/host/', 200); },
        });
      } else { showWinner(msg.winnerId); }
      break;

    case 'gameSelected':
      if (msg.gameId !== 'race') {
        window.location.href = HostCommon.gameUrls[msg.gameId] || '/host/';
      }
      break;
  }
};

function ordinal(n) {
  const s = ['th','st','nd','rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function runCountdown() {
  $hud.style.display = 'none';
  const steps = ['3', '2', '1', 'GO!'];
  let i = 0;
  $countdown.style.display = 'block';
  function next() {
    if (i >= steps.length) { $countdown.style.display = 'none'; if (typeof HUD === 'undefined') $hud.style.display = ''; return; }
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
  $lobbyInfo.textContent = connected >= 2 ? 'Ready to race!' : 'Waiting for players...';
  $btnStart.style.display = connected >= 2 ? '' : 'none';
  $lobbyPlayers.innerHTML = HostCommon.lobbyPlayersHTML(s.players);
}

function updateHUD(s) {
  // Find "my" player (first connected) for lap display
  const conn = Object.entries(s.players).filter(([, p]) => p.connected);
  if (conn.length > 0) {
    // Show leader's lap
    let maxLap = 1;
    conn.forEach(([, p]) => { if (p.lap > maxLap) maxLap = p.lap; });
    $hudLap.textContent = 'Lap ' + Math.min(maxLap, s.totalLaps) + '/' + s.totalLaps;
  }

  const finished = Object.values(s.players).filter(p => p.connected && p.finished).length;
  const total = Object.values(s.players).filter(p => p.connected === true).length;
  $hudAlive.textContent = finished + '/' + total + ' finished';

  // Position ranking
  const sorted = conn.sort((a, b) => {
    const ga = a[1], gb = b[1];
    if (ga.finished && !gb.finished) return -1;
    if (!ga.finished && gb.finished) return 1;
    return (gb.waypoint || 0) - (ga.waypoint || 0);
  });
  const posTexts = sorted.slice(0, 3).map(([id, p], i) => {
    return ordinal(i + 1) + ' ' + (p.name || 'P' + id);
  });
  $hudPos.textContent = posTexts.join('  ');

  if (typeof HUD !== 'undefined') {
    HUD.update(s.players, {
      gameName: 'GRAND PRIX',
      primary: 'Lap ' + Math.min(s.finishOrder ? s.finishOrder.length + 1 : 1, s.totalLaps) + '/' + s.totalLaps,
      secondary: posTexts[0] || '',
      secondaryColor: '#ffcc00',
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
      <div style="font-size:50px;margin-bottom:4px">🏁</div>
      <div style="font-size:60px;filter:drop-shadow(0 0 20px ${p.color})">${icon}</div>
      <div class="w-text" style="color:${p.color};text-shadow:0 0 30px ${p.color}">${pname(winnerId)}</div>
      <div style="font-size:22px;font-weight:800;color:#4dff4d;margin-top:4px;letter-spacing:3px">WINS THE RACE!</div>
      <div class="w-sub" style="margin-top:12px">${state.finishOrder ? state.finishOrder.length : 0} racers finished</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.2);border-radius:8px;background:rgba(255,255,255,0.08);color:#eee;font-size:14px;cursor:pointer">LOBBY</button>
      </div>`;
  } else {
    $winOverlay.innerHTML = `
      <div class="w-text" style="color:#4dff4d">RACE OVER!</div>
      <div class="w-sub">Nobody crossed the line...</div>
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
