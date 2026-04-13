const WebSocket = require('ws');

const URL = 'ws://localhost:3000';
let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { passed++; console.log('  OK: ' + label); }
  else { failed++; console.log('  FAIL: ' + label); }
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
  });
}

function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

function waitFor(ws, predicate, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(msg);
      }
    };
    ws.on('message', handler);
  });
}

function collectMessages(ws, durationMs) {
  return new Promise((resolve) => {
    const msgs = [];
    const handler = (raw) => msgs.push(JSON.parse(raw));
    ws.on('message', handler);
    setTimeout(() => { ws.off('message', handler); resolve(msgs); }, durationMs);
  });
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('\n=== TEST: Full game flow ===\n');

  // 1. Connect host
  console.log('1. Host connection');
  const host = await connect();
  send(host, { type: 'host' });
  const hostState = await waitFor(host, m => m.type === 'state');
  assert(hostState.gameState.phase === 'lobby', 'host receives lobby state');
  assert(Object.keys(hostState.gameState.players).length === 0, 'no players yet');

  // 2. Connect player 1
  console.log('\n2. Player 1 joins');
  const p1 = await connect();
  send(p1, { type: 'join' });
  const init1 = await waitFor(p1, m => m.type === 'init');
  assert(init1.playerId === 1, 'player 1 gets id=1');

  // Host should get updated state with 1 player
  const stateAfterP1 = await waitFor(host, m => m.type === 'state' && Object.keys(m.gameState.players).length === 1);
  assert(stateAfterP1.gameState.players['1'].connected === true, 'host sees player 1 connected');

  // 3. Connect player 2
  console.log('\n3. Player 2 joins');
  const p2 = await connect();
  send(p2, { type: 'join' });
  const init2 = await waitFor(p2, m => m.type === 'init');
  assert(init2.playerId === 2, 'player 2 gets id=2');

  const stateAfterP2 = await waitFor(host, m => m.type === 'state' && Object.keys(m.gameState.players).length === 2);
  assert(stateAfterP2.gameState.players['2'].connected === true, 'host sees player 2 connected');

  // 4. Start game
  console.log('\n4. Start game');
  const hostStartPromise = waitFor(host, m => m.type === 'event' && m.name === 'start');
  const p1StartPromise = waitFor(p1, m => m.type === 'event' && m.name === 'start');
  const p2StartPromise = waitFor(p2, m => m.type === 'event' && m.name === 'start');
  send(host, { type: 'start' });

  await hostStartPromise;
  await p1StartPromise;
  await p2StartPromise;
  assert(true, 'all clients receive start event');

  // Wait a tick to confirm phase is game
  const gameState = await waitFor(host, m => m.type === 'state' && m.gameState.phase === 'game');
  assert(gameState.gameState.phase === 'game', 'phase is now game');

  // 5. Simulate tapping - player 1 taps fast, player 2 taps slow
  console.log('\n5. Simulate tapping (player 1 fast, player 2 slow)');

  // Send 100 taps for player 1 in rapid bursts
  for (let i = 0; i < 100; i++) {
    send(p1, { type: 'input', action: 'tap', value: 1 });
    if (i % 20 === 0) await sleep(60); // let ticks process
  }
  // Player 2 sends only a few
  for (let i = 0; i < 10; i++) {
    send(p2, { type: 'input', action: 'tap', value: 1 });
  }

  // 6. Wait for end event
  console.log('\n6. Wait for winner');
  const endEvent = await waitFor(host, m => m.type === 'event' && m.name === 'end', 10000);
  assert(endEvent.winner === 1, 'player 1 wins (winner id=1)');

  // Check final scores on p1
  const p1End = await waitFor(p1, m => m.type === 'event' && m.name === 'end', 2000);
  assert(p1End.winner === 1, 'player 1 receives end event');

  const p2End = await waitFor(p2, m => m.type === 'event' && m.name === 'end', 2000);
  assert(p2End.winner === 1, 'player 2 receives end event');

  // Get final state from host
  // We need to check the last state that was broadcast
  const resultState = await waitFor(host, m => m.type === 'state' && m.gameState.phase === 'result', 2000).catch(() => null);
  if (resultState) {
    assert(resultState.gameState.players['1'].score === 100, 'player 1 score capped at 100');
    assert(resultState.gameState.players['2'].score < 100, 'player 2 score < 100');
  }

  // 7. Restart
  console.log('\n7. Restart game');
  send(host, { type: 'restart' });
  const lobbyState = await waitFor(host, m => m.type === 'state' && m.gameState.phase === 'lobby');
  assert(lobbyState.gameState.phase === 'lobby', 'back to lobby after restart');
  assert(lobbyState.gameState.players['1'].score === 0, 'player 1 score reset to 0');
  assert(lobbyState.gameState.players['2'].score === 0, 'player 2 score reset to 0');

  // 8. Disconnect test
  console.log('\n8. Player disconnect');
  const dcPromise = waitFor(host, m => m.type === 'state' && m.gameState.players['2'] && m.gameState.players['2'].connected === false, 3000);
  p2.close();
  const dcState = await dcPromise;
  assert(dcState.gameState.players['2'].connected === false, 'player 2 shows disconnected');
  assert(dcState.gameState.players['1'].connected === true, 'player 1 still connected');

  // Cleanup
  host.close();
  p1.close();

  // Results
  console.log('\n=== RESULTS ===');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : '\n  SOME TESTS FAILED\n');
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
