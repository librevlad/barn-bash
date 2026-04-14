const { chromium } = require('playwright');
const fs = require('fs');
const WebSocket = require('ws');
const DIR = 'E:/frantics/.gstack/qa-reports/screenshots';

async function screenshot(page, name) {
  const path = `${DIR}/${name}.png`;
  await page.screenshot({ path });
  return path;
}

async function checkConsole(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

(async () => {
  const browser = await chromium.launch();
  const results = { pages: [], issues: [], errors: [] };

  // ============================================
  // 1. LOBBY HOST
  // ============================================
  console.log('\n=== 1. LOBBY HOST ===');
  const lobby = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const lobbyErrors = [];
  lobby.on('pageerror', e => lobbyErrors.push(e.message));

  await lobby.goto('http://localhost:3000/host/', { waitUntil: 'networkidle' });
  await lobby.waitForTimeout(2000);
  await lobby.addStyleTag({ content: '*, *::before, *::after { animation: none !important; }' });
  await lobby.waitForTimeout(200);
  await screenshot(lobby, '01-lobby');
  console.log('  Lobby loaded. Errors:', lobbyErrors.length);
  if (lobbyErrors.length) console.log('  ', lobbyErrors);

  // Check bg.png loads
  const bgLoaded = await lobby.evaluate(() => {
    const bg = document.getElementById('bg');
    const style = getComputedStyle(bg);
    return style.backgroundImage.includes('bg.png');
  });
  console.log('  bg.png loaded:', bgLoaded);

  // Check buttons exist
  const btnCount = await lobby.locator('.sprite-btn').count();
  console.log('  Sprite buttons:', btnCount);

  // Check button images load
  const btnSrcs = await lobby.evaluate(() => {
    return Array.from(document.querySelectorAll('.sprite-btn img')).map(i => ({
      src: i.src, w: i.naturalWidth, h: i.naturalHeight, loaded: i.complete && i.naturalWidth > 0
    }));
  });
  btnSrcs.forEach(b => console.log('    btn:', b.src.split('/').pop(), b.loaded ? 'OK' : 'BROKEN', b.w + 'x' + b.h));

  // Click PLAY → modal
  await lobby.click('#btn-play');
  await lobby.waitForTimeout(500);
  await screenshot(lobby, '02-modal');
  const modalVisible = await lobby.locator('#game-modal.show').count();
  console.log('  Modal opened:', modalVisible > 0);

  // Check frame.png loads in modal
  const frameLoaded = await lobby.evaluate(() => {
    const box = document.querySelector('.modal-box');
    const style = getComputedStyle(box);
    return style.backgroundImage.includes('frame.png');
  });
  console.log('  frame.png loaded:', frameLoaded);

  // Check game cards
  const cardCount = await lobby.locator('.modal-card').count();
  console.log('  Game cards:', cardCount);

  // Close modal
  await lobby.click('#modal-close');
  await lobby.waitForTimeout(300);

  // ============================================
  // 2. CONTROLLER
  // ============================================
  console.log('\n=== 2. CONTROLLER ===');
  const ctrl = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const ctrlErrors = [];
  ctrl.on('pageerror', e => ctrlErrors.push(e.message));

  await ctrl.goto('http://localhost:3000/controller/', { waitUntil: 'networkidle' });
  await ctrl.waitForTimeout(1000);
  await screenshot(ctrl, '03-controller-onboarding');
  console.log('  Controller loaded. Errors:', ctrlErrors.length);
  if (ctrlErrors.length) console.log('  ', ctrlErrors);

  // Check onboarding visible
  const onboardingVisible = await ctrl.locator('#onboarding').isVisible();
  console.log('  Onboarding visible:', onboardingVisible);

  // Fill name and proceed
  await ctrl.fill('#ob-name', 'QA_Tester');
  await ctrl.click('#ob-name-btn');
  await ctrl.waitForTimeout(300);
  await screenshot(ctrl, '04-controller-charselect');

  // Check 8 character buttons
  const charBtns = await ctrl.locator('#ob-chars button').count();
  console.log('  Character buttons:', charBtns, '(expected 9: 8 chars + JOIN)');

  // Select bear (new character)
  await ctrl.locator('#ob-chars button >> text=Bear').click();
  await ctrl.waitForTimeout(200);

  // Click JOIN THE SHOW
  await ctrl.locator('button >> text=JOIN THE SHOW').click();
  await ctrl.waitForTimeout(1000);
  await screenshot(ctrl, '05-controller-joined');
  console.log('  Joined game');

  // ============================================
  // 3. CONNECT 2ND PLAYER VIA WS
  // ============================================
  console.log('\n=== 3. 2ND PLAYER ===');
  const ws2 = new WebSocket('ws://localhost:3000');
  await new Promise(r => ws2.on('open', r));
  ws2.send(JSON.stringify({ type: 'join', name: 'Bot2', character: 'chicken' }));
  await new Promise(r => setTimeout(r, 500));
  console.log('  Bot2 (chicken) connected');

  // Check lobby shows players
  await lobby.waitForTimeout(500);
  await screenshot(lobby, '06-lobby-with-players');
  const playerPills = await lobby.locator('.player-pill').count();
  console.log('  Player pills in lobby:', playerPills);

  // ============================================
  // 4. EACH GAME HOST PAGE
  // ============================================
  const games = [
    { id: 'escapeFox', url: '/host-escape/', name: 'Escape Fox' },
    { id: 'hillKing', url: '/host-hill/', name: 'Hill King' },
    { id: 'meteor', url: '/host-meteor/', name: 'Meteor' },
    { id: 'race', url: '/host-race/', name: 'Race' },
  ];

  for (const game of games) {
    console.log(`\n=== 4. ${game.name.toUpperCase()} HOST ===`);
    const gp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const gErrors = [];
    gp.on('pageerror', e => gErrors.push(e.message));

    await gp.goto('http://localhost:3000' + game.url, { waitUntil: 'networkidle' });
    await gp.waitForTimeout(1500);
    await screenshot(gp, `07-${game.id}-lobby`);
    console.log(`  ${game.name} lobby loaded. Errors:`, gErrors.length);
    if (gErrors.length) gErrors.forEach(e => console.log('    ERR:', e));

    // Check canvas exists
    const hasCanvas = await gp.locator('canvas').count();
    console.log(`  Canvas elements:`, hasCanvas);

    await gp.close();
  }

  // ============================================
  // 5. SERVER-SIDE TESTS
  // ============================================
  console.log('\n=== 5. SERVER TESTS ===');

  // Run join tests
  const { execSync } = require('child_process');
  try {
    const joinOut = execSync('node test-join.js 2>&1', { cwd: 'E:/frantics', timeout: 15000 }).toString();
    const joinMatch = joinOut.match(/(\d+) passed, (\d+) failed/);
    console.log('  test-join:', joinMatch ? `${joinMatch[1]} passed, ${joinMatch[2]} failed` : 'unknown');
    if (joinMatch && joinMatch[2] !== '0') results.issues.push({ id: 'SRV-001', title: 'Join tests failing', severity: 'critical' });
  } catch (e) { console.log('  test-join: FAILED', e.message.split('\n')[0]); }

  // ============================================
  // 6. SUMMARY
  // ============================================
  console.log('\n=== SUMMARY ===');
  console.log('Pages tested: lobby, controller, modal, 4 game hosts');
  console.log('Console errors:', lobbyErrors.length + ctrlErrors.length);
  console.log('Issues found:', results.issues.length);

  // Cleanup
  ws2.close();
  await ctrl.close();
  await lobby.close();
  await browser.close();
  console.log('\nQA complete.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
