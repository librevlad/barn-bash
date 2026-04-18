/* =========================================================================
   Frantics Controller — main.js (Phase 2b WS adapter)
   Owns: gesture manager + WebSocket. Delegates gameplay UI to Gameplay
   module (gameplay.js) and onboarding UI to Onboarding module.
   ========================================================================= */

let playerId = null, myColor = null, phase = 'lobby';
let gameId = 'escapeFox';
let myName = null;
let selectedChar = null;
let selectedColor = null;
let jumpCount = 0;
let gameplayReady = false;        // true after Gameplay.start() has been called
let stumbleTimer = null;
let teeterTimer = null;
let shieldState = false, speedState = false;

const GAME_NAMES = {
  escapeFox: 'ESCAPE THE FOX',
  hillKing:  'KING OF THE HILL',
  meteor:    'METEOR SHOWER',
  race:      'GRAND PRIX',
};

// ============================================================
// ONBOARDING — delegates to Onboarding module (onboarding.js)
// ============================================================
Onboarding.start({
  onDone: ({ name, character, carColor }) => {
    myName = name;
    selectedChar = character;
    selectedColor = carColor;
    connectWS();
  },
});

function hideOnboarding() {
  const root = document.querySelector('.onboarding-root');
  if (!root) return;
  root.style.transition = 'opacity 300ms';
  root.style.opacity = '0';
  setTimeout(() => root.remove(), 320);
}

function ensureGameplay(nextGameId) {
  const targetGame = nextGameId || gameId;
  if (gameplayReady) {
    const root = document.querySelector('.gameplay-root');
    if (root && root.classList.contains('game-' + targetGame)) {
      return; // same game, no rebuild
    }
    // Game id changed (or root missing) — tear down and rebuild so that
    // eyebrow text, hintbar actions, and icon match the new game.
    Gameplay.stop();
    gameplayReady = false;
  }
  Gameplay.start({
    gameId: targetGame,
    playerId: playerId,
    character: selectedChar,
    carColor: selectedColor,
    name: myName,
    onLobby: () => { send('restart'); },
  });
  gameplayReady = true;
}

// ============================================================
// WEBSOCKET — delayed until onboarding complete
// ============================================================
let ws = null;
let wsRetryCount = 0;
const WS_RETRY_DELAYS = [1000, 2000, 4000, 8000];

function connectWS() {
  ws = new WebSocket('ws://' + location.host);
  ws.onopen = () => {
    wsRetryCount = 0;
    if (gameplayReady && Gameplay.getPhase() === 'lost') {
      // Reconnected — return to previous state; the next `state` message
      // will restore HUD content.
      Gameplay.setPhase(phase === 'running' ? 'running' : 'idle');
    }
    // Phase 28 — protocol-typed message. carColor stays an extra
    // field (not in the canonical Join shape, additive).
    const joinMsg = Protocol.makeJoin({ name: myName, character: selectedChar });
    joinMsg.carColor = selectedColor;
    Protocol.send(ws, joinMsg);
  };
  ws.onmessage = onMessage;
  ws.onclose = () => {
    if (wsRetryCount < WS_RETRY_DELAYS.length) {
      const delay = WS_RETRY_DELAYS[wsRetryCount++];
      if (gameplayReady) {
        Gameplay.setPhase('lost');
        Gameplay.setConnectionAttempt(wsRetryCount, WS_RETRY_DELAYS.length);
      }
      setTimeout(connectWS, delay);
      return;
    }
    if (gameplayReady) {
      Gameplay.setPhase('lost');
      Gameplay.setConnectionAttempt(WS_RETRY_DELAYS.length, WS_RETRY_DELAYS.length);
    }
    document.body.onclick = () => { document.body.onclick = null; location.reload(); };
  };
}

// ============================================================
// GESTURE DETECTION — unchanged engine/Input.js wiring
// ============================================================
const input = new InputManager(document.body, {
  excludeSelector: '.onboarding-root, .gameplay-root .gp-action, .gameplay-root .gp-go-btn'
});
input.onTap(() => onTap());
input.onSwipe(({ direction }) => onSwipe(direction));
input.onHold(() => onHold());
input.onHoldRelease(() => onHoldRelease());

