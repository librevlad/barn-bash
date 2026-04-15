// Analyze race-sprites.png (white bg): find DARK content regions.
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
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  const W = img.width, H = img.height;

  function scanRow(y0, y1, label) {
    const cols = new Array(W).fill(0);
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const R = d[i], G = d[i+1], B = d[i+2];
        // content = NOT near white
        if (R < 230 || G < 230 || B < 230) cols[x]++;
      }
    }
    const TH = (y1 - y0) * 0.12;
    const ranges = [];
    let inRange = false, start = 0;
    for (let x = 0; x < W; x++) {
      if (cols[x] > TH) {
        if (!inRange) { inRange = true; start = x; }
      } else {
        if (inRange) { inRange = false; ranges.push([start, x - 1]); }
      }
    }
    if (inRange) ranges.push([start, W - 1]);
    const wide = ranges.filter(r => r[1] - r[0] > 40);
    // Merge adjacent within 15px
    const merged = [];
    for (const r of wide) {
      if (merged.length && r[0] - merged[merged.length-1][1] < 15) {
        merged[merged.length-1][1] = r[1];
      } else merged.push(r.slice());
    }
    return { label, ranges: merged };
  }

  window._analysis = {
    dims: [W, H],
    topStrip: scanRow(60, 240, 'TopTrees'),
    midStrip: scanRow(420, 600, 'MidBushes'),
    bottomStrip: scanRow(680, 900, 'BottomDecor'),
  };
  document.getElementById('out').textContent = JSON.stringify(window._analysis, null, 2);
})();
</script>
</body></html>`;

(async () => {
  const srcImg = fs.readFileSync('E:/frantics/assets/race-sprites.png').toString('base64');
  const html = HTML.replace('__SRC__', 'data:image/png;base64,' + srcImg);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.waitForTimeout(2000);
  const a = await page.evaluate(() => window._analysis);
  console.log(JSON.stringify(a, null, 2));
  await browser.close();
})();
