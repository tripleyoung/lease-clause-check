import { chromium } from 'playwright';
import fs from 'fs';

async function measureAll() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1697 } });

  // 1. Lease
  const leaseScript = fs.readFileSync('scripts/render-scanned-base.cjs', 'utf8');
  const lHtml = leaseScript.slice(leaseScript.indexOf('const html = `') + 'const html = `'.length, leaseScript.indexOf('`;\n\n  await page.setContent'));
  await page.setContent(lHtml, { waitUntil: 'networkidle' });
  const leaseResult = await page.evaluate(() => {
    const p = document.querySelector('.scanner-page');
    const pRect = p.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('.clause-item'));
    return {
      aspectRatio: `${Math.round(pRect.width)} / ${Math.round(pRect.height)}`,
      boxes: items.map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          idx: i + 1,
          left: Number((((r.left - pRect.left) / pRect.width) * 100).toFixed(2)),
          top: Number((((r.top - pRect.top) / pRect.height) * 100).toFixed(2)),
          width: Number(((r.width / pRect.width) * 100).toFixed(2)),
          height: Number(((r.height / pRect.height) * 100).toFixed(2)),
        };
      })
    };
  });

  // 2. Gym & Tax
  const combinedScript = fs.readFileSync('scripts/render-scanned-gym.cjs', 'utf8');
  // Gym
  const gymStart = combinedScript.indexOf('const gymHtml = `') + 'const gymHtml = `'.length;
  const gymEnd = combinedScript.indexOf('`;\n\n  // 2. Tax receipt');
  const gymHtml = combinedScript.slice(gymStart, gymEnd);

  await page.setContent(gymHtml, { waitUntil: 'networkidle' });
  const gymResult = await page.evaluate(() => {
    const p = document.querySelector('.scanner-page');
    const pRect = p.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('.clause-item'));
    return {
      aspectRatio: `${Math.round(pRect.width)} / ${Math.round(pRect.height)}`,
      boxes: items.map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          idx: i + 1,
          left: Number((((r.left - pRect.left) / pRect.width) * 100).toFixed(2)),
          top: Number((((r.top - pRect.top) / pRect.height) * 100).toFixed(2)),
          width: Number(((r.width / pRect.width) * 100).toFixed(2)),
          height: Number(((r.height / pRect.height) * 100).toFixed(2)),
        };
      })
    };
  });

  // 3. Tax
  const taxStart = combinedScript.indexOf('const taxHtml = `') + 'const taxHtml = `'.length;
  const taxEnd = combinedScript.indexOf('`;\n\n  await page.setContent(taxHtml');
  const taxHtml = combinedScript.slice(taxStart, taxEnd);

  await page.setContent(taxHtml, { waitUntil: 'networkidle' });
  const taxResult = await page.evaluate(() => {
    const p = document.querySelector('.scanner-page');
    const pRect = p.getBoundingClientRect();
    const items = Array.from(document.querySelectorAll('.clause-item'));
    return {
      aspectRatio: `${Math.round(pRect.width)} / ${Math.round(pRect.height)}`,
      boxes: items.map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          idx: i + 1,
          left: Number((((r.left - pRect.left) / pRect.width) * 100).toFixed(2)),
          top: Number((((r.top - pRect.top) / pRect.height) * 100).toFixed(2)),
          width: Number(((r.width / pRect.width) * 100).toFixed(2)),
          height: Number(((r.height / pRect.height) * 100).toFixed(2)),
        };
      })
    };
  });

  console.log('RESULTS = ' + JSON.stringify({ lease: leaseResult, gym: gymResult, tax: taxResult }, null, 2));

  await browser.close();
}

measureAll().catch(console.error);
