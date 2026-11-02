import fs from 'fs';
import { chromium } from 'playwright';

async function run() {
  const script = fs.readFileSync('scripts/render-scanned-gym.cjs', 'utf8');
  const gymStart = script.indexOf('const gymHtml = `') + 'const gymHtml = `'.length;
  const gymEnd = script.indexOf('`;\n\n  // 2. Tax receipt');
  const gymHtml = script.slice(gymStart, gymEnd);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1697 } });
  await page.setContent(gymHtml, { waitUntil: 'networkidle' });
  const p = await page.locator('.scanner-page').first();
  const box = await p.boundingBox();
  console.log('Gym page box:', box);

  const items = await page.evaluate(() => {
    const pageEl = document.querySelector('.scanner-page');
    const pRect = pageEl.getBoundingClientRect();
    return Array.from(pageEl.querySelectorAll('.clause-item')).map((el, idx) => {
      const r = el.getBoundingClientRect();
      return {
        idx: idx + 1,
        text: el.textContent.trim().slice(0, 30),
        left: Number((((r.left - pRect.left) / pRect.width) * 100).toFixed(2)),
        top: Number((((r.top - pRect.top) / pRect.height) * 100).toFixed(2)),
        width: Number(((r.width / pRect.width) * 100).toFixed(2)),
        height: Number(((r.height / pRect.height) * 100).toFixed(2)),
      };
    });
  });
  console.log('Gym items:', items);
  await browser.close();
}

run().catch(console.error);
