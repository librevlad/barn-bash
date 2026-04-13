// ============================================================
// FULL QA TEST — All 4 games, every aspect
// ============================================================
const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SS = path.join(__dirname, 'screenshots-qa');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

let passed = 0, failed = 0, warnings = 0;
const issues = [];

function ok(label) { passed++; console.log(`  ✅ ${label}`); }
function fail(label) { failed++; issues.push(label); console.log(`  ❌ ${label}`); }
function warn(label) { warnings++; console.log(`  ⚠️  ${label}`); }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function wsConnect(name, character) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', name, character }));
      ws.once('message', (raw) => {
        const msg = JSON.parse(raw);
        resolve({ ws, id: msg.playerId, color: msg.color, name: msg.name });
      });
    });
  });
}

function collectMessages(ws, durationMs) {
  return new Promise(resolve => {
    const msgs = [];
    const handler = raw => msgs.push(JSON.parse(raw));
    ws.on('message', handler);
    setTimeout(() => { ws.off('message', handler); resolve(msgs); }, durationMs);
  });
}

async function run() {
  console.log('\n========================================');
  console.log('  FRANTICS — FULL QA TEST');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  // Connect 3 players
  const p1 = await wsConnect('Alice', 'cat');
  const p2 = await wsConnect('Bob', 'wolf');
  const p3 = await wsConnect('Charlie', 'frog');
  console.log('Players: Alice(cat), Bob(wolf), Charlie(frog)\n');

  // ========================================
  // 1. LOBBY
  // ========================================
  console.log('--- 1. LOBBY ---');
  const lobbyPage = await context.newPage();
  lobbyPage.on('pageerror', err => fail('Lobby JS error: ' + err.message));
  await lobbyPage.goto(BASE + '/host/');
  await sleep(1500);
  await lobbyPage.screenshot({ path: path.join(SS, 'full-01-lobby.png') });

  const title = await lobbyPage.textContent('.lobby-title').catch(() => null);
  title && title.includes('FRANTICS') ? ok('Lobby title: ' + title) : fail('Lobby title missing');

  const contestants = await lobbyPage.$$('.contestant');
  contestants.length >= 3 ? ok('3 contestants shown') : fail('Expected 3 contestants, got ' + contestants.length);

  const gameCards = await lobbyPage.$$('.game-card:not(.disabled)');
  gameCards.length >= 4 ? ok('4 game cards enabled') : fail('Expected 4 game cards, got ' + gameCards.length);

  const narrator = await lobbyPage.textContent('#narrator-idle').catch(() => '');
  narrator ? ok('Narrator active: ' + narrator.slice(0, 40)) : warn('No narrator idle text');

  // ========================================
  // 2. CONTROLLER ONBOARDING
  // ========================================
  console.log('\n--- 2. CONTROLLER ---');
  const ctrlPage = await context.newPage();
  ctrlPage.on('pageerror', err => fail('Controller JS error: ' + err.message));
  await ctrlPage.goto(BASE + '/controller/');
  await sleep(1000);
  await ctrlPage.screenshot({ path: path.join(SS, 'full-02-controller.png') });

  const onboarding = await ctrlPage.$('#onboarding');
  const obVisible = onboarding ? await onboarding.isVisible() : false;
  obVisible ? ok('Onboarding visible') : fail('Onboarding not visible');

  const nameInput = await ctrlPage.$('#ob-name');
  nameInput ? ok('Name input exists') : fail('Name input missing');

  const charBtns = await ctrlPage.$$('#ob-chars button');
  charBtns.length === 3 ? ok('3 character buttons') : fail('Expected 3 char buttons, got ' + charBtns.length);

  // ========================================
  // 3. ESCAPE THE FOX
  // ========================================
  console.log('\n--- 3. ESCAPE THE FOX ---');
  // Select game
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'escapeFox' }));
  await sleep(300);

  const escapePage = await context.newPage();
  const escapeErrors = [];
  escapePage.on('pageerror', err => escapeErrors.push(err.message));
  await escapePage.goto(BASE + '/host-escape/');
  await sleep(1000);
  await escapePage.screenshot({ path: path.join(SS, 'full-03-escape-lobby.png') });

  const escLobby = await escapePage.$('#lobby');
  escLobby ? ok('Escape lobby loaded') : fail('Escape lobby missing');

  // Start game
  const startBtn = await escapePage.$('#btn-start');
  if (startBtn && await startBtn.isVisible()) {
    await startBtn.click();
    ok('Escape started');
    await sleep(5000); // countdown + gameplay
    await escapePage.screenshot({ path: path.join(SS, 'full-04-escape-running.png') });

    const canvas = await escapePage.$('#game-canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      box && box.width > 0 ? ok('Canvas rendering') : fail('Canvas zero size');
    }

    // Play: send inputs
    p1.ws.send(JSON.stringify({ type: 'input', action: 'jump' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'slide' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'lane', direction: 'right' }));
    await sleep(2000);
    p1.ws.send(JSON.stringify({ type: 'input', action: 'jump' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'jump' }));
    await sleep(3000);
    await escapePage.screenshot({ path: path.join(SS, 'full-05-escape-gameplay.png') });

    // Check HUD
    const hudDist = await escapePage.textContent('#hud-distance').catch(() => '');
    hudDist ? ok('HUD distance: ' + hudDist) : warn('HUD distance empty');

    escapeErrors.length === 0 ? ok('Zero JS errors') : fail(escapeErrors.length + ' JS errors in Escape');
  } else {
    fail('Start button not visible');
  }

  // Restart
  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ========================================
  // 4. KING OF THE HILL
  // ========================================
  console.log('\n--- 4. KING OF THE HILL ---');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'hillKing' }));
  await sleep(300);

  const hillPage = await context.newPage();
  const hillErrors = [];
  hillPage.on('pageerror', err => hillErrors.push(err.message));
  await hillPage.goto(BASE + '/host-hill/');
  await sleep(1000);
  await hillPage.screenshot({ path: path.join(SS, 'full-06-hill-lobby.png') });

  const hillStart = await hillPage.$('#btn-start');
  if (hillStart && await hillStart.isVisible()) {
    await hillStart.click();
    ok('Hill started');
    await sleep(5000);
    await hillPage.screenshot({ path: path.join(SS, 'full-07-hill-running.png') });

    // Play
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dash' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'shield' }));
    await sleep(1000);
    p2.ws.send(JSON.stringify({ type: 'input', action: 'shieldEnd' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'dash' }));
    await sleep(2000);
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dashDir', direction: 'left' }));
    await sleep(2000);
    await hillPage.screenshot({ path: path.join(SS, 'full-08-hill-gameplay.png') });

    hillErrors.length === 0 ? ok('Zero JS errors') : fail(hillErrors.length + ' JS errors in Hill: ' + hillErrors[0]);
  } else {
    fail('Hill start not visible');
  }

  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ========================================
  // 5. METEOR SHOWER
  // ========================================
  console.log('\n--- 5. METEOR SHOWER ---');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'meteor' }));
  await sleep(300);

  const meteorPage = await context.newPage();
  const meteorErrors = [];
  meteorPage.on('pageerror', err => meteorErrors.push(err.message));
  await meteorPage.goto(BASE + '/host-meteor/');
  await sleep(1000);
  await meteorPage.screenshot({ path: path.join(SS, 'full-09-meteor-lobby.png') });

  const meteorStart = await meteorPage.$('#btn-start');
  if (meteorStart && await meteorStart.isVisible()) {
    await meteorStart.click();
    ok('Meteor started');
    await sleep(6000); // countdown + first wave
    await meteorPage.screenshot({ path: path.join(SS, 'full-10-meteor-running.png') });

    // Play
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dodge' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'move', direction: 'left' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'dodge' }));
    await sleep(3000);
    await meteorPage.screenshot({ path: path.join(SS, 'full-11-meteor-gameplay.png') });

    meteorErrors.length === 0 ? ok('Zero JS errors') : fail(meteorErrors.length + ' JS errors in Meteor: ' + meteorErrors[0]);
  } else {
    fail('Meteor start not visible');
  }

  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ========================================
  // 6. GRAND PRIX
  // ========================================
  console.log('\n--- 6. GRAND PRIX ---');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'race' }));
  await sleep(300);

  const racePage = await context.newPage();
  const raceErrors = [];
  racePage.on('pageerror', err => raceErrors.push(err.message));
  await racePage.goto(BASE + '/host-race/');
  await sleep(1000);
  await racePage.screenshot({ path: path.join(SS, 'full-12-race-lobby.png') });

  const raceStart = await racePage.$('#btn-start');
  if (raceStart && await raceStart.isVisible()) {
    await raceStart.click();
    ok('Race started');
    await sleep(5000);
    await racePage.screenshot({ path: path.join(SS, 'full-13-race-running.png') });

    // Play — steer, boost
    p1.ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: 'left' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: 'right' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'useItem' }));
    await sleep(2000);
    p1.ws.send(JSON.stringify({ type: 'input', action: 'driftStart' }));
    await sleep(1000);
    p1.ws.send(JSON.stringify({ type: 'input', action: 'driftEnd' }));
    await sleep(2000);
    await racePage.screenshot({ path: path.join(SS, 'full-14-race-gameplay.png') });

    raceErrors.length === 0 ? ok('Zero JS errors') : fail(raceErrors.length + ' JS errors in Race: ' + raceErrors[0]);
  } else {
    fail('Race start not visible');
  }

  // ========================================
  // 7. JOIN FLOW TESTS
  // ========================================
  console.log('\n--- 7. JOIN FLOW ---');
  const p4 = await wsConnect('TestUser', 'cat');
  p4.name === 'TestUser' ? ok('Join with name works') : fail('Name not returned: ' + p4.name);
  p4.ws.close();

  const p5 = await wsConnect('', null);
  p5.name.startsWith('Player') ? ok('Default name: ' + p5.name) : fail('No default name');
  p5.ws.close();

  // Test selectCharacter
  const charWait = new Promise(resolve => {
    const handler = raw => {
      const m = JSON.parse(raw);
      if (m.type === 'state' && m.gameState && m.gameState.players[p1.id] && m.gameState.players[p1.id].character === 'frog') {
        p1.ws.off('message', handler);
        resolve(true);
      }
    };
    p1.ws.on('message', handler);
    setTimeout(() => { p1.ws.off('message', handler); resolve(false); }, 3000);
  });
  p1.ws.send(JSON.stringify({ type: 'selectCharacter', character: 'frog' }));
  const charChanged = await charWait;
  charChanged ? ok('selectCharacter works') : fail('selectCharacter did not update');
  // Reset
  p1.ws.send(JSON.stringify({ type: 'selectCharacter', character: 'cat' }));

  // ========================================
  // 8. SCREENSHOTS REVIEW
  // ========================================
  console.log('\n--- 8. SCREENSHOT REVIEW ---');
  const screenshots = fs.readdirSync(SS).filter(f => f.startsWith('full-'));
  ok(screenshots.length + ' screenshots captured');

  // ========================================
  // RESULTS
  // ========================================
  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log('========================================');
  if (issues.length > 0) {
    console.log('\nISSUES:');
    issues.forEach(i => console.log('  ❌ ' + i));
  }
  console.log('\nScreenshots: ' + SS + '/');
  console.log('');

  // Cleanup
  await browser.close();
  [p1, p2, p3].forEach(p => p.ws.close());
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('CRASH:', e.message); process.exit(1); });
