// scripts/finish-walk.js
// Drives every minigame from Title → Board → minigame, waits up to ~40s
// for the finish overlay, and captures a single screenshot per game to
//   .qa/finishes/<game>.png
// Used to visually review the V2 winner-card overlays end-to-end without
// playing each one by hand.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/';
const OUT = path.resolve(__dirname, '..', '.qa', 'finishes');
const TIMEOUT_MS = 40000;
const POLL_MS = 200;

const GAMES = [
  { id: 'tap',    title: 'ПОРОСЯЧИЙ ЗАБЕГ',    file: 'pig-sprint.png',     finishText: 'ФИНИШ!',         spamSpace: true },
  { id: 'hay',    title: 'СЕННАЯ ПАНИКА',       file: 'hay-panic.png',      finishText: ['ВЫЖИЛ!', 'РАЗГРОМ!', 'ВРЕМЯ!'] },
  { id: 'aim',    title: 'ЯБЛОЧКО В ГЛАЗ',      file: 'apple-aim.png',      finishText: 'КОНЕЦ МАТЧА!',  spamSpace: true },
  { id: 'gopher', title: 'СУСЛИК',              file: 'whack-a-gopher.png', finishText: 'ВРЕМЯ!' },
  { id: 'egg',    title: 'ГОРЯЧЕЕ ЯЙЦО',        file: 'egg-pass.png',       finishText: 'ВЫЖИЛ!',        spamSpace: true },
  { id: 'mud',    title: 'ГРЯЗНЫЙ ЗАБЕГ',       file: 'mud-dash.png',       finishText: 'ФИНИШ!' },
  { id: 'tug',    title: 'КАНАТНЫЙ БЕСПРЕДЕЛ',  file: 'tug-o-war.png',      finishText: 'ВЗЯЛИ!',        spamSpace: true },
  { id: 'fish',   title: 'БЕШЕНАЯ РЫБАЛКА',     file: 'fishing-frenzy.png', finishText: 'УЛОВ!' },
  { id: 'jump',   title: 'САРАЙНЫЙ ПРЫЖОК',     file: 'barn-jump.png',      finishText: 'ГОТОВО!' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function pollForText(page, text, timeoutMs) {
  const needles = Array.isArray(text) ? text : [text];
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await page.evaluate((needles) => {
      const body = document.body && document.body.innerText || '';
      return needles.some(n => body.includes(n));
    }, needles);
    if (found) return true;
    await sleep(POLL_MS);
  }
  return false;
}

async function main() {
  ensureDir(OUT);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  page.on('pageerror', e => console.error('[pageerror]', e.message));

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('barnyard-tweaks', JSON.stringify({
      difficulty: 'easy', playerCount: 2, totalRounds: 8,
      palette: 'barnyard', twists: false, youChar: 'pig',
    }));
    localStorage.removeItem('barnyard-screen');
  });

  const summary = [];

  for (const game of GAMES) {
    const out = path.join(OUT, game.file);
    let captured = false;
    let elapsedMs = 0;
    const t0 = Date.now();

    try {
      await page.goto(BASE, { waitUntil: 'load' });
      await sleep(400);

      // Title → 5 РАУНДОВ
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('5 РАУНДОВ'));
        if (b) b.click();
      });
      await sleep(600);
      // CharSel → ПОЕХАЛИ
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('ПОЕХАЛИ'));
        if (b) b.click();
      });
      await sleep(700);
      // Board → click target tile
      const clicked = await page.evaluate((title) => {
        const tile = [...document.querySelectorAll('[style*="cursor"]')]
          .find(d => d.textContent && d.textContent.toUpperCase().includes(title));
        if (tile) { tile.click(); return true; }
        return false;
      }, game.title);
      if (!clicked) {
        summary.push({ game: game.id, captured: false, reason: 'tile-miss', elapsedMs: Date.now() - t0 });
        console.log(`[${game.id}] tile-miss`);
        continue;
      }
      await sleep(500);

      // Optional: spam space for tap-driven games (TugOWar especially)
      let spamHandle = null;
      if (game.spamSpace) {
        spamHandle = setInterval(() => {
          page.evaluate(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
          }).catch(()=>{});
        }, 80);
      }

      // Wait for finish marker text to appear
      const found = await pollForText(page, game.finishText, TIMEOUT_MS);
      if (spamHandle) clearInterval(spamHandle);
      elapsedMs = Date.now() - t0;

      if (found) {
        // Small settle so the pop-in animation lands.
        await sleep(180);
        await page.screenshot({ path: out, fullPage: false });
        captured = true;
      } else {
        // Fallback: capture whatever's on screen at timeout for diagnostics.
        await page.screenshot({ path: out, fullPage: false });
      }

      summary.push({ game: game.id, captured, elapsedMs });
      console.log(`[${game.id}] captured=${captured} t=${(elapsedMs/1000).toFixed(1)}s`);

      // Reset to Title for next game.
      try {
        await page.evaluate(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        await sleep(500);
      } catch (_) {}
    } catch (e) {
      summary.push({ game: game.id, captured: false, reason: String(e).slice(0, 200), elapsedMs: Date.now() - t0 });
      console.log(`[${game.id}] error: ${String(e).slice(0, 120)}`);
    }
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2));
  console.log('\nFinish screenshots written to', OUT);
  await browser.close();
}

main().catch(e => { console.error('finish-walk failed:', e); process.exit(1); });
