// Take a closeup screenshot and zoom on the game canvas.
const { chromium } = require('playwright');
const WebSocket = require('ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });

  const players = [];
  for (let i = 0; i < 4; i++) {
    const ws = new WebSocket('ws://localhost:3000');
    await new Promise(r => ws.on('open', r));
    const chars = ['cat', 'frog', 'bear', 'bunny'];
    ws.send(JSON.stringify({ type: 'join', name: 'P' + i, character: chars[i] }));
    players.push(ws);
    await sleep(200);
  }

  players[0].send(JSON.stringify({ type: 'selectGame', gameId: 'race' }));
  await sleep(400);

  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/host-race/', { waitUntil: 'networkidle' });
  await sleep(1000);
  players[0].send(JSON.stringify({ type: 'start' }));
  await sleep(6000);

  // Drive with different patterns
  for (let i = 0; i < 10; i++) {
    players[0].send(JSON.stringify({ type: 'input', action: 'steer', direction: 'left' }));
    players[1].send(JSON.stringify({ type: 'input', action: 'steer', direction: 'right' }));
    players[2].send(JSON.stringify({ type: 'input', action: 'steer', direction: i % 2 ? 'left' : 'right' }));
    if (i === 3) players[0].send(JSON.stringify({ type: 'input', action: 'useItem' }));
    if (i === 5) players[1].send(JSON.stringify({ type: 'input', action: 'useItem' }));
    await sleep(700);
  }

  await page.screenshot({ path: 'E:/frantics/screenshots-qa/race-hi-res.png' });

  // Evaluate loaded sprites
  const spriteInfo = await page.evaluate(() => {
    const has = (n) => window.SpriteLoader && window.SpriteLoader.has(n);
    return {
      car_red: has('car-red'),
      car_green: has('car-green'),
      item_boost: has('item-boost'),
      item_oil: has('item-oil'),
      item_missile: has('item-missile'),
    };
  });
  console.log('Sprites loaded:', spriteInfo);

  await browser.close();
  players.forEach(ws => ws.close());
  process.exit(0);
})();
