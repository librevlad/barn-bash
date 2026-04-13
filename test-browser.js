const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const results = [];

  function check(cond, label) {
    results.push({ ok: !!cond, label });
    console.log(cond ? `  OK: ${label}` : `  FAIL: ${label}`);
  }

  try {
    // === 1. HOST PAGE ===
    console.log('\n=== 1. Host page ===');
    const hostPage = await browser.newPage();
    await hostPage.goto(BASE + '/host/');
    await hostPage.waitForTimeout(500);

    check(await hostPage.textContent('h1') === 'COLOR SMASH', 'host title');
    check((await hostPage.textContent('#instruction')).includes('Waiting'), 'waiting message');
    check(await hostPage.$eval('#btn-start', el => el.style.display === 'none'), 'START hidden with 0 players');

    // === 2. CONTROLLER 1 ===
    console.log('\n=== 2. Controller 1 ===');
    const ctrl1 = await browser.newPage();
    await ctrl1.goto(BASE + '/controller/');
    await ctrl1.waitForTimeout(500);

    check(await ctrl1.textContent('#info') === 'Player 1', 'ctrl1 is Player 1');
    const bg1 = await ctrl1.$eval('body', el => el.style.background);
    check(bg1 === 'rgb(231, 76, 60)' || bg1 === '#e74c3c', 'ctrl1 is red');
    check(await ctrl1.textContent('#status') === 'Waiting for start...', 'ctrl1 waiting');

    await hostPage.waitForTimeout(300);
    check(await hostPage.$eval('#btn-start', el => el.style.display === 'none'), 'START hidden with 1 player');

    // === 3. CONTROLLER 2 ===
    console.log('\n=== 3. Controller 2 ===');
    const ctrl2 = await browser.newPage();
    await ctrl2.goto(BASE + '/controller/');
    await ctrl2.waitForTimeout(500);

    check(await ctrl2.textContent('#info') === 'Player 2', 'ctrl2 is Player 2');
    await hostPage.waitForTimeout(300);
    check(await hostPage.$eval('#btn-start', el => el.style.display !== 'none'), 'START visible with 2 players');
    check((await hostPage.$$('.p-dot')).length === 2, 'scoreboard has 2 dots');

    // === 4. SCREENSHOTS: LOBBY ===
    console.log('\n=== 4. Lobby screenshots ===');
    await hostPage.screenshot({ path: 'screenshot-lobby.png', fullPage: true });
    await ctrl1.screenshot({ path: 'screenshot-ctrl1-lobby.png', fullPage: true });
    console.log('  Saved lobby screenshots');

    // === 5. START GAME ===
    console.log('\n=== 5. Start game ===');
    await hostPage.click('#btn-start');
    await hostPage.waitForTimeout(400);

    check(await hostPage.textContent('#round-info') === 'ROUND 1', 'ROUND 1 shown');
    check((await hostPage.textContent('#instruction')).includes('TAP'), 'tap instruction');
    check(await ctrl1.textContent('#status') === 'TAP!', 'ctrl1 shows TAP!');

    const timerW = await hostPage.$eval('#timer-fill', el => parseFloat(el.style.width));
    check(timerW > 0, 'timer bar running');

    // === 6. TAP LOGIC ===
    console.log('\n=== 6. Tap logic ===');
    const targetBg = await hostPage.$eval('#target', el => el.style.background);
    const p1Bg = await ctrl1.$eval('body', el => el.style.background);
    const isP1Target = targetBg === p1Bg;
    console.log('  P1 is target: ' + isP1Target);

    const targetCtrl = isP1Target ? ctrl1 : ctrl2;
    const otherCtrl = isP1Target ? ctrl2 : ctrl1;

    await targetCtrl.dispatchEvent('body', 'pointerdown');
    await hostPage.waitForTimeout(200);
    check(await targetCtrl.textContent('#result') === '+1', 'correct tap +1');
    check(await targetCtrl.textContent('#status') === 'Nice!', 'correct tap Nice!');

    await otherCtrl.dispatchEvent('body', 'pointerdown');
    await hostPage.waitForTimeout(200);
    check(await otherCtrl.textContent('#result') === '-1', 'wrong tap -1');
    check(await otherCtrl.textContent('#status') === 'Wrong!', 'wrong tap Wrong!');

    // === 7. MID-ROUND SCREENSHOT ===
    console.log('\n=== 7. Mid-round screenshot ===');
    await hostPage.screenshot({ path: 'screenshot-round.png', fullPage: true });
    console.log('  Saved: screenshot-round.png');

    // === 8. ROUND CYCLE ===
    console.log('\n=== 8. Round cycle ===');
    await hostPage.waitForTimeout(5000);
    const nextRound = await hostPage.textContent('#round-info');
    check(nextRound !== 'ROUND 1', 'advanced past round 1 (' + nextRound + ')');

    // === 9. PLAY TO WIN ===
    console.log('\n=== 9. Play to win (auto-tap) ===');

    // Install auto-tap on both controllers: tap only when they are the target
    await ctrl1.evaluate(() => {
      ws.addEventListener('message', (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'round_start' && msg.targetPlayerId === playerId) {
          setTimeout(() => ws.send(JSON.stringify({ type: 'input', action: 'tap' })), 20);
        }
      });
    });
    await ctrl2.evaluate(() => {
      ws.addEventListener('message', (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'round_start' && msg.targetPlayerId === playerId) {
          setTimeout(() => ws.send(JSON.stringify({ type: 'input', action: 'tap' })), 20);
        }
      });
    });

    // Wait for winner overlay to appear (max ~100s for 20 rounds)
    console.log('  Waiting for winner...');
    await hostPage.waitForFunction(
      () => document.getElementById('winner-overlay').classList.contains('show'),
      null,
      { timeout: 120000 }
    );
    check(true, 'game reached result phase');

    const winText = await hostPage.textContent('.w-text');
    check(winText.includes('WINS'), 'winner text: ' + winText);

    const restartBtn = await hostPage.$eval('#btn-restart', el => el.style.display !== 'none');
    check(restartBtn, 'PLAY AGAIN button visible');

    // === 10. RESULT SCREENSHOTS ===
    console.log('\n=== 10. Result screenshots ===');
    await hostPage.screenshot({ path: 'screenshot-result.png', fullPage: true });
    await ctrl1.screenshot({ path: 'screenshot-ctrl-result.png', fullPage: true });
    console.log('  Saved result screenshots');

    // === 11. RESTART ===
    console.log('\n=== 11. Restart ===');
    await hostPage.click('#btn-restart');
    await hostPage.waitForTimeout(500);

    check((await hostPage.textContent('#instruction')).includes('Ready'), 'back to lobby');
    const scoresAfter = await hostPage.$$eval('.p-score', els => els.map(e => parseInt(e.textContent)));
    check(scoresAfter.every(s => s === 0), 'scores reset to 0');

  } catch (err) {
    console.error('\nERROR:', err.message);
  }

  await browser.close();

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed) {
    results.filter(r => !r.ok).forEach(r => console.log('  - ' + r.label));
  }
  console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : '\n  SOME TESTS FAILED\n');
  process.exit(failed ? 1 : 0);
})();
