import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function extractAccurateBoxes() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1697 } });

  // 1. Measure Lease Contract
  const leaseScript = fs.readFileSync('scripts/render-scanned-base.cjs', 'utf8');
  // Extract html string
  const startIdx = leaseScript.indexOf('const html = `');
  const endIdx = leaseScript.indexOf('`;\n\n  await page.setContent');
  const html = leaseScript.slice(startIdx + 'const html = `'.length, endIdx);

  await page.setContent(html, { waitUntil: 'networkidle' });

  const leaseBoxes = await page.evaluate(() => {
    const pageEl = document.querySelector('.scanner-page');
    const pageRect = pageEl.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('.clause-item'));

    return items.map((el, idx) => {
      const rect = el.getBoundingClientRect();
      return {
        clauseIdx: idx + 1,
        text: el.textContent.trim().slice(0, 30),
        box: {
          left: Number((((rect.left - pageRect.left) / pageRect.width) * 100).toFixed(2)),
          top: Number((((rect.top - pageRect.top) / pageRect.height) * 100).toFixed(2)),
          width: Number(((rect.width / pageRect.width) * 100).toFixed(2)),
          height: Number(((rect.height / pageRect.height) * 100).toFixed(2)),
        },
        pageWidth: pageRect.width,
        pageHeight: pageRect.height,
      };
    });
  });

  console.log('Lease Clause Boxes (%):', JSON.stringify(leaseBoxes, null, 2));

  await browser.close();
}

extractAccurateBoxes().catch(console.error);
