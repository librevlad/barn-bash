// test/core.test.js
// Unit tests for the pure host-side engine modules. Uses node:test +
// node:assert — no external deps. The IIFE modules assume a browser
// `window.BB = window.BB || {}` convention, so we shim it before
// requiring and then read the factories out of `global.window.BB`.

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

global.window = { BB: {} };

// Load order matches <script> tags in index.html (deps first).
require(path.resolve(__dirname, '../src/core/screens.js'));
require(path.resolve(__dirname, '../src/core/math.js'));
require(path.resolve(__dirname, '../src/core/gameReducer.js'));
require(path.resolve(__dirname, '../src/core/score.js'));

const { Screen, core } = global.window.BB;

test('core exports expected shape', () => {
  assert.strictEqual(typeof core.gameReducer, 'function');
  assert.strictEqual(typeof core.initialGameState, 'function');
  assert.strictEqual(typeof core.rankByValue, 'function');
  assert.strictEqual(typeof core.buildRoundEndPayload, 'function');
  assert.strictEqual(typeof core.buildGameOverPayload, 'function');
});

test('Screen enum is frozen + holds all six screens', () => {
  assert.deepStrictEqual(Object.keys(Screen).sort(), [
    'Board', 'CharacterSelect', 'Minigame', 'Podium', 'Scoreboard', 'Title',
  ]);
  assert.ok(Object.isFrozen(Screen));
});

test('GO_TITLE wipes lineup but preserves coins + difficulty', () => {
  const initial = {
    screen: Screen.Board,
    round: 3, totalRounds: 5,
    scores: [5, 3, 2, 1],
    players: [{ id: 'a' }, { id: 'b' }],
    lastEarned: [3, 1, 0, 0],
    lastMinigame: 'Pig Sprint',
    currentGameId: 'tap',
    coins: 1300,
    modifier: { id: 'fast' },
    difficulty: 'hard',
  };
  const next = core.gameReducer(initial, { type: 'GO_TITLE' });
  assert.strictEqual(next.screen, Screen.Title);
  assert.strictEqual(next.round, 1);
  assert.deepStrictEqual(next.scores, []);
  assert.deepStrictEqual(next.players, []);
  assert.deepStrictEqual(next.lastEarned, []);
  assert.strictEqual(next.lastMinigame, null);
  assert.strictEqual(next.currentGameId, null);
  assert.strictEqual(next.modifier, null);
  assert.strictEqual(next.coins, 1300, 'coins persist through reset');
  assert.strictEqual(next.difficulty, 'hard', 'difficulty preserved');
});

test('FINISH_MINIGAME guards against late fires after GO_TITLE', () => {
  const reset = { screen: Screen.Title, players: [], scores: [], lastEarned: [] };
  const next = core.gameReducer(reset, {
    type: 'FINISH_MINIGAME', earned: [5, 3, 1, 0], name: 'Pig Sprint',
  });
  assert.strictEqual(next, reset, 'returns same state (no-op) when players empty');
});

test('PICK_MINIGAME routes to Screen.Minigame with currentGameId', () => {
  const state = { screen: Screen.Board, currentGameId: null };
  const next = core.gameReducer(state, { type: 'PICK_MINIGAME', gameId: 'tap' });
  assert.strictEqual(next.screen, Screen.Minigame);
  assert.strictEqual(next.currentGameId, 'tap');
});

test('CONTINUE_ROUND advances round + adds lastEarned to scores', () => {
  const state = {
    screen: Screen.Scoreboard,
    round: 2, totalRounds: 5,
    scores: [10, 5, 3, 1],
    lastEarned: [3, 1, 0, 0],
    coins: 100,
  };
  const next = core.gameReducer(state, { type: 'CONTINUE_ROUND' });
  assert.strictEqual(next.screen, Screen.Board);
  assert.strictEqual(next.round, 3);
  assert.deepStrictEqual(next.scores, [13, 6, 3, 1]);
  // Slot 0 earned 3 coins → coins += 3 * 10
  assert.strictEqual(next.coins, 130);
});

test('CONTINUE_ROUND on last round routes to Podium, no round++', () => {
  const state = {
    screen: Screen.Scoreboard,
    round: 5, totalRounds: 5,
    scores: [10, 5],
    lastEarned: [3, 1],
    coins: 0,
  };
  const next = core.gameReducer(state, { type: 'CONTINUE_ROUND' });
  assert.strictEqual(next.screen, Screen.Podium);
  assert.strictEqual(next.round, 5);
  assert.deepStrictEqual(next.scores, [13, 6]);
});

test('CONFIRM_CHARACTERS in party mode jumps straight to first Minigame', () => {
  const state = {
    screen: Screen.CharacterSelect, mode: 'party',
    players: [{ id: 1 }], currentGameId: null,
  };
  const next = core.gameReducer(state, {
    type: 'CONFIRM_CHARACTERS', firstGameId: 'pig-sprint',
  });
  assert.strictEqual(next.screen, Screen.Minigame);
  assert.strictEqual(next.currentGameId, 'pig-sprint');
});