// ============================================================
// GESTURE HANDLERS
// ============================================================

function onTap() {
  if (phase !== 'running') return;
  let actionKey = null;
  if (gameId === 'escapeFox') {
    jumpCount++;
    actionKey = 'jump';
    send('jump');
    Sound.play(jumpCount > 1 ? 'jump2' : 'jump');
  } else if (gameId === 'hillKing') {
    actionKey = 'dash';
    send('dash');
    Sound.play('dash');
  } else if (gameId === 'meteor') {
    actionKey = 'dodge';
    send('dodge');
    Sound.play('dodge');
  } else if (gameId === 'race') {
    actionKey = 'useItem';
    send('useItem');
    Sound.play('dash');
  }
  if (actionKey && gameplayReady) Gameplay.onLocalAction(actionKey);
  document.body.style.transform = 'scale(0.98)';
  setTimeout(() => { document.body.style.transform = ''; }, 80);
}

function onSwipe(dir) {
  if (phase !== 'running') return;
  let actionKey = null;

  if (gameId === 'escapeFox') {
    if (dir === 'left' || dir === 'right') {
      actionKey = 'lane';
      send('lane', dir);
      Sound.play('dash');
    } else if (dir === 'up') {
      jumpCount++;
      actionKey = 'jumpStart';
      send('jumpStart');
      Sound.play(jumpCount > 1 ? 'jump2' : 'jump');
      setTimeout(() => send('jumpEnd'), 400);
    } else if (dir === 'down') {
      actionKey = 'slide';
      send('slide');
      Sound.play('slide');
    }
  } else if (gameId === 'hillKing') {
    if (dir === 'down') {
      actionKey = 'groundPound';
      send('groundPound');
      Sound.play('slam');
    } else {
      actionKey = 'move';
      send('move', dir);
      Sound.play('dodge');
    }
  } else if (gameId === 'meteor') {
    actionKey = 'move';
    send('move', dir);
    Sound.play('dodge');
  } else if (gameId === 'race') {
    if (dir === 'left' || dir === 'right') {
      actionKey = 'steer';
      send('steer', dir);
    } else if (dir === 'down') {
      actionKey = 'dropItem';
      send('dropItem');
    }
  }

  if (actionKey && gameplayReady) {
    Gameplay.onLocalAction(actionKey, { gesture: 'swipe', direction: dir });
  }
}

function onHold() {
  if (phase !== 'running') return;
  if (gameplayReady) Gameplay.holdStart();

  if (gameId === 'hillKing') {
    send('shield');
  } else if (gameId === 'meteor') {
    send('sprint');
  } else if (gameId === 'race') {
    send('driftStart');
  }
}

function onHoldRelease() {
  if (gameplayReady) Gameplay.holdEnd();
  if (gameId === 'hillKing') {
    send('shieldEnd');
  } else if (gameId === 'race') {
    send('driftEnd');
  }
}

function send(action, direction) {
  if (!ws || ws.readyState !== 1) return;
  const msg = { type: action === 'restart' ? 'restart' : 'input' };
  if (msg.type === 'input') msg.action = action;
  if (direction) msg.direction = direction;
  ws.send(JSON.stringify(msg));
}

// Phase 38e — analog move for hillKing virtual joystick. Sends vx/vy
// floats in [-1, 1] alongside the existing discrete move protocol.
function sendMoveAnalog(vx, vy) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: 'input', action: 'move', vx: vx, vy: vy }));
}

// Phase 38e / 42 — hill virtual joystick + dash-charge button. Both
// installed only while gameId === 'hillKing' and the player is in the
// running phase. The joystick zone excludes the dash button.
let hillJoystick = null;
let hillDashBtn = null;
function updateJoystickMode() {
  const active = (gameId === 'hillKing' && phase === 'running');
  if (active && !hillJoystick && typeof HillJoystick !== 'undefined') {
    hillJoystick = new HillJoystick({
      onMove: sendMoveAnalog,
      excludeSelector: '.gp-action, .gp-go-btn, .gp-countdown, .gameover-root, .hill-dash-btn',
    });
    hillJoystick.install();
  } else if (!active && hillJoystick) {
    hillJoystick.destroy();
    hillJoystick = null;
  }

  if (active && !hillDashBtn && typeof HillDashButton !== 'undefined') {
    hillDashBtn = new HillDashButton({
      onRelease: (power) => {
        if (!ws || ws.readyState !== 1) return;
        ws.send(JSON.stringify({ type: 'input', action: 'dash', power: power }));
        if (gameplayReady) Gameplay.onLocalAction('DASH!');
        Sound.play('dash', { power: power });
      },
    });
    hillDashBtn.install();
  } else if (!active && hillDashBtn) {
    hillDashBtn.destroy();
    hillDashBtn = null;
  }
}

