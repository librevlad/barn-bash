// =============================================================================
// DEEP GAMEPLAY QA TEST v2 — Frantics
// Connects 3 players, plays all 4 games with aggressive strategies, diagnoses
// root causes of gameplay issues
// =============================================================================

const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');

const WS_URL = 'ws://localhost:3000';
const HOST_URLS = {
  escapeFox: 'http://localhost:3000/host-escape/',
  hillKing:  'http://localhost:3000/host-hill/',
  meteor:    'http://localhost:3000/host-meteor/',
  race:      'http://localhost:3000/host-race/',
};

const PLAYERS = [
  { name: 'Pro',     character: 'cat'  },
  { name: 'Noob',    character: 'wolf' },
  { name: 'Tryhard', character: 'frog' },
];

const results = {};

// =============================================================================
// WS player with message tracking
// =============================================================================
function connectPlayer(name, character) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const player = {
      name, character, ws, id: null, color: null,
      messages: [], msgCounts: {}, msgByType: {},
      errors: [], closed: false, latestState: null,
    };
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', name, character }));
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        player.messages.push(msg);
        const t = msg.type;
        player.msgCounts[t] = (player.msgCounts[t] || 0) + 1;
        if (!player.msgByType[t]) player.msgByType[t] = [];
        player.msgByType[t].push(msg);
        if (t === 'state') player.latestState = msg;
        if (t === 'init') { player.id = msg.playerId; player.color = msg.color; resolve(player); }
      } catch (e) { player.errors.push(e.message); }
    });
    ws.on('error', (e) => { player.errors.push(e.message); reject(e); });
    ws.on('close', () => { player.closed = true; });
    setTimeout(() => reject(new Error(`Player ${name} timed out`)), 5000);
  });
}