test('CONFIRM_CHARACTERS classic mode still routes to Board', () => {
  const state = { screen: Screen.CharacterSelect, mode: 'classic' };
  const next = core.gameReducer(state, { type: 'CONFIRM_CHARACTERS' });
  assert.strictEqual(next.screen, Screen.Board);
});

test('START_PARTY sets mode=party and totalRounds=null', () => {
  const initial = {
    screen: Screen.Title, round: 1, totalRounds: 5,
    scores: [], players: [], playedGameIds: [], coins: 1240,
    mode: 'classic', lastEarned: [], lastMinigame: null, currentGameId: null,
    modifier: null, difficulty: 'medium',
  };
  const next = core.gameReducer(initial, {
    type: 'START_PARTY',
    players: [{ id: 1 }, { id: 2 }],
    difficulty: 'medium',
    modifier: null,
  });
  assert.strictEqual(next.mode, 'party');
  assert.strictEqual(next.totalRounds, null);
  assert.strictEqual(next.screen, Screen.CharacterSelect);
  assert.deepStrictEqual(next.playedGameIds, []);
  assert.deepStrictEqual(next.scores, [0, 0]);
  assert.strictEqual(next.round, 1);
});

test('FINISH_MINIGAME appends currentGameId to playedGameIds in party mode', () => {
  const state = {
    screen: Screen.Minigame, mode: 'party',
    players: [{ id: 1 }, { id: 2 }],
    scores: [0, 0], lastEarned: [], lastMinigame: null,
    currentGameId: 'pig-sprint', playedGameIds: [],
  };
  const next = core.gameReducer(state, {
    type: 'FINISH_MINIGAME', earned: [3, 1], name: 'Pig Sprint',
  });
  assert.strictEqual(next.screen, Screen.Scoreboard);
  assert.deepStrictEqual(next.playedGameIds, ['pig-sprint']);
  assert.strictEqual(next.currentGameId, null);
});

test('FINISH_MINIGAME does NOT touch playedGameIds in classic mode', () => {
  const state = {
    screen: Screen.Minigame, mode: 'classic',
    players: [{ id: 1 }],
    scores: [0], lastEarned: [], lastMinigame: null,
    currentGameId: 'pig-sprint', playedGameIds: [],
  };
  const next = core.gameReducer(state, {
    type: 'FINISH_MINIGAME', earned: [3], name: 'Pig Sprint',
  });
  assert.deepStrictEqual(next.playedGameIds, []);
});

test('CONTINUE_ROUND in party mode routes to Minigame with nextGameId, not Board', () => {
  const state = {
    screen: Screen.Scoreboard, mode: 'party',
    round: 2, totalRounds: null,
    players: [{ id: 1 }, { id: 2 }],
    scores: [5, 3], lastEarned: [2, 0],
    coins: 50, playedGameIds: ['pig-sprint'],
  };
  const next = core.gameReducer(state, {
    type: 'CONTINUE_ROUND', nextGameId: 'hay-panic',
  });
  assert.strictEqual(next.screen, Screen.Minigame);
  assert.strictEqual(next.currentGameId, 'hay-panic');
  assert.deepStrictEqual(next.scores, [7, 3]);
  // Party mode doesn't terminate on round count; round advances but isn't capped
  assert.strictEqual(next.round, 3);
  // Fresh minigame → lastEarned reset so next Scoreboard doesn't double-count
  assert.deepStrictEqual(next.lastEarned, [0, 0]);
});

test('CONTINUE_ROUND in party mode without nextGameId is a no-op on screen', () => {
  // Defensive: if handler forgets to supply nextGameId, we should not blank
  // out currentGameId and crash SceneManager. Stay on Scoreboard.
  const state = {
    screen: Screen.Scoreboard, mode: 'party',
    round: 2, totalRounds: null,
    scores: [5, 3], lastEarned: [2, 0],
    coins: 0, playedGameIds: [],
  };
  const next = core.gameReducer(state, { type: 'CONTINUE_ROUND' });
  assert.strictEqual(next.screen, Screen.Scoreboard);
});

test('END_PARTY routes to Podium with lastEarned folded into scores', () => {
  const state = {
    screen: Screen.Scoreboard, mode: 'party',
    scores: [10, 5], lastEarned: [3, 0],
    coins: 0, playedGameIds: ['pig-sprint', 'hay-panic'],
  };
  const next = core.gameReducer(state, { type: 'END_PARTY' });
  assert.strictEqual(next.screen, Screen.Podium);
  assert.deepStrictEqual(next.scores, [13, 5]);
});

test('END_PARTY from Minigame (mid-round exit) bails straight to Podium', () => {
  const state = {
    screen: Screen.Minigame, mode: 'party',
    scores: [10, 5], lastEarned: [],
    currentGameId: 'barn-jump', playedGameIds: ['pig-sprint'],
  };
  const next = core.gameReducer(state, { type: 'END_PARTY' });
  assert.strictEqual(next.screen, Screen.Podium);
  assert.strictEqual(next.currentGameId, null);
  // No lastEarned to fold in; totals unchanged
  assert.deepStrictEqual(next.scores, [10, 5]);
});

