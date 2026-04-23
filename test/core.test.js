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
require(path.resolve(__dirname, '../src/core/partyPicker.js'));
require(path.resolve(__dirname, '../src/core/moderator.js'));
require(path.resolve(__dirname, '../src/core/chaosPacing.js'));

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

test('pickNextPartyGame returns null for empty gameIds', () => {
  assert.strictEqual(core.pickNextPartyGame({ gameIds: [] }), null);
  assert.strictEqual(core.pickNextPartyGame({ gameIds: null }), null);
});

test('pickNextPartyGame returns the only game when list length is 1', () => {
  assert.strictEqual(core.pickNextPartyGame({ gameIds: ['only'] }), 'only');
  // Even if it is lastGameId — we have no alternative to avoid a repeat.
  assert.strictEqual(
    core.pickNextPartyGame({ gameIds: ['only'], lastGameId: 'only' }), 'only'
  );
});

test('pickNextPartyGame never repeats lastGameId when alternatives exist', () => {
  // Deterministic because lastGameId weight is 0.
  for (let i = 0; i < 50; i++) {
    const id = core.pickNextPartyGame({ gameIds: ['a', 'b'], lastGameId: 'a' });
    assert.strictEqual(id, 'b');
  }
});

test('pickNextPartyGame biases toward unplayed games over played (statistical)', () => {
  // Weights: unplayed = 3, played-once = 1. Ratio ~3:1 expected.
  let unplayedCount = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const id = core.pickNextPartyGame({
      gameIds: ['played', 'unplayed'],
      playedGameIds: ['played'],
    });
    if (id === 'unplayed') unplayedCount++;
  }
  // 3:1 ideal = 75%. Allow ±8% window for randomness.
  assert.ok(unplayedCount > N * 0.67, `unplayed should dominate: ${unplayedCount}/${N}`);
  assert.ok(unplayedCount < N * 0.85, `but not be deterministic: ${unplayedCount}/${N}`);
});

test('pickNextPartyGame accepts an injected rand for determinism', () => {
  // rand=0 → picks the first game that still has positive weight.
  // With lastGameId='a', 'a' has weight 0, so first positive is 'b'.
  const id = core.pickNextPartyGame({
    gameIds: ['a', 'b', 'c'], lastGameId: 'a', rand: () => 0,
  });
  assert.strictEqual(id, 'b');
});

test('pickNextPartyGame after everything played keeps picking (no starvation)', () => {
  // Every game played 2x — weights all positive (0.75), picker still fires.
  const id = core.pickNextPartyGame({
    gameIds: ['a', 'b', 'c'],
    playedGameIds: ['a', 'b', 'c', 'a', 'b', 'c'],
    lastGameId: 'c',
  });
  assert.ok(['a', 'b'].includes(id), `expected a or b (not last=c): ${id}`);
});

test('pickModeratorLine returns null for empty players', () => {
  assert.strictEqual(core.pickModeratorLine({ players: [] }), null);
  assert.strictEqual(core.pickModeratorLine({ players: null }), null);
});

test('pickModeratorLine picks shutout when everyone earned 0', () => {
  const players = [{ char: { name: 'pig' } }, { char: { name: 'cow' } }];
  const line = core.pickModeratorLine({
    players, scores: [3, 1], earned: [0, 0], lastMinigame: 'pig-sprint',
    rand: () => 0,
  });
  assert.strictEqual(line.category, 'shutout');
  assert.ok(line.text.length > 0);
  // Shutout templates don't reference any player names, so substitution
  // should leave no lingering {placeholder} tokens.
  assert.ok(!/\{\w+\}/.test(line.text), `unfilled placeholder: ${line.text}`);
});

test('pickModeratorLine picks tie when two players share the top earn', () => {
  const players = [
    { char: { name: 'pig' }, displayName: 'vlad' },
    { char: { name: 'cow' }, displayName: 'misha' },
    { char: { name: 'sheep' }, displayName: 'max' },
  ];
  const line = core.pickModeratorLine({
    players, scores: [0, 0, 0], earned: [3, 3, 1],
    rand: () => 0,
  });
  assert.strictEqual(line.category, 'tie');
  // Templates tie-1 / tie-4 use {winner1} + {winner2} — with rand=0 we land
  // on tie-1 which interpolates both. Confirm at least one resolved name
  // lands in the output to prove substitution ran.
  assert.ok(line.text.includes('VLAD') || line.text.includes('MISHA'),
    `expected a tied winner name in: ${line.text}`);
  assert.ok(!/\{\w+\}/.test(line.text), `unfilled placeholder: ${line.text}`);
});

