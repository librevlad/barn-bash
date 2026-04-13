// ============================================================
// FRANTICS GRAND PRIX — QA Test Script
// Tests: connection, game selection, gameplay, items, drift,
//        collisions, laps, screenshots, console errors
// ============================================================

const { chromium } = require('playwright');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

const HOST = 'localhost:3000';
const WS_URL = `ws://${HOST}`;
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots-qa');

// Ensure screenshot directory
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// ---- Helpers ----

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function connectPlayer(name, character) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const messages = [];
    const messageCounts = {};
    let playerId = null;

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'join', name, character }));
    });

    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      messages.push(msg);
      messageCounts[msg.type] = (messageCounts[msg.type] || 0) + 1;

      if (msg.type === 'init') {
        playerId = msg.playerId;
        console.log(`  [PLAYER] ${name} (${character}) connected as id=${playerId}, color=${msg.color}`);
        resolve({ ws, playerId, name, character, messages, messageCounts });
      }
    });

    ws.on('error', (err) => reject(err));

    // Timeout for connection
    setTimeout(() => {
      if (!playerId) reject(new Error(`Player ${name} failed to connect within 5s`));
    }, 5000);
  });
}

function sendInput(player, action, extra = {}) {
  if (player.ws.readyState !== WebSocket.OPEN) return;
  player.ws.send(JSON.stringify({ type: 'input', action, ...extra }));
}

function selectGame(player, gameId) {
  if (player.ws.readyState !== WebSocket.OPEN) return;
  player.ws.send(JSON.stringify({ type: 'selectGame', gameId }));
}

async function takeScreenshot(page, name) {
  const filepath = path.join(SCREENSHOT_DIR, `race-${name}.png`);
  await page.screenshot({ path: filepath });
  console.log(`  [SCREENSHOT] ${filepath}`);
  return filepath;
}

// ---- Player Play Strategies ----

// Player 1: Aggressive — frequent swipes, uses items immediately
function aggressivePlay(player, tick) {
  // Steer frequently — every 300-600ms
  if (tick % 6 === 0) {
    const dir = Math.random() > 0.5 ? 'left' : 'right';
    sendInput(player, 'steer', { direction: dir });
  }
  if (tick % 6 === 3) {
    sendInput(player, 'steerNeutral');
  }
  // Use item immediately when picked up
  if (tick % 10 === 0) {
    sendInput(player, 'useItem');
  }
  // Occasional mini-boost
  if (tick % 25 === 0) {
    sendInput(player, 'useItem');
  }
}

// Player 2: Drift-focused — hold/release for drift boosts
function driftPlay(player, tick) {
  // Gentle steering
  if (tick % 12 === 0) {
    sendInput(player, 'steer', { direction: tick % 24 === 0 ? 'left' : 'right' });
  }
  if (tick % 12 === 6) {
    sendInput(player, 'steerNeutral');
  }
  // Drift pattern: start drift, hold 1s (20 ticks at 50ms), release
  // Cycle every 40 ticks (2s): 20 ticks drift, 20 ticks normal
  const driftPhase = tick % 40;
  if (driftPhase === 0) {
    sendInput(player, 'driftStart');
    sendInput(player, 'steer', { direction: 'right' });
  }
  if (driftPhase === 20) {
    sendInput(player, 'driftEnd'); // Should trigger drift boost (>10 ticks)
    sendInput(player, 'steerNeutral');
  }
  // Use items when available
  if (tick % 30 === 15) {
    sendInput(player, 'useItem');
  }
}

// Player 3: Balanced — mix of steering, occasional boosts
function balancedPlay(player, tick) {
  // Moderate steering
  if (tick % 8 === 0) {
    const dir = Math.sin(tick * 0.15) > 0 ? 'left' : 'right';
    sendInput(player, 'steer', { direction: dir });
  }
  if (tick % 8 === 4) {
    sendInput(player, 'steerNeutral');
  }
  // Occasional drift
  if (tick % 60 === 10) sendInput(player, 'driftStart');
  if (tick % 60 === 30) sendInput(player, 'driftEnd');
  // Use items sometimes
  if (tick % 20 === 0) {
    sendInput(player, 'useItem');
  }
  // Drop oil if holding it
  if (tick % 35 === 17) {
    sendInput(player, 'dropItem');
  }
}

// ---- Main Test ----

