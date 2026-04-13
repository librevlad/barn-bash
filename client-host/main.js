const ws = new WebSocket('ws://' + location.host);

const $lobbyPlayers = document.getElementById('lobby-players');
const $gameGrid = document.getElementById('game-grid');
const $btnTournament = document.getElementById('btn-tournament');
const $narratorIdle = document.getElementById('narrator-idle');
const $connectUrl = document.getElementById('connect-url-value');
const $contestantsLabel = document.getElementById('contestants-label');

// Show connect URL
$connectUrl.textContent = location.host + '/controller';

ws.onopen = () => ws.send(JSON.stringify({ type: 'host' }));

// ============================================================
// IDLE NARRATOR — Game Master quips while waiting
// ============================================================
const IDLE_QUIPS = [
  '"Is anyone coming? I didn\'t prepare all this for nothing."',
  '"The stage is set. The audience is... nonexistent."',
  '"Tick tock. My patience has limits."',
  '"I see we\'re fashionably late. How... predictable."',
  '"You know, the show works better with actual contestants."',
  '"I\'ve hosted scarier things. But never emptier."',
  '"Ah, silence. My favorite sound. Just kidding. I hate it."',
  '"Every second you waste is a second I could be tormenting someone."',
];
const IDLE_QUIPS_WITH_PLAYERS = [
  '"Shall we begin? Or are we waiting for more victims?"',
  '"I see brave souls have gathered. How... touching."',
  '"The more the merrier. Well, merrier for me."',
  '"Choose a challenge. Or stare at me. I enjoy both."',
  '"Don\'t be shy. Pick a game. They\'re all equally unfair."',
];
let idleTimer = null;
let lastQuipIdx = -1;
let hasPlayers = false;

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
  setTimeout(() => {
    $narratorIdle.textContent = pool[idx];
    $narratorIdle.style.opacity = '1';
  }, 400);
}

function stopIdleNarrator() {
  clearInterval(idleTimer);
  $narratorIdle.style.opacity = '0';
}

startIdleNarrator();

// ============================================================
// MESSAGE HANDLING
// ============================================================
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  if (Tournament.handleMessage(msg)) return;

  switch (msg.type) {
    case 'gameSelected':
      stopIdleNarrator();
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
      // Narrator reacts to new contestant
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
  setTimeout(() => {
    $narratorIdle.textContent = quip;
    $narratorIdle.style.opacity = '1';
  }, 200);
  // Resume idle after 5s
  clearInterval(idleTimer);
  idleTimer = setTimeout(() => startIdleNarrator(), 5000);
}

// ============================================================
// LOBBY RENDERING
// ============================================================
const charIcons = { cat: '🐱', frog: '🐸', wolf: '🐺' };
const charLabels = { cat: 'Cat', frog: 'Frog', wolf: 'Wolf' };

function navigateToGame(gameId) {
  const urls = { escapeFox: '/host-escape/', hillKing: '/host-hill/', meteor: '/host-meteor/', race: '/host-race/' };
  if (urls[gameId]) {
    if (typeof Transitions !== 'undefined') Transitions.navigateTo(urls[gameId]);
    else window.location.href = urls[gameId];
  }
}

// Fade in on load
if (typeof Transitions !== 'undefined') Transitions.fadeIn(600);

function updateLobby(players) {
  const connected = Object.entries(players || {}).filter(([, p]) => p.connected);
  const enough = connected.length >= 2;
  hasPlayers = connected.length > 0;

  if (connected.length === 0) {
    $contestantsLabel.textContent = 'Waiting for Contestants...';
    $lobbyPlayers.innerHTML = '<div class="contestant-empty"><div class="contestant-empty-icon">?</div><div class="contestant-empty-text">waiting...</div></div>';
  } else {
    $contestantsLabel.textContent = 'Tonight\'s Contestants';
    $lobbyPlayers.innerHTML = connected.map(([id, p]) => {
      const icon = p.character ? charIcons[p.character] || '' : '?';
      const charName = p.character ? charLabels[p.character] || '' : 'undecided';
      const name = p.name || ('P' + id);
      return `<div class="contestant" style="border-color:${p.color}22">
        <div class="contestant-blob" style="font-size:32px;line-height:50px">${icon}</div>
        <div class="contestant-name" style="color:${p.color}">${name}</div>
        <div class="contestant-char">${charName}</div>
      </div>`;
    }).join('');
  }

  $gameGrid.querySelectorAll('.game-card').forEach(c => c.classList.toggle('disabled', !enough));
  $btnTournament.classList.toggle('disabled', !enough);
}

// Game card clicks
$gameGrid.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => {
    if (card.classList.contains('disabled')) return;
    stopIdleNarrator();
    ws.send(JSON.stringify({ type: 'selectGame', gameId: card.dataset.game }));
  });
});

// Tournament
$btnTournament.addEventListener('click', () => {
  if ($btnTournament.classList.contains('disabled')) return;
  stopIdleNarrator();
  ws.send(JSON.stringify({ type: 'startTournament' }));
});
