const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 600 } });
  await page.goto('http://localhost:3000/host/slice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  console.log(await page.textContent('#log'));
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/slicer-v4.png' });
  const results = await page.evaluate(() => window._results);
  if (results) {
    for (const [name, dataUrl] of Object.entries(results))
      fs.writeFileSync('E:/frantics/assets/btn-' + name + '.png', Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved ' + Object.keys(results).length + ' PNGs');
  }
  await browser.close();
})();
