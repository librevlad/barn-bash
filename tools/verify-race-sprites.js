// Quick test: load race host, check sprites load without errors, take screenshot.
const { chromium } = require('playwright');
const WebSocket = require('ws');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  // Connect 2 players (needed for race)
  const players = [];
  for (let i = 0; i < 3; i++) {
    const ws = new WebSocket('ws://localhost:3000');
    await new Promise(r => ws.on('open', r));
    const chars = ['cat', 'frog', 'bear'];
    ws.send(JSON.stringify({ type: 'join', name: 'P' + i, character: chars[i] }));
    players.push(ws);
    await sleep(200);
  }

  // Select race
  players[0].send(JSON.stringify({ type: 'selectGame', gameId: 'race' }));
  await sleep(400);

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('[pageerror] ' + e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('[console.error] ' + msg.text());
    if (msg.text().includes('Car sprites loaded')) console.log('  OK: ' + msg.text());
    if (msg.text().includes('Sprite load failed')) console.log('  FAIL: ' + msg.text());
  });

  await page.goto('http://localhost:3000/host-race/', { waitUntil: 'networkidle' });
  await sleep(1500);

  // Start game via WebSocket (simpler than clicking DOM)
  players[0].send(JSON.stringify({ type: 'start' }));
  await sleep(7000); // countdown + some race

  // Drive the cars
  for (let i = 0; i < 6; i++) {
    for (const ws of players) {
      ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: (i % 2 === 0 ? 'left' : 'right') }));
    }
    if (i === 2) players[0].send(JSON.stringify({ type: 'input', action: 'useItem' }));
    await sleep(800);
  }

  await page.screenshot({ path: 'E:/frantics/screenshots-qa/race-sprites-integrated.png' });

  if (errors.length) {
    console.log('\n  Errors:');
    errors.forEach(e => console.log('  ' + e));
  } else {
    console.log('  No JS errors');
  }
  await browser.close();
  players.forEach(ws => ws.close());
  process.exit(errors.length ? 1 : 0);
})();
