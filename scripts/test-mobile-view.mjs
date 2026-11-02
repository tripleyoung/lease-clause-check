import { chromium, devices } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5193...');
  await page.goto('http://localhost:5193', { waitUntil: 'networkidle' });

  // 1. Welcome page top
  await page.screenshot({ path: 'scripts/mobile_1_welcome_top.png' });
  console.log('Saved mobile_1_welcome_top.png');

  // Scroll down welcome page to see Donut chart
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'scripts/mobile_1_welcome_donut.png' });
  console.log('Saved mobile_1_welcome_donut.png');

  // Scroll back up and click "로그인 없이 둘러보기 (빠른 체험)"
  await page.evaluate(() => window.scrollTo(0, 0));
  const guestBtn = page.locator('button:has-text("로그인 없이 둘러보기 (빠른 체험)")');
  await guestBtn.click();
  await page.waitForTimeout(500);

  // 2. Chat ready state (.suggest)
  await page.screenshot({ path: 'scripts/mobile_2_ready_top.png' });
  console.log('Saved mobile_2_ready_top.png');

  // Scroll suggest down
  await page.evaluate(() => {
    const s = document.querySelector('.suggest');
    if (s) s.scrollTop = s.scrollHeight;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'scripts/mobile_2_ready_scrolled.png' });
  console.log('Saved mobile_2_ready_scrolled.png');

  // 3. Click sample doc card
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  if (await sampleCard.isVisible()) {
    await sampleCard.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'scripts/mobile_3_preview_top.png' });
    console.log('Saved mobile_3_preview_top.png');

    // Scroll preview shell to bottom
    await page.evaluate(() => {
      const shell = document.querySelector('.doc-preview-shell');
      if (shell) shell.scrollTop = shell.scrollHeight;
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'scripts/mobile_3_preview_bottom.png' });
    console.log('Saved mobile_3_preview_bottom.png');

    // 4. Open Fullscreen Document Modal
    const fsBtn = page.locator('[data-testid="open-doc-fullscreen-btn"]');
    console.log('fsBtn visible?', await fsBtn.isVisible());
    if (await fsBtn.isVisible()) {
      await fsBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: 'scripts/mobile_4_fullscreen_modal_top.png' });
      console.log('Saved mobile_4_fullscreen_modal_top.png');

      // Scroll modal body down
      await page.evaluate(() => {
        const body = document.querySelector('.doc-fullscreen-body');
        if (body) body.scrollTop = body.scrollHeight;
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'scripts/mobile_4_fullscreen_modal_bottom.png' });
      console.log('Saved mobile_4_fullscreen_modal_bottom.png');

      // Close fullscreen modal
      const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
      await closeBtn.click();
      await page.waitForTimeout(400);
    }

    // 5. Start Check
    const startCheckBtn = page.locator('[data-testid="start-sample-check-btn"]');
    console.log('startCheckBtn visible?', await startCheckBtn.isVisible());
    if (await startCheckBtn.isVisible()) {
      await startCheckBtn.click();
      console.log('Clicked start check...');
      await page.waitForSelector('.turn', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'scripts/mobile_5_turn_top.png' });
      console.log('Saved mobile_5_turn_top.png');

      // Scroll turn deck slide
      await page.evaluate(() => {
        const slide = document.querySelector('.deck__slide');
        if (slide) slide.scrollTop = slide.scrollHeight;
      });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'scripts/mobile_5_turn_bottom.png' });
      console.log('Saved mobile_5_turn_bottom.png');

      // 6. Test fullscreen deck
      const toggleFsDeckBtn = page.locator('[data-testid="toggle-deck-fullscreen-btn"]');
      console.log('toggleFsDeckBtn visible?', await toggleFsDeckBtn.isVisible());
      if (await toggleFsDeckBtn.isVisible()) {
        await toggleFsDeckBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'scripts/mobile_6_deck_fullscreen_top.png' });
        console.log('Saved mobile_6_deck_fullscreen_top.png');

        await page.evaluate(() => {
          const fs = document.querySelector('.turn--fullscreen');
          if (fs) fs.scrollTop = fs.scrollHeight;
        });
        await page.waitForTimeout(400);
        await page.screenshot({ path: 'scripts/mobile_6_deck_fullscreen_bottom.png' });
        console.log('Saved mobile_6_deck_fullscreen_bottom.png');
      }

      // 7. Test fullscreen doc inside turn
      const turnDocFsBtn = page.locator('[data-testid="annotated-doc-fullscreen-btn"]');
      console.log('turnDocFsBtn visible?', await turnDocFsBtn.isVisible());
      if (await turnDocFsBtn.isVisible()) {
        await turnDocFsBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: 'scripts/mobile_7_turn_doc_fullscreen.png' });
        console.log('Saved mobile_7_turn_doc_fullscreen.png');
      }
    }
  }

  await browser.close();
  console.log('All tests completed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
