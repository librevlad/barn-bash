// ============================================================
// Frantics QA Agent 2 — Meteor Shower + Full Tournament
// ============================================================
const { chromium } = require('playwright');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';
const SS_DIR = path.join(__dirname, 'screenshots-qa');

if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });

let ssCount = 0;
async function screenshot(page, label) {
  ssCount++;
  const name = `agent2-${String(ssCount).padStart(2, '0')}-${label}.png`;
  await page.screenshot({ path: path.join(SS_DIR, name), fullPage: true });
  console.log(`  [SS] ${name}`);
  return name;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const consoleErrors = [];

// ============================================================
// WebSocket helpers
// ============================================================
function connectPlayer(name, character) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const messages = [];
    let playerId = null;
    ws.on('open', () => ws.send(JSON.stringify({ type: 'join', name, character })));
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        messages.push(msg);
        if (msg.type === 'init') {
          playerId = msg.playerId;
          console.log(`  [PLAYER] ${name} = P${playerId} (${character})`);
          resolve({ ws, playerId, messages, name, character });
        }
      } catch {}
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error(`${name} join timeout`)), 5000);
  });
}

function send(player, obj) {
  if (player.ws.readyState === WebSocket.OPEN)
    player.ws.send(JSON.stringify(obj));
}

function sendInput(player, action, extra = {}) {
  send(player, { type: 'input', action, ...extra });
}

// Wait for a specific message type from a player's message stream
function waitForMsg(player, type, timeout = 15000) {
  return new Promise((resolve) => {
    const baseline = player.messages.length;
    const start = Date.now();
    const iv = setInterval(() => {
      const found = player.messages.slice(baseline).find(m => m.type === type);
      if (found) { clearInterval(iv); resolve(found); }
      if (Date.now() - start > timeout) { clearInterval(iv); resolve(null); }
    }, 100);
  });
}

const DIRS = ['up', 'down', 'left', 'right'];

