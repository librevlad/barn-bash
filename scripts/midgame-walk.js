// scripts/midgame-walk.js
// Drives every minigame from Title → Board → minigame, plays it for a
// game-specific number of seconds, then captures one screenshot to
//   .qa/midgames/<game>.png
// Used to visually review the in-game V3-V9 visuals (parallax, dust,
// rope tension, hammer swing, panic glow, etc.) without playing each
// minigame by hand.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000/';
const OUT = path.resolve(__dirname, '..', '.qa', 'midgames');

// Per-game capture moment (seconds into the round) tuned to land on the
// visual we want to review. Some games need spam-space to keep the round
// progressing (taps drive the human runner / arrow / tug team / egg pass).
// Each game has a ~3s RulesSplash + an in-game 3-2-1 Countdown overlay
// before the round actually starts. captureAfterMs accounts for that and
// targets a moment that exposes the V3-V9 visuals we want to review.
const GAMES = [
  { id: 'tap',    title: 'ПОРОСЯЧИЙ ЗАБЕГ',    file: 'pig-sprint.png',     captureAfterMs: 9000, spamSpace: true  },
  { id: 'hay',    title: 'СЕННАЯ ПАНИКА',       file: 'hay-panic.png',      captureAfterMs: 12000 },
  { id: 'aim',    title: 'ЯБЛОЧКО В ГЛАЗ',      file: 'apple-aim.png',      captureAfterMs: 9000 },
  { id: 'gopher', title: 'СУСЛИК',              file: 'whack-a-gopher.png', captureAfterMs: 12000 },
  { id: 'egg',    title: 'ГОРЯЧЕЕ ЯЙЦО',        file: 'egg-pass.png',       captureAfterMs: 7500 },
  { id: 'mud',    title: 'ГРЯЗНЫЙ ЗАБЕГ',       file: 'mud-dash.png',       captureAfterMs: 12000 },
  { id: 'tug',    title: 'КАНАТНЫЙ БЕСПРЕДЕЛ',  file: 'tug-o-war.png',      captureAfterMs: 8000, spamSpace: true  },
  { id: 'fish',   title: 'БЕШЕНАЯ РЫБАЛКА',     file: 'fishing-frenzy.png', captureAfterMs: 12000 },
  { id: 'jump',   title: 'САРАЙНЫЙ ПРЫЖОК',     file: 'barn-jump.png',      captureAfterMs: 5500 }, // wait phase, after splash, before signal
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

async function main() {
  ensureDir(OUT);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();

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
    const t0 = Date.now();

    try {
      await page.goto(BASE, { waitUntil: 'load' });
      await sleep(400);

      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('5 РАУНДОВ'));
        if (b) b.click();
      });
      await sleep(600);
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('ПОЕХАЛИ'));
        if (b) b.click();
      });
      await sleep(700);
      const clicked = await page.evaluate((title) => {
        const tile = [...document.querySelectorAll('[style*="cursor"]')]
          .find(d => d.textContent && d.textContent.toUpperCase().includes(title));
        if (tile) { tile.click(); return true; }
        return false;
      }, game.title);
      if (!clicked) {
        summary.push({ game: game.id, captured: false, reason: 'tile-miss' });
        console.log(`[${game.id}] tile-miss`);
        continue;
      }
      // Allow rules splash to auto-dismiss before we start counting.
      await sleep(700);

      let spamHandle = null;
      if (game.spamSpace) {
        spamHandle = setInterval(() => {
          page.evaluate(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
          }).catch(()=>{});
        }, 90);
      }

      await sleep(game.captureAfterMs);
      await page.screenshot({ path: out, fullPage: false });

      if (spamHandle) clearInterval(spamHandle);

      const elapsedMs = Date.now() - t0;
      summary.push({ game: game.id, captured: true, elapsedMs });
      console.log(`[${game.id}] captured t=${(elapsedMs/1000).toFixed(1)}s`);

      // Reset to Title — leave the round running long enough that the
      // server doesn't broadcast finish payloads we don't care about.
      try {
        await page.evaluate(() => {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        });
        await sleep(400);
      } catch (_) {}
    } catch (e) {
      summary.push({ game: game.id, captured: false, reason: String(e).slice(0, 200) });
      console.log(`[${game.id}] error: ${String(e).slice(0, 120)}`);
    }
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2));
  console.log('\nMidgame screenshots written to', OUT);
  await browser.close();
}

main().catch(e => { console.error('midgame-walk failed:', e); process.exit(1); });