// ============================================================
// WEBSOCKET MESSAGES → Gameplay API
// ============================================================

function onMessage(e) {
  const msg = JSON.parse(e.data);

  switch (msg.type) {
    case 'init':
      playerId = msg.playerId;
      myColor = msg.color;
      if (msg.colorId && msg.colorId !== selectedColor) {
        Onboarding.onServerAssignedColor?.(msg.colorId);
        selectedColor = msg.colorId;
      }
      break;

    case 'player_joined':
      if (msg.playerId !== playerId) Onboarding.onPlayerJoined?.(msg);
      break;

    case 'player_left':
      Onboarding.onPlayerLeft?.(msg.playerId);
      break;

    case 'gameSelected':
      hideOnboarding();
      gameId = msg.gameId;
      jumpCount = 0;
      ensureGameplay(gameId);
      Gameplay.setPhase('idle');
      Gameplay.setScore('0', { context: 'waiting for start' });
      break;

    case 'tournamentStarted':
      hideOnboarding();
      ensureGameplay(gameId);
      Gameplay.setPhase('idle');
      Gameplay.setScore('0', { context: 'tournament starting' });
      break;

    case 'tournamentRound':
      gameId = msg.gameId;
      jumpCount = 0;
      ensureGameplay(gameId);
      Gameplay.setPhase('countdown');
      Gameplay.setCountdown('Round ' + msg.round, (GAME_NAMES[msg.gameId] || '') + ' · get ready');
      break;

    case 'tournamentStandings':
      if (!gameplayReady) break;
      Gameplay.setScore((msg.scores && msg.scores[playerId]) || '0', { context: 'round ' + (msg.round || '-') });
      break;

    case 'tournamentEnd':
      if (!gameplayReady) break;
      Gameplay.onGameOver({
        label: 'Tournament Complete',
        winnerName: msg.champName || ('Player ' + msg.champId),
        winnerCharacter: (msg.playerCharacters && msg.playerCharacters[msg.champId]) || selectedChar,
        subline: msg.champId === playerId ? 'YOU ARE CHAMPION!' : 'CHAMPION',
        quip: msg.quip,
      });
      break;

    case 'state':
      if (msg.gameId) gameId = msg.gameId;
      if (!playerId) break;
      ensureGameplay(gameId);
      phase = msg.gameState.phase;
      updateJoystickMode();

      if (phase === 'lobby') {
        Gameplay.setPhase('idle');
        Gameplay.setScore('0', { context: 'waiting for host' });
        break;
      }
      if (phase !== 'running') break;

      if (Gameplay.getPhase() !== 'running' && Gameplay.getPhase() !== 'eliminated') {
        Gameplay.setPhase('running');
      }

      handleRunningState(msg.gameState);
      break;

    case 'eliminated':
      if (msg.playerId !== playerId) break;
      if (gameplayReady) Gameplay.setPhase('eliminated');
      phase = 'running';
      break;

    case 'powerup_collected':
      if (msg.playerId !== playerId || !gameplayReady) break;
      {
        const labels = { shield: 'SHIELD!', speedBoost: 'SPEED!', sprintBoost: 'SPRINT!', radar: 'RADAR!', coin: '+COIN', anchor: 'ANCHOR!', superDash: 'SUPER DASH!', gravityBomb: 'BOMB!' };
        const sounds = { shield: 'shieldPickup', speedBoost: 'speedPickup', sprintBoost: 'speedPickup', radar: 'coinPickup', coin: 'coinPickup', anchor: 'shieldPickup', superDash: 'speedPickup', gravityBomb: 'coinPickup' };
        Gameplay.onLocalAction(labels[msg.powerup] || 'POWERUP');
        Sound.play(sounds[msg.powerup]);
        if (msg.powerup === 'shield') { shieldState = true; Gameplay.setModifier('shielded', true); }
        if (msg.powerup === 'speedBoost' || msg.powerup === 'sprintBoost') { speedState = true; Gameplay.setModifier('speeding', true); }
      }
      break;

    case 'shield_break':
      if (msg.playerId !== playerId || !gameplayReady) break;
      shieldState = false;
      Gameplay.setModifier('shielded', false);
      Gameplay.rejectAction('SHIELD BROKEN');
      Sound.play('shieldBreak');
      break;

    case 'stumble':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.setModifier('stumbling', true);
      Gameplay.onLocalAction('STUMBLE!');
      Sound.play('stumble');
      clearTimeout(stumbleTimer);
      stumbleTimer = setTimeout(() => Gameplay.setModifier('stumbling', false), 800);
      break;

    case 'near_miss':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.nearMiss();
      Sound.play('nearMiss');
      break;

    case 'fox_growl':
      Sound.play('foxGrowl');
      navigator.vibrate?.([50, 20, 50, 20, 50]);
      break;
    case 'fox_sprint':
      Sound.play('foxSprint');
      break;
    case 'fox_leap':
      Sound.play('foxLeap');
      navigator.vibrate?.([80]);
      break;

    case 'dramatic_finish':
      if (gameplayReady) Gameplay.onLocalAction('⚡ FINAL TWO!');
      navigator.vibrate?.([30, 15, 30, 15, 30]);
      break;

    case 'sudden_death':
      if (gameplayReady) Gameplay.onLocalAction('SUDDEN DEATH');
      navigator.vibrate?.([50, 20, 50, 20, 50]);
      break;

    case 'teetering':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.rejectAction('TEETERING!');
      Gameplay.setModifier('teetering', true);
      navigator.vibrate?.([60, 30, 60, 30, 60]);
      clearTimeout(teeterTimer);
      teeterTimer = setTimeout(() => Gameplay.setModifier('teetering', false), 1500);
      break;

    case 'bump':
      if (msg.to !== playerId || !gameplayReady) break;
      Gameplay.rejectAction('BUMPED!');
      navigator.vibrate?.(80);
      break;

    case 'ground_pound':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.onLocalAction('SLAM!');
      break;

    case 'gravity_bomb':
      if (!gameplayReady) break;
      if (msg.playerId === playerId) Gameplay.onLocalAction('BOOM!');
      else Gameplay.rejectAction('BOMB!');
      navigator.vibrate?.([50, 20, 50]);
      break;

    case 'singed':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.rejectAction('SINGED!');
      Sound.play('stumble');
      break;

    case 'push':
      if (msg.to !== playerId || !gameplayReady) break;
      Gameplay.rejectAction('PUSHED!');
      break;

    case 'bump':
      if (!gameplayReady) break;
      if (msg.to === playerId) Gameplay.rejectAction('BUMPED!');
      else if (msg.from === playerId) Gameplay.onLocalAction('HIT!');
      break;

    case 'shieldBlock':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.onLocalAction('BLOCKED!');
      Sound.play('shieldPickup');
      break;

    case 'item_pickup':
      if (msg.playerId !== playerId || !gameplayReady) break;
      {
        const map = { boost: 'speed', oil: 'shield', missile: 'shield', shield: 'shield' };
        Gameplay.setItem(map[msg.item] || 'shield');
        Gameplay.onLocalAction((msg.item || 'item').toUpperCase() + '!');
        Sound.play('coinPickup');
      }
      break;

    case 'item_used':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.setItem(null);
      Gameplay.onLocalAction(msg.item ? msg.item.toUpperCase() + '!' : 'USE!');
      Sound.play('dash');
      break;

    case 'lap_complete':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.onLocalAction('LAP ' + msg.lap + '!');
      Sound.play('nearMiss');
      break;

    case 'race_finish':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.onLocalAction('#' + msg.position);
      Sound.play('shieldPickup');
      break;

    case 'drift_boost':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.onLocalAction('DRIFT BOOST!');
      break;

    case 'player_stunned':
      if (msg.playerId !== playerId || !gameplayReady) break;
      Gameplay.rejectAction('STUNNED!');
      Sound.play('stumble');
      break;

    case 'game_over':
      if (!gameplayReady) break;
      phase = 'result';
      {
        const winnerIsMe = msg.winnerId === playerId;
        const subline = gameId === 'hillKing' ? (winnerIsMe ? 'YOU ARE KING!' : 'IS KING!')
                      : gameId === 'race' ? (winnerIsMe ? 'YOU WON THE RACE!' : 'WINS THE RACE!')
                      : (winnerIsMe ? 'YOU SURVIVED!' : 'SURVIVED!');
        Gameplay.onGameOver({
          label: 'Round complete',
          winnerName: winnerIsMe ? myName : (msg.winnerName || (msg.winnerId ? 'Player ' + msg.winnerId : null)),
          winnerCharacter: winnerIsMe ? selectedChar : (msg.winnerCharacter || 'wolf'),
          subline: msg.winnerId ? subline : 'NO WINNER',
          quip: msg.narratorText || (winnerIsMe ? 'The crowd goes mild.' : ''),
        });
        navigator.vibrate?.(winnerIsMe ? [50, 30, 50, 30, 100] : [30]);
      }
      break;
  }
}

