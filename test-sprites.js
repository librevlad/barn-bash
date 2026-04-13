const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('\n=== SPRITE TEST ===\n');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  // Connect players
  const p1 = new WebSocket('ws://localhost:3000');
  await new Promise(r => p1.on('open', r));
  p1.send(JSON.stringify({ type: 'join', name: 'Tester1', character: 'cat' }));
  await sleep(300);
  const p2 = new WebSocket('ws://localhost:3000');
  await new Promise(r => p2.on('open', r));
  p2.send(JSON.stringify({ type: 'join', name: 'Tester2', character: 'wolf' }));
  await sleep(300);

  // Select race
  p1.send(JSON.stringify({ type: 'selectGame', gameId: 'race' }));
  await sleep(500);

  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => {
    if (msg.text().includes('Sprites loaded')) console.log('  ✅ ' + msg.text());
    if (msg.text().includes('failed')) console.log('  ❌ ' + msg.text());
  });

  await page.goto('http://localhost:3000/host-race/');
  await sleep(2000);

  // Start game
  const btn = await page.$('#btn-start');
  if (btn) await btn.click();
  await sleep(6000);

  // Screenshot early game
  await page.screenshot({ path: 'E:/frantics/screenshots-review/sprite-test-1.png' });
  console.log('  📸 Screenshot 1 taken');

  // Play for a bit
  for (let i = 0; i < 10; i++) {
    p1.send(JSON.stringify({ type: 'input', action: 'steer', direction: i % 2 === 0 ? 'left' : 'right' }));
    p2.send(JSON.stringify({ type: 'input', action: 'steer', direction: i % 3 === 0 ? 'left' : 'right' }));
    if (i === 4) p1.send(JSON.stringify({ type: 'input', action: 'useItem' }));
    await sleep(1000);
  }

  await page.screenshot({ path: 'E:/frantics/screenshots-review/sprite-test-2.png' });
  console.log('  📸 Screenshot 2 taken');

  // Check for errors
  if (errors.length === 0) console.log('  ✅ Zero JS errors');
  else errors.forEach(e => console.log('  ❌ ' + e));

  console.log('\n=== DONE ===\n');
  await browser.close();
  p1.close(); p2.close();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
