const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');
const Players = require('./players');
const EscapeFoxGame = require('./escapeFoxGame');
const HillGame = require('./hillGame');
const MeteorGame = require('./meteorGame');
const RaceGame = require('./raceGame');

const PORT = 3000;
const GAMES = { escapeFox: EscapeFoxGame, hillKing: HillGame, meteor: MeteorGame, race: RaceGame };
const GAME_IDS = ['escapeFox', 'hillKing', 'meteor', 'race'];

// --- HTTP ---

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.json': 'application/json'
};

function resolve(url) {
  const root = path.join(__dirname, '..');

  if (url === '/test/')
    return path.join(root, 'client-host', 'test.html');
  if (url === '/host/')
    return path.join(root, 'client-host', 'index.html');
  if (url === '/host/slice')
    return path.join(root, 'client-host', 'slice.html');
  if (url === '/host/slice-btns')
    return path.join(root, 'client-host', 'slice-btns.html');
  if (url === '/host/slice-back')
    return path.join(root, 'client-host', 'slice-back.html');
  if (url === '/host/slice-tourn')
    return path.join(root, 'client-host', 'slice-tourn.html');
  if (url === '/host/slice-ticket')
    return path.join(root, 'client-host', 'slice-ticket.html');
  if (url === '/host/slice-race')
    return path.join(root, 'client-host', 'slice-race.html');
  if (url === '/host/slice-race2')
    return path.join(root, 'client-host', 'slice-race2.html');
  if (url === '/host/slice-sprites')
    return path.join(root, 'client-host', 'slice-sprites.html');
  if (url === '/host/slice-modal-tickets')
    return path.join(root, 'client-host', 'slice-modal-tickets.html');
  if (url.startsWith('/host/') && url.endsWith('.js'))
    return path.join(root, 'client-host', path.basename(url));

  // Shared JS (tournament overlay etc.)
  if (url.startsWith('/shared/') && url.endsWith('.js'))
    return path.join(root, 'client-shared', path.basename(url));

  // Engine modules
  if (url.startsWith('/engine/') && url.endsWith('.js'))
    return path.join(root, 'engine', path.basename(url));

  // Assets (sprites, textures)
  if (url.startsWith('/assets/')) {
    const rel = url.slice('/assets/'.length);
    if (!rel || rel.includes('..')) return null;
    const resolved = path.resolve(root, 'assets', rel);
    if (!resolved.startsWith(path.resolve(root, 'assets'))) return null;
    return resolved;
  }

  // Escape host — full subpath serving
  if (url === '/host-escape/')
    return path.join(root, 'client-host-escape', 'index.html');
  if (url.startsWith('/host-escape/')) {
    const rel = url.slice('/host-escape/'.length);
    if (!rel || rel.includes('..')) return null;
    const resolved = path.resolve(root, 'client-host-escape', rel);
    if (!resolved.startsWith(path.resolve(root, 'client-host-escape'))) return null;
    return resolved;
  }

  // Hill host — full subpath serving (lib/, assets/)
  if (url === '/host-hill/')
    return path.join(root, 'client-host-hill', 'index.html');
  if (url.startsWith('/host-hill/')) {
    const rel = url.slice('/host-hill/'.length);
    if (!rel || rel.includes('..')) return null;
    const resolved = path.resolve(root, 'client-host-hill', rel);
    if (!resolved.startsWith(path.resolve(root, 'client-host-hill'))) return null;
    return resolved;
  }

  // Meteor host — full subpath serving (lib/, assets/)
  if (url === '/host-meteor/')
    return path.join(root, 'client-host-meteor', 'index.html');
  if (url.startsWith('/host-meteor/')) {
    const rel = url.slice('/host-meteor/'.length);
    if (!rel || rel.includes('..')) return null;
    const resolved = path.resolve(root, 'client-host-meteor', rel);
    if (!resolved.startsWith(path.resolve(root, 'client-host-meteor'))) return null;
    return resolved;
  }

  // Race host
  if (url === '/host-race/')
    return path.join(root, 'client-host-race', 'index.html');
  if (url.startsWith('/host-race/')) {
    const rel = url.slice('/host-race/'.length);
    if (!rel || rel.includes('..')) return null;
    const resolved = path.resolve(root, 'client-host-race', rel);
    if (!resolved.startsWith(path.resolve(root, 'client-host-race'))) return null;
    return resolved;
  }

  if (url === '/' || url === '/controller/')
    return path.join(root, 'client-controller', 'index.html');
  if (url.startsWith('/controller/') && url.endsWith('.js'))
    return path.join(root, 'client-controller', path.basename(url));

  return null;
}

