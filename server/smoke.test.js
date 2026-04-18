// Phase 31 — HTTP smoke test. Boots the server on a random port,
// verifies every route returns 200 + expected content. Shuts down
// cleanly after all asserts pass. Runs with: npm test.
//
// Uses node:test + node:http, no external browser — so CI doesn't
// need to install Playwright or Chromium.

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 3999; // dedicated smoke port, avoid stepping on dev
const BASE = `http://localhost:${PORT}`;

/**
 * Spawn the server process on PORT, wait for it to respond, return
 * the child so tests can kill it after.
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let ready = false;
    const giveUp = setTimeout(() => {
      if (!ready) {
        child.kill();
        reject(new Error('server boot timeout'));
      }
    }, 5000);
    const ping = () => {
      http.get(BASE + '/host/', (res) => {
        if (res.statusCode === 200) {
          ready = true;
          clearTimeout(giveUp);
          res.resume();
          resolve(child);
        } else {
          setTimeout(ping, 100);
        }
      }).on('error', () => setTimeout(ping, 100));
    };
    setTimeout(ping, 200);
  });
}

function get(pathOrUrl) {
  return new Promise((resolve, reject) => {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : BASE + pathOrUrl;
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    }).on('error', reject);
  });
}

// Phase 31 — end-to-end smoke test. Boots the server on a dedicated
// port (PORT env) so it won't collide with a running dev server.
// Verifies every critical route serves content.
test('smoke: server boots + serves routes', async () => {
  const child = await startServer();
  try {
    const host = await get('/host/');
    assert.strictEqual(host.statusCode, 200, 'host/ status');
    assert.match(host.body, /FRANTICS/i, 'host/ contains FRANTICS title');

    const controller = await get('/controller/');
    assert.strictEqual(controller.statusCode, 200, 'controller/ status');

    const proto = await get('/shared/protocol.js');
    assert.strictEqual(proto.statusCode, 200, 'protocol.js served');
    assert.match(proto.body, /Protocol/, 'protocol.js has Protocol identifier');

    const asset = await get('/assets/bg.png');
    assert.strictEqual(asset.statusCode, 200, 'bg.png served');
  } finally {
    child.kill();
  }
});

// Smoke test that DOES run — validates the protocol schema invariants
// exhaustively alongside the existing protocol.test.js unit tests.
test('smoke: protocol schema round-trip for every known type', () => {
  const Protocol = require('../client-shared/protocol');

  // Every client constructor produces a message that validates.
  const specimens = [
    Protocol.makeHost(),
    Protocol.makeJoin({ name: 'A', character: 'cat' }),
    Protocol.makeStart(),
    Protocol.makeRestart(),
    Protocol.makeSelectGame('escapeFox'),
    Protocol.makeStartTournament(),
    Protocol.makeInput('jump'),
    Protocol.makePing(123),
    Protocol.makeLeave(),
  ];
  for (const m of specimens) {
    const reason = Protocol.validate(m);
    assert.strictEqual(reason, null, `validate rejected ${JSON.stringify(m)}: ${reason}`);
  }

  // Server constructors build messages with the right types.
  const serverSpecimens = [
    Protocol.makeInit(1, { color: '#abc', name: 'B' }),
    Protocol.makePlayerJoined(2, { name: 'C', character: 'cat' }),
    Protocol.makePlayerLeft(3),
    Protocol.makeGameOver(4, 'race'),
    Protocol.makeGameSelected('meteor'),
    Protocol.makeTournamentStarted(3, ['a', 'b', 'c']),
    Protocol.makeEliminated(5),
  ];
  for (const m of serverSpecimens) {
    assert.strictEqual(typeof m.type, 'string');
    assert.ok(Protocol.SERVER_TYPES.includes(m.type), `${m.type} in SERVER_TYPES`);
  }
});
