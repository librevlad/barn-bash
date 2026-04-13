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
    // ============================================
    // PART A: Verify Color Smash still works
    // ============================================
    console.log('\n=== A. Color Smash regression ===');

    const host = await browser.newPage();
    await host.goto(BASE + '/host/');
    await host.waitForTimeout(500);

    check(await host.textContent('h1') === 'COLOR SMASH', 'CS: title ok');

    const c1 = await browser.newPage();
    await c1.goto(BASE + '/controller/');
    await c1.waitForTimeout(400);
    const c2 = await browser.newPage();
    await c2.goto(BASE + '/controller/');
    await c2.waitForTimeout(400);

    check(await c1.textContent('#info') === 'Player 1', 'CS: ctrl1 joined');
    check(await c2.textContent('#info') === 'Player 2', 'CS: ctrl2 joined');

    await host.waitForTimeout(300);
    const csStart = await host.$eval('#btn-start', el => el.style.display !== 'none');
    check(csStart, 'CS: COLOR SMASH button visible');

    const csEscape = await host.$eval('#btn-escape', el => el.style.display !== 'none');
    check(csEscape, 'CS: ESCAPE THE FOX button visible');

    // Quick Color Smash round
    await host.click('#btn-start');
    await host.waitForTimeout(400);
    const csRound = await host.textContent('#round-info');
    check(csRound === 'ROUND 1', 'CS: round started');

    // Restart to go back to lobby
    // Wait for round to end
    await host.waitForTimeout(4000);
    // Send restart via WebSocket
    await host.evaluate(() => ws.send(JSON.stringify({ type: 'restart' })));
    await host.waitForTimeout(500);

    const csLobby = await host.textContent('#instruction');
    check(csLobby.includes('Ready'), 'CS: back to lobby');

    // ============================================
    // PART B: Select Escape the Fox
    // ============================================
    console.log('\n=== B. Game selection ===');

    // Click ESCAPE THE FOX → should navigate to /host-escape/
    await host.click('#btn-escape');
    await host.waitForURL('**/host-escape/**', { timeout: 5000 }).catch(() => {});
    await host.waitForTimeout(500);
    const hostUrl = host.url();
    check(hostUrl.includes('/host-escape'), 'navigated to /host-escape/');

    // ============================================
    // PART C: Escape the Fox lobby
    // ============================================
    console.log('\n=== C. Escape Fox lobby ===');

    await host.waitForTimeout(500);
    const efTitle = await host.textContent('#lobby h2');
    check(efTitle === 'ESCAPE THE FOX', 'EF: title shown');

    const efPlayers = await host.textContent('#lobby-players');
    check(efPlayers.includes('P1') && efPlayers.includes('P2'), 'EF: players shown in lobby');

    const efStart = await host.$eval('#btn-start', el => el.style.display !== 'none');
    check(efStart, 'EF: START button visible');

    // Screenshot lobby
    await host.screenshot({ path: 'screenshot-ef-lobby.png', fullPage: true });
    console.log('  Saved: screenshot-ef-lobby.png');

    // ============================================
    // PART D: Start Escape Fox game
    // ============================================
    console.log('\n=== D. Escape Fox game ===');

    await host.click('#btn-start');
    await host.waitForTimeout(800);

    // Lobby should be hidden
    const lobbyHidden = await host.$eval('#lobby', el => el.classList.contains('hidden'));
    check(lobbyHidden, 'EF: lobby hidden after start');

    // HUD should show
    const hudVisible = await host.$eval('#hud', el => el.style.display !== 'none');
    check(hudVisible, 'EF: HUD visible');

    // Check HUD content
    const dist = await host.textContent('#hud-distance');
    check(dist.includes('m'), 'EF: distance shown');

    const alive = await host.textContent('#hud-alive');
    check(alive.includes('alive'), 'EF: alive count shown');

    // Controller should show TAP TO JUMP
    const c1Status = await c1.textContent('#status');
    check(c1Status === 'TAP TO JUMP!', 'EF: ctrl shows TAP TO JUMP!');

    // Screenshot game
    await host.screenshot({ path: 'screenshot-ef-game.png', fullPage: true });
    console.log('  Saved: screenshot-ef-game.png');

    // ============================================
    // PART E: Test jump input
    // ============================================
    console.log('\n=== E. Jump input ===');

    // Controller 1 taps (jump)
    await c1.dispatchEvent('body', 'pointerdown');
    await host.waitForTimeout(200);

    // Score should show distance (not 0)
    const c1Score = await c1.textContent('#score');
    check(c1Score.includes('m'), 'EF: ctrl shows distance');

    // ============================================
    // PART F: Wait for game to end
    // ============================================
    console.log('\n=== F. Wait for elimination ===');

    // Don't tap — players will hit obstacles and be eliminated
    // Wait for game over (obstacles start at tick 40 = 2s, first hits around 5-6s)
    try {
      await host.waitForFunction(
        () => {
          const w = document.getElementById('winner-overlay');
          return w && w.classList.contains('show');
        },
        null,
        { timeout: 60000 }
      );
      check(true, 'EF: game reached result');

      const winText = await host.textContent('.w-text');
      check(winText.includes('SURVIVED') || winText.includes('NOBODY'), 'EF: winner text shown');
      console.log('  Result: ' + winText);

      // Controls should show
      const ctrlsVisible = await host.$eval('#controls', el => el.style.display !== 'none');
      check(ctrlsVisible, 'EF: result controls visible');

    } catch {
      check(false, 'EF: game reached result (timeout)');
    }

    // Screenshot result
    await host.screenshot({ path: 'screenshot-ef-result.png', fullPage: true });
    await c1.screenshot({ path: 'screenshot-ef-ctrl.png', fullPage: true });
    console.log('  Saved result screenshots');

    // ============================================
    // PART G: Restart and return to lobby
    // ============================================
    console.log('\n=== G. Restart ===');

    const btnAgain = await host.$('#btn-again');
    if (btnAgain) {
      await host.click('#btn-again');
      await host.waitForTimeout(500);
      const lobbyBack = await host.$eval('#lobby', el => !el.classList.contains('hidden'));
      check(lobbyBack, 'EF: back to lobby after restart');
    }

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
