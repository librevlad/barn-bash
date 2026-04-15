// Analyze modal-game-select.png to find the 4 ticket positions.
const { chromium } = require('playwright');
const fs = require('fs');

const HTML = `<!DOCTYPE html><html><body>
<canvas id="c"></canvas><pre id="out"></pre>
<script>
(async () => {
  const img = new Image();
  img.src = '__SRC__';
  await new Promise(r => { img.onload = r; });
  const c = document.getElementById('c');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  window._dims = { w: img.width, h: img.height };
  document.getElementById('out').textContent = JSON.stringify(window._dims, null, 2);
})();
</script>
</body></html>`;

(async () => {
  const src = fs.readFileSync('E:/frantics/assets/modal-game-select.png').toString('base64');
  const html = HTML.replace('__SRC__', 'data:image/png;base64,' + src);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  await page.setContent(html);
  await page.waitForTimeout(1500);
  const dims = await page.evaluate(() => window._dims);
  console.log('modal-game-select dims:', dims);
  await browser.close();
})();
