import { chromium, devices } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ...devices['iPhone 13'] });

  console.log('Navigating to dev server...');
  await page.goto('http://localhost:5193', { waitUntil: 'networkidle' });

  // 1. Enter guest mode
  await page.click('button:has-text("로그인 없이 둘러보기 (빠른 체험)")');
  await page.waitForTimeout(400);

  // Check topbar metrics on iPhone 13
  const topbarCheck = await page.evaluate(() => {
    const topbar = document.querySelector('.topbar');
    const brand = document.querySelector('.brand');
    const actions = document.querySelector('.topbar__actions');
    const profileBtn = actions?.querySelector('.topbar__btn--signed, .topbar__btn--login');
    const cachePill = document.querySelector('.cache-pill');
    return {
      windowWidth: window.innerWidth,
      topbarRect: topbar?.getBoundingClientRect(),
      brandRect: brand?.getBoundingClientRect(),
      actionsRect: actions?.getBoundingClientRect(),
      profileBtnRect: profileBtn?.getBoundingClientRect(),
      profileBtnText: profileBtn?.innerText,
      hasCachePill: Boolean(cachePill),
    };
  });
  console.log('Topbar metrics on iPhone 13:', JSON.stringify(topbarCheck, null, 2));

  await page.screenshot({ path: '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b/onyul_mobile_topbar_fixed.png' });
  console.log('Captured onyul_mobile_topbar_fixed.png');

  // 2. Open Sample Preview Card
  await page.click('[data-testid="sample-card-lease_sample"]');
  await page.waitForTimeout(500);

  // Click on the scanned image at 62% vertical (특약 3번 보증금 반환 지연 부근)
  const container = page.locator('[data-testid="scanned-a4-container"]');
  const box = await container.boundingBox();
  console.log('Container bounding box:', box);

  if (box) {
    // Click at 62% height
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.62);
    await page.waitForTimeout(400);

    const selectedClauseNum = await page.evaluate(() => {
      const activePin = document.querySelector('.doc-annotation-box.is-selected');
      const summaryTag = document.querySelector('.scan-pin-summary-body strong')?.innerText;
      return {
        activePinText: activePin?.innerText,
        summaryTag,
      };
    });
    console.log('Selected clause after clicking image at 62%:', selectedClauseNum);
  }

  await page.screenshot({ path: '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b/onyul_mobile_image_click_highlight.png' });
  console.log('Captured onyul_mobile_image_click_highlight.png');

  // 3. Start Check to verify turn card without mask-banner
  await page.click('[data-testid="start-sample-check-btn"]');
  await page.waitForSelector('.turn', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const maskBannerExists = await page.isVisible('.mask-banner');
  console.log('mask-banner exists in turn?', maskBannerExists);

  // Click on image in result mode to select clause 2 (at ~58% vertical)
  const resultContainer = page.locator('[data-testid="result-scanned-container"]');
  const rBox = await resultContainer.boundingBox();
  if (rBox) {
    await page.mouse.click(rBox.x + rBox.width * 0.5, rBox.y + rBox.height * 0.58);
    await page.waitForTimeout(400);
    const resultSelected = await page.evaluate(() => {
      const active = document.querySelector('.doc-annotation-box.is-selected');
      const detailBadge = document.querySelector('.pointed-detail__pin-pill')?.innerText;
      return {
        activeText: active?.innerText,
        detailBadge,
      };
    });
    console.log('Result selected after clicking image:', resultSelected);
  }

  await page.screenshot({ path: '/Users/yun-yeowon/.gemini/antigravity-cli/brain/b7bcd662-843d-493a-abeb-83391f1a771b/onyul_mobile_turn_no_mask_banner.png' });
  console.log('Captured onyul_mobile_turn_no_mask_banner.png');

  await browser.close();
  console.log('All verification steps succeeded!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
