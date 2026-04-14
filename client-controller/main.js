const $info     = document.getElementById('info');
const $score    = document.getElementById('score');
const $result   = document.getElementById('result');
const $status   = document.getElementById('status');
const $gameName = document.getElementById('game-name');
const $cdWrap   = document.getElementById('cooldown-wrap');
const $cdFill   = document.getElementById('cooldown-fill');
const $pulse    = document.getElementById('tap-pulse');
const $arrow    = document.getElementById('swipe-arrow');
const $holdRing = document.getElementById('hold-ring');
const $gestHint = document.getElementById('gesture-hint');

let playerId = null, myColor = null, phase = 'lobby';
let gameId = 'escapeFox', tapped = false;

const GAME_NAMES = { escapeFox: 'ESCAPE THE FOX', hillKing: 'KING OF THE HILL', meteor: 'METEOR SHOWER', race: 'GRAND PRIX' };
const GESTURE_HINTS = {
  escapeFox: 'TAP = jump · SWIPE ↑ = high jump · SWIPE ←→ = lane · SWIPE ↓ = slide',
  hillKing:  'SWIPE = move · SWIPE DOWN = slam · TAP = dash · HOLD = shield',
  meteor:    'TAP = dodge to safety · SWIPE = move · HOLD = sprint',
  race:      'SWIPE ←→ = steer · TAP = boost or use item · HOLD = drift',
};

const CHAR_NAMES = { cat: 'Cat', frog: 'Frog', wolf: 'Wolf' };
const CHAR_TRAITS = { cat: 'High Jumper', frog: 'Triple Jump', wolf: 'Long Slide' };
const CHAR_QUIPS = {
  cat: '"A cat. How... predictable."',
  frog: '"A frog? This should be... slimy."',
  wolf: '"A wolf. Bold choice. I respect hunger."',
};
let selectedChar = null;
let myName = null;
let jumpCount = 0;

// ============================================================
// ONBOARDING — Name → Character → Join
// ============================================================
const $onboarding = document.getElementById('onboarding');
const $obStepName = document.getElementById('ob-step-name');
const $obStepChar = document.getElementById('ob-step-char');
const $obName = document.getElementById('ob-name');
const $obNameBtn = document.getElementById('ob-name-btn');
const $obChars = document.getElementById('ob-chars');
const $obCharQuip = document.getElementById('ob-char-quip');

// Load from localStorage
const saved = localStorage.getItem('frantics_player');
if (saved) {
  try {
    const s = JSON.parse(saved);
    if (s.name) $obName.value = s.name;
    if (s.character) selectedChar = s.character;
  } catch {}
}

// Build character buttons
for (const [id, label] of Object.entries(CHAR_NAMES)) {
  const btn = document.createElement('button');
  btn.dataset.char = id;
  btn.innerHTML = `<span style="font-size:18px;margin-right:8px">${id === 'cat' ? '🐱' : id === 'frog' ? '🐸' : '🐺'}</span> ${label} <span style="color:#888;font-size:11px;margin-left:4px">(${CHAR_TRAITS[id]})</span>`;
  btn.style.cssText = 'display:flex;align-items:center;width:100%;padding:12px 14px;border:2px solid rgba(255,255,255,0.15);border-radius:10px;background:rgba(255,255,255,0.03);color:#eee;font-size:14px;cursor:pointer;font-family:inherit;text-align:left;';
  if (selectedChar === id) btn.style.borderColor = '#fff';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectedChar = id;
    $obCharQuip.textContent = CHAR_QUIPS[id] || '';
    $obChars.querySelectorAll('button').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.15)');
    btn.style.borderColor = '#fff';
    navigator.vibrate?.([15]);
  });
  $obChars.appendChild(btn);
}
// Confirm button for character selection
const confirmBtn = document.createElement('button');
confirmBtn.textContent = 'JOIN THE SHOW';
confirmBtn.style.cssText = 'display:block;width:100%;margin-top:14px;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff3366,#cc33ff);color:white;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;';
confirmBtn.addEventListener('click', (e) => { e.stopPropagation(); finishOnboarding(); });
$obChars.appendChild(confirmBtn);
if (selectedChar) $obCharQuip.textContent = CHAR_QUIPS[selectedChar] || '';