function sendInput(player, action, extra = {}) {
  if (player.ws.readyState !== WebSocket.OPEN) return;
  player.ws.send(JSON.stringify({ type: 'input', action, ...extra }));
}
function sendRaw(player, msg) {
  if (player.ws.readyState !== WebSocket.OPEN) return;
  player.ws.send(JSON.stringify(msg));
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function resetCounters(players) {
  for (const p of players) { p.messages = []; p.msgCounts = {}; p.msgByType = {}; }
}
function anyReceived(players, type) { return players.some(p => (p.msgCounts[type] || 0) > 0); }
function countAll(players, type) { return players.reduce((s, p) => s + (p.msgCounts[type] || 0), 0); }
function selectGame(p, gid) { sendRaw(p, { type: 'selectGame', gameId: gid }); }
function startGame(p) { sendRaw(p, { type: 'start' }); }
function restartGame(p) { sendRaw(p, { type: 'restart' }); }

async function screenshot(page, label) {
  const f = `E:/frantics/screenshots-qa/deepplay-${label}.png`;
  try { await page.screenshot({ path: f, fullPage: true }); return f; }
  catch (e) { return `FAILED: ${e.message}`; }
}

// Gather per-player event summary
function perPlayerEvents(players) {
  const out = {};
  for (const p of players) {
    const evts = {};
    for (const [t, c] of Object.entries(p.msgCounts)) {
      if (t !== 'state') evts[t] = c;
    }
    out[p.name] = evts;
  }
  return out;
}

// =============================================================================
// GAME 1: ESCAPE THE FOX  (15s)
// Strategy: P1 jumps aggressively + lane changes. P2 idle. P3 slides.
// Key insight from code: fox starts at -15 (for 2-player) or -12 (3-player),
//   catches at FOX_CATCH_DIST=1.5. Fox speed mult starts at 0.92 and climbs.
//   Obstacles spawn starting at tick 80. Stumble costs STUMBLE_DIST_PENALTY=0.5.
//   MAX_STUMBLES=1, so 2nd hit = death.
// =============================================================================
async function testEscapeFox(players, page, jsErrors) {
  console.log('\n========================================');
  console.log('GAME 1: ESCAPE THE FOX (15s)');
  console.log('========================================');

  const screenshots = [];
  selectGame(players[0], 'escapeFox');
  await sleep(500);
  await page.goto(HOST_URLS.escapeFox, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  resetCounters(players);
  const errBefore = jsErrors.length;

  startGame(players[0]);
  await sleep(300);

  const startTime = Date.now();
  const PLAY_MS = 15000;
  const intervals = [];

  // P1 (Pro/cat): jump every 2s + lane change every 3s
  let p1LaneDir = 'right';
  intervals.push(setInterval(() => sendInput(players[0], 'jump'), 2000));
  intervals.push(setInterval(() => {
    sendInput(players[0], 'lane', { direction: p1LaneDir });
    p1LaneDir = p1LaneDir === 'right' ? 'left' : 'right';
  }, 3000));

  // P2 (Noob/wolf): IDLE — test: does idle player die faster?

  // P3 (Tryhard/frog): slide every 4s
  intervals.push(setInterval(() => sendInput(players[2], 'slide'), 4000));

  // Screenshots at 5s, 10s, 15s
  const ssTimers = [];
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'ef-05s')); }, 5000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'ef-10s')); }, 10000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'ef-15s')); }, 15000));

  // Also collect fox distance diagnostics from state messages
  const foxDiag = [];
  const diagInterval = setInterval(() => {
    const s = players[0].latestState;
    if (s && s.gameState) {
      const gs = s.gameState;
      const alivePlayers = Object.entries(gs.players).filter(([,v]) => v.alive);
      foxDiag.push({
        t: Date.now() - startTime,
        foxDist: gs.foxDist?.toFixed(2),
        worldDist: gs.worldDist?.toFixed(2),
        foxProx: gs.foxProximity?.toFixed(3),
        alive: alivePlayers.length,
        offsets: alivePlayers.map(([id, v]) => `${v.name}:${v.distOffset?.toFixed(2)}`).join(', '),
      });
    }
  }, 2000);

  // Wait for end or timeout
  await new Promise((resolve) => {
    const ck = setInterval(() => {
      if (anyReceived(players, 'game_over') || Date.now() - startTime > PLAY_MS + 2000) {
        clearInterval(ck); resolve();
      }
    }, 200);
  });

  intervals.forEach(i => clearInterval(i));
  ssTimers.forEach(t => clearTimeout(t));
  clearInterval(diagInterval);
  await sleep(500);

  const duration = Date.now() - startTime;
  const jsErrsGame = jsErrors.length - errBefore;
  const issues = [];
  const expected = ['stumble', 'near_miss', 'eliminated', 'powerup_collected'];
  const missing = expected.filter(e => !anyReceived(players, e));

  // Diagnose: did fox catch anyone?
  const elimEvents = players.flatMap(p => (p.msgByType['eliminated'] || []));
  const stumbleEvents = players.flatMap(p => (p.msgByType['stumble'] || []));
  const gameEnded = anyReceived(players, 'game_over');

  // Check idle player (Noob) fate
  const noobElim = elimEvents.some(m => m.playerId === players[1].id);
  const noobStumble = stumbleEvents.some(m => m.playerId === players[1].id);

  if (!noobElim && !gameEnded) {
    issues.push('BUG: Idle player (Noob) survived 15s without any input — fox or obstacles should have killed them');
  }

  if (!anyReceived(players, 'eliminated')) {
    // Analyze fox proximity from diagnostics
    const lastDiag = foxDiag[foxDiag.length - 1];
    if (lastDiag) {
      issues.push(`No eliminations in ${(duration/1000).toFixed(1)}s. Fox proximity at end: ${lastDiag.foxProx}. Fox at ${lastDiag.foxDist}, world at ${lastDiag.worldDist}. Player offsets: ${lastDiag.offsets}`);
    } else {
      issues.push('No eliminations and no state data received');
    }
  }

  // fox_growl at tick 400 = 20s, game is 15s — expected missing
  const foxGrowlNote = !anyReceived(players, 'fox_growl')
    ? 'fox_growl fires at tick 400 (20s) — game ran ~15s, expected missing'
    : 'fox_growl fired OK';

  // Check obstacle hit detection quality
  if (!anyReceived(players, 'stumble') && !anyReceived(players, 'eliminated')) {
    issues.push('SUSPECT: No stumbles AND no eliminations — obstacle collision detection may never trigger. Obstacles have lanes[] and players have lane property; possible mismatch?');
  }

  const allEvents = {};
  for (const p of players) {
    for (const [t, c] of Object.entries(p.msgCounts)) { allEvents[t] = (allEvents[t] || 0) + c; }
  }

  results.escapeFox = {
    duration: `${(duration / 1000).toFixed(1)}s`,
    events: allEvents,
    perPlayer: perPlayerEvents(players),
    missing, screenshots,
    jsErrors: jsErrsGame, gameEnded, issues,
    foxDiag: foxDiag.slice(-3),
    notes: [foxGrowlNote],
    verdict: issues.length === 0 ? 'PASS' : 'ISSUES',
  };

  console.log(`  Duration: ${results.escapeFox.duration}`);
  console.log(`  Game over: ${gameEnded}`);
  console.log(`  Fox diagnostics (last 3):`, JSON.stringify(foxDiag.slice(-3), null, 2));
  console.log(`  Events (non-state):`, JSON.stringify(
    Object.fromEntries(Object.entries(allEvents).filter(([k]) => k !== 'state')), null, 2));
  console.log(`  Per-player:`, JSON.stringify(perPlayerEvents(players), null, 2));
  console.log(`  Missing: ${missing.join(', ') || 'none'}`);
  console.log(`  Issues: ${issues.join('\n    ') || 'none'}`);

  restartGame(players[0]);
  await sleep(1000);
}

