import { chromium } from 'playwright';
import path from 'path';

async function measure() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load the test page or inspect the scanned images directly
  await page.goto('http://localhost:5193');
  await page.waitForLoadState('networkidle');

  // Dev login
  await page.locator('.welcome__dev').click();
  await page.waitForTimeout(500);

  // Open lease sample
  await page.locator('[data-testid="sample-card-lease_sample"]').click();
  await page.waitForTimeout(500);

  const imgInfo = await page.evaluate(() => {
    const img = document.querySelector('.paper-doc-scanned-img');
    const container = document.querySelector('.paper-doc-scanned-container');
    if (!img || !container) return null;
    const imgRect = img.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    return {
      imgWidth: imgRect.width,
      imgHeight: imgRect.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      contWidth: contRect.width,
      contHeight: contRect.height,
      offsetTop: imgRect.top - contRect.top,
      offsetLeft: imgRect.left - contRect.left,
    };
  });

  console.log('Measurement Info:', imgInfo);
  await browser.close();
}

measure().catch(console.error);
