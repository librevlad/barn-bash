const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('http://localhost:3000/host/', { waitUntil: 'networkidle' });
  await sleep(800);
  await page.evaluate(() => document.getElementById('btn-play').click());
  await sleep(700);
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/modal-current.png' });
  // Hover escape card
  await page.hover('.modal-btn[data-game="escapeFox"]');
  await sleep(350);
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/modal-hover.png' });
  console.log('Saved modal screenshots');
  await browser.close();
})();
