const { chromium } = require('playwright');
const WebSocket = require('ws');
const DIR = 'E:/frantics/.gstack/design-reports/screenshots';

(async () => {
  const browser = await chromium.launch();

  // ============================================
  // 1. LOBBY — desktop 1280x720
  // ============================================
  console.log('\n=== LOBBY (1280x720) ===');
  const lobby = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await lobby.goto('http://localhost:3000/host/', { waitUntil: 'networkidle' });
  await lobby.waitForTimeout(2500);
  await lobby.addStyleTag({ content: '*, *::before, *::after { animation: none !important; }' });
  await lobby.waitForTimeout(200);
  await lobby.screenshot({ path: `${DIR}/lobby-desktop.png` });

  // Fonts in use
  const fonts = await lobby.evaluate(() =>
    [...new Set([...document.querySelectorAll('*')].slice(0,300).map(e => getComputedStyle(e).fontFamily))]
  );
  console.log('Fonts:', fonts.join(' | '));

  // Colors
  const colors = await lobby.evaluate(() =>
    [...new Set([...document.querySelectorAll('*')].slice(0,300).flatMap(e =>
      [getComputedStyle(e).color, getComputedStyle(e).backgroundColor]
    ).filter(c => c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(0, 0, 0)'))]
  );
  console.log('Colors:', colors.length, 'unique');

  // Modal
  await lobby.click('#btn-play');
  await lobby.waitForTimeout(500);
  await lobby.screenshot({ path: `${DIR}/modal-desktop.png` });

  // Hover game card
  await lobby.hover('.modal-card[data-game="escapeFox"]');
  await lobby.waitForTimeout(300);
  await lobby.screenshot({ path: `${DIR}/modal-hover.png` });
  await lobby.click('#modal-close');
  await lobby.waitForTimeout(300);

  // ============================================
  // 2. LOBBY — mobile 375x812
  // ============================================
  console.log('\n=== LOBBY (375x812 mobile) ===');
  await lobby.setViewportSize({ width: 375, height: 812 });
  await lobby.waitForTimeout(500);
  await lobby.screenshot({ path: `${DIR}/lobby-mobile.png` });

  // ============================================
  // 3. CONTROLLER — mobile 375x812
  // ============================================
  console.log('\n=== CONTROLLER (375x812) ===');
  const ctrl = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await ctrl.goto('http://localhost:3000/controller/', { waitUntil: 'networkidle' });
  await ctrl.waitForTimeout(1500);
  await ctrl.screenshot({ path: `${DIR}/ctrl-onboarding.png` });

  // Fill name, go to char select
  await ctrl.fill('#ob-name', 'DesignTest');
  await ctrl.click('#ob-name-btn');
  await ctrl.waitForTimeout(500);
  await ctrl.screenshot({ path: `${DIR}/ctrl-charselect.png` });

  // ============================================
  // 4. GAME HOSTS — desktop
  // ============================================
  // Connect 2 players via WS
  const ws1 = new WebSocket('ws://localhost:3000');
  await new Promise(r => ws1.on('open', r));
  ws1.send(JSON.stringify({ type: 'join', name: 'P1', character: 'cat' }));
  const ws2 = new WebSocket('ws://localhost:3000');
  await new Promise(r => ws2.on('open', r));
  ws2.send(JSON.stringify({ type: 'join', name: 'P2', character: 'bear' }));
  await new Promise(r => setTimeout(r, 500));

  // Select and start each game, screenshot
  const games = ['escapeFox', 'hillKing', 'meteor', 'race'];
  for (const gid of games) {
    console.log(`\n=== ${gid} HOST ===`);
    ws1.send(JSON.stringify({ type: 'restart' }));
    await new Promise(r => setTimeout(r, 300));
    ws1.send(JSON.stringify({ type: 'selectGame', gameId: gid }));
    await new Promise(r => setTimeout(r, 300));

    const gp = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const gameUrls = { escapeFox: '/host-escape/', hillKing: '/host-hill/', meteor: '/host-meteor/', race: '/host-race/' };
    await gp.goto('http://localhost:3000' + gameUrls[gid], { waitUntil: 'networkidle' });
    await gp.waitForTimeout(1500);
    await gp.screenshot({ path: `${DIR}/${gid}-lobby.png` });

    // Start game
    ws1.send(JSON.stringify({ type: 'start' }));
    await new Promise(r => setTimeout(r, 2000));
    await gp.screenshot({ path: `${DIR}/${gid}-playing.png` });

    // Check console errors
    const errs = [];
    gp.on('pageerror', e => errs.push(e.message));
    await gp.waitForTimeout(500);
    if (errs.length) console.log('  JS errors:', errs);
    else console.log('  No JS errors');

    await gp.close();
  }

  // Cleanup
  ws1.close(); ws2.close();
  await ctrl.close();
  await lobby.close();
  await browser.close();
  console.log('\nDesign review screenshots complete.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