$obNameBtn.addEventListener('click', () => {
  const name = $obName.value.trim();
  if (!name) { $obName.focus(); return; }
  myName = name;
  $obStepName.style.display = 'none';
  $obStepChar.style.display = '';
  // Always show character selection — don't auto-proceed
});
$obName.addEventListener('keydown', (e) => { if (e.key === 'Enter') $obNameBtn.click(); });

function finishOnboarding() {
  if (!myName || !selectedChar) return;
  localStorage.setItem('frantics_player', JSON.stringify({ name: myName, character: selectedChar }));
  $onboarding.style.opacity = '0';
  setTimeout(() => { $onboarding.style.display = 'none'; }, 400);
  // Now connect
  connectWS();
}

// ============================================================
// WEBSOCKET — delayed until onboarding complete
// ============================================================
let ws = null;
function connectWS() {
  ws = new WebSocket('ws://' + location.host);
  ws.onopen = () => ws.send(JSON.stringify({ type: 'join', name: myName, character: selectedChar }));
  ws.onmessage = onMessage;
  ws.onclose = () => {
    $info.textContent = 'Disconnected';
    $status.textContent = 'Tap to reconnect';
    $score.textContent = '💔';
    phase = '';
    document.body.style.background = '#333';
    document.body.onclick = () => { document.body.onclick = null; location.reload(); };
  };
}

// ============================================================
// GESTURE DETECTION
// ============================================================
// Uses engine/Input.js — unified gesture manager
const input = new InputManager(document.body, { excludeSelector: '#onboarding' });
input.onTap(() => onTap());
input.onSwipe(({ direction }) => onSwipe(direction));
input.onHold(() => onHold());
input.onHoldRelease(() => onHoldRelease());
input.onPressStart(() => onPressStart());
input.onPressEnd(() => onPressEnd());

// ============================================================
// GESTURE HANDLERS
// ============================================================

function onTap() {
  if (gameId === 'escapeFox') {
    if (phase !== 'running') return;
    jumpCount++;
    send('jump');
    Sound.play(jumpCount > 1 ? 'jump2' : 'jump');
  } else if (gameId === 'hillKing') {
    if (phase !== 'running') return;
    send('dash');
    Sound.play('dash');
  } else if (gameId === 'meteor') {
    if (phase !== 'running') return;
    send('dodge');
    Sound.play('dodge');
  } else if (gameId === 'race') {
    if (phase !== 'running') return;
    send('useItem');
    Sound.play('dash');
  }
  // Visual feedback
  triggerPulse();
  document.body.style.transform = 'scale(0.95)';
  setTimeout(() => { document.body.style.transform = ''; }, 80);
  navigator.vibrate?.(20);
}

function onSwipe(dir) {
  if (phase !== 'running') return;

  if (gameId === 'escapeFox') {
    if (dir === 'left' || dir === 'right') {
      send('lane', dir);
      Sound.play('dash');
    } else if (dir === 'up') {
      jumpCount++;
      // Swipe up = high jump (hold boost for ~400ms)
      send('jumpStart');
      Sound.play(jumpCount > 1 ? 'jump2' : 'jump');
      setTimeout(() => send('jumpEnd'), 400);
    } else if (dir === 'down') {
      send('slide');
      Sound.play('slide');
    }
  } else if (gameId === 'hillKing') {
    if (dir === 'down') {
      // Swipe down = ground pound (AoE slam)
      send('groundPound');
      Sound.play('slam');
    } else {
      // Swipe left/right/up = direct movement (orbit + radius control)
      send('move', dir);
      Sound.play('dodge');
    }
  } else if (gameId === 'meteor') {
    send('move', dir);
    Sound.play('dodge');
  } else if (gameId === 'race') {
    if (dir === 'left' || dir === 'right') {
      send('steer', dir);
    } else if (dir === 'down') {
      send('dropItem');
    }
  }

  // Swipe arrow flash
  showSwipeArrow(dir);
  document.body.style.transform = `translate${dir === 'left' || dir === 'right' ? 'X' : 'Y'}(${dir === 'left' || dir === 'up' ? '-' : ''}8px)`;
  setTimeout(() => { document.body.style.transform = ''; }, 100);
  navigator.vibrate?.([15, 10, 25]);
}