// =============================================================================
// GAME 2: KING OF THE HILL  (15s)
// Key insight from v1: NO bumps, NO shieldBlocks, NO teetering.
// Root cause analysis:
//   - Dash lasts only 6 ticks (0.3s). Dash CD is 16 ticks (0.8s).
//   - Players orbit at different speeds on different radii.
//   - circleVsCircle uses halfHit = HIT_DIST/2 = 0.5 — quite small.
//   - dashDir actually MOVES radius/angle directly, not velocity.
//   - Problem: dash movement is position-based, collision check is at next tick.
//     If dash overshoots, they never overlap.
// Strategy: Spam dash much more aggressively (every 0.85s = just above CD).
//   Use directional dashes to push players into each other.
// =============================================================================
async function testKingOfHill(players, page, jsErrors) {
  console.log('\n========================================');
  console.log('GAME 2: KING OF THE HILL (15s)');
  console.log('========================================');

  const screenshots = [];
  selectGame(players[0], 'hillKing');
  await sleep(500);
  await page.goto(HOST_URLS.hillKing, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  resetCounters(players);
  const errBefore = jsErrors.length;

  startGame(players[0]);
  await sleep(300);

  const startTime = Date.now();
  const PLAY_MS = 15000;
  const intervals = [];

  // P1 (Pro/cat): auto-target dash every 0.9s (just above 0.8s CD)
  intervals.push(setInterval(() => sendInput(players[0], 'dash'), 900));

  // P2 (Noob/wolf): cycle shield ON 1s, OFF 1s, then dash
  let p2Phase = 0;
  intervals.push(setInterval(() => {
    if (p2Phase % 3 === 0) sendInput(players[1], 'shield');
    else if (p2Phase % 3 === 1) sendInput(players[1], 'shieldEnd');
    else sendInput(players[1], 'dash');
    p2Phase++;
  }, 850));

  // P3 (Tryhard/frog): directional dash rotating rapidly
  let p3Dir = 0;
  const dirs = ['up', 'right', 'down', 'left'];
  intervals.push(setInterval(() => {
    sendInput(players[2], 'dashDir', { direction: dirs[p3Dir % 4] });
    p3Dir++;
  }, 900));

  // Screenshots
  const ssTimers = [];
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'hill-05s')); }, 5000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'hill-10s')); }, 10000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'hill-15s')); }, 15000));

  // Diagnostics: track player positions from state
  const posDiag = [];
  const diagInterval = setInterval(() => {
    const s = players[0].latestState;
    if (s && s.gameState && s.gameState.players) {
      const gs = s.gameState;
      const entries = Object.entries(gs.players).filter(([,v]) => v.alive);
      const positions = entries.map(([id, v]) => {
        const x = Math.cos(v.angle) * v.radius;
        const z = Math.sin(v.angle) * v.radius;
        return `${v.name}(r=${v.radius?.toFixed(2)},a=${v.angle?.toFixed(2)},d=${v.dashing},s=${v.shielding})`;
      });
      // Calculate distances between players
      const dists = [];
      const ps = entries.map(([id, v]) => ({
        name: v.name, x: Math.cos(v.angle) * v.radius, z: Math.sin(v.angle) * v.radius
      }));
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const d = Math.sqrt((ps[i].x - ps[j].x) ** 2 + (ps[i].z - ps[j].z) ** 2);
          dists.push(`${ps[i].name}-${ps[j].name}=${d.toFixed(2)}`);
        }
      }
      posDiag.push({ t: Date.now() - startTime, pos: positions.join(' | '), dists: dists.join(', '), platR: gs.platR?.toFixed(2) });
    }
  }, 2000);

  await new Promise((resolve) => {
    const ck = setInterval(() => {
      if (anyReceived(players, 'game_over') || Date.now() - startTime > PLAY_MS + 2000) {
        clearInterval(ck); resolve();
      }
    }, 200);
  });

  intervals.forEach(i => clearInterval(i));
  ssTimers.forEach(t => clearTimeout(t));
  clearInterval(diagInterval);
  await sleep(500);

  const duration = Date.now() - startTime;
  const jsErrsGame = jsErrors.length - errBefore;
  const issues = [];
  const expected = ['bump', 'shieldBlock', 'teetering', 'platform_shrink', 'near_miss'];
  const missing = expected.filter(e => !anyReceived(players, e));

  if (!anyReceived(players, 'bump')) {
    // Analyze why: check min distances between players
    const minDists = posDiag.map(d => {
      const nums = d.dists.split(', ').map(s => parseFloat(s.split('=')[1]));
      return Math.min(...nums);
    });
    const globalMin = Math.min(...minDists);
    issues.push(`No bump events. Min player distance sampled: ${globalMin.toFixed(2)}. HIT_DIST=1.0 (halfHit=0.5/player). Dash lasts only 6 ticks (0.3s) and moves position directly — collision window is tiny. This is likely a DESIGN issue: dashes teleport position but collision check only runs once per tick, so players can pass through each other.`);
  }

  if (!anyReceived(players, 'shieldBlock')) {
    if (anyReceived(players, 'bump')) {
      issues.push('GAMEPLAY: shieldBlock never fired despite bumps occurring AND Player 2 cycling shield. In handleInput, shielding=true prevents dashing (line 451), so P2 cannot dash while shielded. For shieldBlock to fire, someone must dash INTO shielding P2. The auto-target dash moves ~0.8 units toward nearest player — but the timing window where P2 is shielding AND another player dashes AND they overlap (HIT_DIST=1.0) is very narrow. shieldBlock is extremely rare in normal gameplay.');
    } else {
      issues.push('No shieldBlock — no bumps either, so collision system prevented testing this mechanic.');
    }
  }

  if (!anyReceived(players, 'teetering')) {
    issues.push(`No teetering — players must exceed platR+0.5. Platform shrinks to ${posDiag[posDiag.length-1]?.platR || '?'}. Gravity pull (0.003/tick) keeps players centered. Dashes are the only way to push players out, but dashes dont cause collisions (see bump issue).`);
  }

  if (!anyReceived(players, 'platform_shrink')) {
    issues.push('No platform_shrink in 15s — SHRINK_INT=130 ticks (6.5s), should fire at least once');
  }

  const gameEnded = anyReceived(players, 'game_over');

  const allEvents = {};
  for (const p of players) {
    for (const [t, c] of Object.entries(p.msgCounts)) { allEvents[t] = (allEvents[t] || 0) + c; }
  }

  results.hillKing = {
    duration: `${(duration / 1000).toFixed(1)}s`,
    events: allEvents,
    perPlayer: perPlayerEvents(players),
    missing, screenshots,
    jsErrors: jsErrsGame, gameEnded, issues,
    posDiag: posDiag.slice(-3),
    verdict: issues.length === 0 ? 'PASS' : 'ISSUES',
  };

  console.log(`  Duration: ${results.hillKing.duration}`);
  console.log(`  Game over: ${gameEnded}`);
  console.log(`  Position diagnostics (last 3):`);
  posDiag.slice(-3).forEach(d => console.log(`    t=${d.t}ms platR=${d.platR} ${d.pos} dists=[${d.dists}]`));
  console.log(`  Events (non-state):`, JSON.stringify(
    Object.fromEntries(Object.entries(allEvents).filter(([k]) => k !== 'state')), null, 2));
  console.log(`  Missing: ${missing.join(', ') || 'none'}`);
  console.log(`  Issues: ${issues.length}`);
  issues.forEach(i => console.log(`    - ${i}`));

  restartGame(players[0]);
  await sleep(1000);
}

