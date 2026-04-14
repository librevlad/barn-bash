const ws = new WebSocket('ws://' + location.host);

const $lobbyPlayers = document.getElementById('lobby-players');
const $gameGrid = document.getElementById('game-grid');
const $btnTournament = document.getElementById('btn-tournament');
const $narratorIdle = document.getElementById('narrator-idle');
const $connectUrl = document.getElementById('connect-url');
const $connectUrlValue = document.getElementById('connect-url-value');
const $gameModal = document.getElementById('game-modal');
const $modalNeed = document.getElementById('modal-need');
const $btnPlay = document.getElementById('btn-play');
const $btnCustomize = document.getElementById('btn-customize');
const $btnSettings = document.getElementById('btn-settings');

// Show connect URL
const connectUrl = location.host + '/controller';
$connectUrlValue.textContent = connectUrl;
$connectUrl.dataset.url = connectUrl;

let playerCount = 0;

ws.onopen = () => ws.send(JSON.stringify({ type: 'host' }));

// ============================================================
// IDLE NARRATOR
// ============================================================
const IDLE_QUIPS = [
  '"Is anyone coming? I didn\'t prepare all this for nothing."',
  '"The stage is set. The audience is... nonexistent."',
  '"Tick tock. My patience has limits."',
  '"You know, the show works better with actual contestants."',
  '"Ah, silence. My favorite sound. Just kidding. I hate it."',
  '"Every second you waste is a second I could be tormenting someone."',
];
const IDLE_QUIPS_WITH_PLAYERS = [
  '"Shall we begin? Or are we waiting for more victims?"',
  '"I see brave souls have gathered. How... touching."',
  '"The more the merrier. Well, merrier for me."',
  '"Don\'t be shy. Press PLAY. They\'re all equally unfair."',
];
let idleTimer = null, lastQuipIdx = -1, hasPlayers = false;

function startIdleNarrator() {
  clearInterval(idleTimer);
  showIdleQuip();
  idleTimer = setInterval(showIdleQuip, 9000);
}
function showIdleQuip() {
  const pool = hasPlayers ? IDLE_QUIPS_WITH_PLAYERS : IDLE_QUIPS;
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); } while (idx === lastQuipIdx && pool.length > 1);
  lastQuipIdx = idx;
  $narratorIdle.style.opacity = '0';
  setTimeout(() => { $narratorIdle.textContent = pool[idx]; $narratorIdle.style.opacity = '1'; }, 400);
}
function stopIdleNarrator() { clearInterval(idleTimer); $narratorIdle.style.opacity = '0'; }
startIdleNarrator();

// Start music on first click
document.addEventListener('click', () => { Sound.startMusic('lobby'); }, { once: true });

// ============================================================
// HOTSPOT BUTTONS — with hover sound + click sound + narrator
// ============================================================
// Hover sound for all buttons
document.querySelectorAll('.hotspot').forEach(btn => {
  btn.addEventListener('mouseenter', () => Sound.play('nearMiss'));
});
// Also hover on modal cards
document.querySelectorAll('.modal-card, .modal-tournament').forEach(btn => {
  btn.addEventListener('mouseenter', () => Sound.play('nearMiss'));
});

$btnPlay.addEventListener('click', () => {
  Sound.play('countdownGo');
  navigator.vibrate?.([30]);
  $modalNeed.style.display = playerCount < 2 ? 'block' : 'none';
  $gameModal.classList.add('show');
});

$btnCustomize.addEventListener('click', () => {
  Sound.play('shieldPickup');
  navigator.vibrate?.([20]);
  $narratorIdle.style.opacity = '0';
  setTimeout(() => {
    $narratorIdle.textContent = '"Customize? Use your phone to pick a character!"';
    $narratorIdle.style.opacity = '1';
  }, 200);
  clearInterval(idleTimer);
  idleTimer = setTimeout(() => startIdleNarrator(), 4000);
});

$btnSettings.addEventListener('click', () => {
  Sound.play('shieldPickup');
  navigator.vibrate?.([20]);
  $narratorIdle.style.opacity = '0';
  setTimeout(() => {
    $narratorIdle.textContent = '"Settings? There are none. I control everything."';
    $narratorIdle.style.opacity = '1';
  }, 200);
  clearInterval(idleTimer);
  idleTimer = setTimeout(() => startIdleNarrator(), 4000);
});

// Modal close
document.getElementById('modal-close').addEventListener('click', () => {
  $gameModal.classList.remove('show');
});
$gameModal.addEventListener('click', (e) => {
  if (e.target === $gameModal) $gameModal.classList.remove('show');
});