// ============================================================
// Gameplay simulators — all run for up to durationMs or until gameOver
// ============================================================
async function playMeteor(p1, p2, durationMs, p1Msgs) {
  const start = Date.now();
  let actions = 0;
  while (Date.now() - start < durationMs) {
    const t = Date.now() - start;
    // P1 (frog): dodge + move toward safe zone
    if (t % 300 < 50) { sendInput(p1, 'dodge'); actions++; }
    if (t % 500 < 50) { sendInput(p1, 'move', { direction: DIRS[Math.floor(Math.random() * 4)] }); actions++; }
    if (t % 1800 < 50) { sendInput(p1, 'push'); actions++; }
    // P2 (wolf): aggressive pushes + sprint
    if (t % 400 < 50) { sendInput(p2, 'move', { direction: DIRS[Math.floor(Math.random() * 4)] }); actions++; }
    if (t % 1000 < 50) { sendInput(p2, 'sprint'); actions++; }
    if (t % 700 < 50) { sendInput(p2, 'push'); actions++; }
    if (t % 1300 < 50) { sendInput(p2, 'dodge'); actions++; }
    await sleep(50);
    // Check game over
    if (p1Msgs && p1Msgs.slice(-10).some(m => m.type === 'game_over')) break;
  }
  console.log(`  [PLAY] meteor: ${actions} actions, ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function playEscape(p1, p2, durationMs, p1Msgs) {
  const start = Date.now();
  let actions = 0;
  while (Date.now() - start < durationMs) {
    const t = Date.now() - start;
    if (t % 500 < 50) { sendInput(p1, 'jumpStart'); setTimeout(() => sendInput(p1, 'jumpEnd'), 120); actions++; }
    if (t % 1100 < 50) { sendInput(p1, 'lane', { direction: Math.random() > 0.5 ? 'left' : 'right' }); actions++; }
    if (t % 1800 < 50) { sendInput(p1, 'slide'); actions++; }
    if (t % 600 < 50) { sendInput(p2, 'jump'); actions++; }
    if (t % 900 < 50) { sendInput(p2, 'slide'); actions++; }
    if (t % 1300 < 50) { sendInput(p2, 'lane', { direction: Math.random() > 0.5 ? 'left' : 'right' }); actions++; }
    await sleep(50);
    if (p1Msgs && p1Msgs.slice(-10).some(m => m.type === 'game_over')) break;
  }
  console.log(`  [PLAY] escape: ${actions} actions, ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function playHill(p1, p2, durationMs, p1Msgs) {
  const start = Date.now();
  let actions = 0;
  while (Date.now() - start < durationMs) {
    const t = Date.now() - start;
    if (t % 600 < 50) { sendInput(p1, 'dash'); actions++; }
    if (t % 1400 < 50) { sendInput(p1, 'shield'); setTimeout(() => sendInput(p1, 'shieldEnd'), 300); actions++; }
    if (t % 2000 < 50) { sendInput(p1, 'dashDir', { direction: DIRS[Math.floor(Math.random() * 4)] }); actions++; }
    if (t % 500 < 50) { sendInput(p2, 'dash'); actions++; }
    if (t % 900 < 50) { sendInput(p2, 'dashDir', { direction: DIRS[Math.floor(Math.random() * 4)] }); actions++; }
    if (t % 1800 < 50) { sendInput(p2, 'groundPound'); actions++; }
    await sleep(50);
    if (p1Msgs && p1Msgs.slice(-10).some(m => m.type === 'game_over')) break;
  }
  console.log(`  [PLAY] hill: ${actions} actions, ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

const GAME_PLAYERS = { meteor: playMeteor, escapeFox: playEscape, hillKing: playHill };
const GAME_URLS = { meteor: '/host-meteor/', escapeFox: '/host-escape/', hillKing: '/host-hill/' };
const GAME_NAMES = { meteor: 'Meteor Shower', escapeFox: 'Escape the Fox', hillKing: 'King of the Hill' };

// ============================================================
// Main
// ============================================================
(async () => {
  const report = { bugs: [], observations: [] };
  let browser, hostPage, p1, p2;

  try {
    console.log('\n========================================');
    console.log('  FRANTICS QA AGENT 2 — FULL PLAYTEST');
    console.log('========================================\n');

    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    hostPage = await ctx.newPage();
    hostPage.on('console', m => { if (m.type() === 'error') consoleErrors.push({ url: hostPage.url(), text: m.text() }); });
    hostPage.on('pageerror', e => consoleErrors.push({ url: hostPage.url(), text: e.message }));

    // ========================================================
    // PHASE 1: LOBBY
    // ========================================================
    console.log('--- PHASE 1: LOBBY ---');
    await hostPage.goto(BASE + '/host/', { waitUntil: 'networkidle' });
    await sleep(800);
    await screenshot(hostPage, 'lobby-empty');

    p1 = await connectPlayer('Zara', 'frog');
    await sleep(400);
    p2 = await connectPlayer('Kai', 'wolf');
    await sleep(1500);
    await screenshot(hostPage, 'lobby-2players');

    // Verify lobby content
    const lobbyHTML = await hostPage.content();
    const checks = {
      zaraName: lobbyHTML.includes('Zara'),
      kaiName: lobbyHTML.includes('Kai'),
      frogChar: lobbyHTML.includes('Frog') || lobbyHTML.includes('frog'),
      wolfChar: lobbyHTML.includes('Wolf') || lobbyHTML.includes('wolf'),
    };
    console.log(`  Lobby: ${JSON.stringify(checks)}`);
    report.observations.push(`Lobby names/chars: ${JSON.stringify(checks)}`);
    if (!checks.zaraName) report.bugs.push('Zara not shown in lobby');
    if (!checks.kaiName) report.bugs.push('Kai not shown in lobby');

    const uiState = await hostPage.evaluate(() => ({
      cards: Array.from(document.querySelectorAll('.game-card')).map(c => ({ game: c.dataset.game, disabled: c.classList.contains('disabled') })),
      tournamentEnabled: !document.getElementById('btn-tournament')?.classList.contains('disabled'),
      narratorQuip: document.getElementById('narrator-idle')?.textContent?.trim() || '',
    }));
    console.log(`  Cards: ${JSON.stringify(uiState.cards)}`);
    console.log(`  Tournament enabled: ${uiState.tournamentEnabled}`);
    console.log(`  Narrator: "${uiState.narratorQuip}"`);
    report.observations.push(`Game cards: ${JSON.stringify(uiState.cards)}`);
    report.observations.push(`Narrator quip: "${uiState.narratorQuip}"`);

    // ========================================================
    // PHASE 2: METEOR SHOWER (standalone)
    // ========================================================
    console.log('\n--- PHASE 2: METEOR SHOWER ---');
    send(p1, { type: 'selectGame', gameId: 'meteor' });

    try { await hostPage.waitForURL('**/host-meteor/**', { timeout: 5000 }); }
    catch { await hostPage.goto(BASE + '/host-meteor/', { waitUntil: 'networkidle' }); }
    await sleep(1500);
    console.log(`  Host at: ${hostPage.url()}`);
    await screenshot(hostPage, 'meteor-lobby');

    const mLobby = await hostPage.evaluate(() => ({
      visible: !document.getElementById('lobby')?.classList.contains('hidden'),
      title: document.querySelector('#lobby h2')?.textContent || '',
      players: document.getElementById('lobby-players')?.innerHTML || '',
      info: document.getElementById('lobby-info')?.textContent || '',
    }));
    console.log(`  Meteor lobby: ${mLobby.title}, info="${mLobby.info}"`);
    console.log(`  Players HTML: ${mLobby.players.substring(0, 120)}`);
    report.observations.push(`Meteor lobby: title="${mLobby.title}", visible=${mLobby.visible}`);

    // Start game
    send(p1, { type: 'start' });
    await sleep(800);
    await screenshot(hostPage, 'meteor-countdown');
    await sleep(3200);
    await screenshot(hostPage, 'meteor-running');

    // Track meteor events from P1's message stream
    const meteorBaseline = p1.messages.length;
    const meteorEvents = { warnings: 0, impacts: 0, eliminations: 0, singes: 0, pushes: 0, fireZones: 0, shrinks: 0, powerups: 0, shieldBreaks: 0, gameOver: false, winnerId: null };

    const mTracker = setInterval(() => {
      for (const m of p1.messages.slice(meteorBaseline)) {
        if (m._counted) continue; m._counted = true;
        if (m.type === 'meteor_warning') meteorEvents.warnings++;
        if (m.type === 'meteor_impact') meteorEvents.impacts++;
        if (m.type === 'eliminated') meteorEvents.eliminations++;
        if (m.type === 'singed') meteorEvents.singes++;
        if (m.type === 'push') meteorEvents.pushes++;
        if (m.type === 'fire_zone') meteorEvents.fireZones++;
        if (m.type === 'platform_shrink') meteorEvents.shrinks++;
        if (m.type === 'powerup_collected') meteorEvents.powerups++;
        if (m.type === 'shield_break') meteorEvents.shieldBreaks++;
        if (m.type === 'game_over') { meteorEvents.gameOver = true; meteorEvents.winnerId = m.winnerId; }
      }
    }, 150);

    // Play 20s with screenshots every 3s
    const mStart = Date.now();
    const mPlayPromise = playMeteor(p1, p2, 20000, p1.messages);
    let ssRound = 0;
    let lastSS = 0;

    while (Date.now() - mStart < 20000 && !meteorEvents.gameOver) {
      if (Date.now() - lastSS >= 3000) {
        ssRound++;
        await screenshot(hostPage, `meteor-play-${ssRound}`);
        const hud = await hostPage.evaluate(() => ({
          wave: document.getElementById('hud-wave')?.textContent || '',
          alive: document.getElementById('hud-alive')?.textContent || '',
          warn: document.getElementById('hud-warn')?.textContent || '',
          msg: document.getElementById('message')?.classList.contains('show') ? document.getElementById('message').textContent : '',
        }));
        console.log(`  HUD @${ssRound}: wave="${hud.wave}" alive="${hud.alive}" warn="${hud.warn}" msg="${hud.msg}"`);
        report.observations.push(`Meteor HUD @${ssRound}: ${JSON.stringify(hud)}`);
        lastSS = Date.now();
      }
      await sleep(300);
    }

    await mPlayPromise;
    clearInterval(mTracker);

    if (meteorEvents.gameOver) {
      console.log(`  Game over! Winner: P${meteorEvents.winnerId}`);
    }

    await sleep(1500);
    await screenshot(hostPage, 'meteor-result');

    const winOverlay = await hostPage.evaluate(() => {
      const wo = document.getElementById('winner-overlay');
      return { visible: wo?.classList.contains('show'), html: wo?.innerHTML?.substring(0, 200) || '' };
    });
    console.log(`  Winner overlay: visible=${winOverlay.visible}`);
    console.log(`  Content: ${winOverlay.html}`);
    report.observations.push(`Winner overlay: visible=${winOverlay.visible}`);

    console.log('\n  -- METEOR EVENTS --');
    for (const [k, v] of Object.entries(meteorEvents)) console.log(`  ${k}: ${v}`);
    report.observations.push(`Meteor events: warnings=${meteorEvents.warnings}, impacts=${meteorEvents.impacts}, elim=${meteorEvents.eliminations}`);

    // ========================================================
    // PHASE 3: RETURN TO LOBBY
    // ========================================================
    console.log('\n--- PHASE 3: RETURN TO LOBBY ---');
    send(p1, { type: 'restart' });
    await sleep(800);
    send(p1, { type: 'selectGame', gameId: 'escapeFox' });
    await sleep(800);
    await hostPage.goto(BASE + '/host/', { waitUntil: 'networkidle' });
    await sleep(1500);
    await screenshot(hostPage, 'lobby-return');

    // ========================================================
    // PHASE 4: TOURNAMENT
    // ========================================================
    console.log('\n--- PHASE 4: TOURNAMENT ---');

    // Record all incoming tournament messages
    const tBaseline = p1.messages.length;

    send(p1, { type: 'startTournament' });

    // Wait for the tournamentStarted message
    const tStartMsg = await waitForMsg(p1, 'tournamentStarted', 5000);
    console.log(`  Tournament started: ${tStartMsg ? 'yes, sequence=' + JSON.stringify(tStartMsg.sequence) : 'NO'}`);

    await sleep(1500);
    await screenshot(hostPage, 'tournament-start');

    const tResults = { gameSequence: [], rounds: [], champion: null };
    if (tStartMsg) tResults.gameSequence = tStartMsg.sequence;

    for (let round = 1; round <= 3; round++) {
      console.log(`\n  === ROUND ${round}/3 ===`);

      // Wait for tournamentRound message for this round
      let roundMsg = null;
      for (let tries = 0; tries < 30; tries++) {
        roundMsg = p1.messages.slice(tBaseline).find(m => m.type === 'tournamentRound' && m.round === round);
        if (roundMsg) break;
        await sleep(500);
      }
      const gameId = roundMsg ? roundMsg.gameId : tResults.gameSequence[(round - 1) % tResults.gameSequence.length] || 'unknown';
      console.log(`  Game: ${gameId} (${GAME_NAMES[gameId] || gameId})`);

      // Navigate host to correct page
      const targetUrl = GAME_URLS[gameId];
      if (targetUrl) {
        try { await hostPage.waitForURL(`**${targetUrl}**`, { timeout: 4000 }); }
        catch { await hostPage.goto(BASE + targetUrl, { waitUntil: 'networkidle' }); }
      }
      await sleep(1500);
      console.log(`  Host at: ${hostPage.url()}`);

      await screenshot(hostPage, `t-r${round}-${gameId}-pre`);

      // Check for tournament overlay
      const overlay = await hostPage.evaluate(() => {
        const o = document.getElementById('tournament-overlay');
        return o ? { visible: o.classList.contains('show'), text: o.textContent?.substring(0, 100) } : { visible: false, text: '' };
      });
      console.log(`  Tournament overlay: visible=${overlay.visible}, text="${overlay.text}"`);

      // Wait for auto-start (server sends start after 5s delay)
      // The game auto-starts, but the host page must have the WS connection
      await sleep(5000);

      await screenshot(hostPage, `t-r${round}-${gameId}-game`);

      // Play the round
      const roundBaseline = p1.messages.length;
      const player = GAME_PLAYERS[gameId];
      if (player) {
        await player(p1, p2, 25000, p1.messages);
      } else {
        console.log(`  Unknown game ${gameId}, waiting...`);
        await sleep(15000);
      }

      // Check if game_over arrived
      const goMsg = p1.messages.slice(roundBaseline).find(m => m.type === 'game_over');
      console.log(`  game_over: ${goMsg ? 'winner=' + goMsg.winnerId : 'NOT RECEIVED'}`);

      await sleep(1500);
      await screenshot(hostPage, `t-r${round}-${gameId}-end`);

      // Wait for standings
      await sleep(4000);
      await screenshot(hostPage, `t-r${round}-standings`);

      const standings = await hostPage.evaluate(() => {
        const o = document.getElementById('tournament-overlay');
        if (!o) return { visible: false };
        return { visible: o.classList.contains('show'), html: o.innerHTML?.substring(0, 300) || '' };
      });
      console.log(`  Standings: visible=${standings.visible}`);
      report.observations.push(`Round ${round} (${gameId}): gameOver=${!!goMsg}, standings=${standings.visible}`);

      tResults.rounds.push({ round, gameId, gameOver: !!goMsg, standingsVisible: standings.visible });

      // Wait for transition
      await sleep(5000);
    }

    // ========================================================
    // PHASE 5: CHAMPION
    // ========================================================
    console.log('\n--- PHASE 5: CHAMPION ---');
    await sleep(4000);

    // Check for tournamentEnd message
    const champMsg = p1.messages.slice(tBaseline).find(m => m.type === 'tournamentEnd');
    if (champMsg) {
      console.log(`  Champion: P${champMsg.champId}, scores: ${JSON.stringify(champMsg.scores)}`);
      tResults.champion = champMsg;
    } else {
      console.log('  No tournamentEnd received');
    }

    await screenshot(hostPage, 'tournament-champion');

    const champOverlay = await hostPage.evaluate(() => {
      const o = document.getElementById('tournament-overlay');
      return o ? { visible: o.classList.contains('show'), html: o.innerHTML?.substring(0, 300) } : { visible: false };
    });
    console.log(`  Champion overlay: visible=${champOverlay.visible}`);
    if (champOverlay.html) console.log(`  Content: ${champOverlay.html.substring(0, 150)}`);

    await sleep(8000);
    await screenshot(hostPage, 'tournament-done');

    report.tournament = tResults;

    // ========================================================
    // FINAL REPORT
    // ========================================================
    console.log('\n========================================');
    console.log('  QA REPORT');
    console.log('========================================');

    console.log(`\n  Console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e, i) => console.log(`  ${i + 1}. [${e.url}] ${e.text}`));

    console.log(`\n  Bugs: ${report.bugs.length}`);
    report.bugs.forEach((b, i) => console.log(`  ${i + 1}. ${b}`));

    console.log(`\n  Observations: ${report.observations.length}`);
    report.observations.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));

    console.log(`\n  METEOR: w=${meteorEvents.warnings} i=${meteorEvents.impacts} e=${meteorEvents.eliminations} go=${meteorEvents.gameOver} winner=P${meteorEvents.winnerId}`);
    console.log(`  TOURNAMENT: ${tResults.gameSequence.join('->')}`);
    tResults.rounds.forEach(r => console.log(`    R${r.round} ${r.gameId}: go=${r.gameOver} standings=${r.standingsVisible}`));
    if (tResults.champion) console.log(`  CHAMPION: P${tResults.champion.champId} scores=${JSON.stringify(tResults.champion.scores)}`);

    console.log(`\n  Screenshots: ${ssCount}`);
    console.log(`  P1 messages: ${p1.messages.length}, P2 messages: ${p2.messages.length}`);

  } catch (err) {
    console.error('\n[FATAL]', err.message, err.stack);
    if (hostPage) await screenshot(hostPage, 'error').catch(() => {});
  } finally {
    if (p1?.ws) p1.ws.close();
    if (p2?.ws) p2.ws.close();
    if (browser) await browser.close();
    console.log('\n  Done.\n');
  }
})();