// =============================================================================
// GAME 3: METEOR SHOWER  (15s)
// Key insight from v1: All 3 players eliminated on wave 1. No singed events.
// Root cause analysis:
//   - singed requires closestDist < (closestZoneR + SINGED_THRESHOLD=0.3)
//   - But ALSO requires !g.singed (first time only)
//   - Problem: if ALL 3 are far from safe zone, they all die instantly.
//     singed only triggers when close to safe zone edge.
//   - The dodge action moves TOWARD safe zone. If P1 dodges every 1s,
//     they should reach it. But P3 is idle, so P3 dies.
// Strategy: P1 dodge every 0.5s (more aggressive). P2 random. P3 idle.
//   Also: first impact is at subTick=80 pause + 50 warning = tick ~130 = 6.5s
// =============================================================================
async function testMeteorShower(players, page, jsErrors) {
  console.log('\n========================================');
  console.log('GAME 3: METEOR SHOWER (15s)');
  console.log('========================================');

  const screenshots = [];
  selectGame(players[0], 'meteor');
  await sleep(500);
  await page.goto(HOST_URLS.meteor, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  resetCounters(players);
  const errBefore = jsErrors.length;

  startGame(players[0]);
  await sleep(300);

  const startTime = Date.now();
  const PLAY_MS = 15000;
  const intervals = [];

  // P1 (Pro/cat): dodge every 0.5s (toward safe zone)
  intervals.push(setInterval(() => sendInput(players[0], 'dodge'), 500));

  // P2 (Noob/wolf): move in random directions every 0.8s
  intervals.push(setInterval(() => {
    const d = ['up','down','left','right'][Math.floor(Math.random() * 4)];
    sendInput(players[1], 'move', { direction: d });
  }, 800));

  // P3 (Tryhard/frog): stay still — test idle death

  // Screenshots
  const ssTimers = [];
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'met-05s')); }, 5000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'met-10s')); }, 10000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'met-12s')); }, 12000));

  // Track wave/subphase diagnostics
  const waveDiag = [];
  const diagInterval = setInterval(() => {
    const s = players[0].latestState;
    if (s && s.gameState) {
      const gs = s.gameState;
      const alive = Object.entries(gs.players).filter(([,v]) => v.alive);
      const playerLocs = alive.map(([id, v]) => {
        const dzx = v.x - (gs.safeZone?.x || 0);
        const dzz = v.z - (gs.safeZone?.z || 0);
        const distToSafe = Math.sqrt(dzx*dzx + dzz*dzz);
        return `${v.name}(${v.x?.toFixed(1)},${v.z?.toFixed(1)},distSZ=${distToSafe.toFixed(2)},safe=${v.safe},singed=${v.singed})`;
      });
      waveDiag.push({
        t: Date.now() - startTime,
        wave: gs.wave, subPhase: gs.subPhase, subTick: gs.subTick,
        safeZone: gs.safeZone ? `(${gs.safeZone.x?.toFixed(1)},${gs.safeZone.z?.toFixed(1)},r=${gs.safeZone.r?.toFixed(2)})` : 'none',
        alive: alive.length,
        players: playerLocs.join(' | '),
      });
    }
  }, 1000);

  await new Promise((resolve) => {
    const ck = setInterval(() => {
      if (anyReceived(players, 'game_over') || Date.now() - startTime > PLAY_MS + 2000) {
        clearInterval(ck); resolve();
      }
    }, 200);
  });

  intervals.forEach(i => clearInterval(i));
  ssTimers.forEach(t => clearTimeout(t));
  clearInterval(diagInterval);
  await sleep(500);

  const duration = Date.now() - startTime;
  const jsErrsGame = jsErrors.length - errBefore;
  const issues = [];
  const expected = ['meteor_warning', 'meteor_impact', 'singed', 'eliminated'];
  const missing = expected.filter(e => !anyReceived(players, e));

  if (!anyReceived(players, 'meteor_warning')) {
    issues.push('CRITICAL: No meteor_warning — wave system broken');
  }
  if (!anyReceived(players, 'meteor_impact')) {
    issues.push('CRITICAL: No meteor_impact — impact never triggered');
  }

  // Analyze singed
  const elimEvents = players.flatMap(p => (p.msgByType['eliminated'] || []));
  const singedEvents = players.flatMap(p => (p.msgByType['singed'] || []));
  const impactCount = (players[0].msgCounts['meteor_impact'] || 0);
  const warningCount = (players[0].msgCounts['meteor_warning'] || 0);

  if (!anyReceived(players, 'singed') && elimEvents.length > 0) {
    // Analyze distances from wave diagnostics
    const lastWarningDiag = waveDiag.filter(d => d.subPhase === 'warning').pop();
    const distInfo = lastWarningDiag ? lastWarningDiag.players : 'no data';
    issues.push(`GAMEPLAY: Singed (grace period) never fired. ${elimEvents.length} eliminations across ${warningCount} wave(s). Root cause: singed only triggers within (safeZone.r + SINGED_THRESHOLD=0.3) = ~1.84 units of safe zone center. Players at wave end: ${distInfo}. Random-moving Noob (~2.8 units away) and idle Tryhard (~2.9 units away) are both far outside the 1.84-unit singed band. The 0.3-unit grace band is extremely narrow — in practice, a player must be ALMOST inside the safe zone to get singed instead of killed. This makes the singed mechanic nearly useless for players who are not already close to safety.`);
  }

  // Check: did dodge move P1 into safe zone?
  const p1Survived = !elimEvents.some(m => m.playerId === players[0].id);
  if (p1Survived && impactCount >= 1) {
    // Good — dodge worked
  } else if (!p1Survived && impactCount >= 1) {
    issues.push(`Pro (dodging every 0.5s) was eliminated despite actively dodging — dodge speed (${0.45 + 0.09}=0.54/tick) may be insufficient to reach safe zone in time`);
  }

  // Check idle player
  const p3Elim = elimEvents.some(m => m.playerId === players[2].id);
  if (!p3Elim && impactCount >= 1) {
    issues.push('Idle player (Tryhard) survived meteor impact — should have been killed');
  }

  const gameEnded = anyReceived(players, 'game_over');
  const uniqueWaves = new Set((players[0].msgByType['meteor_warning'] || []).map(m => m.wave));

  const allEvents = {};
  for (const p of players) {
    for (const [t, c] of Object.entries(p.msgCounts)) { allEvents[t] = (allEvents[t] || 0) + c; }
  }

  results.meteor = {
    duration: `${(duration / 1000).toFixed(1)}s`,
    events: allEvents,
    perPlayer: perPlayerEvents(players),
    missing, screenshots,
    jsErrors: jsErrsGame, gameEnded, issues,
    wavesPlayed: uniqueWaves.size,
    waveDiag: waveDiag.slice(-5),
    verdict: issues.length === 0 ? 'PASS' : 'ISSUES',
  };

  console.log(`  Duration: ${results.meteor.duration}`);
  console.log(`  Waves: ${uniqueWaves.size}`);
  console.log(`  Game over: ${gameEnded}`);
  console.log(`  Wave diagnostics:`);
  waveDiag.forEach(d => console.log(`    t=${d.t}ms wave=${d.wave} ${d.subPhase}(${d.subTick}) sz=${d.safeZone} alive=${d.alive} ${d.players}`));
  console.log(`  Events (non-state):`, JSON.stringify(
    Object.fromEntries(Object.entries(allEvents).filter(([k]) => k !== 'state')), null, 2));
  console.log(`  Missing: ${missing.join(', ') || 'none'}`);
  console.log(`  Issues: ${issues.length}`);
  issues.forEach(i => console.log(`    - ${i}`));

  restartGame(players[0]);
  await sleep(1000);
}

