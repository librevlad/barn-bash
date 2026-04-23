// scripts/qa-walk.js
// Headed Chromium walks through all 9 minigames via classic mode,
// captures a screenshot every second for 8 seconds per game, then
// Esc-returns to Title. Produces:
//   .qa/walk/<game>/t<sec>.png
//   .qa/walk/report.json  {game, screens[], errors, overlayFound}

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/';
const OUT = path.resolve(__dirname, '..', '.qa', 'walk');
const PER_GAME_SECONDS = 8;

const GAMES = [
  { id: 'tap',    title: 'ПОРОСЯЧИЙ ЗАБЕГ',    dir: 'pig-sprint' },
  { id: 'hay',    title: 'СЕННАЯ ПАНИКА',       dir: 'hay-panic' },
  { id: 'aim',    title: 'ЯБЛОЧКО В ГЛАЗ',      dir: 'apple-aim' },
  { id: 'gopher', title: 'СУСЛИК',              dir: 'whack-a-gopher' },
  { id: 'egg',    title: 'ГОРЯЧЕЕ ЯЙЦО',        dir: 'egg-pass' },
  { id: 'mud',    title: 'ГРЯЗНЫЙ ЗАБЕГ',       dir: 'mud-dash' },
  { id: 'tug',    title: 'КАНАТНЫЙ БЕСПРЕДЕЛ',  dir: 'tug-o-war' },
  { id: 'fish',   title: 'БЕШЕНАЯ РЫБАЛКА',     dir: 'fishing-frenzy' },
  { id: 'jump',   title: 'САРАЙНЫЙ ПРЫЖОК',     dir: 'barn-jump' },
];

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  ensureDir(OUT);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push({ kind: 'pageerror', msg: String(e), at: Date.now() }));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Skip the benign favicon 404.
      if (/favicon/i.test(txt)) return;
      errors.push({ kind: 'console', msg: txt, at: Date.now() });
    }
  });

  const report = { startedAt: new Date().toISOString(), games: [] };

  await page.goto(BASE, { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('barnyard-tweaks', JSON.stringify({
      difficulty: 'easy', playerCount: 2, totalRounds: 8,
      palette: 'barnyard', twists: false, youChar: 'pig',
    }));
    localStorage.removeItem('barnyard-screen');
  });

  for (const game of GAMES) {
    const gameDir = path.join(OUT, game.dir);
    ensureDir(gameDir);
    const entry = {
      game: game.id, title: game.title,
      screens: [], overlayFound: false,
      errors: [],
      reachedMinigame: false,
      crashed: false,
    };

    const errStart = errors.length;

    try {
      await page.goto(BASE, { waitUntil: 'load' });
      await sleep(400);

      // Click "5 РАУНДОВ"
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('5 РАУНДОВ'));
        if (b) b.click();
      });
      await sleep(600);

      // CharacterSelect → ПОЕХАЛИ
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('ПОЕХАЛИ'));
        if (b) b.click();
      });
      await sleep(700);

      // Board → click tile for this game
      const tileClicked = await page.evaluate((title) => {
        const tile = [...document.querySelectorAll('[style*="cursor"]')]
          .find(d => d.textContent && d.textContent.toUpperCase().includes(title));
        if (tile) { tile.click(); return true; }
        return false;
      }, game.title);

      if (!tileClicked) {
        entry.errors.push({ kind: 'tile-miss', msg: 'tile not found: ' + game.title });
        report.games.push(entry);
        continue;
      }

      // Wait briefly for rules splash to auto-dismiss, then take screens
      await sleep(500);

      for (let sec = 1; sec <= PER_GAME_SECONDS; sec++) {
        const file = path.join(gameDir, `t${sec}.png`);
        await page.screenshot({ path: file, fullPage: false });
        const state = await page.evaluate(() => ({
          screen: document.querySelector('[data-screen-label]')?.getAttribute('data-screen-label') || '',
          hasOverlay: !![...document.querySelectorAll('.plank')]
            .find(p => p.textContent && p.textContent.includes('ЛИДЕРБОРД')),
        }));
        entry.screens.push({ sec, ...state });
        if (state.screen.startsWith('04')) entry.reachedMinigame = true;
        if (state.hasOverlay) entry.overlayFound = true;
        await sleep(1000);
      }

      // Snapshot any errors that happened during this game
      entry.errors = errors.slice(errStart).map(e => ({ kind: e.kind, msg: e.msg.slice(0, 300) }));
      if (entry.errors.length > 0) entry.crashed = true;
    } catch (e) {
      entry.errors.push({ kind: 'walker', msg: String(e).slice(0, 300) });
      entry.crashed = true;
    }

    report.games.push(entry);
    console.log(`[${game.id}] reached=${entry.reachedMinigame} overlay=${entry.overlayFound} errs=${entry.errors.length}`);

    // Reset to Title
    try {
      await page.evaluate(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      await sleep(400);
    } catch (_) {}
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nReport:', path.join(OUT, 'report.json'));

  await browser.close();
}

main().catch(e => { console.error('walk failed:', e); process.exit(1); });
