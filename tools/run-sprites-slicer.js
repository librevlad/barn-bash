const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1700, height: 1400 } });
  await page.goto('http://localhost:3000/host/slice-sprites', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  console.log(await page.textContent('#log'));
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/sprites-slicer.png', fullPage: true });
  const results = await page.evaluate(() => window._results);
  if (results) {
    for (const [name, dataUrl] of Object.entries(results))
      fs.writeFileSync('E:/frantics/assets/sprite-' + name + '.png', Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved ' + Object.keys(results).length + ' sprite PNGs');
  }
  await browser.close();
})();