test('pickModeratorLine picks blowout when single winner ≥2x next', () => {
  const players = [
    { char: { name: 'pig' }, displayName: 'vlad' },
    { char: { name: 'cow' }, displayName: 'misha' },
  ];
  const line = core.pickModeratorLine({
    players, scores: [0, 0], earned: [6, 1],
    rand: () => 0,
  });
  assert.strictEqual(line.category, 'blowout');
  assert.ok(line.text.includes('VLAD'), `expected winner name: ${line.text}`);
  assert.ok(!/\{\w+\}/.test(line.text), `unfilled placeholder: ${line.text}`);
});

test('pickModeratorLine: tight single winner falls through to solo/roast/leader', () => {
  // 2 vs 1 is not a blowout (ratio 2 but absolute 2 is tiny). Solo-winner
  // is the expected category for a tight round like this.
  const players = [
    { char: { name: 'pig' }, displayName: 'vlad' },
    { char: { name: 'cow' }, displayName: 'misha' },
  ];
  const line = core.pickModeratorLine({
    players, scores: [0, 0], earned: [2, 1],
    // rand sequence: 0 picks first category ('solo-winner'), then 0 picks
    // the first template in that bank.
    rand: () => 0,
  });
  assert.notStrictEqual(line.category, 'blowout');
  assert.ok(['solo-winner', 'zero-roast', 'leader-taunt'].includes(line.category),
    `unexpected category: ${line.category}`);
});

test('pickModeratorLine avoids repeating lastLineKey when alternatives exist', () => {
  const players = [{ char: { name: 'pig' } }, { char: { name: 'cow' } }];
  // Force shutout category — 4 templates available.
  // With lastLineKey='shut-1' and rand=0, picker should pick the first
  // *remaining* template, which is 'shut-2'.
  const line = core.pickModeratorLine({
    players, scores: [0, 0], earned: [0, 0],
    lastLineKey: 'shut-1', rand: () => 0,
  });
  assert.notStrictEqual(line.key, 'shut-1', `expected dedup, got: ${line.key}`);
});

test('pickModeratorLine: injected rand makes selection deterministic', () => {
  const players = [
    { char: { name: 'pig' }, displayName: 'vlad' },
    { char: { name: 'cow' }, displayName: 'misha' },
  ];
  const a = core.pickModeratorLine({
    players, scores: [5, 3], earned: [2, 0], rand: () => 0.42,
  });
  const b = core.pickModeratorLine({
    players, scores: [5, 3], earned: [2, 0], rand: () => 0.42,
  });
  assert.deepStrictEqual(a, b);
});

test('intensityFromRound returns 0 in classic mode regardless of round', () => {
  for (const round of [1, 5, 10, 100]) {
    assert.strictEqual(
      core.intensityFromRound({ round, mode: 'classic' }), 0,
      `classic round ${round} should be 0`
    );
  }
});

test('intensityFromRound ramps 0→1 across party rounds 1..9', () => {
  assert.strictEqual(core.intensityFromRound({ round: 1, mode: 'party' }), 0);
  assert.strictEqual(core.intensityFromRound({ round: 5, mode: 'party' }), 0.5);
  assert.strictEqual(core.intensityFromRound({ round: 9, mode: 'party' }), 1);
  // After round 9 it's capped so deep parties don't break the contract.
  assert.strictEqual(core.intensityFromRound({ round: 20, mode: 'party' }), 1);
});

test('intensityFromRound is monotonic non-decreasing across party rounds', () => {
  let prev = -1;
  for (let r = 1; r <= 15; r++) {
    const v = core.intensityFromRound({ round: r, mode: 'party' });
    assert.ok(v >= prev, `round ${r} (=${v}) must be ≥ prev (${prev})`);
    assert.ok(v >= 0 && v <= 1, `round ${r} value ${v} out of [0,1]`);
    prev = v;
  }
});

test('chaosDelayRange at intensity 0 reproduces the 8-15s window', () => {
  const { minMs, spanMs } = core.chaosDelayRange(0);
  assert.strictEqual(minMs, 8000);
  assert.strictEqual(spanMs, 7000);
  assert.strictEqual(minMs + spanMs, 15000);
});

test('chaosDelayRange at intensity 1 tightens to a 4-8s window', () => {
  const { minMs, spanMs } = core.chaosDelayRange(1);
  assert.strictEqual(minMs, 4000);
  assert.strictEqual(spanMs, 4000);
  assert.strictEqual(minMs + spanMs, 8000);
});

test('swapWeight is 0 at intensity 0 and 0.15 at intensity 1', () => {
  assert.strictEqual(core.swapWeight(0), 0);
  assert.ok(Math.abs(core.swapWeight(1) - 0.15) < 1e-9);
  // Defensive: negative or >1 input clamps into [0, 0.15].
  assert.strictEqual(core.swapWeight(-2), 0);
  assert.ok(Math.abs(core.swapWeight(42) - 0.15) < 1e-9);
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
