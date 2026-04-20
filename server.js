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
const { spawn } = require('child_process');
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
  // Trailing slash canonicalisation: the controller HTML loads its scripts
  // with relative paths (lib/*, screens/*, …) which only resolve correctly
  // when the browser URL already ends in `/`. A bare /controller from a QR
  // scan or typed URL would 404 every sub-script; redirect it.
  if (url === '/controller' || url === '/host') {
    res.writeHead(301, { Location: url + '/' });
    res.end();
    return;
  }
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

// perMessageDeflate shaves ~30-50% off repeat JSON payloads (screen /
// playerList / scoreUpdate broadcasts through a tunnel). threshold=512
// keeps tiny frames uncompressed so CPU stays cheap; concurrencyLimit
// caps parallel compression jobs so a burst can't starve the event loop.
const wss = new WebSocketServer({
  server,
  perMessageDeflate: {
    zlibDeflateOptions: { level: 1, memLevel: 7 },
    threshold: 512,
    concurrencyLimit: 10,
    serverNoContextTakeover: false,
    clientNoContextTakeover: false,
  },
});

// One host at a time. Controllers are indexed by server-assigned playerId.
// playerId is a small integer (1, 2, 3, ...) stable for a session; reused
// when a client disconnects + reconnects under the same clientId if present.
let host = null;                     // single WebSocket for the host
const controllers = new Map();       // playerId (number) → { ws, name, character, color, clientId? }
let nextPlayerId = 1;
// Last screen + active minigame + scoreboard + turn state, replayed to new
// controllers on connect so late-joining phones land on the right UI with
// current numbers instead of waiting for the next throttled broadcast tick.
let lastScreen = null;
let lastMinigame = null;
let lastScore = null;
let lastTurn = null;

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
  // Disable Nagle on the underlying TCP socket so a 20-byte tap / vote
  // frame isn't held for ~40ms waiting for a companion packet. Adds a
  // handful of extra small packets per second but collapses small-frame
  // latency to the network RTT floor.
  try { ws._socket && ws._socket.setNoDelay && ws._socket.setNoDelay(true); } catch (_) {}

  // Mark alive for the heartbeat sweep below.
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  const urlParams = new URL(req.url, 'http://_').searchParams;
  const role = urlParams.get('role') || 'controller';

  if (role === 'host') {
    // Replace any prior host connection (reload / reconnect). A fresh host
    // means fresh game state, so drop any cached screen / minigame so new
    // phones don't get replayed stale events.
    if (host && host.readyState === 1) { try { host.close(4001, 'replaced'); } catch (_) {} }
    host = ws;
    lastScreen = null;
    lastMinigame = null;
    lastScore = null;
    lastTurn = null;
    safeSend(ws, { type: 'hello', role: 'host', players: snapshotPlayers() });
    ws.on('message', (raw) => {
      let msg; try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
      // Host broadcasts state / targeted messages to controllers.
      if (msg.type === 'state' || msg.type === 'screen' || msg.type === 'minigameStart' || msg.type === 'minigameEnd' || msg.type === 'roundEnd' || msg.type === 'gameOver' || msg.type === 'scoreUpdate' || msg.type === 'turnUpdate') {
        if (msg.type === 'screen') lastScreen = msg;
        if (msg.type === 'minigameStart') { lastMinigame = msg; lastScore = null; lastTurn = null; }
        if (msg.type === 'minigameEnd') { lastMinigame = null; lastScore = null; lastTurn = null; }
        if (msg.type === 'scoreUpdate') lastScore = msg;
        if (msg.type === 'turnUpdate') lastTurn = msg;
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
  // Reuse playerId for reconnects of the same clientId so the host's
  // gameState.players[*].remoteId mapping survives phone/browser blips.
  const clientId = urlParams.get('clientId') || null;
  let playerId = null;
  if (clientId) {
    for (const [id, c] of controllers.entries()) {
      if (c.clientId === clientId) {
        playerId = id;
        try { c.ws && c.ws.readyState === 1 && c.ws.close(4002, 'replaced'); } catch (_) {}
        c.ws = ws;
        break;
      }
    }
  }
  const isReconnect = playerId != null;
  if (!isReconnect) playerId = nextPlayerId++;
  const entry = isReconnect
    ? controllers.get(playerId)
    : { ws, name: null, character: null, color: null, clientId };
  if (!isReconnect) controllers.set(playerId, entry);
  safeSend(ws, { type: 'hello', role: 'controller', playerId });
  // Tell host a player is in the room (even before name/char are picked).
  safeSend(host, { type: 'playerJoin', id: playerId });
  broadcastToControllers({ type: 'playerList', players: snapshotPlayers() });
  // Replay current screen / active minigame / score / turn so a late or
  // reconnecting phone lands on the right UI with current numbers and
  // turn info instead of waiting for the next throttled host tick.
  if (lastScreen) safeSend(ws, lastScreen);
  if (lastMinigame) safeSend(ws, lastMinigame);
  if (lastScore) safeSend(ws, lastScore);
  if (lastTurn) safeSend(ws, lastTurn);

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
    // A reload is: old ws closes, new ws opens ~100ms later with the same
    // clientId. If we delete the entry on close, the new ws can't find the
    // clientId and gets a fresh playerId, orphaning gameState.remoteId.
    // Instead, keep the entry and just null out ws + announce 'playerLeave'
    // so the host can CPU-fallback that lane. A real reconnect restores
    // c.ws; a true quit leaves the ghost entry until host resets (or
    // a 45s sweep removes it).
    const c = controllers.get(playerId);
    if (!c || c.ws !== ws) return;
    c.ws = null;
    c.disconnectedAt = Date.now();
    safeSend(host, { type: 'playerLeave', id: playerId });
    broadcastToControllers({ type: 'playerList', players: snapshotPlayers() });
  });
});

