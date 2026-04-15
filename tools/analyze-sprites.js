// Analyze sprites.png to auto-detect car/item bounding boxes by finding non-dark regions.
const { chromium } = require('playwright');

const HTML = `<!DOCTYPE html><html><body>
<canvas id="c"></canvas>
<pre id="out"></pre>
<script>
(async () => {
  const img = new Image();
  img.src = '/assets/sprites.png';
  await new Promise(r => { img.onload = r; });
  const c = document.getElementById('c');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height).data;
  const W = img.width, H = img.height;

  // Brightness map: is pixel "content" (bright) or "background" (dark)?
  // For each column, find number of bright pixels across all rows.
  // Then find connected horizontal ranges where brightness is above threshold.

  function scanRow(y0, y1, label) {
    const cols = new Array(W).fill(0);
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const R = d[i], G = d[i+1], B = d[i+2];
        const br = (R + G + B) / 3;
        if (br > 55) cols[x]++;
      }
    }
    // Print count per 30px of columns to eyeball
    // Find ranges: consecutive x where cols[x] > threshold
    const TH = (y1 - y0) * 0.08; // at least 8% of rows are bright
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
    // Filter: only keep ranges wider than 50
    const wide = ranges.filter(r => r[1] - r[0] > 50);
    // Merge adjacent within 15px
    const merged = [];
    for (const r of wide) {
      if (merged.length && r[0] - merged[merged.length-1][1] < 15) {
        merged[merged.length-1][1] = r[1];
      } else merged.push(r.slice());
    }
    return { label, ranges: merged };
  }

  const row1 = scanRow(30, 290, 'Row1');
  const row2 = scanRow(300, 570, 'Row2');
  const decor = scanRow(570, 720, 'Decor');
  const itemsRow = scanRow(740, 900, 'Items');

  const out = document.getElementById('out');
  out.textContent = JSON.stringify([row1, row2, decor, itemsRow], null, 2);
  window._analysis = [row1, row2, decor, itemsRow];
})();
</script>
</body></html>`;

const http = require('http');
const fs = require('fs');
const path = require('path');

// Server-side: we just reuse the frantics server since it's already running.
(async () => {
  // Save the analyzer HTML into the project and open it
  fs.writeFileSync('E:/frantics/client-host/analyze-sprites.html', HTML);
  // Add route on the fly? Nope. Just serve via a throwaway HTML at existing route.
  // Actually, use /host/slice-sprites pattern — add a temp route or use data URL.
  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Use data URL? Can't due to same-origin. Host via static server on /host/slice-sprites by replacing file temporarily.
  // Simpler: use file:// and fetch sprites from disk via relative path
  const srcImg = fs.readFileSync('E:/frantics/assets/sprites.png').toString('base64');
  const html2 = HTML.replace("'/assets/sprites.png'", "'data:image/png;base64," + srcImg + "'");
  await page.setContent(html2);
  await page.waitForTimeout(2500);
  const analysis = await page.evaluate(() => window._analysis);
  console.log(JSON.stringify(analysis, null, 2));
  await browser.close();
})();
