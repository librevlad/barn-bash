const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000/host/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/lobby-sprites-normal.png' });
  await page.hover('#btn-play');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/lobby-sprites-hover-play.png' });
  await page.hover('#btn-customize');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'E:/frantics/screenshots-qa/lobby-sprites-hover-custom.png' });
  console.log('done');
  await browser.close();
})();
