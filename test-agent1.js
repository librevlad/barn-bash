// ============================================================
// Frantics QA Agent #1 — Escape the Fox + King of the Hill
// Full gameplay simulation with 2 WS players + Playwright host
// ============================================================

const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';
const SS_DIR = path.join(__dirname, 'screenshots-qa');

// Ensure screenshot dir
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

// ============================================================
// Utility
// ============================================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
let ssIdx = 0;

async function screenshot(page, label) {
  ssIdx++;
  const name = `agent1-${String(ssIdx).padStart(2, '0')}-${label}.png`;
  const fpath = path.join(SS_DIR, name);
  await page.screenshot({ path: fpath, fullPage: true });
  console.log(`  [SCREENSHOT] ${name}`);
  return fpath;
}

// ============================================================
// WS Player Helper
// ============================================================
class WSPlayer {
  constructor(name, character) {
    this.name = name;
    this.character = character;
    this.ws = null;
    this.playerId = null;
    this.messages = [];
    this.stateUpdates = [];
    this.events = [];
    this.lastState = null;
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);
      this.ws.on('open', () => {
        this.ws.send(JSON.stringify({ type: 'join', name: this.name, character: this.character }));
        this.connected = true;
      });
      this.ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        this.messages.push(msg);
        if (msg.type === 'init') {
          this.playerId = msg.playerId;
          console.log(`  [${this.name}] Joined as player ${this.playerId} (${msg.character})`);
          resolve();
        }
        if (msg.type === 'state') {
          this.lastState = msg.gameState;
          this.stateUpdates.push({ time: Date.now(), state: msg.gameState, gameId: msg.gameId });
        }
        if (msg.type !== 'state' && msg.type !== 'init') {
          this.events.push({ time: Date.now(), ...msg });
        }
      });
      this.ws.on('error', reject);
      setTimeout(() => reject(new Error(`${this.name} connect timeout`)), 5000);
    });
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  jump() { this.send({ type: 'input', action: 'jump' }); }
  jumpStart() { this.send({ type: 'input', action: 'jumpStart' }); }
  jumpEnd() { this.send({ type: 'input', action: 'jumpEnd' }); }
  slide() { this.send({ type: 'input', action: 'slide' }); }
  laneLeft() { this.send({ type: 'input', action: 'lane', direction: 'left' }); }
  laneRight() { this.send({ type: 'input', action: 'lane', direction: 'right' }); }
  dash() { this.send({ type: 'input', action: 'dash' }); }
  dashDir(dir) { this.send({ type: 'input', action: 'dashDir', direction: dir }); }
  shield() { this.send({ type: 'input', action: 'shield' }); }
  shieldEnd() { this.send({ type: 'input', action: 'shieldEnd' }); }
  groundPound() { this.send({ type: 'input', action: 'groundPound' }); }

  isAlive() {
    if (!this.lastState || !this.lastState.players) return false;
    const me = this.lastState.players[this.playerId];
    return me && me.alive;
  }

  getPhase() {
    return this.lastState ? this.lastState.phase : 'unknown';
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

// ============================================================
// MAIN
// ============================================================
(async () => {
  const consoleErrors = [];
  const observations = [];

  console.log('\n========================================');
  console.log(' FRANTICS QA AGENT #1 — FULL PLAYTEST');
  console.log('========================================\n');

  // --- Launch browser ---
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const host = await context.newPage();

  // Capture console errors
  host.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ page: host.url(), text: msg.text(), time: Date.now() });
    }
  });
  host.on('pageerror', err => {
    consoleErrors.push({ page: host.url(), text: err.message, time: Date.now() });
  });

  try {
    // ========================================================
    // PHASE 1: LOBBY
    // ========================================================
    console.log('--- PHASE 1: LOBBY ---');
    await host.goto(BASE + '/host/', { waitUntil: 'networkidle' });
    await sleep(1000);

    const title = await host.textContent('.lobby-title');
    console.log(`  Lobby title: "${title}"`);
    observations.push(`Lobby title: "${title}"`);

    await screenshot(host, 'lobby-empty');

    // --- Connect players ---
    console.log('\n--- Connecting players ---');
    const luna = new WSPlayer('Luna', 'cat');
    const rex = new WSPlayer('Rex', 'wolf');

    await luna.connect();
    await sleep(300);
    await rex.connect();
    await sleep(800);

    await screenshot(host, 'lobby-2players');

    // Check narrator reacted to joins
    const narratorText = await host.textContent('#narrator-idle').catch(() => '');
    console.log(`  Narrator says: ${narratorText}`);
    observations.push(`Narrator on join: "${narratorText}"`);

    // Check player cards rendered
    const lobbyHTML = await host.innerHTML('#lobby-players');
    const lunaVisible = lobbyHTML.includes('Luna');
    const rexVisible = lobbyHTML.includes('Rex');
    console.log(`  Luna visible in lobby: ${lunaVisible}`);
    console.log(`  Rex visible in lobby: ${rexVisible}`);
    observations.push(`Players in lobby: Luna=${lunaVisible}, Rex=${rexVisible}`);

    // Check game cards enabled
    const escapeDisabled = await host.$eval('[data-game="escapeFox"]', el => el.classList.contains('disabled'));
    console.log(`  Escape Fox card disabled: ${escapeDisabled}`);
    observations.push(`Game cards enabled with 2 players: ${!escapeDisabled}`);

    // ========================================================
    // PHASE 2: ESCAPE THE FOX
    // ========================================================
    console.log('\n--- PHASE 2: ESCAPE THE FOX ---');

    // Select Escape the Fox
    await host.click('[data-game="escapeFox"]');
    await sleep(500);

    // Wait for navigation to /host-escape/
    try {
      await host.waitForURL('**/host-escape/**', { timeout: 5000 });
      console.log('  Navigated to /host-escape/');
    } catch {
      console.log('  URL: ' + host.url());
    }
    await sleep(1500);

    await screenshot(host, 'escape-lobby');

    // Check lobby elements
    const efTitle = await host.textContent('#lobby h2').catch(() => 'N/A');
    console.log(`  Escape Fox title: "${efTitle}"`);
    observations.push(`Escape Fox lobby title: "${efTitle}"`);

    // Start the game
    console.log('\n  Starting Escape the Fox...');
    const startVisible = await host.$eval('#btn-start', el => el.style.display !== 'none').catch(() => false);
    if (startVisible) {
      await host.click('#btn-start');
    } else {
      // Fallback: send start via WS
      luna.send({ type: 'start' });
    }
    await sleep(500);

    await screenshot(host, 'escape-countdown');

    // Wait for countdown to finish
    await sleep(3500);

    console.log('  Game running!');
    await screenshot(host, 'escape-running-start');

    // Check HUD
    const hudVisible = await host.$eval('#hud', el => el.style.display !== 'none').catch(() => false);
    console.log(`  HUD visible: ${hudVisible}`);
    observations.push(`Escape Fox HUD visible after countdown: ${hudVisible}`);

    if (hudVisible) {
      const dist = await host.textContent('#hud-distance').catch(() => '?');
      const alive = await host.textContent('#hud-alive').catch(() => '?');
      const speed = await host.textContent('#hud-speed').catch(() => '?');
      console.log(`  HUD distance: ${dist}, alive: ${alive}, speed: ${speed}`);
      observations.push(`HUD initial: dist=${dist}, alive=${alive}, speed=${speed}`);
    }

    // ---- GAMEPLAY SIMULATION: 18 seconds ----
    console.log('\n  --- Simulating 18s of gameplay ---');
    const escapeStart = Date.now();
    let screenshotTimer = Date.now();
    let escapeScreenshots = 0;
    let lunaActions = 0, rexActions = 0;

    // Luna (cat) strategy: frequent jumps, occasional slides, lane changes
    // Rex (wolf) strategy: some jumps, slides (wolf has Long Slide), fewer lane changes, some mistakes

    const gameLoop = async () => {
      const elapsed = (Date.now() - escapeStart) / 1000;

      // Luna: skilled player, varied actions
      if (luna.isAlive()) {
        if (elapsed % 1.0 < 0.08) { luna.jumpStart(); lunaActions++; }
        if (elapsed % 1.0 > 0.3 && elapsed % 1.0 < 0.38) { luna.jumpEnd(); }
        if (elapsed % 2.5 < 0.08) { luna.slide(); lunaActions++; }
        if (elapsed % 3.0 < 0.08) { luna.laneRight(); lunaActions++; }
        if (elapsed % 4.5 < 0.08) { luna.laneLeft(); lunaActions++; }
        // Double jump attempt
        if (elapsed % 1.5 > 0.4 && elapsed % 1.5 < 0.48) { luna.jump(); lunaActions++; }
      }

      // Rex: weaker player, occasional jumps, fewer slides
      if (rex.isAlive()) {
        if (elapsed % 1.8 < 0.08) { rex.jump(); rexActions++; }
        if (elapsed % 4.0 < 0.08) { rex.slide(); rexActions++; }
        if (elapsed % 5.0 < 0.08) { rex.laneLeft(); rexActions++; }
        // Intentional miss: Rex sometimes does nothing for stretches
      }

      // Screenshot every ~3 seconds
      if (Date.now() - screenshotTimer > 3000) {
        escapeScreenshots++;
        await screenshot(host, `escape-gameplay-${escapeScreenshots}`);
        screenshotTimer = Date.now();

        // Gather observations from page
        const dist = await host.textContent('#hud-distance').catch(() => '?');
        const alive = await host.textContent('#hud-alive').catch(() => '?');
        const speed = await host.textContent('#hud-speed').catch(() => '?');
        const msg = await host.textContent('#message').catch(() => '');
        const msgVisible = await host.$eval('#message', el => el.classList.contains('show')).catch(() => false);
        console.log(`    [${elapsed.toFixed(1)}s] dist=${dist} alive=${alive} speed=${speed} msg=${msgVisible ? msg : '(hidden)'}`);
        observations.push(`Escape @${elapsed.toFixed(1)}s: dist=${dist}, alive=${alive}, speed=${speed}${msgVisible ? ', msg=' + msg : ''}`);

        // Check fox proximity warning
        const foxWarning = speed && speed.includes('FOX');
        if (foxWarning) observations.push(`Fox warning visible at ${elapsed.toFixed(1)}s`);
      }
    };

    // Run game loop for ~20 seconds with fixed-interval actions
    let escapeEnded = false;
    const escapeMaxDuration = 22000;

    while (!escapeEnded && (Date.now() - escapeStart) < escapeMaxDuration) {
      const phase = luna.getPhase();
      if (phase === 'result') { escapeEnded = true; break; }

      const elapsed = (Date.now() - escapeStart) / 1000;

      // Luna: skilled player
      if (luna.isAlive()) {
        const t = Math.floor(elapsed * 10);
        if (t % 10 === 0) { luna.jumpStart(); lunaActions++; }
        if (t % 10 === 3) { luna.jumpEnd(); }
        if (t % 25 === 0) { luna.slide(); lunaActions++; }
        if (t % 30 === 0) { luna.laneRight(); lunaActions++; }
        if (t % 45 === 0) { luna.laneLeft(); lunaActions++; }
        if (t % 15 === 7) { luna.jump(); lunaActions++; } // double jump
      }

      // Rex: weaker player
      if (rex.isAlive()) {
        const t = Math.floor(elapsed * 10);
        if (t % 18 === 0) { rex.jump(); rexActions++; }
        if (t % 40 === 0) { rex.slide(); rexActions++; }
        if (t % 50 === 0) { rex.laneLeft(); rexActions++; }
      }

      // Screenshot every ~3 seconds
      if (Date.now() - screenshotTimer > 3000) {
        escapeScreenshots++;
        await screenshot(host, `escape-gameplay-${escapeScreenshots}`);
        screenshotTimer = Date.now();

        const dist = await host.textContent('#hud-distance').catch(() => '?');
        const alive = await host.textContent('#hud-alive').catch(() => '?');
        const speed = await host.textContent('#hud-speed').catch(() => '?');
        const msg = await host.textContent('#message').catch(() => '');
        const msgVisible = await host.$eval('#message', el => el.classList.contains('show')).catch(() => false);
        console.log(`    [${elapsed.toFixed(1)}s] dist=${dist} alive=${alive} speed=${speed} msg=${msgVisible ? msg : '(hidden)'}`);
        observations.push(`Escape @${elapsed.toFixed(1)}s: dist=${dist}, alive=${alive}, speed=${speed}${msgVisible ? ', msg=' + msg : ''}`);

        const foxWarning = speed && speed.includes('FOX');
        if (foxWarning) observations.push(`Fox warning visible at ${elapsed.toFixed(1)}s`);
      }

      await sleep(100);
    }
    await sleep(500);

    console.log(`\n  Escape Fox ended. Luna actions: ${lunaActions}, Rex actions: ${rexActions}`);
    observations.push(`Escape Fox ended after ${((Date.now() - escapeStart) / 1000).toFixed(1)}s. Luna actions: ${lunaActions}, Rex: ${rexActions}`);

    // Analyze events
    const lunaEvents = luna.events.filter(e => e.gameId === 'escapeFox');
    const rexEvents = rex.events.filter(e => e.gameId === 'escapeFox');
    const allEvents = [...lunaEvents, ...rexEvents];
    const eventTypes = {};
    allEvents.forEach(e => { eventTypes[e.type] = (eventTypes[e.type] || 0) + 1; });
    console.log(`  Event types received: ${JSON.stringify(eventTypes)}`);
    observations.push(`Escape events: ${JSON.stringify(eventTypes)}`);

    // Check stumbles
    const stumbles = allEvents.filter(e => e.type === 'stumble');
    console.log(`  Stumbles: ${stumbles.length}`);
    observations.push(`Stumbles occurred: ${stumbles.length}`);

    // Check eliminations
    const elims = allEvents.filter(e => e.type === 'eliminated');
    console.log(`  Eliminations: ${elims.length}`);
    observations.push(`Eliminations: ${elims.length}`);

    // Check near misses
    const nearMisses = allEvents.filter(e => e.type === 'near_miss');
    console.log(`  Near misses: ${nearMisses.length}`);
    observations.push(`Near misses: ${nearMisses.length}`);

    // Check powerups
    const powerups = allEvents.filter(e => e.type === 'powerup_collected');
    console.log(`  Powerups collected: ${powerups.length}`);
    observations.push(`Powerups collected: ${powerups.length}`);

    // Check fox events
    const foxEvents = allEvents.filter(e => e.type.startsWith('fox_'));
    console.log(`  Fox events: ${foxEvents.map(e => e.type).join(', ') || 'none'}`);
    observations.push(`Fox events: ${foxEvents.map(e => e.type).join(', ') || 'none'}`);

    // Game over details
    const gameOver = allEvents.find(e => e.type === 'game_over');
    if (gameOver) {
      console.log(`  Winner: player ${gameOver.winnerId}`);
      observations.push(`Escape winner: player ${gameOver.winnerId}`);
    }

    // Screenshot result
    await screenshot(host, 'escape-result');

    // Check winner overlay
    const winnerShown = await host.$eval('#winner-overlay', el => el.classList.contains('show')).catch(() => false);
    console.log(`  Winner overlay shown: ${winnerShown}`);
    observations.push(`Winner overlay displayed: ${winnerShown}`);

    if (winnerShown) {
      const winText = await host.textContent('#winner-overlay').catch(() => '?');
      console.log(`  Result text: ${winText.trim().substring(0, 80)}`);
      observations.push(`Result: ${winText.trim().substring(0, 80)}`);
    }

    // ========================================================
    // PHASE 3: SWITCH TO KING OF THE HILL
    // ========================================================
    console.log('\n--- PHASE 3: SWITCH TO KING OF THE HILL ---');

    // Restart and go to lobby
    luna.send({ type: 'restart' });
    await sleep(800);

    // Select Hill King
    luna.send({ type: 'selectGame', gameId: 'hillKing' });
    await sleep(500);

    // Wait for navigation
    try {
      await host.waitForURL('**/host-hill/**', { timeout: 5000 });
      console.log('  Navigated to /host-hill/');
    } catch {
      console.log('  URL after select: ' + host.url());
      // Force navigate
      await host.goto(BASE + '/host-hill/', { waitUntil: 'networkidle' });
      await sleep(500);
    }
    await sleep(1500);

    await screenshot(host, 'hill-lobby');

    // Check hill lobby
    const hillTitle = await host.textContent('#lobby h2').catch(() => 'N/A');
    console.log(`  Hill King title: "${hillTitle}"`);
    observations.push(`Hill King lobby title: "${hillTitle}"`);

    // Start King of the Hill
    console.log('\n  Starting King of the Hill...');
    const hillStartBtn = await host.$eval('#btn-start', el => el.style.display !== 'none').catch(() => false);
    if (hillStartBtn) {
      await host.click('#btn-start');
    } else {
      luna.send({ type: 'start' });
    }
    await sleep(500);

    await screenshot(host, 'hill-countdown');
    await sleep(3500);

    console.log('  Hill King running!');
    await screenshot(host, 'hill-running-start');

    // Check HUD
    const hillHudVisible = await host.$eval('#hud', el => el.style.display !== 'none').catch(() => false);
    console.log(`  Hill HUD visible: ${hillHudVisible}`);
    observations.push(`Hill King HUD visible: ${hillHudVisible}`);

    if (hillHudVisible) {
      const hillAlive = await host.textContent('#hud-alive').catch(() => '?');
      const hillPlat = await host.textContent('#hud-plat').catch(() => '?');
      console.log(`  HUD alive: ${hillAlive}, platform: ${hillPlat}`);
      observations.push(`Hill HUD: alive=${hillAlive}, platform=${hillPlat}`);
    }

    // ---- HILL KING GAMEPLAY: 18 seconds ----
    console.log('\n  --- Simulating 18s of Hill King gameplay ---');
    const hillStart = Date.now();
    let hillScreenshots = 0;
    let hillScreenshotTimer = Date.now();
    let lunaHillActions = 0, rexHillActions = 0;
    let hillEnded = false;

    // Clear old events
    luna.events = [];
    rex.events = [];

    const hillGameLoop = async () => {
      const elapsed = (Date.now() - hillStart) / 1000;

      // Luna (cat - fast orbit): dashes, shields, directional dashes
      if (luna.isAlive()) {
        if (elapsed % 1.2 < 0.08) { luna.dash(); lunaHillActions++; }
        if (elapsed % 3.0 < 0.08) { luna.dashDir('left'); lunaHillActions++; }
        if (elapsed % 4.5 < 0.08) { luna.shield(); lunaHillActions++; }
        if (elapsed % 4.8 < 0.08) { luna.shieldEnd(); }
        if (elapsed % 6.0 < 0.08) { luna.dashDir('right'); lunaHillActions++; }
        if (elapsed % 7.0 < 0.08) { luna.groundPound(); lunaHillActions++; }
      }

      // Rex (wolf - strong push): more aggressive dashing, fewer shields
      if (rex.isAlive()) {
        if (elapsed % 1.0 < 0.08) { rex.dash(); rexHillActions++; }
        if (elapsed % 2.2 < 0.08) { rex.dashDir('up'); rexHillActions++; }
        if (elapsed % 3.5 < 0.08) { rex.dashDir('down'); rexHillActions++; }
        if (elapsed % 5.0 < 0.08) { rex.shield(); rexHillActions++; }
        if (elapsed % 5.3 < 0.08) { rex.shieldEnd(); }
        if (elapsed % 8.0 < 0.08) { rex.groundPound(); rexHillActions++; }
      }

      // Screenshot every ~3 seconds
      if (Date.now() - hillScreenshotTimer > 3000) {
        hillScreenshots++;
        await screenshot(host, `hill-gameplay-${hillScreenshots}`);
        hillScreenshotTimer = Date.now();

        const alive = await host.textContent('#hud-alive').catch(() => '?');
        const plat = await host.textContent('#hud-plat').catch(() => '?');
        const msg = await host.textContent('#message').catch(() => '');
        const msgVisible = await host.$eval('#message', el => el.classList.contains('show')).catch(() => false);
        console.log(`    [${elapsed.toFixed(1)}s] alive=${alive} plat=${plat} msg=${msgVisible ? msg : '(hidden)'}`);
        observations.push(`Hill @${elapsed.toFixed(1)}s: alive=${alive}, plat=${plat}${msgVisible ? ', msg=' + msg : ''}`);
      }
    };

    const hillMaxDuration = 22000;

    while (!hillEnded && (Date.now() - hillStart) < hillMaxDuration) {
      const phase = luna.getPhase();
      if (phase === 'result') { hillEnded = true; break; }

      const elapsed = (Date.now() - hillStart) / 1000;

      // Luna: dashes, shields, directional dashes
      if (luna.isAlive()) {
        const t = Math.floor(elapsed * 10);
        if (t % 12 === 0) { luna.dash(); lunaHillActions++; }
        if (t % 30 === 0) { luna.dashDir('left'); lunaHillActions++; }
        if (t % 45 === 0) { luna.shield(); lunaHillActions++; }
        if (t % 48 === 0) { luna.shieldEnd(); }
        if (t % 60 === 0) { luna.dashDir('right'); lunaHillActions++; }
        if (t % 70 === 0) { luna.groundPound(); lunaHillActions++; }
      }

      // Rex: aggressive dasher
      if (rex.isAlive()) {
        const t = Math.floor(elapsed * 10);
        if (t % 10 === 0) { rex.dash(); rexHillActions++; }
        if (t % 22 === 0) { rex.dashDir('up'); rexHillActions++; }
        if (t % 35 === 0) { rex.dashDir('down'); rexHillActions++; }
        if (t % 50 === 0) { rex.shield(); rexHillActions++; }
        if (t % 53 === 0) { rex.shieldEnd(); }
        if (t % 80 === 0) { rex.groundPound(); rexHillActions++; }
      }

      // Screenshot every ~3 seconds
      if (Date.now() - hillScreenshotTimer > 3000) {
        hillScreenshots++;
        await screenshot(host, `hill-gameplay-${hillScreenshots}`);
        hillScreenshotTimer = Date.now();

        const alive = await host.textContent('#hud-alive').catch(() => '?');
        const plat = await host.textContent('#hud-plat').catch(() => '?');
        const msg = await host.textContent('#message').catch(() => '');
        const msgVisible = await host.$eval('#message', el => el.classList.contains('show')).catch(() => false);
        console.log(`    [${elapsed.toFixed(1)}s] alive=${alive} plat=${plat} msg=${msgVisible ? msg : '(hidden)'}`);
        observations.push(`Hill @${elapsed.toFixed(1)}s: alive=${alive}, plat=${plat}${msgVisible ? ', msg=' + msg : ''}`);
      }

      await sleep(100);
    }
    await sleep(500);

    console.log(`\n  Hill King ended. Luna actions: ${lunaHillActions}, Rex actions: ${rexHillActions}`);
    observations.push(`Hill King ended after ${((Date.now() - hillStart) / 1000).toFixed(1)}s. Luna: ${lunaHillActions}, Rex: ${rexHillActions}`);

    // Analyze hill events
    const hillLunaEvents = luna.events.filter(e => e.gameId === 'hillKing');
    const hillRexEvents = rex.events.filter(e => e.gameId === 'hillKing');
    const allHillEvents = [...hillLunaEvents, ...hillRexEvents];
    const hillEventTypes = {};
    allHillEvents.forEach(e => { hillEventTypes[e.type] = (hillEventTypes[e.type] || 0) + 1; });
    console.log(`  Hill event types: ${JSON.stringify(hillEventTypes)}`);
    observations.push(`Hill events: ${JSON.stringify(hillEventTypes)}`);

    // Bumps
    const bumps = allHillEvents.filter(e => e.type === 'bump');
    console.log(`  Bumps: ${bumps.length}`);
    observations.push(`Bumps: ${bumps.length}`);

    // Teetering
    const teeters = allHillEvents.filter(e => e.type === 'teetering');
    console.log(`  Teetering events: ${teeters.length}`);
    observations.push(`Teetering: ${teeters.length}`);

    // Ground pounds
    const gpounds = allHillEvents.filter(e => e.type === 'ground_pound');
    console.log(`  Ground pounds: ${gpounds.length}`);
    observations.push(`Ground pounds: ${gpounds.length}`);

    // Platform shrinks
    const shrinks = allHillEvents.filter(e => e.type === 'platform_shrink');
    console.log(`  Platform shrinks: ${shrinks.length}`);
    observations.push(`Platform shrinks: ${shrinks.length}`);

    // Shield blocks
    const blocks = allHillEvents.filter(e => e.type === 'shieldBlock');
    console.log(`  Shield blocks: ${blocks.length}`);
    observations.push(`Shield blocks: ${blocks.length}`);

    // Near misses in hill
    const hillNM = allHillEvents.filter(e => e.type === 'near_miss');
    console.log(`  Near misses: ${hillNM.length}`);
    observations.push(`Hill near misses: ${hillNM.length}`);

    // Hill game over
    const hillGameOver = allHillEvents.find(e => e.type === 'game_over');
    if (hillGameOver) {
      console.log(`  Hill winner: player ${hillGameOver.winnerId}`);
      observations.push(`Hill winner: player ${hillGameOver.winnerId}`);
    }

    // Screenshot result
    await screenshot(host, 'hill-result');

    const hillWinnerShown = await host.$eval('#winner-overlay', el => el.classList.contains('show')).catch(() => false);
    console.log(`  Hill winner overlay shown: ${hillWinnerShown}`);
    observations.push(`Hill winner overlay: ${hillWinnerShown}`);

    if (hillWinnerShown) {
      const hillWinText = await host.textContent('#winner-overlay').catch(() => '?');
      console.log(`  Hill result: ${hillWinText.trim().substring(0, 80)}`);
      observations.push(`Hill result: ${hillWinText.trim().substring(0, 80)}`);
    }

    // ========================================================
    // PHASE 4: STATE SYNC ANALYSIS
    // ========================================================
    console.log('\n--- PHASE 4: STATE SYNC ANALYSIS ---');

    const lunaStateCount = luna.stateUpdates.length;
    const rexStateCount = rex.stateUpdates.length;
    console.log(`  Luna received ${lunaStateCount} state updates`);
    console.log(`  Rex received ${rexStateCount} state updates`);
    observations.push(`State updates: Luna=${lunaStateCount}, Rex=${rexStateCount}`);

    // Check for state divergence: did both players receive consistent game IDs?
    const lunaGameIds = [...new Set(luna.stateUpdates.map(s => s.gameId))];
    const rexGameIds = [...new Set(rex.stateUpdates.map(s => s.gameId))];
    console.log(`  Luna saw games: ${lunaGameIds.join(', ')}`);
    console.log(`  Rex saw games: ${rexGameIds.join(', ')}`);
    observations.push(`Game IDs seen: Luna=${lunaGameIds.join(',')}, Rex=${rexGameIds.join(',')}`);

    // Check update frequency
    if (luna.stateUpdates.length > 10) {
      const times = luna.stateUpdates.slice(-50).map(s => s.time);
      const intervals = [];
      for (let i = 1; i < times.length; i++) intervals.push(times[i] - times[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      console.log(`  Average state update interval: ${avgInterval.toFixed(0)}ms`);
      observations.push(`State update interval: ${avgInterval.toFixed(0)}ms (every 2 ticks = ~100ms expected)`);
    }

  } catch (err) {
    console.error('\n[FATAL ERROR]', err.message);
    consoleErrors.push({ page: 'script', text: err.message, time: Date.now() });
    await screenshot(host, 'error-state').catch(() => {});
  }

  // ========================================================
  // PHASE 5: REPORT
  // ========================================================
  console.log('\n\n========================================');
  console.log(' QA REPORT');
  console.log('========================================');

  console.log('\n--- CONSOLE ERRORS ---');
  if (consoleErrors.length === 0) {
    console.log('  None!');
  } else {
    consoleErrors.forEach(e => console.log(`  [${e.page}] ${e.text}`));
  }

  console.log('\n--- OBSERVATIONS ---');
  observations.forEach(o => console.log(`  * ${o}`));

  console.log('\n--- SCREENSHOTS TAKEN ---');
  const ssFiles = fs.readdirSync(SS_DIR).filter(f => f.startsWith('agent1-')).sort();
  ssFiles.forEach(f => console.log(`  ${f}`));
  console.log(`  Total: ${ssFiles.length} screenshots`);

  // Clean up
  try { luna.close(); } catch {}
  try { rex.close(); } catch {}
  await browser.close();

  console.log('\n========================================');
  console.log(' DONE — See screenshots in screenshots-qa/');
  console.log('========================================\n');
})();