// ============================================================
// MESSAGE HANDLING
// ============================================================
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (Tournament.handleMessage(msg)) return;

  switch (msg.type) {
    case 'gameSelected':
      stopIdleNarrator();
      $gameModal.classList.remove('show');
      navigateToGame(msg.gameId);
      break;
    case 'state':
      window._lastPlayers = msg.gameState ? msg.gameState.players : {};
      if (msg.gameId && msg.gameState && msg.gameState.phase !== 'lobby') {
        stopIdleNarrator();
        navigateToGame(msg.gameId);
        return;
      }
      updateLobby(msg.gameState ? msg.gameState.players : {});
      break;
    case 'player_joined':
      showJoinReaction(msg);
      break;
  }
};

// ============================================================
// JOIN REACTIONS
// ============================================================
const CHAR_REACTIONS = {
  cat: ['"A cat. How... predictable."', '"Cats always land on their feet. Let\'s test that."'],
  frog: ['"A frog? This should be... slimy."', '"Ribbit ribbit. That\'s frog for \'I\'m doomed.\'"'],
  wolf: ['"A wolf. Bold choice. I respect hunger."', '"Fangs won\'t save you here, wolf."'],
  bear: ['"A bear. This should be... heavy."', '"Slow and steady. Emphasis on slow."'],
  bunny: ['"A bunny! How adorable. How doomed."', '"Fast little thing. I like a moving target."'],
  pig: ['"A pig. Stubborn. I can work with that."', '"Oink oink. That\'s pig for \'I regret nothing.\'"'],
  chicken: ['"A chicken! Brave choice. Or not."', '"Why did the chicken join the game show?"'],
  raccoon: ['"A raccoon. Watch your pockets, everyone."', '"Sneaky. I respect that."'],
};
const GENERIC_REACTIONS = [
  '"{name} has entered the arena."',
  '"Ah, {name}. Fresh meat."',
  '"Welcome, {name}. Don\'t get comfortable."',
];

function showJoinReaction(msg) {
  let quip;
  if (msg.character && CHAR_REACTIONS[msg.character]) {
    const pool = CHAR_REACTIONS[msg.character];
    quip = pool[Math.floor(Math.random() * pool.length)];
  } else {
    quip = GENERIC_REACTIONS[Math.floor(Math.random() * GENERIC_REACTIONS.length)];
  }
  quip = quip.replace('{name}', msg.name || 'stranger');
  $narratorIdle.style.opacity = '0';
  setTimeout(() => { $narratorIdle.textContent = quip; $narratorIdle.style.opacity = '1'; }, 200);
  clearInterval(idleTimer);
  idleTimer = setTimeout(() => startIdleNarrator(), 5000);
}

// ============================================================
// LOBBY RENDERING
// ============================================================
const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺', bear: '🐻', bunny: '🐰', pig: '🐷', chicken: '🐔', raccoon: '🦝' };

function navigateToGame(gameId) {
  const urls = { escapeFox: '/host-escape/', hillKing: '/host-hill/', meteor: '/host-meteor/', race: '/host-race/' };
  if (urls[gameId]) {
    if (typeof Transitions !== 'undefined') Transitions.navigateTo(urls[gameId]);
    else window.location.href = urls[gameId];
  }
}

if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);

function updateLobby(players) {
  const connected = Object.entries(players || {}).filter(([, p]) => p.connected);
  playerCount = connected.length;
  hasPlayers = playerCount > 0;

  if (playerCount === 0) {
    $lobbyPlayers.innerHTML = '<div class="player-empty">Waiting for players...</div>';
  } else {
    $lobbyPlayers.innerHTML = connected.map(([id, p]) => {
      const icon = p.character ? charIcons[p.character] || '' : '?';
      const name = p.name || ('P' + id);
      return `<div class="player-pill" style="border-color:${p.color}44">
        <span class="player-pill-icon">${icon}</span>
        <span class="player-pill-name" style="color:${p.color}">${name}</span>
      </div>`;
    }).join('');
  }

  // Update modal need message
  if (playerCount >= 2) $modalNeed.style.display = 'none';
}

// Game card clicks (inside modal)
$gameGrid.querySelectorAll('.modal-card').forEach(card => {
  card.addEventListener('click', () => {
    if (playerCount < 2) { Sound.play('stumble'); return; }
    Sound.play('countdownGo');
    stopIdleNarrator();
    $gameModal.classList.remove('show');
    ws.send(JSON.stringify({ type: 'selectGame', gameId: card.dataset.game }));
  });
});

// Tournament
$btnTournament.addEventListener('click', () => {
  if (playerCount < 2) { Sound.play('stumble'); return; }
  Sound.play('winner');
  stopIdleNarrator();
  $gameModal.classList.remove('show');
  ws.send(JSON.stringify({ type: 'startTournament' }));
});
