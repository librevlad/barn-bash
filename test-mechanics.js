// =============================================================================
// SERVER-ONLY MECHANICS TEST — No browser required
// Connects 3 WS players, plays each game, verifies events fire correctly
// =============================================================================
const WebSocket = require('ws');

const URL = 'ws://localhost:3000';
let passed = 0, failed = 0, warnings = 0;

function ok(cond, label) {
  if (cond) { passed++; console.log('  OK: ' + label); }
  else { failed++; console.log('  FAIL: ' + label); }
}
function warn(cond, label) {
  if (cond) { passed++; console.log('  OK: ' + label); }
  else { warnings++; console.log('  WARN: ' + label); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function connectPlayer(name, character) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const p = { name, character, ws, id: null, msgs: {}, all: [], state: null };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name, character })));
    ws.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      const t = msg.type;
      p.msgs[t] = (p.msgs[t] || 0) + 1;
      p.all.push(msg);
      if (t === 'state') p.state = msg;
      if (t === 'init') { p.id = msg.playerId; resolve(p); }
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error(`${name} timeout`)), 5000);
  });
}

function send(p, msg) {
  if (p.ws.readyState === WebSocket.OPEN)
    p.ws.send(JSON.stringify(msg));
}
function input(p, action, extra = {}) { send(p, { type: 'input', action, ...extra }); }
function resetMsgs(players) {
  for (const p of players) { p.msgs = {}; p.all = []; p.state = null; }
}
function total(players, type) { return players.reduce((s, p) => s + (p.msgs[type] || 0), 0); }
function anyGot(players, type) { return players.some(p => (p.msgs[type] || 0) > 0); }

// Helper: switch to a game safely (restart current → select new → start)
async function switchToGame(players, gameId) {
  // Restart to get back to lobby phase
  send(players[0], { type: 'restart' });
  await sleep(300);
  // Select new game
  send(players[0], { type: 'selectGame', gameId });
  await sleep(300);
  // Verify selection
  resetMsgs(players);
  // Start game
  send(players[0], { type: 'start' });
  await sleep(500);
}

