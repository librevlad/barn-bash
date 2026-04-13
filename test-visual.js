// ============================================================
// Visual QA — Screenshot every page, check for errors
// ============================================================
const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots-qa');
const issues = [];

function issue(page, severity, description) {
  issues.push({ page, severity, description });
  console.log(`  ${severity === 'BUG' ? '🔴' : '🟡'} [${page}] ${description}`);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function wsConnect(name, character) {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', name, character }));
      ws.once('message', (raw) => {
        const msg = JSON.parse(raw);
        resolve({ ws, playerId: msg.playerId });
      });
    });
  });
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR);
  console.log('\n=== VISUAL QA TEST ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  // Connect 2 players via WebSocket
  const p1 = await wsConnect('Alice', 'cat');
  const p2 = await wsConnect('Bob', 'frog');
  console.log('Players connected: Alice (cat), Bob (frog)\n');

  // ============================================
  // 1. LOBBY HOST
  // ============================================
  console.log('--- LOBBY HOST ---');
  const lobbyPage = await context.newPage();
  lobbyPage.on('console', msg => {
    if (msg.type() === 'error') issue('lobby', 'BUG', 'Console error: ' + msg.text());
  });
  lobbyPage.on('pageerror', err => issue('lobby', 'BUG', 'Page error: ' + err.message));

  await lobbyPage.goto(BASE + '/host/');
  await sleep(1500);
  await lobbyPage.screenshot({ path: path.join(SCREENSHOT_DIR, '01-lobby.png') });

  // Check elements
  const lobbyTitle = await lobbyPage.textContent('.lobby-title').catch(() => null);
  if (!lobbyTitle || !lobbyTitle.includes('FRANTICS')) issue('lobby', 'BUG', 'Title missing or wrong');
  else console.log('  ✅ Title: ' + lobbyTitle);

  const contestants = await lobbyPage.$$('.contestant');
  if (contestants.length < 2) issue('lobby', 'BUG', `Expected 2 contestants, found ${contestants.length}`);
  else console.log('  ✅ Contestants: ' + contestants.length);

  const narratorText = await lobbyPage.textContent('#narrator-idle').catch(() => '');
  if (narratorText) console.log('  ✅ Narrator idle: ' + narratorText.slice(0, 50));
  else issue('lobby', 'WARN', 'No narrator idle text visible');

  const connectUrl = await lobbyPage.textContent('#connect-url-value').catch(() => '');
  if (connectUrl) console.log('  ✅ Connect URL: ' + connectUrl);
  else issue('lobby', 'WARN', 'Connect URL not shown');

  const gameCards = await lobbyPage.$$('.game-card:not(.disabled)');
  if (gameCards.length < 3) issue('lobby', 'BUG', `Expected 3 enabled game cards, found ${gameCards.length}`);
  else console.log('  ✅ Game cards enabled: ' + gameCards.length);

  // ============================================
  // 2. CONTROLLER
  // ============================================
  console.log('\n--- CONTROLLER ---');
  const ctrlPage = await context.newPage();
  ctrlPage.on('console', msg => {
    if (msg.type() === 'error') issue('controller', 'BUG', 'Console error: ' + msg.text());
  });
  ctrlPage.on('pageerror', err => issue('controller', 'BUG', 'Page error: ' + err.message));

  await ctrlPage.goto(BASE + '/controller/');
  await sleep(1000);
  await ctrlPage.screenshot({ path: path.join(SCREENSHOT_DIR, '02-controller-onboarding.png') });

  // Check onboarding
  const onboarding = await ctrlPage.$('#onboarding');
  const obVisible = onboarding ? await onboarding.isVisible() : false;
  if (obVisible) console.log('  ✅ Onboarding visible');
  else issue('controller', 'BUG', 'Onboarding not visible on load');

  const nameInput = await ctrlPage.$('#ob-name');
  if (nameInput) console.log('  ✅ Name input exists');
  else issue('controller', 'BUG', 'Name input missing');

  // ============================================
  // 3. ESCAPE THE FOX — start game and screenshot
  // ============================================
  console.log('\n--- ESCAPE THE FOX ---');
  // Select game
  p1.ws.send(JSON.stringify({ type: 'input', action: 'start' })); // won't work, need host
  // Use a host page approach
  const escapePage = await context.newPage();
  escapePage.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION')) {
      issue('escape', 'BUG', 'Console error: ' + msg.text());
    }
  });
  escapePage.on('pageerror', err => issue('escape', 'BUG', 'Page error: ' + err.message));

  // Select escape fox game
  await lobbyPage.click('.game-card[data-game="escapeFox"]');
  await sleep(500);

  await escapePage.goto(BASE + '/host-escape/');
  await sleep(1000);
  await escapePage.screenshot({ path: path.join(SCREENSHOT_DIR, '03-escape-lobby.png') });

  // Check lobby elements
  const escLobby = await escapePage.$('#lobby');
  if (escLobby) console.log('  ✅ Escape lobby loaded');
  else issue('escape', 'BUG', 'Escape lobby element missing');

  // Start game
  const startBtn = await escapePage.$('#btn-start');
  if (startBtn) {
    const visible = await startBtn.isVisible();
    if (visible) {
      await startBtn.click();
      console.log('  ✅ Start button clicked');
      await sleep(4500); // countdown + game start
      await escapePage.screenshot({ path: path.join(SCREENSHOT_DIR, '04-escape-running.png') });

      // Check canvas
      const canvas = await escapePage.$('#game-canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        if (box && box.width > 0) console.log('  ✅ Game canvas rendering (' + box.width + 'x' + box.height + ')');
        else issue('escape', 'BUG', 'Canvas has zero size');
      } else {
        issue('escape', 'BUG', 'Game canvas element missing');
      }

      // Check HUD
      const hudDist = await escapePage.textContent('#hud-distance').catch(() => '');
      if (hudDist) console.log('  ✅ HUD distance: ' + hudDist);
      else issue('escape', 'WARN', 'HUD distance not updating');

      // Let game run a bit
      await sleep(3000);
      await escapePage.screenshot({ path: path.join(SCREENSHOT_DIR, '05-escape-midgame.png') });

      // Send some inputs
      p1.ws.send(JSON.stringify({ type: 'input', action: 'jump' }));
      p2.ws.send(JSON.stringify({ type: 'input', action: 'slide' }));
      await sleep(500);
      p1.ws.send(JSON.stringify({ type: 'input', action: 'lane', direction: 'right' }));
      await sleep(2000);
      await escapePage.screenshot({ path: path.join(SCREENSHOT_DIR, '06-escape-gameplay.png') });

    } else {
      issue('escape', 'BUG', 'Start button not visible');
    }
  } else {
    issue('escape', 'BUG', 'Start button missing');
  }

  // Restart to lobby
  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(1000);

  // ============================================
  // 4. KING OF THE HILL
  // ============================================
  console.log('\n--- KING OF THE HILL ---');
  // Select hill game
  p1.ws.send(JSON.stringify({ type: 'input', action: 'selectGame', gameId: 'hillKing' }));
  await sleep(200);
  // Actually need to use the proper message type
  const hillWs = new WebSocket('ws://localhost:3000');
  await new Promise(r => hillWs.on('open', r));
  hillWs.send(JSON.stringify({ type: 'selectGame', gameId: 'hillKing' }));
  await sleep(500);

  const hillPage = await context.newPage();
  hillPage.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION')) {
      issue('hill', 'BUG', 'Console error: ' + msg.text());
    }
  });
  hillPage.on('pageerror', err => issue('hill', 'BUG', 'Page error: ' + err.message));

  await hillPage.goto(BASE + '/host-hill/');
  await sleep(1000);
  await hillPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07-hill-lobby.png') });

  const hillStart = await hillPage.$('#btn-start');
  if (hillStart && await hillStart.isVisible()) {
    await hillStart.click();
    console.log('  ✅ Hill start clicked');
    await sleep(4500);
    await hillPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08-hill-running.png') });

    const hillCanvas = await hillPage.$('#game-canvas');
    if (hillCanvas) {
      const box = await hillCanvas.boundingBox();
      if (box && box.width > 0) console.log('  ✅ Hill canvas rendering (' + box.width + 'x' + box.height + ')');
      else issue('hill', 'BUG', 'Hill canvas zero size');
    } else {
      issue('hill', 'BUG', 'Hill canvas missing');
    }

    // Send inputs
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dash' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'shield' }));
    await sleep(2000);
    await hillPage.screenshot({ path: path.join(SCREENSHOT_DIR, '09-hill-gameplay.png') });
    p2.ws.send(JSON.stringify({ type: 'input', action: 'shieldEnd' }));
  } else {
    issue('hill', 'WARN', 'Hill start button not visible or missing');
  }

  // Restart
  hillWs.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ============================================
  // 5. METEOR SHOWER
  // ============================================
  console.log('\n--- METEOR SHOWER ---');
  hillWs.send(JSON.stringify({ type: 'selectGame', gameId: 'meteor' }));
  await sleep(500);

  const meteorPage = await context.newPage();
  meteorPage.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION')) {
      issue('meteor', 'BUG', 'Console error: ' + msg.text());
    }
  });
  meteorPage.on('pageerror', err => issue('meteor', 'BUG', 'Page error: ' + err.message));

  await meteorPage.goto(BASE + '/host-meteor/');
  await sleep(1000);
  await meteorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10-meteor-lobby.png') });

  const meteorStart = await meteorPage.$('#btn-start');
  if (meteorStart && await meteorStart.isVisible()) {
    await meteorStart.click();
    console.log('  ✅ Meteor start clicked');
    await sleep(5000);
    await meteorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '11-meteor-running.png') });

    const meteorCanvas = await meteorPage.$('#game-canvas');
    if (meteorCanvas) {
      const box = await meteorCanvas.boundingBox();
      if (box && box.width > 0) console.log('  ✅ Meteor canvas rendering (' + box.width + 'x' + box.height + ')');
      else issue('meteor', 'BUG', 'Meteor canvas zero size');
    } else {
      issue('meteor', 'BUG', 'Meteor canvas missing');
    }

    // Send inputs
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dodge' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'move', direction: 'left' }));
    await sleep(3000);
    await meteorPage.screenshot({ path: path.join(SCREENSHOT_DIR, '12-meteor-gameplay.png') });
  } else {
    issue('meteor', 'WARN', 'Meteor start button not visible or missing');
  }

  // ============================================
  // RESULTS
  // ============================================
  console.log('\n=== VISUAL QA RESULTS ===\n');
  const bugs = issues.filter(i => i.severity === 'BUG');
  const warns = issues.filter(i => i.severity === 'WARN');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log(`Total issues: ${issues.length} (${bugs.length} bugs, ${warns.length} warnings)\n`);
  for (const i of issues) {
    console.log(`  ${i.severity === 'BUG' ? '🔴' : '🟡'} [${i.page}] ${i.description}`);
  }
  if (issues.length === 0) console.log('  ✅ No visual issues found!');

  // Cleanup
  await browser.close();
  p1.ws.close(); p2.ws.close(); hillWs.close();
  process.exit(bugs.length > 0 ? 1 : 0);
}

run().catch(e => { console.error('Test runner error:', e); process.exit(1); });
