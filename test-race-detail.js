// =============================================================================
// RACE DETAIL TEST — verifies lap counting and item pickup
// Simulates a player driving along the track waypoints
// =============================================================================
const WebSocket = require('ws');
const URL = 'ws://localhost:3000';
let passed = 0, failed = 0;

function ok(cond, label) {
  if (cond) { passed++; console.log('  OK: ' + label); }
  else { failed++; console.log('  FAIL: ' + label); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function connectPlayer(name, character) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const p = { name, character, ws, id: null, msgs: {}, all: [], state: null };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name, character })));
    ws.on('message', raw => {
      const msg = JSON.parse(raw.toString());
      p.msgs[msg.type] = (p.msgs[msg.type] || 0) + 1;
      p.all.push(msg);
      if (msg.type === 'state') p.state = msg;
      if (msg.type === 'init') { p.id = msg.playerId; resolve(p); }
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error(`${name} timeout`)), 5000);
  });
}

function send(p, msg) {
  if (p.ws.readyState === WebSocket.OPEN) p.ws.send(JSON.stringify(msg));
}
function input(p, action, extra = {}) { send(p, { type: 'input', action, ...extra }); }

async function main() {
  console.log('========================================');
  console.log('  RACE DETAIL TEST');
  console.log('========================================\n');

  const players = [];
  players.push(await connectPlayer('Racer1', 'cat'));
  players.push(await connectPlayer('Racer2', 'wolf'));
  console.log(`Connected: ${players.map(p => p.name + '(' + p.id + ')').join(', ')}\n`);

  // Start race
  send(players[0], { type: 'restart' });
  await sleep(300);
  send(players[0], { type: 'selectGame', gameId: 'race' });
  await sleep(300);
  players.forEach(p => { p.msgs = {}; p.all = []; p.state = null; });
  send(players[0], { type: 'start' });
  await sleep(500);

  ok(players[0].state !== null, 'Game started');
  ok(players[0].state && players[0].state.gameId === 'race', 'Game is race');

  // Get initial state
  const gs = players[0].state && players[0].state.gameState;
  if (gs) {
    const me = gs.players[players[0].id];
    ok(me && me.lap === 1, `Initial lap is 1 (got ${me && me.lap})`);
    ok(gs.items && gs.items.length > 0, `Items spawned: ${gs.items ? gs.items.length : 0}`);
    console.log(`  Track has ${gs.track ? gs.track.length : '?'} waypoints`);
    console.log(`  Items: ${gs.items ? gs.items.length : 0} on track`);

    // Check item positions
    if (gs.items) {
      for (const item of gs.items) {
        console.log(`    Item ${item.type} at (${item.x.toFixed(1)}, ${item.z.toFixed(1)})`);
      }
    }
  }

  // Drive P1 in circles: steer right continuously (the track is roughly clockwise)
  console.log('\n  Driving for 30s with right steer...');
  const driveInterval = setInterval(() => {
    input(players[0], 'steer', { direction: 'right' });
  }, 400);
  // P2: also drive
  const drive2 = setInterval(() => {
    input(players[1], 'steer', { direction: 'right' });
  }, 500);

  // Track laps and items over time
  let lastLap = 1;
  const lapTimes = [];
  const itemPickups = [];
  const checkInterval = setInterval(() => {
    const s = players[0].state;
    if (!s || !s.gameState) return;
    const me = s.gameState.players[players[0].id];
    if (!me) return;
    if (me.lap > lastLap) {
      lapTimes.push({ lap: me.lap, tick: Date.now() });
      lastLap = me.lap;
    }
  }, 200);

  await sleep(30000);

  clearInterval(driveInterval);
  clearInterval(drive2);
  clearInterval(checkInterval);

  // Results
  const totalLaps = (players[0].msgs['lap_complete'] || 0);
  const totalPickups = (players[0].msgs['item_pickup'] || 0);
  const totalUsed = (players[0].msgs['item_used'] || 0);
  const finished = (players[0].msgs['race_finish'] || 0);

  console.log(`\n  Results after 30s:`);
  console.log(`    Laps completed: ${totalLaps}`);
  console.log(`    Items picked up: ${totalPickups}`);
  console.log(`    Items used: ${totalUsed}`);
  console.log(`    Race finished: ${finished > 0 ? 'YES' : 'NO'}`);
  console.log(`    Lap times: ${lapTimes.map(l => 'L' + l.lap).join(', ') || 'none'}`);

  // Check final state
  const finalState = players[0].state && players[0].state.gameState;
  if (finalState) {
    const me = finalState.players[players[0].id];
    console.log(`    Final lap: ${me ? me.lap : '?'}`);
    console.log(`    Final waypoint: ${me ? me.waypoint : '?'}`);
    console.log(`    Finished: ${me ? me.finished : '?'}`);

    // Verify lap is reasonable
    ok(me && me.lap >= 1, `Lap >= 1 (got ${me && me.lap})`);
    // With right steer only, player likely goes in circles but may not follow track
    // Just verify no crash
  }

  // Items test: with 6 spawn points and 30s, should pick up several
  ok(totalPickups > 0, `Picked up items (${totalPickups})`);

  // Waypoint test: check that waypoint advances
  if (finalState) {
    const me = finalState.players[players[0].id];
    ok(me && me.waypoint > 1, `Waypoint advanced (${me && me.waypoint})`);
  }

  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================');

  players.forEach(p => p.ws.close());
  await sleep(300);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