// ============================================================
// PER-GAME running-state → Gameplay view
// ============================================================
function handleRunningState(state) {
  const me = state.players && state.players[playerId];
  if (!me) return;

  // Track modifier flags for shield / speed / stumbling on every tick.
  const wantShield  = !!me.shield;
  const wantSpeed   = !!(me.speedBoost || me.sprint);
  const wantStumble = !!me.stumbling;
  if (wantShield !== shieldState) { shieldState = wantShield; Gameplay.setModifier('shielded', wantShield); }
  if (wantSpeed  !== speedState)  { speedState  = wantSpeed;  Gameplay.setModifier('speeding',  wantSpeed); }
  if (wantStumble) Gameplay.setModifier('stumbling', true);
  else if (!wantStumble && !stumbleTimer) Gameplay.setModifier('stumbling', false);

  if (!me.alive) {
    if (Gameplay.getPhase() !== 'eliminated') Gameplay.setPhase('eliminated');
    return;
  }

  if (gameId === 'escapeFox') {
    if (me.y === 0) jumpCount = 0;
    const dist = Math.floor(state.worldDist || 0);
    Gameplay.setScore(dist + 'm', { context: 'meters dodged' });
    Gameplay.setItem(null);
  } else if (gameId === 'meteor') {
    Gameplay.setScore('Wave ' + (state.wave || 1), { context: countAliveLabel(state) });
    const warning = state.subPhase === 'warning' && !me.safe;
    Gameplay.setMeteorWarn(warning);
    Gameplay.setItem(null);
  } else if (gameId === 'hillKing') {
    const seconds = Math.floor((state.elapsedMs || 0) / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    Gameplay.setScore(mm + ':' + ss, { context: 'on the hill' });
    Gameplay.setItem(null);
  } else if (gameId === 'race') {
    const totalLaps = state.totalLaps || 3;
    if (me.finished) {
      const fo = state.finishOrder || [];
      const pos = fo.indexOf(playerId) + 1;
      Gameplay.setScore('#' + (pos || '?'), { context: 'finished' });
    } else {
      const lap = Math.min(me.lap || 1, totalLaps);
      Gameplay.setScore('Lap ' + lap + '/' + totalLaps, { context: 'in the race' });
    }
    Gameplay.setItem(me.item || null);
  }
}

function countAliveLabel(state) {
  const players = Object.values(state.players || {});
  const alive = players.filter(p => p.alive && p.connected !== false).length;
  return alive + ' alive';
}

// ============================================================
// DESKTOP D-PAD (dev helper)
// ============================================================
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const dir = btn.dataset.dir;
    if (dir === 'tap') onTap();
    else if (dir === 'hold') onHold();
    else onSwipe(dir);
  });
  btn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    if (btn.dataset.dir === 'hold') onHoldRelease();
  });
});