(async () => {
  console.log('==============================================');
  console.log('  FRANTICS GRAND PRIX — QA TEST');
  console.log('==============================================\n');

  const screenshots = [];
  const consoleErrors = [];
  const consoleWarnings = [];
  const allConsoleLogs = [];
  let page, browser;

  try {
    // ---- STEP 1: Connect 3 players ----
    console.log('[STEP 1] Connecting 3 players via WebSocket...');
    const p1 = await connectPlayer('Speedy', 'cat');
    const p2 = await connectPlayer('Drift King', 'frog');
    const p3 = await connectPlayer('Turbo', 'wolf');
    const allPlayers = [p1, p2, p3];
    console.log('  All 3 players connected successfully.\n');

    // ---- STEP 2: Select race game ----
    console.log('[STEP 2] Selecting race game...');
    // Need a "host" connection to select game
    const hostWs = new WebSocket(WS_URL);
    await new Promise((res, rej) => {
      hostWs.on('open', () => {
        hostWs.send(JSON.stringify({ type: 'selectGame', gameId: 'race' }));
        console.log('  Sent selectGame: race');
        res();
      });
      hostWs.on('error', rej);
    });
    await sleep(500);
    console.log('  Game selected.\n');

    // ---- STEP 3: Open host page with Playwright ----
    console.log('[STEP 3] Opening host page with Playwright...');
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage();

    // Monitor console errors
    page.on('console', (msg) => {
      const entry = { type: msg.type(), text: msg.text(), location: msg.location() };
      allConsoleLogs.push(entry);
      if (msg.type() === 'error') {
        consoleErrors.push(entry);
        console.log(`  [CONSOLE ERROR] ${msg.text()}`);
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(entry);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push({ type: 'pageerror', text: err.message, stack: err.stack });
      console.log(`  [PAGE ERROR] ${err.message}`);
    });

    await page.goto(`http://${HOST}/host-race/`, { waitUntil: 'load' });
    console.log('  Host page loaded.\n');

    // Wait for lobby to render with players
    await sleep(1500);
    screenshots.push(await takeScreenshot(page, '01-lobby'));

    // ---- STEP 4: Start the game ----
    console.log('[STEP 4] Starting the game via Start button...');
    // Wait for button to be visible
    const startBtnVisible = await page.isVisible('#btn-start');
    console.log(`  Start button visible: ${startBtnVisible}`);

    if (startBtnVisible) {
      await page.click('#btn-start');
      console.log('  Clicked START button.');
    } else {
      // Fallback: send start via WS
      console.log('  Start button not visible, sending via WebSocket...');
      hostWs.send(JSON.stringify({ type: 'start' }));
    }

    // Wait for countdown
    await sleep(1000);
    screenshots.push(await takeScreenshot(page, '02-countdown'));
    await sleep(2500);
    screenshots.push(await takeScreenshot(page, '03-race-start'));
    console.log('  Game started!\n');

    // ---- STEP 5: Play for 35+ seconds with varied inputs ----
    console.log('[STEP 5] Playing the race for ~40 seconds...');
    const PLAY_TICKS = 800; // 800 * 50ms = 40s
    const TICK_INTERVAL = 50;
    let screenshotCounter = 4;
    let lastScreenshotTime = Date.now();
    const SCREENSHOT_INTERVAL = 4000; // Every 4 seconds

    for (let tick = 0; tick < PLAY_TICKS; tick++) {
      // Player 1: Aggressive
      if (tick % 6 === 0 || tick % 10 === 0 || tick % 25 === 0) {
        aggressivePlay(p1, tick);
      }

      // Player 2: Drift-focused
      if (tick % 4 === 0 || tick % 40 === 0 || tick % 40 === 20) {
        driftPlay(p2, tick);
      }

      // Player 3: Balanced
      if (tick % 5 === 0 || tick % 60 === 10 || tick % 60 === 30 || tick % 20 === 0) {
        balancedPlay(p3, tick);
      }

      // Screenshots every 4 seconds
      const now = Date.now();
      if (now - lastScreenshotTime >= SCREENSHOT_INTERVAL) {
        const padNum = String(screenshotCounter).padStart(2, '0');
        screenshots.push(await takeScreenshot(page, `${padNum}-gameplay-t${Math.floor(tick * TICK_INTERVAL / 1000)}s`));
        screenshotCounter++;
        lastScreenshotTime = now;
      }

      await sleep(TICK_INTERVAL);
    }

    console.log('  Gameplay phase complete.\n');

    // ---- Take final screenshots ----
    screenshots.push(await takeScreenshot(page, `${screenshotCounter}-final`));
    screenshotCounter++;

    // Wait a bit more for game_over
    console.log('[STEP 6] Waiting for game_over or timeout...');
    await sleep(5000);
    screenshots.push(await takeScreenshot(page, `${screenshotCounter}-post-game`));
    screenshotCounter++;

    // ---- STEP 7: Collect and analyze messages ----
    console.log('\n[STEP 7] Message analysis per player:');
    for (const p of allPlayers) {
      console.log(`\n  --- ${p.name} (id=${p.playerId}) ---`);
      console.log('  Message type counts:');
      for (const [type, count] of Object.entries(p.messageCounts).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${type}: ${count}`);
      }
    }

    // ---- STEP 8: Console error report ----
    console.log('\n[STEP 8] Console error report:');
    console.log(`  Errors: ${consoleErrors.length}`);
    for (const e of consoleErrors) {
      console.log(`    [${e.type}] ${e.text}`);
    }
    console.log(`  Warnings: ${consoleWarnings.length}`);

    // ---- STEP 9: Item events ----
    console.log('\n[STEP 9] Item event verification:');
    for (const p of allPlayers) {
      const pickups = p.messages.filter(m => m.type === 'item_pickup');
      const used = p.messages.filter(m => m.type === 'item_used');
      console.log(`  ${p.name}: pickups=${pickups.length}, used=${used.length}`);
      if (pickups.length > 0) console.log(`    First pickup: ${JSON.stringify(pickups[0])}`);
      if (used.length > 0) console.log(`    First used: ${JSON.stringify(used[0])}`);
    }

    // ---- STEP 10: Drift boost events ----
    console.log('\n[STEP 10] Drift boost verification:');
    for (const p of allPlayers) {
      const drifts = p.messages.filter(m => m.type === 'drift_boost');
      console.log(`  ${p.name}: drift_boost events=${drifts.length}`);
      if (drifts.length > 0) console.log(`    First: ${JSON.stringify(drifts[0])}`);
    }

    // ---- STEP 11: Collision/bump events ----
    console.log('\n[STEP 11] Collision (bump) verification:');
    for (const p of allPlayers) {
      const bumps = p.messages.filter(m => m.type === 'bump');
      console.log(`  ${p.name}: bump events=${bumps.length}`);
    }

    // ---- STEP 12: Lap completion events ----
    console.log('\n[STEP 12] Lap completion verification:');
    for (const p of allPlayers) {
      const laps = p.messages.filter(m => m.type === 'lap_complete');
      console.log(`  ${p.name}: lap_complete events=${laps.length}`);
      for (const l of laps) console.log(`    ${JSON.stringify(l)}`);
    }

    // ---- STEP 13: Game over ----
    console.log('\n[STEP 13] Game over verification:');
    for (const p of allPlayers) {
      const gameOvers = p.messages.filter(m => m.type === 'game_over');
      console.log(`  ${p.name}: game_over events=${gameOvers.length}`);
      if (gameOvers.length > 0) console.log(`    ${JSON.stringify(gameOvers[0])}`);
    }

    // Check for race_finish events
    console.log('\n  Race finish events:');
    for (const p of allPlayers) {
      const finishes = p.messages.filter(m => m.type === 'race_finish');
      console.log(`  ${p.name}: race_finish=${finishes.length}`);
      for (const f of finishes) console.log(`    ${JSON.stringify(f)}`);
    }

    // Check for stunned events
    console.log('\n  Stun events:');
    for (const p of allPlayers) {
      const stuns = p.messages.filter(m => m.type === 'player_stunned');
      console.log(`  ${p.name}: player_stunned=${stuns.length}`);
      for (const s of stuns) console.log(`    reason=${s.reason}, playerId=${s.playerId}`);
    }

    // ---- Summary of game state from last state message ----
    console.log('\n[SUMMARY] Final game state from last state message:');
    for (const p of allPlayers) {
      const stateMessages = p.messages.filter(m => m.type === 'state' && m.gameId === 'race');
      if (stateMessages.length > 0) {
        const lastState = stateMessages[stateMessages.length - 1].gameState;
        console.log(`  Phase: ${lastState.phase}`);
        console.log(`  Finish order: ${JSON.stringify(lastState.finishOrder)}`);
        console.log(`  Winner: ${lastState.winner}`);
        console.log('  Players:');
        for (const [id, pd] of Object.entries(lastState.players)) {
          console.log(`    id=${id}: name=${pd.name}, lap=${pd.lap}, finished=${pd.finished}, score=${pd.score}, x=${pd.x?.toFixed(2)}, z=${pd.z?.toFixed(2)}`);
        }
        break; // Only need one player's view
      }
    }

    console.log(`\n  Total screenshots taken: ${screenshots.length}`);
    console.log(`  Total console errors: ${consoleErrors.length}`);
    console.log(`  Total console warnings: ${consoleWarnings.length}`);

    // ---- Cleanup ----
    for (const p of allPlayers) {
      if (p.ws.readyState === WebSocket.OPEN) p.ws.close();
    }
    if (hostWs.readyState === WebSocket.OPEN) hostWs.close();

    console.log('\n==============================================');
    console.log('  QA TEST COMPLETE');
    console.log('==============================================\n');

  } catch (err) {
    console.error('TEST FAILED:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
