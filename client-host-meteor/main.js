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
const pname = HostCommon.pname;

// Phase 10d — async-strip lobby-meteor backdrop white surround; swap
// img src to processed data URL once loadPainterly resolves.
setTimeout(() => {
  if (typeof SpriteLoader === 'undefined') return;
  SpriteLoader.loadPainterly('lobby-meteor', '/assets/lobby-meteor.png')
    .then((canvas) => {
      const img = document.querySelector('#lobby .lobby-backdrop');
      if (img && canvas) img.src = canvas.toDataURL('image/png');
    })
    .catch(() => {});
}, 0);

ws.onopen = () => ws.send(JSON.stringify({ type: 'host' }));

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (typeof Tournament !== 'undefined' && Tournament.handleMessage(msg)) return;
  switch (msg.type) {
    case 'state':
      window._lastPlayers = msg.gameState ? msg.gameState.players : {};
      if (HostCommon.redirectIfWrongGame('meteor', msg.gameId)) return;
      state = msg.gameState;
      if (state.phase === 'lobby') { gameStarted = false; showLobby(state); }
      else if (state.phase === 'running') {
        if (!gameStarted) {
          gameStarted = true;
          $lobby.classList.add('hidden');
          if (typeof HUD !== 'undefined') { HUD.init(); $hud.style.display = 'none'; }
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
      showMsg(pname(msg.from) + ' pushed ' + pname(msg.to) + '!', 1000);
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
      if (typeof PostGame !== 'undefined') {
        const w = msg.winnerId ? state.players[msg.winnerId] : null;
        PostGame.show({
          winnerId: msg.winnerId,
          winnerName: w ? (w.name || 'Player ' + msg.winnerId) : null,
          winnerColor: w ? w.color : '#fff',
          winnerCharacter: w ? w.character : null,
          winLabel: 'DODGED THEM ALL!',
          loseIcon: '☄️', loseText: 'EVERYONE GOT BURNED!',
          loseQuote: 'Total annihilation. Beautiful.',
          stats: [
            { label: 'Waves', value: state.wave || 1 },
          ],
          onPlayAgain: () => ws.send(JSON.stringify({ type: 'restart' })),
          onLobby: () => { ws.send(JSON.stringify({ type: 'restart' })); setTimeout(() => window.location.href = '/host/', 200); },
        });
      } else { showWinner(msg.winnerId); }
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
    if (i >= steps.length) { $countdown.style.display = 'none'; return; }
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
  $lobbyInfo.textContent = connected >= 2 ? 'Ready to dodge!' : 'Waiting for players...';
  $btnStart.style.display = connected >= 2 ? '' : 'none';
  $lobbyPlayers.innerHTML = HostCommon.lobbyPlayersHTML(s.players);
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

function showMsg(text, ms) { HostCommon.showMsg($message, text, ms);
  msgTimer = setTimeout(() => $message.classList.remove('show'), ms);
}

function showWinner(winnerId) {
  if (typeof HUD !== 'undefined') HUD.hide();
  $hud.style.display = 'none';
  $message.classList.remove('show');
  const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };
  const p = winnerId ? state.players[winnerId] : null;
  if (p) {
    const icon = charIcons[p.character] || '';
    $winOverlay.innerHTML = `
      <div style="font-size:60px;margin-bottom:8px;filter:drop-shadow(0 0 20px ${p.color})">${icon}</div>
      <div class="w-text" style="color:${p.color};text-shadow:0 0 30px ${p.color}">${pname(winnerId)}</div>
      <div style="font-family:var(--font-display);font-size:22px;color:var(--accent-gold);margin-top:6px;letter-spacing:3px;text-shadow:0 2px 0 var(--accent-red-deep)">DODGED THEM ALL!</div>
      <div class="w-sub" style="margin-top:12px">Survived ${state.wave || 0} waves</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'">LOBBY</button>
      </div>`;
  } else {
    $winOverlay.innerHTML = `
      <div style="font-size:50px;margin-bottom:8px">☄️</div>
      <div class="w-text" style="color:var(--danger-red);text-shadow:0 2px 0 var(--accent-red-deep), 0 0 30px rgba(217,83,79,0.45)">EVERYONE GOT BURNED!</div>
      <div style="font-family:var(--font-accent);font-size:15px;color:var(--text-dim);margin-top:10px;font-style:italic;letter-spacing:0.3px">"Total annihilation. Beautiful."</div>
      <div id="controls" style="display:flex;justify-content:center;gap:12px;margin-top:24px">
        <button onclick="ws.send(JSON.stringify({type:'restart'}))">PLAY AGAIN</button>
        <button onclick="window.location.href='/host/'">LOBBY</button>
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
