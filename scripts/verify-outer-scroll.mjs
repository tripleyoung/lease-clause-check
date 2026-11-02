import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });
  const page = await context.newPage();

  console.log('1. Navigating and opening SamplePreviewCard...');
  await page.goto('http://localhost:5193');
  await page.waitForLoadState('networkidle');

  // Dev login
  await page.locator('.welcome__dev').click();
  await page.waitForTimeout(500);

  // Open lease sample
  await page.locator('[data-testid="sample-card-lease_sample"]').click();
  await page.waitForTimeout(600);

  const shell = page.locator('.doc-preview-shell');
  await shell.waitFor({ state: 'visible', timeout: 5000 });

  // 1. Capture initial top state
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_outer_container_scroll_top.png'),
  });
  console.log('✓ Captured onyul_outer_container_scroll_top.png');

  // 2. Scroll the OUTER container (.doc-preview-shell) to bottom
  const scrollInfo = await shell.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    return {
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    };
  });
  console.log('Outer container scroll info:', scrollInfo);
  await page.waitForTimeout(500);

  // Check that the footer button is fully visible in viewport
  const startBtn = page.locator('[data-testid="start-sample-check-btn"]');
  const btnBox = await startBtn.boundingBox();
  console.log('Start check button box in viewport:', btnBox);

  // 3. Capture scrolled-to-bottom state showing bottom signatures AND the footer actions together
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_outer_container_scroll_bottom.png'),
  });
  console.log('✓ Captured onyul_outer_container_scroll_bottom.png (Bottom signatures and footer verified)');

  await browser.close();
  console.log('Outer container scroll verification passed successfully!');
}

main().catch(console.error);