// =============================================================================
async function main() {
  console.log('========================================');
  console.log('  FRANTICS — SERVER MECHANICS TEST');
  console.log('========================================\n');

  // Connect 3 players
  const players = [];
  try {
    players.push(await connectPlayer('Alpha', 'cat'));
    players.push(await connectPlayer('Beta', 'wolf'));
    players.push(await connectPlayer('Gamma', 'frog'));
  } catch (e) {
    console.error('Connection failed:', e.message);
    process.exit(1);
  }
  console.log(`Connected: ${players.map(p => `${p.name}(${p.id})`).join(', ')}\n`);

  // =========================================================================
  // ESCAPE THE FOX (12s)
  // =========================================================================
  console.log('--- ESCAPE THE FOX (12s) ---');
  await switchToGame(players, 'escapeFox');

  ok(anyGot(players, 'state'), 'Game sends state updates');

  // P0: jump + lane changes (active)
  const efI = [];
  efI.push(setInterval(() => input(players[0], 'jump'), 1500));
  efI.push(setInterval(() => input(players[0], 'lane', { direction: 'right' }), 2500));
  // P2: slide + jump
  efI.push(setInterval(() => input(players[2], 'slide'), 2000));
  efI.push(setInterval(() => input(players[2], 'jump'), 3000));

  await sleep(12000);
  efI.forEach(clearInterval);

  const efStates = total(players, 'state');
  ok(efStates > 20, `Got ${efStates} state updates (>20)`);
  warn(anyGot(players, 'elimination') || anyGot(players, 'game_over'),
    'Produces elimination or game_over');
  warn(anyGot(players, 'near_miss'), 'Near miss events fired');
  warn(anyGot(players, 'stumble'), 'Stumble events fired');

  if (players[0].state && players[0].state.gameState) {
    const s = players[0].state.gameState;
    ok(s.foxDist !== undefined, 'State has foxDist');
    ok(Array.isArray(s.obstacles), 'State has obstacles array');
    ok(typeof s.players === 'object', 'State has players object');
    const firstP = Object.values(s.players)[0];
    if (firstP) {
      ok(firstP.name !== undefined, 'Player has name');
      ok(firstP.character !== undefined, 'Player has character');
    }
  }

  console.log(`  Events: states=${efStates}, near_miss=${total(players, 'near_miss')}, ` +
    `stumble=${total(players, 'stumble')}, elim=${total(players, 'elimination')}, ` +
    `game_over=${total(players, 'game_over')}\n`);

  // =========================================================================
  // HILL KING (15s)
  // =========================================================================
  console.log('--- HILL KING (15s) ---');
  await switchToGame(players, 'hillKing');

  ok(anyGot(players, 'state'), 'Hill King sends states');

  // Verify it's actually hillKing
  if (players[0].state) {
    ok(players[0].state.gameId === 'hillKing', `Game is hillKing (got ${players[0].state.gameId})`);
  }

  // P0: aggressive dash + move
  const hkI = [];
  hkI.push(setInterval(() => input(players[0], 'dash'), 800));
  hkI.push(setInterval(() => input(players[0], 'move', { direction: 'left' }), 600));
  // P1: shield toggle
  hkI.push(setInterval(() => input(players[1], 'shield', { active: true }), 1000));
  hkI.push(setInterval(() => {
    input(players[1], 'shield', { active: false });
    setTimeout(() => input(players[1], 'shield', { active: true }), 200);
  }, 2000));
  // P2: move + dash
  hkI.push(setInterval(() => input(players[2], 'move', { direction: 'right' }), 500));
  hkI.push(setInterval(() => input(players[2], 'dash'), 2000));

  await sleep(15000);
  hkI.forEach(clearInterval);

  const hkStates = total(players, 'state');
  ok(hkStates > 30, `Got ${hkStates} state updates (>30)`);
  warn(anyGot(players, 'bump'), `Bump events: ${total(players, 'bump')}`);
  warn(anyGot(players, 'shieldBlock'), `Shield block events: ${total(players, 'shieldBlock')}`);
  warn(anyGot(players, 'powerup'), `Powerup events: ${total(players, 'powerup')}`);

  // Find a hillKing state (last one with gameId=hillKing)
  let hkState = null;
  for (const p of players) {
    for (let i = p.all.length - 1; i >= 0; i--) {
      if (p.all[i].type === 'state' && p.all[i].gameId === 'hillKing') {
        hkState = p.all[i].gameState;
        break;
      }
    }
    if (hkState) break;
  }

  if (hkState) {
    ok(hkState.platR !== undefined, 'State has platR (platform radius)');
    ok(typeof hkState.players === 'object', 'State has players');
    const firstP = Object.values(hkState.players)[0];
    if (firstP) {
      ok(firstP.angle !== undefined, 'Player has angle');
      ok(firstP.radius !== undefined, 'Player has radius');
    }
  } else {
    ok(false, 'No hillKing state received');
  }

  console.log(`  Events: states=${hkStates}, bump=${total(players, 'bump')}, ` +
    `shieldBlock=${total(players, 'shieldBlock')}, powerup=${total(players, 'powerup')}, ` +
    `elim=${total(players, 'elimination')}, game_over=${total(players, 'game_over')}\n`);

  // =========================================================================
  // METEOR SHOWER (15s)
  // =========================================================================
  console.log('--- METEOR SHOWER (15s) ---');
  await switchToGame(players, 'meteor');

  ok(anyGot(players, 'state'), 'Meteor sends states');

  // P0: dodge + move
  const mtI = [];
  mtI.push(setInterval(() => input(players[0], 'dodge'), 1500));
  mtI.push(setInterval(() => input(players[0], 'move', { direction: 'left' }), 800));
  // P1: sprint
  mtI.push(setInterval(() => input(players[1], 'sprint'), 2000));
  mtI.push(setInterval(() => input(players[1], 'move', { direction: 'up' }), 1000));
  // P2: push + dodge
  mtI.push(setInterval(() => input(players[2], 'push'), 2500));
  mtI.push(setInterval(() => input(players[2], 'dodge'), 2000));

  await sleep(15000);
  mtI.forEach(clearInterval);

  const mtStates = total(players, 'state');
  ok(mtStates > 30, `Got ${mtStates} state updates (>30)`);
  warn(anyGot(players, 'singed'), `Singed events: ${total(players, 'singed')}`);
  warn(anyGot(players, 'push'), `Push events: ${total(players, 'push')}`);

  if (players[0].state && players[0].state.gameState) {
    const s = players[0].state.gameState;
    ok(s.wave !== undefined, 'State has wave');
    ok(s.platR !== undefined, 'State has platR');
  }

  console.log(`  Events: states=${mtStates}, singed=${total(players, 'singed')}, ` +
    `push=${total(players, 'push')}, elim=${total(players, 'elimination')}, ` +
    `game_over=${total(players, 'game_over')}\n`);

  // =========================================================================
  // GRAND PRIX / RACE (20s)
  // =========================================================================
  console.log('--- GRAND PRIX / RACE (20s) ---');
  await switchToGame(players, 'race');

  ok(anyGot(players, 'state'), 'Race sends states');

  // P0: steer alternating + boost (direction-based, matching controller)
  const rcI = [];
  let p0dir = 'right';
  rcI.push(setInterval(() => {
    input(players[0], 'steer', { direction: p0dir });
    p0dir = p0dir === 'right' ? 'left' : 'right';
  }, 700));
  rcI.push(setInterval(() => input(players[0], 'boost'), 5000));
  // P1: steer right mostly
  rcI.push(setInterval(() => input(players[1], 'steer', { direction: 'right' }), 600));
  rcI.push(setInterval(() => input(players[1], 'boost'), 4000));
  // P2: steer left + items
  rcI.push(setInterval(() => input(players[2], 'steer', { direction: 'left' }), 500));
  rcI.push(setInterval(() => input(players[2], 'useItem'), 3000));

  await sleep(20000);
  rcI.forEach(clearInterval);

  const rcStates = total(players, 'state');
  ok(rcStates > 40, `Got ${rcStates} state updates (>40)`);
  warn(anyGot(players, 'lap_complete'), `Lap events: ${total(players, 'lap_complete')}`);
  warn(anyGot(players, 'item_pickup'), `Item pickup: ${total(players, 'item_pickup')}`);

  if (players[0].state && players[0].state.gameState) {
    const s = players[0].state.gameState;
    ok(typeof s.players === 'object', 'State has players');
    const firstP = Object.values(s.players)[0];
    if (firstP) {
      ok(firstP.x !== undefined, 'Player has x');
      ok(firstP.z !== undefined, 'Player has z');
      ok(firstP.lap !== undefined, 'Player has lap');
    }
    ok(Array.isArray(s.items), 'State has items array');
  }

  console.log(`  Events: states=${rcStates}, lap=${total(players, 'lap_complete')}, ` +
    `item_pickup=${total(players, 'item_pickup')}, item_used=${total(players, 'item_used')}, ` +
    `finished=${total(players, 'finished')}, game_over=${total(players, 'game_over')}\n`);

  // =========================================================================
  // RESULTS
  // =========================================================================
  console.log('========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('========================================');

  for (const p of players) p.ws.close();
  await sleep(300);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
