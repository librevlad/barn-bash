// Barn Bash server — static file serving + WebSocket relay for
// host-plus-phones multiplayer. Architecture:
//
//   Host  (`/`)  long-lived WebSocket, role=host
//                 Shows the Barn Bash game UI on the big screen.
//                 Owns authoritative game state.
//
//   Phone (`/controller/`)  one WebSocket per player, role=controller
//                 Mobile UI. Emits join + input events to the host.
//                 Renders a per-minigame control contract.
//
// Server role is minimal: relay messages between the single host and
// N controllers. Host holds authoritative game state; server just
// brokers packets and assigns stable playerIds.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const os = require('os');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.jsx':  'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.webp': 'image/webp',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
};

// --- Static file router --------------------------------------------------
function resolvePath(url) {
  if (url === '/' || url === '/host' || url === '/host/') return path.join(ROOT, 'index.html');
  if (url === '/controller' || url === '/controller/') return path.join(ROOT, 'client-controller', 'index.html');
  if (url.startsWith('/controller/')) {
    const rel = url.slice('/controller/'.length);
    if (!rel || rel.includes('..')) return null;
    const resolved = path.resolve(ROOT, 'client-controller', rel);
    if (!resolved.startsWith(path.resolve(ROOT, 'client-controller'))) return null;
    return resolved;
  }
  // Default: serve from repo root
  const filePath = path.join(ROOT, url);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(ROOT))) return null;
  return resolved;
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0].split('#')[0];
  const filePath = resolvePath(url);
  if (!filePath) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const code = err.code === 'ENOENT' ? 404 : 500;
      res.writeHead(code); res.end(code === 404 ? 'Not found' : 'Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// --- WebSocket relay ----------------------------------------------------

const wss = new WebSocketServer({ server });

// One host at a time. Controllers are indexed by server-assigned playerId.
// playerId is a small integer (1, 2, 3, ...) stable for a session; reused
// when a client disconnects + reconnects under the same clientId if present.
let host = null;                     // single WebSocket for the host
const controllers = new Map();       // playerId (number) → { ws, name, character, color, clientId? }
let nextPlayerId = 1;

function safeSend(ws, obj) {
  if (!ws || ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(obj)); } catch (_) {}
}

function broadcastToControllers(obj) {
  for (const c of controllers.values()) safeSend(c.ws, obj);
}

function snapshotPlayers() {
  return [...controllers.entries()].map(([id, c]) => ({
    id, name: c.name || null, character: c.character || null, color: c.color || null,
  }));
}

wss.on('connection', (ws, req) => {
  const urlParams = new URL(req.url, 'http://_').searchParams;
  const role = urlParams.get('role') || 'controller';

  if (role === 'host') {
    // Replace any prior host connection (reload / reconnect).
    if (host && host.readyState === 1) { try { host.close(4001, 'replaced'); } catch (_) {} }
    host = ws;
    safeSend(ws, { type: 'hello', role: 'host', players: snapshotPlayers() });
    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
      // Host broadcasts state / targeted messages to controllers.
      if (msg.type === 'state' || msg.type === 'screen' || msg.type === 'minigameStart' || msg.type === 'minigameEnd' || msg.type === 'roundEnd' || msg.type === 'scoreUpdate') {
        broadcastToControllers(msg);
      } else if (msg.type === 'toPlayer' && msg.playerId != null) {
        const c = controllers.get(msg.playerId);
        if (c) safeSend(c.ws, msg.payload || {});
      }
    });
    ws.on('close', () => {
      if (host === ws) host = null;
    });
    return;
  }

  // --- controller role ---
  const playerId = nextPlayerId++;
  const entry = { ws, name: null, character: null, color: null, clientId: urlParams.get('clientId') || null };
  controllers.set(playerId, entry);
  safeSend(ws, { type: 'hello', role: 'controller', playerId });
  // Tell host a player is in the room (even before name/char are picked).
  safeSend(host, { type: 'playerJoin', id: playerId });
  broadcastToControllers({ type: 'playerList', players: snapshotPlayers() });

  ws.on('message', (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
    const c = controllers.get(playerId);
    if (!c) return;
    if (msg.type === 'join') {
      c.name = String(msg.name || '').slice(0, 24);
      c.character = String(msg.character || '').slice(0, 32);
      c.color = String(msg.color || '').slice(0, 12);
      safeSend(host, { type: 'playerUpdate', id: playerId, name: c.name, character: c.character, color: c.color });
      broadcastToControllers({ type: 'playerList', players: snapshotPlayers() });
    } else if (msg.type === 'input') {
      safeSend(host, { type: 'input', id: playerId, kind: msg.kind, data: msg.data || null });
    } else if (msg.type === 'ready') {
      safeSend(host, { type: 'playerReady', id: playerId });
    }
  });

  ws.on('close', () => {
    controllers.delete(playerId);
    safeSend(host, { type: 'playerLeave', id: playerId });
    broadcastToControllers({ type: 'playerList', players: snapshotPlayers() });
  });
});

// --- Listen + LAN IP announce -------------------------------------------

function firstLanIp() {
  const ifs = os.networkInterfaces();
  for (const name of Object.keys(ifs)) {
    for (const ni of ifs[name] || []) {
      if (!ni.internal && ni.family === 'IPv4') return ni.address;
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = firstLanIp();
  console.log(`\n  Barn Bash host   http://localhost:${PORT}/`);
  console.log(`  Phone join URL   http://${ip}:${PORT}/controller/\n`);
});
