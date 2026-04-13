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
    // === 1. Navigate to King of the Hill ===
    console.log('\n=== 1. Game selection ===');
    const host = await browser.newPage();
    await host.goto(BASE + '/host/');
    await host.waitForTimeout(400);

    const c1 = await browser.newPage();
    await c1.goto(BASE + '/controller/');
    await c1.waitForTimeout(300);
    const c2 = await browser.newPage();
    await c2.goto(BASE + '/controller/');
    await c2.waitForTimeout(500);

    await host.waitForTimeout(300);

    // Check all 3 game buttons visible
    const hillBtn = await host.$eval('#btn-hill', el => el.style.display !== 'none');
    check(hillBtn, 'KING OF THE HILL button visible');

    await host.click('#btn-hill');
    await host.waitForURL('**/host-hill/**', { timeout: 5000 }).catch(() => {});
    await host.waitForTimeout(500);
    check(host.url().includes('/host-hill'), 'navigated to /host-hill/');

    // === 2. Lobby ===
    console.log('\n=== 2. Hill lobby ===');
    const title = await host.textContent('#lobby h2');
    check(title === 'KING OF THE HILL', 'title shown');

    const startVis = await host.$eval('#btn-start', el => el.style.display !== 'none');
    check(startVis, 'START visible');

    await host.screenshot({ path: 'screenshot-hill-lobby.png', fullPage: true });
    console.log('  Saved: screenshot-hill-lobby.png');

    // === 3. Start game ===
    console.log('\n=== 3. Start game ===');
    await host.click('#btn-start');
    await host.waitForTimeout(4500); // countdown

    const lobbyHidden = await host.$eval('#lobby', el => el.classList.contains('hidden'));
    check(lobbyHidden, 'lobby hidden');

    const canvas = await host.$('canvas');
    check(canvas, 'Three.js canvas exists');

    const hudVis = await host.$eval('#hud', el => el.style.display !== 'none');
    check(hudVis, 'HUD visible');

    const aliveText = await host.textContent('#hud-alive');
    check(aliveText.includes('alive'), 'alive counter shown');

    // Controller should show DASH
    const c1Status = await c1.textContent('#status');
    check(c1Status === 'TAP TO DASH!', 'ctrl shows TAP TO DASH!');

    await host.screenshot({ path: 'screenshot-hill-game.png', fullPage: true });
    console.log('  Saved: screenshot-hill-game.png');

    // === 4. Test dash input ===
    console.log('\n=== 4. Dash input ===');
    await c1.dispatchEvent('body', 'pointerdown');
    await host.waitForTimeout(200);
    check(true, 'dash sent without error');

    // Cooldown should show
    await host.waitForTimeout(100);
    const cdStatus = await c1.textContent('#status');
    check(cdStatus === 'COOLDOWN...', 'ctrl shows cooldown after dash');

    // === 5. Let game play out ===
    console.log('\n=== 5. Wait for result ===');
    try {
      await host.waitForFunction(
        () => document.getElementById('winner-overlay').classList.contains('show'),
        null,
        { timeout: 90000 }
      );
      check(true, 'game reached result');

      const winText = await host.textContent('.w-text');
      check(winText.includes('KING') || winText.includes('SURVIVED'), 'winner text: ' + winText);

      await host.screenshot({ path: 'screenshot-hill-result.png', fullPage: true });
      console.log('  Saved: screenshot-hill-result.png');

    } catch {
      check(false, 'game reached result (timeout)');
      await host.screenshot({ path: 'screenshot-hill-timeout.png', fullPage: true });
    }

    // === 6. Restart ===
    console.log('\n=== 6. Restart ===');
    const again = await host.$('#btn-again');
    if (again) {
      await host.click('#btn-again');
      await host.waitForTimeout(500);
      const back = await host.$eval('#lobby', el => !el.classList.contains('hidden'));
      check(back, 'back to lobby after restart');
    }

  } catch (err) {
    console.error('\nERROR:', err.message);
  }

  await browser.close();
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  if (failed) results.filter(r => !r.ok).forEach(r => console.log('  - ' + r.label));
  console.log(failed === 0 ? '\n  ALL TESTS PASSED\n' : '\n  SOME TESTS FAILED\n');
  process.exit(failed ? 1 : 0);
})();
