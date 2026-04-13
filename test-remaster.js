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
    // === 1. Navigate to Escape Fox via game selector ===
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
    await host.click('.game-card[data-game="escapeFox"]');
    await host.waitForURL('**/host-escape/**', { timeout: 5000 }).catch(() => {});
    await host.waitForTimeout(1000);
    check(host.url().includes('/host-escape'), 'navigated to escape');

    // === 2. Lobby ===
    console.log('\n=== 2. Lobby ===');
    const title = await host.textContent('#lobby h2');
    check(title === 'ESCAPE THE FOX', 'title shown');

    // Wait for GLTF models to load (up to 30s)
    console.log('  Waiting for models to load...');
    try {
      await host.waitForFunction(
        () => document.getElementById('btn-start').style.display !== 'none',
        null, { timeout: 30000 }
      );
      check(true, 'START visible (models loaded)');
    } catch {
      check(false, 'START visible (model load timeout)');
    }

    await host.screenshot({ path: 'screenshot-remaster-lobby.png', fullPage: true });
    console.log('  Saved: screenshot-remaster-lobby.png');

    // === 3. Start game ===
    console.log('\n=== 3. Start game ===');
    await host.click('#btn-start');
    await host.waitForTimeout(2000);

    const lobbyHidden = await host.$eval('#lobby', el => el.classList.contains('hidden'));
    check(lobbyHidden, 'lobby hidden');

    // Wait for HUD to appear after countdown (dynamic wait)
    try {
      await host.waitForFunction(() => document.getElementById('hud').style.display !== 'none', null, { timeout: 8000 });
      check(true, 'HUD visible');
    } catch { check(false, 'HUD visible'); }

    // Check canvas exists (Three.js rendered)
    const canvasExists = await host.$('canvas');
    check(canvasExists, 'Three.js canvas exists');

    // Check HUD content
    const dist = await host.textContent('#hud-distance');
    check(dist.includes('m'), 'distance display');

    const alive = await host.textContent('#hud-alive');
    check(alive.includes('2/2'), 'alive count');

    // Controller shows jump status
    const cStatus = await c1.textContent('#status');
    check(cStatus === 'TAP TO JUMP!', 'ctrl shows TAP TO JUMP');

    await host.screenshot({ path: 'screenshot-remaster-game.png', fullPage: true });
    console.log('  Saved: screenshot-remaster-game.png');

    // === 4. Test jump ===
    console.log('\n=== 4. Jump input ===');
    await c1.dispatchEvent('body', 'pointerdown');
    await host.waitForTimeout(200);
    check(true, 'jump sent without error');

    // === 5. Wait a bit and take another screenshot showing progress ===
    console.log('\n=== 5. Mid-game screenshot ===');
    await host.waitForTimeout(3000);
    await host.screenshot({ path: 'screenshot-remaster-midgame.png', fullPage: true });
    console.log('  Saved: screenshot-remaster-midgame.png');

    const dist2 = await host.textContent('#hud-distance');
    const distNum = parseInt(dist2);
    check(distNum > 10, 'distance progressing (' + dist2 + ')');

    // === 6. Wait for game end ===
    console.log('\n=== 6. Wait for result ===');
    try {
      await host.waitForFunction(
        () => document.getElementById('winner-overlay').classList.contains('show'),
        null,
        { timeout: 60000 }
      );
      check(true, 'game ended');

      const winText = await host.textContent('.w-text');
      check(winText.includes('SURVIVED') || winText.includes('NOBODY'), 'winner shown: ' + winText);

      await host.screenshot({ path: 'screenshot-remaster-result.png', fullPage: true });
      console.log('  Saved: screenshot-remaster-result.png');

      // === 7. Restart ===
      console.log('\n=== 7. Restart ===');
      await host.click('#btn-again');
      await host.waitForTimeout(500);
      const lobbyBack = await host.$eval('#lobby', el => !el.classList.contains('hidden'));
      check(lobbyBack, 'back to lobby');

    } catch {
      check(false, 'game ended (timeout)');
      await host.screenshot({ path: 'screenshot-remaster-timeout.png', fullPage: true });
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