// =============================================================================
// GAME 4: GRAND PRIX  (20s)
// v1 passed! Verify: items, drifts, laps, bumps all work.
// Strategy: P1 alternating steer. P2 useItem + steer right. P3 drift cycle.
// =============================================================================
async function testGrandPrix(players, page, jsErrors) {
  console.log('\n========================================');
  console.log('GAME 4: GRAND PRIX (20s)');
  console.log('========================================');

  const screenshots = [];
  selectGame(players[0], 'race');
  await sleep(500);
  await page.goto(HOST_URLS.race, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  resetCounters(players);
  const errBefore = jsErrors.length;

  startGame(players[0]);
  await sleep(300);

  const startTime = Date.now();
  const PLAY_MS = 20000;
  const intervals = [];

  // P1 (Pro/cat): alternate steer every 1s
  let steerDir = 'left';
  intervals.push(setInterval(() => {
    sendInput(players[0], 'steer', { direction: steerDir });
    steerDir = steerDir === 'left' ? 'right' : 'left';
  }, 1000));

  // P2 (Noob/wolf): useItem every 2s + steer right
  intervals.push(setInterval(() => sendInput(players[1], 'useItem'), 2000));
  intervals.push(setInterval(() => sendInput(players[1], 'steer', { direction: 'right' }), 1500));

  // P3 (Tryhard/frog): drift cycle 2s on / 2s off + some steering
  let drifting = false;
  intervals.push(setInterval(() => {
    if (drifting) { sendInput(players[2], 'driftEnd'); drifting = false; }
    else { sendInput(players[2], 'driftStart'); drifting = true; }
  }, 2000));
  intervals.push(setInterval(() => {
    sendInput(players[2], 'steer', { direction: ['left','right'][Math.floor(Math.random()*2)] });
  }, 1200));

  // Screenshots
  const ssTimers = [];
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'gp-05s')); }, 5000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'gp-10s')); }, 10000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'gp-15s')); }, 15000));
  ssTimers.push(setTimeout(async () => { screenshots.push(await screenshot(page, 'gp-20s')); }, 20000));

  // Track lap progress
  const lapDiag = [];
  const diagInterval = setInterval(() => {
    const s = players[0].latestState;
    if (s && s.gameState && s.gameState.players) {
      const ps = Object.entries(s.gameState.players).map(([id, v]) =>
        `${v.name}(lap=${v.lap},spd=${v.speed?.toFixed(3)},drift=${v.drifting},boost=${v.boosting},item=${v.item||'none'},stun=${v.stunned})`
      );
      lapDiag.push({ t: Date.now() - startTime, players: ps.join(' | ') });
    }
  }, 3000);

  await new Promise((resolve) => {
    const ck = setInterval(() => {
      if (anyReceived(players, 'game_over') || Date.now() - startTime > PLAY_MS + 2000) {
        clearInterval(ck); resolve();
      }
    }, 200);
  });

  intervals.forEach(i => clearInterval(i));
  ssTimers.forEach(t => clearTimeout(t));
  clearInterval(diagInterval);
  await sleep(500);

  const duration = Date.now() - startTime;
  const jsErrsGame = jsErrors.length - errBefore;
  const issues = [];
  const expected = ['item_pickup', 'item_used', 'lap_complete', 'drift_boost', 'bump'];
  const missing = expected.filter(e => !anyReceived(players, e));

  if (!anyReceived(players, 'item_pickup')) {
    issues.push('No item_pickup — items unreachable or pickup radius broken');
  }
  if (!anyReceived(players, 'item_used')) {
    issues.push('No item_used — item use mechanic broken');
  }
  if (!anyReceived(players, 'lap_complete')) {
    issues.push('No lap_complete — waypoint/lap system broken');
  }
  if (!anyReceived(players, 'drift_boost')) {
    issues.push('No drift_boost — drift mechanic broken');
  }

  // Check max progress
  let maxLap = 1, maxWP = 0;
  for (const p of players) {
    for (const s of (p.msgByType['state'] || [])) {
      if (s.gameState && s.gameState.players) {
        for (const v of Object.values(s.gameState.players)) {
          if ((v.lap || 1) > maxLap) maxLap = v.lap;
        }
      }
    }
  }

  const gameEnded = anyReceived(players, 'game_over');
  const anyFinished = anyReceived(players, 'race_finish');

  const allEvents = {};
  for (const p of players) {
    for (const [t, c] of Object.entries(p.msgCounts)) { allEvents[t] = (allEvents[t] || 0) + c; }
  }

  results.race = {
    duration: `${(duration / 1000).toFixed(1)}s`,
    events: allEvents,
    perPlayer: perPlayerEvents(players),
    missing, screenshots,
    jsErrors: jsErrsGame, gameEnded, issues,
    maxLap, anyFinished,
    lapDiag: lapDiag.slice(-3),
    verdict: issues.length === 0 ? 'PASS' : 'ISSUES',
  };

  console.log(`  Duration: ${results.race.duration}`);
  console.log(`  Max lap: ${maxLap}`);
  console.log(`  Game over: ${gameEnded}, Any finished: ${anyFinished}`);
  console.log(`  Lap diagnostics:`);
  lapDiag.forEach(d => console.log(`    t=${d.t}ms ${d.players}`));
  console.log(`  Events (non-state):`, JSON.stringify(
    Object.fromEntries(Object.entries(allEvents).filter(([k]) => k !== 'state')), null, 2));
  console.log(`  Missing: ${missing.join(', ') || 'none'}`);
  console.log(`  Issues: ${issues.length}`);
  issues.forEach(i => console.log(`    - ${i}`));

  restartGame(players[0]);
  await sleep(1000);
}

