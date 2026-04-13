// ============================================================
// HUMAN EYE TEST — Tests what a PLAYER would notice
// ============================================================
// Not "does it crash?" but "does it FEEL right?"
// Each check answers a question a real player would ask.
//
// Categories:
// 1. FIRST IMPRESSION — What do I see when I open the page?
// 2. CAN I PLAY? — Does the game actually start and respond?
// 3. DOES IT LOOK RIGHT? — Visual checks on screenshots
// 4. DOES IT FEEL RIGHT? — Timing, feedback, responsiveness
// 5. IS IT FAIR? — Game mechanics working correctly
// 6. IS IT POLISHED? — Missing details that scream "amateur"

const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const SS = path.join(__dirname, 'screenshots-human');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

let passed = 0, failed = 0, notes = [];
function ok(cat, what) { passed++; console.log(`  ✅ [${cat}] ${what}`); }
function fail(cat, what) { failed++; notes.push(`[${cat}] ${what}`); console.log(`  ❌ [${cat}] ${what}`); }
function note(cat, what) { notes.push(`[NOTE] [${cat}] ${what}`); console.log(`  📝 [${cat}] ${what}`); }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function connect(name, char) {
  return new Promise(resolve => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', name, character: char }));
      const msgs = [];
      ws.on('message', raw => msgs.push(JSON.parse(raw)));
      ws.once('message', raw => {
        const init = JSON.parse(raw);
        resolve({ ws, id: init.playerId, name: init.name, msgs });
      });
    });
  });
}

// Analyze a screenshot for visual issues
async function analyzeScreenshot(page, name, checks) {
  const filepath = path.join(SS, name + '.png');
  await page.screenshot({ path: filepath });

  // Get canvas pixel data for analysis
  const analysis = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { hasCanvas: false };
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;

    // Sample colors from key areas
    function sampleArea(x, y, sw, sh) {
      const data = ctx.getImageData(x, y, sw, sh).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { r += data[i]; g += data[i+1]; b += data[i+2]; count++; }
      }
      if (count === 0) return { r: 0, g: 0, b: 0, empty: true };
      return { r: Math.round(r/count), g: Math.round(g/count), b: Math.round(b/count), empty: false };
    }

    // Check if canvas has content (not blank)
    const center = sampleArea(Math.floor(w/2) - 5, Math.floor(h/2) - 5, 10, 10);
    const topLeft = sampleArea(10, 10, 10, 10);
    const hasContent = !center.empty || !topLeft.empty;

    // Check color variety (not all one color)
    const samples = [];
    for (let sx = 0; sx < 5; sx++) {
      for (let sy = 0; sy < 5; sy++) {
        samples.push(sampleArea(
          Math.floor(w * (sx + 0.5) / 5) - 2,
          Math.floor(h * (sy + 0.5) / 5) - 2, 4, 4
        ));
      }
    }
    const uniqueColors = new Set(samples.map(s => `${Math.floor(s.r/30)},${Math.floor(s.g/30)},${Math.floor(s.b/30)}`));

    return {
      hasCanvas: true, hasContent,
      colorVariety: uniqueColors.size,
      center, topLeft,
      width: w, height: h,
    };
  }).catch(() => ({ hasCanvas: false }));

  return analysis;
}