function onHold() {
  if (phase !== 'running') return;
  $holdRing.classList.add('charging');

  if (gameId === 'hillKing') {
    send('shield');
    $status.textContent = 'SHIELDING...';
  } else if (gameId === 'meteor') {
    send('sprint');
    $status.textContent = 'SPRINTING...';
  } else if (gameId === 'race') {
    send('driftStart');
    $status.textContent = 'DRIFTING...';
  }
  navigator.vibrate?.(40);
}

function onHoldRelease() {
  $holdRing.classList.remove('charging');
  if (gameId === 'hillKing') {
    send('shieldEnd');
  } else if (gameId === 'race') {
    send('driftEnd');
  }
}

function onPressStart() {
  // Reserved for future per-game press events
}

function onPressEnd() {
  // Reserved for future per-game press events
}

function send(action, direction) {
  if (!ws || ws.readyState !== 1) return;
  const msg = { type: 'input', action };
  if (direction) msg.direction = direction;
  ws.send(JSON.stringify(msg));
}

function triggerPulse() {
  $pulse.classList.remove('active');
  void $pulse.offsetWidth;
  $pulse.classList.add('active');
}

let arrowTimer = null;
function showSwipeArrow(dir) {
  const arrows = { up: '↑', down: '↓', left: '←', right: '→' };
  $arrow.textContent = arrows[dir] || '';
  $arrow.classList.add('show');
  clearTimeout(arrowTimer);
  arrowTimer = setTimeout(() => $arrow.classList.remove('show'), 200);
}

function showCooldown(current, max) {
  $cdWrap.style.display = '';
  $cdFill.style.width = ((max - current) / max * 100) + '%';
}

// ============================================================
// WEBSOCKET MESSAGES
// ============================================================

