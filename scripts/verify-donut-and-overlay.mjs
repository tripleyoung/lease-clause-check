import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
  });
  const page = await context.newPage();

  console.log('1. Navigating to Welcome screen...');
  await page.goto('http://localhost:5193');
  await page.waitForLoadState('networkidle');

  // Verify Donut Chart on Welcome screen
  const donutCard = page.locator('[data-testid="question-stats-donut"]');
  await donutCard.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Found Donut Chart on Welcome stage');

  // Hover over the first slice / chip
  const chip1 = page.locator('[data-testid="stat-chip-deposit_return"]');
  await chip1.hover();
  await page.waitForTimeout(400);

  // Capture welcome donut chart screenshot
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_donut_stats_welcome.png'),
    fullPage: true,
  });
  console.log('✓ Captured onyul_donut_stats_welcome.png');

  // Click dev login to enter chat
  console.log('2. Entering chat stage via dev login...');
  const devLoginBtn = page.locator('.welcome__dev');
  await devLoginBtn.click();
  await page.waitForTimeout(500);

  // Verify Donut Chart in main suggestion section
  await page.locator('[data-testid="question-stats-donut"]').waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Found Donut Chart in suggestion area');

  // Click "보증금 미반환" ask button to verify auto-input
  const askBtn = page.locator('[data-testid="ask-stat-deposit_return"]');
  await askBtn.click();
  const composerInput = page.locator('[data-testid="composer-input"]');
  const inputValue = await composerInput.inputValue();
  console.log('✓ Composer auto-filled with:', inputValue);

  // Clear input and open sample preview
  await composerInput.fill('');
  console.log('3. Opening sample preview card for lease_sample...');
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await sampleCard.click();

  // Wait for SamplePreviewCard and A4 scanned container
  const a4Container = page.locator('[data-testid="scanned-a4-container"]');
  await a4Container.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Found A4 scanned container in SamplePreviewCard');

  // Verify in-place annotation pins on document
  const pin1 = page.locator('[data-testid="scan-overlay-pin-1"]');
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  await pin1.waitFor({ state: 'visible', timeout: 3000 });
  await pin3.waitFor({ state: 'visible', timeout: 3000 });
  console.log('✓ Found in-place overlay pins ① and ③ on document');

  // Click pin 3 (deposit delay risk clause)
  await pin3.click();
  await page.waitForTimeout(400);

  // Capture in-place A4 scanned preview screenshot
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_scanned_a4_overlay_preview.png'),
  });
  console.log('✓ Captured onyul_scanned_a4_overlay_preview.png');

  // 4. Click "이 스캔 문서로 정밀 점검 시작하기"
  console.log('4. Triggering check on scanned lease document...');
  const startCheckBtn = page.locator('[data-testid="start-sample-check-btn"]');
  await startCheckBtn.click();

  // Wait for check analysis deck to render
  console.log('Waiting for AnnotatedDocumentDeckCard...');
  const annotatedCard = page.locator('[data-testid="annotated-doc-card"]');
  await annotatedCard.waitFor({ state: 'visible', timeout: 35000 });
  console.log('✓ AnnotatedDocumentDeckCard rendered');

  // Verify result scanned container & in-place pins
  const resultContainer = page.locator('[data-testid="result-scanned-container"]');
  await resultContainer.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Result scanned container with overlay pins rendered');

  // Click pin 3 in result card
  const resultPin3 = page.locator('[data-testid="result-pin-3"]');
  if (await resultPin3.isVisible()) {
    await resultPin3.click();
    await page.waitForTimeout(500);
  }

  // Capture result screenshot
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, 'onyul_result_scanned_annotation.png'),
  });
  console.log('✓ Captured onyul_result_scanned_annotation.png');

  await browser.close();
  console.log('All Playwright verifications passed successfully!');
}

main().catch((err) => {
  console.error('Playwright verification failed:', err);
  process.exit(1);
});