// Sweep ghost entries (disconnected and not reclaimed within 45 seconds).
setInterval(() => {
  const cutoff = Date.now() - 45000;
  for (const [id, c] of controllers.entries()) {
    if (!c.ws && (c.disconnectedAt || 0) < cutoff) {
      controllers.delete(id);
      safeSend(host, { type: 'playerLeave', id });
      broadcastToControllers({ type: 'playerList', players: snapshotPlayers() });
    }
  }
}, 15000);

// WebSocket heartbeat. Pings every open socket every 10s; any socket
// that didn't pong back since the previous sweep gets terminated. Keeps
// Cloudflare Tunnel from silently dropping idle connections after its
// ~100s inactivity timeout, and prunes zombie sockets on LAN too. Cost
// is two control frames per client every 10s — irrelevant.
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) { try { ws.terminate(); } catch (_) {} return; }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  });
}, 10000);

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

// Pinggy SSH reverse-tunnel auto-start. Max's first live test failed
// because LAN wasn't reachable from his phone (likely Windows firewall
// blocking inbound 3000). We spawn a pinggy ssh tunnel on boot and parse
// the public URL out of its output so the host doesn't need to juggle a
// second terminal. Set NO_TUNNEL=1 to skip (LAN-only).
// Free tier: 60 min sessions. Restart the server to roll a fresh URL.
function startTunnel() {
  if (process.env.NO_TUNNEL === '1') {
    console.log('  Tunnel disabled (NO_TUNNEL=1). LAN only.\n');
    return;
  }
  const args = [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ExitOnForwardFailure=yes',
    '-p', '443',
    '-R', `0:localhost:${PORT}`,
    '-T',
    'a.pinggy.io',
  ];
  let ssh;
  try {
    ssh = spawn('ssh', args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  } catch (err) {
    console.log(`  Tunnel unavailable (spawn failed): ${err.message}\n  Run ssh command manually or use LAN URL above.\n`);
    return;
  }
  let url = null;
  const collect = (chunk) => {
    const s = chunk.toString();
    const m = s.match(/https:\/\/[a-z0-9-]+\.(?:a\.pinggy\.link|free\.pinggy\.link|pinggy\.io)/i);
    if (m && !url) {
      url = m[0];
      console.log('\n  ╔══════════════════════════════════════════════════════════╗');
      console.log(`  ║ 🌍 TUNNEL URL  ${url}/controller/`);
      console.log('  ║ Share with phones. Free tier = 60 min. Restart to refresh.');
      console.log('  ╚══════════════════════════════════════════════════════════╝\n');
    }
  };
  ssh.stdout.on('data', collect);
  ssh.stderr.on('data', collect);
  ssh.on('error', (err) => {
    console.log(`  Tunnel error: ${err.message}\n  Use LAN URL above.\n`);
  });
  ssh.on('exit', (code) => {
    if (url) console.log(`\n  Tunnel closed (ssh exit ${code}). Restart server for a fresh URL.`);
    else console.log(`\n  Tunnel failed to open (ssh exit ${code}). Use LAN URL above.`);
  });
  process.on('exit', () => { try { ssh.kill(); } catch (_) {} });
  process.on('SIGINT',  () => { try { ssh.kill(); } catch (_) {} process.exit(0); });
  process.on('SIGTERM', () => { try { ssh.kill(); } catch (_) {} process.exit(0); });
}

server.listen(PORT, () => {
  const ip = firstLanIp();
  console.log(`\n  Barn Bash host   http://localhost:${PORT}/`);
  console.log(`  Phone (LAN)      http://${ip}:${PORT}/controller/`);
  console.log('  (LAN not working? Windows firewall may block inbound on 3000. Tunnel below is always public.)');
  startTunnel();
});