function onMessage(e) {
  const msg = JSON.parse(e.data);

  switch (msg.type) {
    case 'init':
      playerId = msg.playerId;
      myColor = msg.color;
      $info.textContent = msg.name || ('Player ' + playerId);
      document.body.style.background = myColor;
      break;

    case 'gameSelected':
      gameId = msg.gameId;
      tapped = false;
      $result.textContent = ''; $result.className = '';
      $score.textContent = '0';
      $status.textContent = 'Waiting for start...';
      $gameName.textContent = GAME_NAMES[gameId] || '';
      $gestHint.textContent = GESTURE_HINTS[gameId] || '';
      $cdWrap.style.display = 'none';
      break;

    case 'tournamentStarted':
      $result.textContent = ''; $result.className = '';
      $status.textContent = 'Tournament starting!';
      break;

    case 'tournamentRound':
      gameId = msg.gameId;
      $gameName.textContent = 'ROUND ' + msg.round + '/' + msg.totalRounds;
      $gestHint.textContent = GESTURE_HINTS[msg.gameId] || '';
      $status.textContent = (GAME_NAMES[msg.gameId] || '') + ' next...';
      $score.textContent = (msg.scores && msg.scores[playerId]) || '0';
      $result.textContent = ''; $result.className = '';
      tapped = false;
      break;

    case 'tournamentStandings':
      $status.textContent = 'Standings...';
      $score.textContent = (msg.scores && msg.scores[playerId]) || '0';
      break;

    case 'tournamentEnd':
      $gameName.textContent = 'TOURNAMENT';
      $score.textContent = (msg.scores && msg.scores[playerId]) || '0';
      $status.textContent = msg.champId === playerId ? 'YOU ARE CHAMPION!' : 'Player ' + msg.champId + ' wins!';
      break;

    case 'state':
      if (msg.gameId) gameId = msg.gameId;
      $gameName.textContent = GAME_NAMES[gameId] || '';
      $gestHint.textContent = phase === 'running' ? (GESTURE_HINTS[gameId] || '') : '';
      if (!playerId) break;
      phase = msg.gameState.phase;

      if (gameId === 'escapeFox') {
        const me = msg.gameState.players[playerId];
        if (me) {
          const dist = Math.floor(msg.gameState.worldDist || 0);
          const score = me.score || 0;
          $score.textContent = dist + 'm' + (score > 0 ? ' · ' + score + 'pts' : '');
          if (phase === 'running') {
            if (me.y === 0) jumpCount = 0;
            if (me.stumbling) {
              $status.textContent = 'STUMBLING...';
            } else if (!me.alive) {
              $status.textContent = 'ELIMINATED';
            } else {
              let statusParts = [];
              if (me.shield) statusParts.push('SHIELD');
              if (me.speedBoost) statusParts.push('SPEED');
              if (me.combo > 1) statusParts.push('x' + me.combo);
              $status.textContent = statusParts.join(' · ');
            }
            if (me.alive && me.lane !== undefined) {
              $result.textContent = me.lane === -1 ? '←' : me.lane === 1 ? '→' : '·';
              $result.className = '';
            }
          } else if (phase === 'lobby') {
            const charEmoji = { cat: '🐱', frog: '🐸', wolf: '🐺' };
            $score.textContent = charEmoji[selectedChar] || '?';
            $status.textContent = 'Ready! Waiting for host...';
            $result.textContent = ''; $result.className = '';
          }
        }
      } else if (gameId === 'meteor') {
        const me = msg.gameState.players[playerId];
        if (me) {
          if (phase === 'running') {
            $score.textContent = 'Wave ' + (msg.gameState.wave || 1);
            if (!me.alive) { $status.textContent = 'BURNED!'; $cdWrap.style.display = 'none'; }
            else if (msg.gameState.subPhase === 'warning') {
              $status.textContent = me.safe ? '✓ SAFE!' : '⚠ SWIPE TO SAFETY!';
              $result.textContent = me.safe ? '✓' : '⚠';
              $result.className = me.safe ? 'correct' : 'wrong';
            } else {
              $status.textContent = 'Get ready...';
              $result.textContent = ''; $result.className = '';
            }
            $cdWrap.style.display = 'none';
          } else if (phase === 'lobby') {
            $score.textContent = '0'; $status.textContent = 'Waiting for start...';
            $result.textContent = ''; $result.className = ''; $cdWrap.style.display = 'none';
          }
        }
      } else if (gameId === 'hillKing') {
        const me = msg.gameState.players[playerId];
        if (me) {
          if (phase === 'running') {
            $score.textContent = me.alive ? (me.score > 0 ? me.score + 'pts' : '') : 'OUT';
            if (!me.alive) { $status.textContent = 'ELIMINATED'; $cdWrap.style.display = 'none'; }
            else if (me.cd > 0) { $status.textContent = 'COOLDOWN...'; showCooldown(me.cd, 16); }
            else { $status.textContent = ''; $cdWrap.style.display = 'none'; }
          } else if (phase === 'lobby') {
            $score.textContent = '0'; $status.textContent = 'Waiting for start...';
            $result.textContent = ''; $result.className = ''; $cdWrap.style.display = 'none';
          }
        }
      } else if (gameId === 'race') {
        const me = msg.gameState.players[playerId];
        if (me) {
          if (phase === 'running') {
            const totalLaps = msg.gameState.totalLaps || 3;
            if (me.finished) {
              // Show finish position from finishOrder
              const fo = msg.gameState.finishOrder || [];
              const pos = fo.indexOf(playerId) + 1;
              $score.textContent = '#' + (pos || '?');
              $status.textContent = 'FINISHED!';
            } else {
              const displayLap = Math.min(me.lap || 1, totalLaps);
              $score.textContent = 'Lap ' + displayLap + '/' + totalLaps;
            }
            if (!me.finished) {
              if (me.item) {
                $status.textContent = me.item.toUpperCase() + ' ready! TAP to use';
              } else if (me.stunned) {
                $status.textContent = 'STUNNED...';
              } else if (me.drifting) {
                $status.textContent = 'DRIFTING...';
              } else {
                $status.textContent = '';
              }
            }
            $cdWrap.style.display = 'none';
          } else if (phase === 'lobby') {
            $score.textContent = '0'; $status.textContent = 'Waiting for start...';
            $result.textContent = ''; $result.className = ''; $cdWrap.style.display = 'none';
          }
        }
      }
      break;

    case 'eliminated':
      if (msg.playerId === playerId) {
        $result.textContent = 'OUT'; $result.className = 'wrong';
        $status.textContent = 'ELIMINATED';
        navigator.vibrate?.([40, 30, 40]);
      }
      break;

    case 'powerup_collected':
      if (msg.playerId === playerId) {
        const labels = {
          shield: 'SHIELD!', speedBoost: 'SPEED!', sprintBoost: 'SPRINT!',
          radar: 'RADAR!', coin: '+COIN',
          anchor: 'ANCHOR!', superDash: 'SUPER DASH!', gravityBomb: 'BOMB!',
        };
        const sounds = {
          shield: 'shieldPickup', speedBoost: 'speedPickup', sprintBoost: 'speedPickup',
          radar: 'coinPickup', coin: 'coinPickup',
          anchor: 'shieldPickup', superDash: 'speedPickup', gravityBomb: 'coinPickup',
        };
        $result.textContent = labels[msg.powerup] || ''; $result.className = 'correct';
        Sound.play(sounds[msg.powerup]);
        navigator.vibrate?.([10, 5, 10]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1000);
      }
      break;

    case 'shield_break':
      if (msg.playerId === playerId) {
        $result.textContent = 'SHIELD BROKEN!'; $result.className = 'wrong';
        Sound.play('shieldBreak');
        navigator.vibrate?.([30, 20, 30]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1200);
      }
      break;

    case 'stumble':
      if (msg.playerId === playerId) {
        $result.textContent = 'STUMBLE!'; $result.className = 'wrong';
        Sound.play('stumble');
        navigator.vibrate?.([40, 20, 40]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1000);
      }
      break;

    case 'near_miss':
      if (msg.playerId === playerId) {
        $result.textContent = msg.combo > 1 ? 'CLOSE! x' + msg.combo : 'CLOSE!';
        $result.className = 'correct';
        Sound.play('nearMiss');
        navigator.vibrate?.([8]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 600);
      }
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
      $result.textContent = '⚡ FINAL TWO!'; $result.className = 'correct';
      navigator.vibrate?.([30, 15, 30, 15, 30]);
      setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 2000);
      break;

    case 'sudden_death':
      $result.textContent = '💀 SUDDEN DEATH'; $result.className = 'wrong';
      navigator.vibrate?.([50, 20, 50, 20, 50]);
      setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 3000);
      break;

    case 'teetering':
      if (msg.playerId === playerId) {
        $result.textContent = 'TEETERING!'; $result.className = 'wrong';
        navigator.vibrate?.([60, 30, 60, 30, 60]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1500);
      }
      break;

    case 'ground_pound':
      if (msg.playerId === playerId) {
        $result.textContent = 'SLAM!'; $result.className = 'correct';
        navigator.vibrate?.([40]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 800);
      }
      break;

    case 'gravity_bomb':
      if (msg.playerId === playerId) {
        $result.textContent = 'BOOM!'; $result.className = 'correct';
        navigator.vibrate?.([50, 20, 50]);
      } else {
        navigator.vibrate?.([40, 20, 40]);
      }
      setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1000);
      break;

    case 'singed':
      if (msg.playerId === playerId) {
        $result.textContent = 'SINGED!'; $result.className = 'wrong';
        Sound.play('stumble');
        navigator.vibrate?.([40, 20, 40]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1200);
      }
      break;

    case 'push':
      if (msg.to === playerId) {
        $result.textContent = 'PUSHED!'; $result.className = 'wrong';
        navigator.vibrate?.([30, 15, 30]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 800);
      }
      break;

    case 'bump':
      if (msg.to === playerId) {
        $result.textContent = 'BUMPED!'; $result.className = 'wrong';
        navigator.vibrate?.([40, 30, 40]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 800);
      } else if (msg.from === playerId) {
        $result.textContent = 'HIT!'; $result.className = 'correct';
        navigator.vibrate?.([15]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 600);
      }
      break;

    case 'shieldBlock':
      if (msg.playerId === playerId) {
        $result.textContent = 'BLOCKED!'; $result.className = 'correct';
        Sound.play('shieldPickup');
        navigator.vibrate?.([20, 10, 20]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 800);
      }
      break;

    case 'item_pickup':
      if (msg.playerId === playerId) {
        const itemLabels = { boost: 'BOOST!', oil: 'OIL TRAP!', missile: 'MISSILE!' };
        $result.textContent = itemLabels[msg.item] || 'ITEM!'; $result.className = 'correct';
        Sound.play('coinPickup');
        navigator.vibrate?.([10, 5, 10]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 800);
      }
      break;

    case 'item_used':
      if (msg.playerId === playerId) {
        $result.textContent = msg.item === 'boost' ? 'BOOST!' : msg.item === 'missile' ? 'FIRE!' : 'DROPPED!';
        $result.className = 'correct';
        Sound.play('dash');
        navigator.vibrate?.([20]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 600);
      }
      break;

    case 'lap_complete':
      if (msg.playerId === playerId) {
        $result.textContent = 'LAP ' + msg.lap + '!'; $result.className = 'correct';
        Sound.play('nearMiss');
        navigator.vibrate?.([30, 15, 30]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1500);
      }
      break;

    case 'race_finish':
      if (msg.playerId === playerId) {
        $result.textContent = '#' + msg.position; $result.className = 'correct';
        Sound.play('shieldPickup');
        navigator.vibrate?.([50, 30, 50]);
      }
      break;

    case 'drift_boost':
      if (msg.playerId === playerId) {
        $result.textContent = 'DRIFT BOOST!'; $result.className = 'correct';
        navigator.vibrate?.([15]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 500);
      }
      break;

    case 'player_stunned':
      if (msg.playerId === playerId) {
        $result.textContent = 'STUNNED!'; $result.className = 'wrong';
        Sound.play('stumble');
        navigator.vibrate?.([60, 30, 60]);
        setTimeout(() => { $result.textContent = ''; $result.className = ''; }, 1000);
      }
      break;

    case 'game_over':
      phase = 'result'; $result.textContent = ''; $result.className = '';
      $gestHint.textContent = '';
      const isMe = msg.winnerId === playerId;
      if (isMe) {
        $result.textContent = '🏆'; $result.className = 'correct';
        $score.textContent = 'WINNER!';
        $status.textContent = gameId === 'hillKing' ? 'YOU ARE KING!' : gameId === 'race' ? 'YOU WON THE RACE!' : 'YOU SURVIVED!';
        navigator.vibrate?.([50, 30, 50, 30, 100]);
        document.body.style.background = myColor;
      } else if (msg.winnerId) {
        $result.textContent = ''; $result.className = '';
        $status.textContent = 'Game over';
      } else {
        $result.textContent = '💀'; $result.className = 'wrong';
        $status.textContent = 'Nobody survived!';
      }
      break;
  }
}

// ---- DESKTOP D-PAD (for testing without touch) ----
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
