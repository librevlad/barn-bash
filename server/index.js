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
// Phase 28 — shared protocol schema. Single source of truth for every
// message shape. Rejects unknown / malformed messages at the WS boundary.
const Protocol = require('../client-shared/protocol');
// Phase 32 — structured server-side logger.
const logger = require('./logger');

const PORT = Number(process.env.PORT) || 3000;
const GAMES = { escapeFox: EscapeFoxGame, hillKing: HillGame, meteor: MeteorGame, race: RaceGame };
const GAME_IDS = ['escapeFox', 'hillKing', 'meteor', 'race'];

// --- HTTP ---

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
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

  // Shared JS + CSS (tournament overlay, theme tokens etc.)
  if (url.startsWith('/shared/') && (url.endsWith('.js') || url.endsWith('.css')))
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
  if (url.startsWith('/controller/') && (url.endsWith('.js') || url.endsWith('.css')))
    return path.join(root, 'client-controller', path.basename(url));

  return null;
}

// WebP content negotiation: when the client asks for /assets/foo.png AND
// accepts image/webp AND a sibling foo.webp exists, serve the webp with
// Content-Type: image/webp. Keeps every existing .png reference in HTML,
// JS, and CSS untouched while shaving ~93% off the asset wire-weight.
function preferWebp(filePath, acceptHeader) {
  if (!filePath.endsWith('.png')) return filePath;
  if (!acceptHeader || !acceptHeader.includes('image/webp')) return filePath;
  const webpPath = filePath.slice(0, -4) + '.webp';
  try {
    if (fs.statSync(webpPath).isFile()) return webpPath;
  } catch (_) { /* no webp sibling — fall through */ }
  return filePath;
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0].split('#')[0];
  if (urlPath === '/test' || urlPath === '/host' || urlPath === '/controller' || urlPath === '/host-escape' || urlPath === '/host-hill' || urlPath === '/host-meteor' || urlPath === '/host-race') {
    res.writeHead(301, { Location: urlPath + '/' });
    res.end();
    return;
  }
  let filePath = resolve(urlPath);
  if (!filePath) { res.writeHead(404); res.end('Not found'); return; }
  filePath = preferWebp(filePath, req.headers.accept || '');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const code = err.code === 'ENOENT' ? 404 : 500;
      res.writeHead(code);
      res.end(code === 404 ? 'Not found' : 'Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'text/plain',
      'Vary': 'Accept',
    });
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
  if (msg.type === 'game_over') {
    logger.info('game.ended', {
      gameId: msg.gameId || currentGameId,
      winnerId: msg.winnerId || null,
      inTournament: Boolean(tournament),
    });
    if (tournament) handleTournamentGameEnd(msg);
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
  broadcastRaw(Protocol.makeTournamentStarted(tournament.totalRounds, shuffled.map(id => id)));
  logger.info('tournament.started', {
    totalRounds: tournament.totalRounds,
    sequence: shuffled,
    playerCount: players.connectedCount(),
  });
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
  logger.info('tournament.round.advanced', {
    round: tournament.round,
    totalRounds: tournament.totalRounds,
    gameId: gameId,
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
        // Legacy interval handles live on the game instance under
        // various names; clear both for safety.
        /** @type {any} */ const g = currentGame;
        if (g._iv) clearInterval(g._iv);
        if (g._interval) clearInterval(g._interval);
        broadcast(Protocol.makeGameOver(winnerId, currentGameId));
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
  logger.info('tournament.ended', {
    champId: champId,
    champName: champName,
    scores: tournament.scores,
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

wss.on('connection', (ws, req) => {
  let playerId = null;
  logger.debug('connection.opened', {
    remoteAddress: req && req.socket ? req.socket.remoteAddress : null,
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Phase 28 — validate at protocol boundary. Drops malformed /
    // unknown messages early so the switch below never sees garbage.
    const reason = Protocol.validate(msg);
    if (reason) {
      logger.debug('protocol.dropped', {
        reason: reason,
        msg: JSON.stringify(msg).slice(0, 120),
      });
      return;
    }

    switch (msg.type) {
      case 'join':
        playerId = players.add(ws, msg.name, msg.character, msg.carColor);
        const p = players.get(playerId);
        Protocol.send(ws, Protocol.makeInit(playerId, p));
        if (tournament) {
          tournament.scores[playerId] = tournament.scores[playerId] || 0;
        }
        // Broadcast player join event so host can react
        broadcast(Protocol.makePlayerJoined(playerId, p));
        currentGame.broadcastState();
        logger.info('player.joined', {
          playerId: playerId,
          name: p.name,
          character: p.character,
          totalConnected: players.connectedCount(),
        });
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
        if (!tournament) {
          currentGame.start();
          logger.info('game.started', {
            gameId: currentGameId,
            playerCount: players.connectedCount(),
          });
        }
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
        broadcastRaw(Protocol.makeGameSelected(currentGameId));
        currentGame.broadcastState();
        logger.debug('game.selected', { gameId: currentGameId });
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
      logger.info('player.left', {
        playerId: playerId,
        remainingConnected: players.connectedCount(),
      });
      // Safety: if all players left during a running game, reset to lobby
      if (players.connectedCount() === 0 && currentGame.phase === 'running') {
        currentGame.restart();
      }
    } else {
      logger.debug('connection.closed', { playerId: null });
    }
  });

  ws.on('error', (err) => {
    logger.warn('connection.error', {
      playerId: playerId,
      message: err && err.message ? err.message : String(err),
    });
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
  logger.info('server.listening', { port: PORT, ip: ip });
  // Pretty banner stays console-printed for human developer feedback;
  // logger.info above carries the telemetry line for aggregators.
  console.log(`\n  Frantics server on port ${PORT}\n`);
  console.log(`  Host:       http://${ip}:${PORT}/host`);
  console.log(`  Controller: http://${ip}:${PORT}/controller\n`);
});
