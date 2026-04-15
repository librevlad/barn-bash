const test = require('node:test');
const assert = require('node:assert');
const Players = require('./players.js');

function mockWS() { return { send: () => {} }; }

test('player.colorId is assigned from preferredColor when free', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat', 'red');
  assert.strictEqual(p.get(id).colorId, 'red');
  assert.strictEqual(p.get(id).color, '#e74c3c');
});

test('preferred color falls back to next free when taken', () => {
  const p = new Players();
  p.add(mockWS(), 'Alice', 'cat', 'red');
  const bobId = p.add(mockWS(), 'Bob', 'frog', 'red');
  assert.notStrictEqual(p.get(bobId).colorId, 'red');
  assert.ok(['blue','yellow','green','pink','lightblue','purple','magenta','orange','greenalt'].includes(p.get(bobId).colorId));
});

test('unknown preferredColor is ignored, falls back to next free', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat', 'not-a-color');
  assert.ok(['red','blue','yellow','green','pink','lightblue','purple','magenta','orange','greenalt'].includes(p.get(id).colorId));
});

test('missing preferredColor uses first free color', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat');
  assert.strictEqual(p.get(id).colorId, 'red');
});

test('11th player gets wrapped color (pool exhausted)', () => {
  const p = new Players();
  const ids = ['red','blue','yellow','green','pink','lightblue','purple','magenta','orange','greenalt'];
  for (const c of ids) p.add(mockWS(), 'player', 'cat', c);
  const id11 = p.add(mockWS(), 'overflow', 'cat');
  assert.ok(ids.includes(p.get(id11).colorId));
});

test('backward-compat: .color still returns hex string', () => {
  const p = new Players();
  const id = p.add(mockWS(), 'Alice', 'cat', 'blue');
  assert.strictEqual(p.get(id).color, '#3498db');
  assert.strictEqual(typeof p.get(id).color, 'string');
  assert.ok(p.get(id).color.startsWith('#'));
});
