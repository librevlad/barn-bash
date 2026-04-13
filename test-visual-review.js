// ============================================================
// VISUAL REVIEW — Play each game, take detailed screenshots
// Look at everything with fresh eyes like a new user
// ============================================================
const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const SS = path.join(__dirname, 'screenshots-review');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function wsConnect(name, char) {
  return new Promise(resolve => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', name, character: char }));
      ws.once('message', raw => resolve({ ws, ...JSON.parse(raw) }));
    });
  });
}

async function run() {
  console.log('\n=== VISUAL REVIEW — Fresh Eyes ===\n');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  // 3 players
  const p1 = await wsConnect('Luna', 'cat');
  const p2 = await wsConnect('Rex', 'wolf');
  const p3 = await wsConnect('Jade', 'frog');

  // ====== LOBBY ======
  console.log('📸 Lobby...');
  const lobby = await ctx.newPage();
  await lobby.goto('http://localhost:3000/host/');
  await sleep(2000);
  await lobby.screenshot({ path: path.join(SS, '01-lobby-full.png') });

  // ====== ESCAPE FOX ======
  console.log('📸 Escape the Fox...');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'escapeFox' }));
  await sleep(300);
  const esc = await ctx.newPage();
  await esc.goto('http://localhost:3000/host-escape/');
  await sleep(1000);
  await esc.screenshot({ path: path.join(SS, '02-escape-lobby.png') });

  // Start + play
  const escStart = await esc.$('#btn-start');
  if (escStart) await escStart.click();
  await sleep(4500);
  await esc.screenshot({ path: path.join(SS, '03-escape-countdown.png') });

  // Gameplay — varied inputs over 12 seconds
  for (let t = 0; t < 12; t++) {
    p1.ws.send(JSON.stringify({ type: 'input', action: t % 3 === 0 ? 'jump' : 'lane', direction: t % 2 === 0 ? 'left' : 'right' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: t % 4 === 0 ? 'slide' : 'jump' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'lane', direction: t % 2 === 0 ? 'right' : 'left' }));
    await sleep(1000);
    if (t === 3) await esc.screenshot({ path: path.join(SS, '04-escape-early.png') });
    if (t === 7) await esc.screenshot({ path: path.join(SS, '05-escape-mid.png') });
    if (t === 11) await esc.screenshot({ path: path.join(SS, '06-escape-late.png') });
  }

  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ====== HILL KING ======
  console.log('📸 King of the Hill...');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'hillKing' }));
  await sleep(300);
  const hill = await ctx.newPage();
  await hill.goto('http://localhost:3000/host-hill/');
  await sleep(1000);
  const hillStart = await hill.$('#btn-start');
  if (hillStart) await hillStart.click();
  await sleep(5000);
  await hill.screenshot({ path: path.join(SS, '07-hill-start.png') });

  for (let t = 0; t < 10; t++) {
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dash' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: t % 3 === 0 ? 'shield' : 'dashDir', direction: 'left' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'dashDir', direction: t % 2 === 0 ? 'up' : 'down' }));
    if (t === 3) { p2.ws.send(JSON.stringify({ type: 'input', action: 'shieldEnd' })); }
    await sleep(1000);
    if (t === 4) await hill.screenshot({ path: path.join(SS, '08-hill-action.png') });
    if (t === 8) await hill.screenshot({ path: path.join(SS, '09-hill-late.png') });
  }

  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ====== METEOR ======
  console.log('📸 Meteor Shower...');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'meteor' }));
  await sleep(300);
  const met = await ctx.newPage();
  await met.goto('http://localhost:3000/host-meteor/');
  await sleep(1000);
  const metStart = await met.$('#btn-start');
  if (metStart) await metStart.click();
  await sleep(5500);
  await met.screenshot({ path: path.join(SS, '10-meteor-warning.png') });

  for (let t = 0; t < 10; t++) {
    p1.ws.send(JSON.stringify({ type: 'input', action: 'dodge' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: 'move', direction: t % 2 === 0 ? 'left' : 'right' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'dodge' }));
    await sleep(800);
    if (t === 3) await met.screenshot({ path: path.join(SS, '11-meteor-play.png') });
    if (t === 7) await met.screenshot({ path: path.join(SS, '12-meteor-late.png') });
  }

  p1.ws.send(JSON.stringify({ type: 'restart' }));
  await sleep(500);

  // ====== RACE ======
  console.log('📸 Grand Prix...');
  p1.ws.send(JSON.stringify({ type: 'selectGame', gameId: 'race' }));
  await sleep(300);
  const race = await ctx.newPage();
  await race.goto('http://localhost:3000/host-race/');
  await sleep(1000);
  await race.screenshot({ path: path.join(SS, '13-race-lobby.png') });
  const raceStart = await race.$('#btn-start');
  if (raceStart) await raceStart.click();
  await sleep(5000);
  await race.screenshot({ path: path.join(SS, '14-race-start.png') });

  for (let t = 0; t < 15; t++) {
    p1.ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: t % 4 < 2 ? 'left' : 'right' }));
    p2.ws.send(JSON.stringify({ type: 'input', action: t % 5 === 0 ? 'useItem' : 'steer', direction: 'right' }));
    p3.ws.send(JSON.stringify({ type: 'input', action: 'steer', direction: t % 3 === 0 ? 'left' : 'right' }));
    if (t === 6) { p1.ws.send(JSON.stringify({ type: 'input', action: 'driftStart' })); }
    if (t === 8) { p1.ws.send(JSON.stringify({ type: 'input', action: 'driftEnd' })); }
    await sleep(1000);
    if (t === 4) await race.screenshot({ path: path.join(SS, '15-race-early.png') });
    if (t === 9) await race.screenshot({ path: path.join(SS, '16-race-mid.png') });
    if (t === 14) await race.screenshot({ path: path.join(SS, '17-race-late.png') });
  }

  console.log('\n✅ Done! ' + fs.readdirSync(SS).filter(f => f.endsWith('.png')).length + ' screenshots saved\n');

  await browser.close();
  [p1, p2, p3].forEach(p => p.ws.close());
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
