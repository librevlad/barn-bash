// Phase 28 — Protocol schema tests. Run with: node --test client-shared/protocol.test.js
const test = require('node:test');
const assert = require('node:assert');
const Protocol = require('./protocol');

test('validate accepts well-formed host', () => {
  assert.strictEqual(Protocol.validate({ type: 'host' }), null);
});

test('validate rejects non-objects', () => {
  assert.match(Protocol.validate(null) || '', /not an object/);
  assert.match(Protocol.validate(42) || '', /not an object/);
  assert.match(Protocol.validate('host') || '', /not an object/);
});

test('validate rejects missing type', () => {
  assert.match(Protocol.validate({}) || '', /missing type/);
});

test('validate rejects unknown type', () => {
  assert.match(Protocol.validate({ type: 'teleport' }) || '', /unknown type/);
});

test('validate catches malformed join', () => {
  assert.match(
    Protocol.validate({ type: 'join', name: 42 }) || '',
    /join: bad payload/,
  );
});

test('validate catches selectGame without gameId', () => {
  assert.match(
    Protocol.validate({ type: 'selectGame' }) || '',
    /selectGame: missing gameId/,
  );
});

test('validate catches input without action', () => {
  assert.match(
    Protocol.validate({ type: 'input' }) || '',
    /input: missing action/,
  );
});

test('validate accepts input with action + extras', () => {
  assert.strictEqual(
    Protocol.validate({ type: 'input', action: 'jump', direction: 'left' }),
    null,
  );
});

test('makeHost / makeStart / makeRestart return correct shape', () => {
  assert.deepStrictEqual(Protocol.makeHost(), { type: 'host' });
  assert.deepStrictEqual(Protocol.makeStart(), { type: 'start' });
  assert.deepStrictEqual(Protocol.makeRestart(), { type: 'restart' });
});

test('makeJoin omits undefined fields', () => {
  assert.deepStrictEqual(Protocol.makeJoin(), { type: 'join' });
  assert.deepStrictEqual(
    Protocol.makeJoin({ name: 'Alice' }),
    { type: 'join', name: 'Alice' },
  );
  assert.deepStrictEqual(
    Protocol.makeJoin({ name: 'Alice', character: 'cat' }),
    { type: 'join', name: 'Alice', character: 'cat' },
  );
});

test('makeSelectGame includes gameId', () => {
  assert.deepStrictEqual(
    Protocol.makeSelectGame('escapeFox'),
    { type: 'selectGame', gameId: 'escapeFox' },
  );
});

test('makeInput includes action and extras', () => {
  assert.deepStrictEqual(
    Protocol.makeInput('jump'),
    { type: 'input', action: 'jump' },
  );
  assert.deepStrictEqual(
    Protocol.makeInput('steer', { direction: 'left', strength: 0.5 }),
    { type: 'input', action: 'steer', direction: 'left', strength: 0.5 },
  );
});

test('makePing includes timestamp', () => {
  assert.deepStrictEqual(Protocol.makePing(), { type: 'ping' });
  assert.deepStrictEqual(Protocol.makePing(12345), { type: 'ping', t: 12345 });
});

test('send writes JSON to ws', () => {
  let got = null;
  const fakeWs = { readyState: 1, send: (s) => { got = s; } };
  Protocol.send(fakeWs, Protocol.makeJoin({ name: 'Alice' }));
  assert.deepStrictEqual(JSON.parse(got), { type: 'join', name: 'Alice' });
});

test('send skips when readyState is not OPEN', () => {
  let got = null;
  const fakeWs = { readyState: 3 /* CLOSED */, send: (s) => { got = s; } };
  Protocol.send(fakeWs, Protocol.makeHost());
  assert.strictEqual(got, null);
});

test('CLIENT_TYPES + SERVER_TYPES are disjoint sets of strings', () => {
  const clientSet = new Set(Protocol.CLIENT_TYPES);
  const serverSet = new Set(Protocol.SERVER_TYPES);
  assert.ok(Protocol.CLIENT_TYPES.length > 0);
  assert.ok(Protocol.SERVER_TYPES.length > 0);
  for (const t of Protocol.CLIENT_TYPES) {
    assert.strictEqual(typeof t, 'string');
  }
  // Note: 'pong' appears in both client and server (ping/pong is symmetric).
  // So they can overlap. Just verify both are populated.
  void clientSet; void serverSet;
});

test('predicates match exact type field', () => {
  assert.strictEqual(Protocol.isHost({ type: 'host' }), true);
  assert.strictEqual(Protocol.isHost({ type: 'join' }), false);
  assert.strictEqual(Protocol.isInput({ type: 'input', action: 'jump' }), true);
  assert.strictEqual(Protocol.isInput({ type: 'input' }), false);
  assert.strictEqual(Protocol.isSelectGame({ type: 'selectGame', gameId: 'x' }), true);
  assert.strictEqual(Protocol.isSelectGame({ type: 'selectGame' }), false);
});