test('GO_TITLE resets party-specific fields (mode, playedGameIds)', () => {
  const party = {
    screen: Screen.Minigame, mode: 'party',
    round: 3, scores: [5, 3], players: [{id:1}],
    playedGameIds: ['pig-sprint', 'hay-panic'],
    lastEarned: [], lastMinigame: null, currentGameId: 'barn-jump',
    coins: 200, modifier: null, difficulty: 'medium', totalRounds: null,
  };
  const next = core.gameReducer(party, { type: 'GO_TITLE' });
  assert.strictEqual(next.mode, 'classic');
  assert.deepStrictEqual(next.playedGameIds, []);
  assert.strictEqual(next.screen, Screen.Title);
});

test('initialGameState seeds mode=classic and playedGameIds=[]', () => {
  const s = core.initialGameState({ totalRounds: 5, difficulty: 'medium' });
  assert.strictEqual(s.mode, 'classic');
  assert.deepStrictEqual(s.playedGameIds, []);
});

test('PHONE_PRESENCE_SYNC flips isCPU on phone-owned slots', () => {
  const state = {
    players: [
      { char: {}, isCPU: false, remoteId: 1 },  // phone 1 connected
      { char: {}, isCPU: false, remoteId: 2 },  // phone 2 connected — will drop
      { char: {}, isCPU: true },                // pure CPU — untouched
    ],
  };
  const liveIds = new Set([1]); // phone 2 dropped
  const next = core.gameReducer(state, { type: 'PHONE_PRESENCE_SYNC', liveIds });
  assert.strictEqual(next.players[0].isCPU, false, 'phone 1 stays human');
  assert.strictEqual(next.players[1].isCPU, true, 'phone 2 flipped to CPU');
  assert.strictEqual(next.players[2].isCPU, true, 'pure CPU untouched');
});

test('rankByValue assigns competition ranking with ties', () => {
  const players = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
  const ranks = core.rankByValue(players, [5, 3, 5, 1]);
  // desc sort: p0=5, p2=5 share rank 1; p1=3 → 3; p3=1 → 4
  assert.deepStrictEqual(ranks, [1, 3, 1, 4]);
});

test('rankByValue handles missing values as 0', () => {
  const players = [{ id: 0 }, { id: 1 }, { id: 2 }];
  const ranks = core.rankByValue(players, [undefined, 5, null]);
  // sorted: p1=5, p0=0, p2=0 (tied at 0)
  assert.strictEqual(ranks[1], 1);
  assert.strictEqual(ranks[0], 2);
  assert.strictEqual(ranks[2], 2);
});

test('buildRoundEndPayload filters to phone players', () => {
  const state = {
    players: [
      { remoteId: 7, char: {} },
      { remoteId: null, char: {} },         // CPU
      { remoteId: 9, char: {} },
    ],
    scores: [10, 5, 3],
    lastEarned: [3, 0, 1],
    lastMinigame: 'Pig Sprint',
  };
  const payload = core.buildRoundEndPayload(state);
  assert.strictEqual(payload.minigame, 'Pig Sprint');
  assert.deepStrictEqual(Object.keys(payload.byId).sort(), ['7', '9']);
  assert.strictEqual(payload.byId[7].earned, 3);
  assert.strictEqual(payload.byId[7].total, 13);
  assert.strictEqual(payload.byId[9].earned, 1);
  assert.strictEqual(payload.byId[9].total, 4);
});

test('buildGameOverPayload uses final scores', () => {
  const state = {
    players: [{ remoteId: 7 }, { remoteId: 9 }],
    scores: [17, 9],
  };
  const payload = core.buildGameOverPayload(state);
  assert.deepStrictEqual(Object.keys(payload.byId).sort(), ['7', '9']);
  assert.strictEqual(payload.byId[7].rank, 1);
  assert.strictEqual(payload.byId[7].total, 17);
  assert.strictEqual(payload.byId[9].rank, 2);
});

test('randBetween / clamp / pick are attached to the shim window', () => {
  // math.js Object.assign's to `window` but node shim puts it under global.window.
  // Since core/math.js does `Object.assign(window, ...)` at the top level of the
  // IIFE closure (window is passed implicitly? no — destructured from inside.)
  // Actually math.js writes to global `window` object. Verify via global.window.
  assert.strictEqual(typeof global.window.randBetween, 'function');
  assert.strictEqual(typeof global.window.clamp, 'function');
  assert.strictEqual(typeof global.window.pick, 'function');

  const { clamp, pick } = global.window;
  assert.strictEqual(clamp(5, 0, 10), 5);
  assert.strictEqual(clamp(-5, 0, 10), 0);
  assert.strictEqual(clamp(15, 0, 10), 10);
  assert.strictEqual(pick([42]), 42);
});