const server = http.createServer((req, res) => {
  if (req.url === '/test' || req.url === '/host' || req.url === '/controller' || req.url === '/host-escape' || req.url === '/host-hill' || req.url === '/host-meteor' || req.url === '/host-race') {
    res.writeHead(301, { Location: req.url + '/' });
    res.end();
    return;
  }
  const filePath = resolve(req.url);
  if (!filePath) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'text/plain' });
    res.end(data);
  });
});

// --- WebSocket ---

const wss = new WebSocketServer({ server });
const players = new Players();

// --- Tournament state ---
let tournament = null;
// { round, totalRounds, sequence, scores: {playerId: pts}, phase: 'playing'|'standings'|'champion' }

function broadcastRaw(msg) {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

// Wrapped broadcast that intercepts game_over for tournament
function broadcast(msg) {
  broadcastRaw(msg);

  // Tournament: intercept game_over
  if (tournament && msg.type === 'game_over') {
    handleTournamentGameEnd(msg);
  }
}

let currentGameId = 'escapeFox';
let currentGame = new EscapeFoxGame(players, broadcast);

// --- Tournament logic ---

function startTournament() {
  // Shuffle game order, pick 3 of 4 for variety
  const shuffled = [...GAME_IDS].sort(() => Math.random() - 0.5).slice(0, 3);
  tournament = {
    round: 0,
    totalRounds: 3,
    sequence: shuffled,
    scores: {},
    phase: 'playing'
  };
  // Init scores
  for (const p of players.connected()) {
    tournament.scores[p.id] = 0;
  }
  broadcastRaw({ type: 'tournamentStarted', totalRounds: tournament.totalRounds, sequence: shuffled.map(id => id) });
  advanceTournament();
}

function advanceTournament() {
  if (!tournament) return;
  tournament.round++;

  if (tournament.round > tournament.totalRounds) {
    endTournament();
    return;
  }

  const gameId = tournament.sequence[(tournament.round - 1) % tournament.sequence.length];
  currentGameId = gameId;
  currentGame = new GAMES[gameId](players, broadcast);

  tournament.phase = 'playing';
  broadcastRaw({
    type: 'tournamentRound',
    round: tournament.round,
    totalRounds: tournament.totalRounds,
    gameId,
    scores: tournament.scores
  });
  currentGame.broadcastState();

  // Auto-start after delay for host to navigate + countdown
  setTimeout(() => {
    if (tournament && tournament.phase === 'playing') {
      currentGame.start();

      // Tournament safety timeout — force end after 60s
      tournament._gameTimeout = setTimeout(() => {
        if (!tournament || tournament.phase !== 'playing') return;
        if (currentGame.phase !== 'running') return;
        // Force end — highest score or first alive player wins
        const alive = players.connected().filter(p => p.gameData && p.gameData.alive);
        let winnerId = null;
        if (alive.length > 0) {
          // Pick player with highest score, or first alive
          alive.sort((a, b) => (b.gameData.score || 0) - (a.gameData.score || 0));
          winnerId = alive[0].id;
        }
        currentGame.phase = 'result';
        if (currentGame._iv) clearInterval(currentGame._iv);
        if (currentGame._interval) clearInterval(currentGame._interval);
        broadcast({ type: 'game_over', winnerId, gameId: currentGameId });
        currentGame.broadcastState();
      }, 60000);
    }
  }, 5000);
}

function handleTournamentGameEnd(msg) {
  if (!tournament) return;
  // Clear safety timeout
  if (tournament._gameTimeout) { clearTimeout(tournament._gameTimeout); tournament._gameTimeout = null; }

  // Prevent double-invocation
  if (tournament.phase !== 'playing') return;

  // Award points: winner gets 3, everyone else alive gets 1
  if (msg.winnerId) {
    tournament.scores[msg.winnerId] = (tournament.scores[msg.winnerId] || 0) + 3;
  }
  // Survivors get 1 point each
  for (const p of players.connected()) {
    if (p.gameData && p.gameData.alive && p.id !== msg.winnerId) {
      tournament.scores[p.id] = (tournament.scores[p.id] || 0) + 1;
    }
  }

  // Show standings
  tournament.phase = 'standings';
  setTimeout(() => {
    // Include player names for the overlay display
    const playerNames = {};
    for (const p of players.connected()) {
      playerNames[p.id] = p.name || 'Player ' + p.id;
    }
    broadcastRaw({
      type: 'tournamentStandings',
      round: tournament.round,
      totalRounds: tournament.totalRounds,
      scores: tournament.scores,
      playerNames,
      nextGameId: tournament.round < tournament.totalRounds
        ? tournament.sequence[tournament.round % tournament.sequence.length]
        : null
    });

    // Advance after standings display
    setTimeout(() => advanceTournament(), 6000);
  }, 2000);
}

function endTournament() {
  if (!tournament) return;
  tournament.phase = 'champion';

  // Find champion
  let champId = null, maxPts = -1;
  for (const [id, pts] of Object.entries(tournament.scores)) {
    if (pts > maxPts) { maxPts = pts; champId = Number(id); }
  }

  const champName = players.get(champId)?.name || 'Player ' + champId;

  // Include player names for the overlay display
  const playerNames = {};
  for (const p of players.connected()) {
    playerNames[p.id] = p.name || 'Player ' + p.id;
  }

  broadcastRaw({
    type: 'tournamentEnd',
    champId,
    champName,
    playerNames,
    scores: tournament.scores
  });

  // Reset to lobby after delay
  setTimeout(() => {
    tournament = null;
    currentGameId = 'escapeFox';
    currentGame = new EscapeFoxGame(players, broadcast);
    currentGame.broadcastState();
  }, 10000);
}

function getTournamentInfo() {
  if (!tournament) return null;
  return {
    round: tournament.round,
    totalRounds: tournament.totalRounds,
    scores: tournament.scores,
    phase: tournament.phase,
    gameId: currentGameId
  };
}

// --- Connections ---

wss.on('connection', (ws) => {
  let playerId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join':
        playerId = players.add(ws, msg.name, msg.character);
        const p = players.get(playerId);
        ws.send(JSON.stringify({ type: 'init', playerId, color: p.color, name: p.name, character: p.character }));
        if (tournament) {
          tournament.scores[playerId] = tournament.scores[playerId] || 0;
        }
        // Broadcast player join event so host can react
        broadcast({ type: 'player_joined', playerId, name: p.name, character: p.character, color: p.color });
        currentGame.broadcastState();
        break;

      case 'selectCharacter':
        if (playerId && msg.character) {
          players.selectCharacter(playerId, msg.character);
          currentGame.broadcastState();
        }
        break;

      case 'setName':
        if (playerId && msg.name) {
          players.setName(playerId, msg.name);
          currentGame.broadcastState();
        }
        break;

      case 'host':
        ws.send(JSON.stringify({
          type: 'state',
          gameId: currentGameId,
          gameState: currentGame.getState()
        }));
        // Also send tournament info if active
        if (tournament) {
          ws.send(JSON.stringify({
            type: 'tournamentInfo',
            ...getTournamentInfo()
          }));
        }
        break;

      case 'input':
        if (playerId) currentGame.handleInput(playerId, msg.action, msg);
        break;

      case 'start':
        if (!tournament) currentGame.start();
        break;

      case 'restart':
        if (tournament) return; // can't restart during tournament
        currentGame.restart();
        break;

      case 'selectGame':
        if (tournament) return;
        if (currentGame.phase !== 'lobby' && currentGame.phase !== 'result') break;
        if (!GAMES[msg.gameId]) break;
        currentGameId = msg.gameId;
        currentGame = new GAMES[msg.gameId](players, broadcast);
        broadcastRaw({ type: 'gameSelected', gameId: currentGameId });
        currentGame.broadcastState();
        break;

      case 'startTournament':
        if (tournament) break;
        if (players.connectedCount() < 2) break;
        startTournament();
        break;
    }
  });

  ws.on('close', () => {
    if (playerId) {
      players.remove(playerId);
      currentGame.broadcastState();
      // Safety: if all players left during a running game, reset to lobby
      if (players.connectedCount() === 0 && currentGame.phase === 'running') {
        currentGame.restart();
      }
    }
  });
});

// --- Start ---

function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`\n  Frantics server on port ${PORT}\n`);
  console.log(`  Host:       http://${ip}:${PORT}/host`);
  console.log(`  Controller: http://${ip}:${PORT}/controller\n`);
});
