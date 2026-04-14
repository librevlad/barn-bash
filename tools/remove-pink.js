const { chromium } = require('playwright');
const fs = require('fs');

const FILES = [
  { src: '/assets/back-normal-raw.png', out: 'E:/frantics/assets/back-normal.png' },
  { src: '/assets/back-hover-raw.png', out: 'E:/frantics/assets/back-hover.png' },
  { src: '/assets/back-pressed-raw.png', out: 'E:/frantics/assets/back-pressed.png' },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<canvas id="c"></canvas>');

  for (const { src, out } of FILES) {
    const dataUrl = await page.evaluate(async (imgSrc) => {
      const img = new Image();
      img.src = 'http://localhost:3000' + imgSrc;
      await new Promise((r, e) => { img.onload = r; img.onerror = e; });
      const c = document.getElementById('c');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
      const d = id.data;
      // Pink bg ~ rgb(189-240, 39-120, 77-160) — sample corner
      const bgR = d[0], bgG = d[1], bgB = d[2];
      for (let i = 0; i < d.length; i += 4) {
        const dr = Math.abs(d[i] - bgR), dg = Math.abs(d[i+1] - bgG), db = Math.abs(d[i+2] - bgB);
        const maxD = Math.max(dr, dg, db);
        if (maxD < 20) d[i+3] = 0;
        else if (maxD < 40) d[i+3] = Math.round(255 * (maxD - 20) / 20);
      }
      ctx.putImageData(id, 0, 0);
      return c.toDataURL('image/png');
    }, src);

    fs.writeFileSync(out, Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log('Saved:', out.split('/').pop());
  }

  await browser.close();
  // Clean raw files
  FILES.forEach(f => { try { fs.unlinkSync(f.out.replace('.png', '-raw.png').replace('back-normal', 'back-normal').replace('assets/back', 'assets/back')); } catch {} });
  console.log('Done');
})();