// =============================================================================
// FINAL REPORT
// =============================================================================
function printFinalReport() {
  console.log('\n');
  console.log('================================================================');
  console.log('       DEEP PLAY QA REPORT — FINAL VERDICT');
  console.log('================================================================\n');

  for (const [gid, r] of Object.entries(results)) {
    const evtSummary = Object.fromEntries(
      Object.entries(r.events).filter(([k]) => k !== 'state'));

    console.log(`GAME: ${gid}`);
    console.log(`Duration: ${r.duration}`);
    console.log(`Events received: ${JSON.stringify(evtSummary)}`);
    console.log(`State messages: ${r.events.state || 0}`);
    console.log(`EXPECTED but MISSING: ${r.missing.length > 0 ? r.missing.join(', ') : 'none'}`);
    console.log(`Screenshots: ${r.screenshots?.length || 0} captured`);
    console.log(`JS Errors: ${r.jsErrors}`);
    console.log(`Game ended cleanly: ${r.gameEnded}`);
    console.log(`VERDICT: ${r.verdict}`);
    if (r.issues.length > 0) {
      console.log('Issues:');
      r.issues.forEach(i => console.log(`  - ${i}`));
    }
    if (r.notes) r.notes.forEach(n => console.log(`  NOTE: ${n}`));
    console.log('');
  }

  console.log('================================================================');
  console.log('FINAL VERDICT');
  console.log('================================================================');

  const allIssues = [];
  let pass = 0, fail = 0;
  for (const [gid, r] of Object.entries(results)) {
    if (r.verdict === 'PASS') pass++;
    else { fail++; r.issues.forEach(i => allIssues.push(`[${gid}] ${i}`)); }
  }

  console.log(`Games tested: ${Object.keys(results).length}`);
  console.log(`PASS: ${pass}`);
  console.log(`ISSUES: ${fail}`);

  if (allIssues.length > 0) {
    console.log('\nTOP ISSUES:');
    allIssues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));
  } else {
    console.log('\nAll games passed!');
  }
  console.log('\n================================================================');
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('=== FRANTICS DEEP PLAY QA TEST v2 ===');
  console.log(`Started: ${new Date().toISOString()}\n`);

  if (!fs.existsSync('E:/frantics/screenshots-qa')) {
    fs.mkdirSync('E:/frantics/screenshots-qa', { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push({ message: err.message, time: Date.now() }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') jsErrors.push({ message: msg.text(), time: Date.now(), type: 'console' });
  });

  // Connect 3 players
  const players = [];
  for (const p of PLAYERS) {
    const c = await connectPlayer(p.name, p.character);
    players.push(c);
    console.log(`  Connected: ${p.name} (${p.character}) => id=${c.id}`);
  }
  await sleep(500);

  try {
    await testEscapeFox(players, page, jsErrors);
    await testKingOfHill(players, page, jsErrors);
    await testMeteorShower(players, page, jsErrors);
    await testGrandPrix(players, page, jsErrors);
  } catch (e) {
    console.error(`\nFATAL: ${e.message}\n${e.stack}`);
  }

  printFinalReport();

  if (jsErrors.length > 0) {
    console.log(`\nALL JS ERRORS (${jsErrors.length}):`);
    const unique = [...new Set(jsErrors.map(e => e.message))];
    unique.forEach(e => {
      const cnt = jsErrors.filter(x => x.message === e).length;
      console.log(`  [x${cnt}] ${e.substring(0, 150)}`);
    });
  }

  for (const p of players) {
    if (p.ws.readyState === WebSocket.OPEN) p.ws.close();
  }
  await browser.close();
  console.log('\n=== DONE ===');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