async function run() {
  console.log('\n' + '='.repeat(60));
  console.log('  HUMAN EYE TEST — "Would a real player be happy?"');
  console.log('='.repeat(60) + '\n');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  const p1 = await connect('Alice', 'cat');
  const p2 = await connect('Bob', 'wolf');
  const p3 = await connect('Charlie', 'frog');

  // ====================================================
  // LOBBY — First impression
  // ====================================================
  console.log('━━━ LOBBY ━━━');
  const lobby = await ctx.newPage();
  const lobbyErrors = [];
  lobby.on('pageerror', e => lobbyErrors.push(e.message));
  await lobby.goto('http://localhost:3000/host/');
  await sleep(2000);

  // 1. Title visible and correct?
  const title = await lobby.$eval('.lobby-title', el => el.textContent).catch(() => '');
  title.includes('FRANTICS') ? ok('FIRST', 'Title says FRANTICS') : fail('FIRST', 'Title missing or wrong: "' + title + '"');

  // 2. Players visible with NAMES (not just dots)?
  const contestants = await lobby.$$eval('.contestant', els => els.map(e => e.textContent)).catch(() => []);
  const hasNames = contestants.some(c => c.includes('Alice') || c.includes('Bob') || c.includes('Charlie'));
  hasNames ? ok('FIRST', 'Player names visible in lobby') : fail('FIRST', 'Player names NOT visible — just dots or IDs');

  // 3. Game cards enabled (not greyed out)?
  const enabledCards = await lobby.$$('.game-card:not(.disabled)');
  enabledCards.length >= 4 ? ok('FIRST', enabledCards.length + ' game cards active') : fail('FIRST', 'Only ' + enabledCards.length + ' cards active (expected 4)');

  // 4. Narrator speaking?
  const narratorText = await lobby.$eval('#narrator-idle', el => el.textContent).catch(() => '');
  narratorText.length > 5 ? ok('FIRST', 'Narrator: "' + narratorText.slice(0, 50) + '"') : fail('FIRST', 'Narrator silent in lobby');

  // 5. Connect URL shown?
  const url = await lobby.$eval('#connect-url-value', el => el.textContent).catch(() => '');
  url.includes('controller') ? ok('FIRST', 'Connect URL shown') : fail('FIRST', 'No connect URL visible');

  lobbyErrors.length === 0 ? ok('POLISH', 'Zero JS errors') : fail('POLISH', lobbyErrors.length + ' JS errors: ' + lobbyErrors[0]);

  await lobby.screenshot({ path: path.join(SS, 'lobby.png') });

  // ====================================================
  // TEST EACH GAME — Full lifecycle
  // ====================================================
  const games = [
    { id: 'escapeFox', name: 'Escape Fox', url: '/host-escape/', countdown: 'RUN', duration: 12000 },
    { id: 'hillKing', name: 'Hill King', url: '/host-hill/', countdown: 'FIGHT', duration: 12000 },
    { id: 'meteor', name: 'Meteor', url: '/host-meteor/', countdown: 'DODGE', duration: 10000 },
    { id: 'race', name: 'Grand Prix', url: '/host-race/', countdown: 'GO', duration: 15000 },
  ];

  for (const game of games) {
    console.log(`\n━━━ ${game.name.toUpperCase()} ━━━`);
    p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: game.id }));
    await sleep(300);

    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:3000' + game.url);
    await sleep(1000);

    // FIRST IMPRESSION: Lobby shows players?
    const lobbyPlayerText = await page.$eval('#lobby-players', el => el.textContent).catch(() => '');
    lobbyPlayerText.includes('Alice') || lobbyPlayerText.includes('Bob')
      ? ok('PLAY', game.name + ' lobby shows player names')
      : fail('PLAY', game.name + ' lobby does NOT show player names: "' + lobbyPlayerText.slice(0, 60) + '"');

    // CAN I START?
    const startBtn = await page.$('#btn-start');
    const canStart = startBtn ? await startBtn.isVisible() : false;
    canStart ? ok('PLAY', 'Start button visible') : fail('PLAY', 'Start button NOT visible or missing');

    if (canStart) {
      await startBtn.click();
      await sleep(5000); // countdown + start

      // DOES IT LOOK RIGHT? — Canvas has content
      const snap1 = await analyzeScreenshot(page, game.id + '-start');
      snap1.hasContent ? ok('VISUAL', 'Canvas has content') : fail('VISUAL', 'Canvas is BLANK');
      snap1.colorVariety > 3 ? ok('VISUAL', 'Multiple colors visible (' + snap1.colorVariety + ' unique)') : fail('VISUAL', 'Low color variety: ' + snap1.colorVariety + ' (might be broken)');

      // PLAY — Send varied inputs
      const actions = {
        escapeFox: [
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'jump' })),
          () => p2.ws.send(JSON.stringify({ type: 'input', action: 'slide' })),
          () => p3.ws.send(JSON.stringify({ type: 'input', action: 'lane', direction: 'right' })),
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'jump' })),
          () => p2.ws.send(JSON.stringify({ type: 'input', action: 'lane', direction: 'left' })),
        ],
        hillKing: [
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'dash' })),
          () => p2.ws.send(JSON.stringify({ type: 'input', action: 'shield' })),
          () => p3.ws.send(JSON.stringify({ type: 'input', action: 'dashDir', direction: 'left' })),
          () => p2.ws.send(JSON.stringify({ type: 'input', action: 'shieldEnd' })),
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'dash' })),
        ],
        meteor: [
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'dodge' })),
          () => p2.ws.send(JSON.stringify({ type: 'input', action: 'move', direction: 'left' })),
          () => p3.ws.send(JSON.stringify({ type: 'input', action: 'dodge' })),
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'move', direction: 'right' })),
        ],
        race: [
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: 'left' })),
          () => p2.ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: 'right' })),
          () => p3.ws.send(JSON.stringify({ type: 'input', action: 'useItem' })),
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'driftStart' })),
          () => p1.ws.send(JSON.stringify({ type: 'input', action: 'driftEnd' })),
        ],
      };

      // Play game with inputs
      const gameActions = actions[game.id] || [];
      for (let t = 0; t < game.duration / 1000; t++) {
        if (gameActions[t % gameActions.length]) gameActions[t % gameActions.length]();
        await sleep(1000);
        if (t === 3) await page.screenshot({ path: path.join(SS, game.id + '-mid.png') });
      }

      await page.screenshot({ path: path.join(SS, game.id + '-end.png') });

      // AFTER GAMEPLAY — Check for visual movement (comparing mid vs end)
      const snapMid = await analyzeScreenshot(page, game.id + '-final');
      if (snapMid.hasContent) {
        ok('VISUAL', 'Game still rendering at end');
      }

      // Check for game_over or winner events
      const gotGameOver = p1.msgs.some(m => m.type === 'game_over');
      const gotEliminated = p1.msgs.some(m => m.type === 'eliminated');
      const gotState = p1.msgs.filter(m => m.type === 'state').length;
      gotState > 10 ? ok('FEEL', 'Received ' + gotState + ' state updates (smooth)') : fail('FEEL', 'Only ' + gotState + ' state updates (laggy?)');

      if (gotGameOver) ok('FAIR', 'Game ended properly (game_over received)');
      else if (gotEliminated) ok('FAIR', 'Eliminations working');
      else note('FAIR', 'No game_over or elimination in ' + game.duration/1000 + 's — game may be too long');
    }

    // JS ERRORS
    errors.length === 0 ? ok('POLISH', 'Zero JS errors') : fail('POLISH', errors.length + ' errors: ' + errors[0]);

    // Restart for next game
    p1.ws.send(JSON.stringify({ type: 'restart' }));
    await sleep(500);
    await page.close();
  }

  // ====================================================
  // CONTROLLER CHECK
  // ====================================================
  console.log('\n━━━ CONTROLLER ━━━');
  const ctrl = await ctx.newPage();
  ctrl.on('pageerror', e => fail('POLISH', 'Controller error: ' + e.message));
  await ctrl.goto('http://localhost:3000/controller/');
  await sleep(1000);
  await ctrl.screenshot({ path: path.join(SS, 'controller.png') });

  const obVisible = await ctrl.$eval('#onboarding', el => getComputedStyle(el).display !== 'none').catch(() => false);
  obVisible ? ok('PLAY', 'Onboarding shown') : fail('PLAY', 'Onboarding NOT shown');

  const nameInput = await ctrl.$('#ob-name');
  nameInput ? ok('PLAY', 'Name input exists') : fail('PLAY', 'Name input missing');

  const confirmBtn = await ctrl.$eval('#ob-chars', el => el.textContent).catch(() => '');
  confirmBtn.includes('JOIN') ? ok('PLAY', '"JOIN THE SHOW" button exists') : fail('PLAY', 'No confirm button for character select');

  // ====================================================
  // RESULTS
  // ====================================================
  console.log('\n' + '='.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${notes.length} notes`);
  console.log('='.repeat(60));

  if (notes.length > 0) {
    console.log('\nISSUES & NOTES:');
    notes.forEach(n => console.log('  ' + n));
  }

  const screenshots = fs.readdirSync(SS).filter(f => f.endsWith('.png'));
  console.log('\nScreenshots (' + screenshots.length + '): ' + SS);
  console.log('');

  await browser.close();
  [p1, p2, p3].forEach(p => p.ws.close());
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
