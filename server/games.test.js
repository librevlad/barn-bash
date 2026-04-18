// Phase 36 — game-class integration tests. Exercises the public
// lifecycle surface of each of the 4 game classes (constructor,
// phase transitions, start / restart, broadcastState, handleInput)
// without a live WebSocket loop. Uses a mock broadcast that captures
// every emission into an array, and a real Players instance seeded
// with bare-object "sockets" so Players.add() has something to hold.
//
// The tick loop is NOT exercised directly — start() spins a
// setInterval, and restart() is called immediately after assertion
// so the interval is cleared and the test harness exits cleanly.

const test = require('node:test');
const assert = require('node:assert');
const Players = require('./players');
const EscapeFoxGame = require('./escapeFoxGame');
const HillGame = require('./hillGame');
const MeteorGame = require('./meteorGame');
const RaceGame = require('./raceGame');

function makeEnv() {
  const players = new Players();
  const broadcasts = [];
  const broadcast = (msg) => broadcasts.push(msg);
  return { players, broadcasts, broadcast };
}

function seedPlayers(players, count) {
  const ids = [];
  for (let i = 0; i < count; i++) {
    ids.push(players.add({ readyState: 1 }, 'P' + (i + 1), 'cat', undefined));
  }
  return ids;
}

const GAMES = [
  { name: 'escapeFox',  Ctor: EscapeFoxGame, gameId: 'escapeFox' },
  { name: 'hillKing',   Ctor: HillGame,       gameId: 'hillKing' },
  { name: 'meteor',     Ctor: MeteorGame,     gameId: 'meteor' },
  { name: 'race',       Ctor: RaceGame,       gameId: 'race' },
];

for (const { name, Ctor, gameId } of GAMES) {
  test(`${name}: constructor places game in lobby phase`, () => {
    const { players, broadcast } = makeEnv();
    const g = new Ctor(players, broadcast);
    assert.strictEqual(g.phase, 'lobby', 'phase is lobby on construct');
    assert.strictEqual(typeof g.getState, 'function', 'getState exists');
    const s = g.getState();
    assert.strictEqual(s.phase, 'lobby', 'getState reports lobby');
    assert.ok(s.players, 'getState includes players map');
  });

  test(`${name}: broadcastState emits a state message with correct gameId`, () => {
    const { players, broadcast, broadcasts } = makeEnv();
    const g = new Ctor(players, broadcast);
    g.broadcastState();
    assert.ok(broadcasts.length > 0, 'at least one broadcast');
    const state = broadcasts.find(m => m.type === 'state');
    assert.ok(state, 'state message present');
    assert.strictEqual(state.gameId, gameId, 'gameId matches');
    assert.ok(state.gameState, 'gameState payload present');
  });

  test(`${name}: start with 0 or 1 players stays in lobby`, () => {
    const env0 = makeEnv();
    const g0 = new Ctor(env0.players, env0.broadcast);
    g0.start();
    assert.strictEqual(g0.phase, 'lobby', 'no players → no start');

    const env1 = makeEnv();
    seedPlayers(env1.players, 1);
    const g1 = new Ctor(env1.players, env1.broadcast);
    g1.start();
    assert.strictEqual(g1.phase, 'lobby', '1 player → no start');
  });

  test(`${name}: start with ≥2 players moves to running then restart returns to lobby`, () => {
    const { players, broadcast } = makeEnv();
    seedPlayers(players, 2);
    const g = new Ctor(players, broadcast);
    g.start();
    assert.strictEqual(g.phase, 'running', 'phase advances to running');
    g.restart();
    assert.strictEqual(g.phase, 'lobby', 'restart returns to lobby');
  });

  test(`${name}: handleInput on lobby phase is a no-op and does not throw`, () => {
    const { players, broadcast } = makeEnv();
    const id = seedPlayers(players, 2)[0];
    const g = new Ctor(players, broadcast);
    assert.doesNotThrow(() => g.handleInput(id, 'jump', {}));
    assert.doesNotThrow(() => g.handleInput(id, 'left', {}));
    assert.doesNotThrow(() => g.handleInput(id, 'unknown', {}));
    assert.strictEqual(g.phase, 'lobby', 'phase unchanged by input on lobby');
  });

  test(`${name}: getGameId returns stable id (when available)`, () => {
    const { players, broadcast } = makeEnv();
    const g = new Ctor(players, broadcast);
    if (typeof g.getGameId === 'function') {
      assert.strictEqual(g.getGameId(), gameId);
    }
  });
}
