const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1700, height: 1600 } });
  await page.goto('http://localhost:3000/host/slice-modal-tickets', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log(await page.textContent('#log'));
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/modal-slicer-overlay.png', fullPage: true });
  const results = await page.evaluate(() => window._results);
  if (results) {
    for (const [name, dataUrl] of Object.entries(results))
      fs.writeFileSync('E:/frantics/assets/' + name + '.png', Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved ' + Object.keys(results).length + ' modal ticket PNGs');
  }
  await browser.close();
})();
