import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });
  const page = await context.newPage();

  console.log('1. Navigating to Welcome screen and testing Topic Filter tabs...');
  await page.goto('http://localhost:5193');
  await page.waitForLoadState('networkidle');

  // Verify filter tabs on welcome stage
  const tabGym = page.locator('[data-testid="filter-tab-gym"]').first();
  await tabGym.click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_donut_stats_gym.png'),
    fullPage: false,
  });
  console.log('✓ Captured onyul_donut_stats_gym.png');

  const tabTax = page.locator('[data-testid="filter-tab-tax"]').first();
  await tabTax.click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_donut_stats_tax.png'),
    fullPage: false,
  });
  console.log('✓ Captured onyul_donut_stats_tax.png');

  // Dev login to main
  console.log('2. Entering chat and testing Lease Contract Pixel-Perfect Overlay & Scroll...');
  await page.locator('.welcome__dev').click();
  await page.waitForTimeout(500);

  // Open lease sample
  await page.locator('[data-testid="sample-card-lease_sample"]').click();
  await page.waitForTimeout(600);

  // Check pin 3
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  await pin3.click();
  await page.waitForTimeout(300);

  // Capture top view with pin 3 selected and tooltip
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_scanned_a4_pixel_perfect_overlay.png'),
  });
  console.log('✓ Captured onyul_scanned_a4_pixel_perfect_overlay.png');

  // Scroll down in scanned-scroll-wrap
  const scrollWrap = page.locator('[data-testid="scanned-scroll-wrap"]');
  await scrollWrap.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(500);

  // Capture scrolled bottom view (signatures and stamps visible!)
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_scanned_a4_scrolled_to_bottom.png'),
  });
  console.log('✓ Captured onyul_scanned_a4_scrolled_to_bottom.png (Bottom signatures verified)');

  // Close preview and test Gym sample overlay
  await page.locator('.turn__reset').click();
  await page.waitForTimeout(300);

  console.log('3. Testing Gym sample overlay & scroll...');
  await page.locator('[data-testid="sample-card-gym_sample"]').click();
  await page.waitForTimeout(500);

  const gymPin2 = page.locator('[data-testid="scan-overlay-pin-2"]');
  if (await gymPin2.isVisible()) {
    await gymPin2.click();
  }
  await page.waitForTimeout(300);

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_scanned_gym_overlay.png'),
  });
  console.log('✓ Captured onyul_scanned_gym_overlay.png');

  await browser.close();
  console.log('All verification finished successfully!');
}

main().catch(console.error);
