// ============================================================
// Test: Join Flow — Name, Character, Persistence
// ============================================================
const WebSocket = require('ws');

const URL = 'ws://localhost:3000';
let passed = 0, failed = 0;

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

function send(ws, msg) { ws.send(JSON.stringify(msg)); }

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

async function run() {
  console.log('\n=== JOIN FLOW TESTS ===\n');

  // --- Test 1: Join with name and character ---
  console.log('Test 1: Join with name + character');
  const host = await connect();
  send(host, { type: 'host' });
  await waitFor(host, m => m.type === 'state');

  const p1 = await connect();
  const initP = waitFor(p1, m => m.type === 'init');
  send(p1, { type: 'join', name: 'Alex', character: 'cat' });
  const init1 = await initP;

  const id1 = init1.playerId;
  assert(typeof id1 === 'number' && id1 > 0, 'Player gets a valid ID');
  assert(init1.name === 'Alex', 'Name is "Alex"');
  assert(init1.character === 'cat', 'Character is "cat"');
  assert(typeof init1.color === 'string', 'Color assigned');

  // --- Test 2: Join with name only (no character) ---
  console.log('\nTest 2: Join with name only');
  const p2 = await connect();
  const initP2 = waitFor(p2, m => m.type === 'init');
  send(p2, { type: 'join', name: 'Bob' });
  const init2 = await initP2;

  const id2 = init2.playerId;
  assert(typeof id2 === 'number' && id2 > id1, 'Player gets next ID');
  assert(init2.name === 'Bob', 'Name is "Bob"');
  assert(init2.character === null, 'Character is null (not selected)');

  // --- Test 3: Join with no name (default) ---
  console.log('\nTest 3: Join with no name');
  const p3 = await connect();
  const initP3 = waitFor(p3, m => m.type === 'init');
  send(p3, { type: 'join' });
  const init3 = await initP3;

  assert(init3.name.startsWith('Player '), 'Default name starts with "Player "');

  // --- Test 4: Name sanitization (no HTML) ---
  console.log('\nTest 4: Name sanitization');
  const p4 = await connect();
  const initP4 = waitFor(p4, m => m.type === 'init');
  send(p4, { type: 'join', name: '<script>alert(1)</script>' });
  const init4 = await initP4;

  assert(!init4.name.includes('<'), 'HTML tags stripped from name');
  assert(!init4.name.includes('>'), 'No > in name');

  // --- Test 5: Name length limit ---
  console.log('\nTest 5: Name length limit');
  const p5 = await connect();
  const initP5 = waitFor(p5, m => m.type === 'init');
  send(p5, { type: 'join', name: 'A'.repeat(100) });
  const init5 = await initP5;

  assert(init5.name.length <= 16, 'Name truncated to 16 chars');

  // --- Test 6: Invalid character rejected ---
  console.log('\nTest 6: Invalid character');
  const p6 = await connect();
  const initP6 = waitFor(p6, m => m.type === 'init');
  send(p6, { type: 'join', name: 'Evil', character: 'dragon' });
  const init6 = await initP6;

  assert(init6.character === null, 'Invalid character "dragon" rejected → null');

  // --- Test 7: selectCharacter after join ---
  console.log('\nTest 7: Select character after join');
  // Register handler BEFORE sending to avoid race condition
  const charWait = waitFor(host, m =>
    m.type === 'state' && m.gameState && m.gameState.players[id2] && m.gameState.players[id2].character === 'wolf'
  , 5000);
  send(p2, { type: 'selectCharacter', character: 'wolf' });
  const stateMsg = await charWait;
  const p2Data = stateMsg.gameState.players[id2];

  assert(p2Data.character === 'wolf', 'Bob character updated to wolf via selectCharacter');

  // --- Test 8: player_joined broadcast ---
  console.log('\nTest 8: player_joined broadcast');
  const joinedP = waitFor(host, m => m.type === 'player_joined');
  const p7 = await connect();
  send(p7, { type: 'join', name: 'Charlie', character: 'frog' });
  const joined = await joinedP;

  assert(joined.name === 'Charlie', 'player_joined has name');
  assert(joined.character === 'frog', 'player_joined has character');
  assert(typeof joined.color === 'string', 'player_joined has color');

  // --- Test 9: Name in game state broadcast ---
  console.log('\nTest 9: Name in game state');
  const stateMsg2 = await waitFor(host, m => m.type === 'state' && m.gameState && m.gameState.players[id1]);
  const p1State = stateMsg2.gameState.players[id1];

  assert(p1State.name === 'Alex', 'Game state includes player name');
  assert(p1State.character === 'cat', 'Game state includes character');

  // --- Test 10: setName after join ---
  console.log('\nTest 10: setName after join');
  send(p1, { type: 'setName', name: 'Alexander' });
  const stateMsg3 = await waitFor(host, m =>
    m.type === 'state' && m.gameState && m.gameState.players[id1] && m.gameState.players[id1].name === 'Alexander'
  );
  const p1Updated = stateMsg3.gameState.players[id1];

  assert(p1Updated.name === 'Alexander', 'Name updated to "Alexander" via setName');

  // --- Cleanup ---
  [host, p1, p2, p3, p4, p5, p6, p7].forEach(ws => ws.close());

  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
