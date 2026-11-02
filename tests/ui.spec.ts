import { test, expect } from '@playwright/test';

test('first load shows Daon-style welcome & login screen with lawyer Hangyeol', async ({ page }) => {
  await page.goto('/');
  // 1. Welcome screen headline & eyebrow
  await expect(page.locator('.welcome h1')).toContainText('내 편이 되어주는 법률·세무 파트너');
  await expect(page.locator('.welcome h1 span')).toHaveText('한결');

  // 2. 3 Promise points (一, 二, 三)
  await expect(page.locator('.welcome__list li')).toHaveCount(3);

  // 3. Login buttons
  await expect(page.locator('.welcome__primary-btn')).toHaveText('계정으로 시작하기');
  await expect(page.locator('.welcome__dev')).toContainText('로그인 없이 둘러보기');
});

test('quick entry enters chat stage and supports sample doc preview', async ({ page }) => {
  await page.goto('/');
  await page.click('.welcome__dev');

  // Entered chat stage
  await expect(page.locator('.topbar .brand')).toContainText('온율 · 계약·법률·세무');
  await expect(page.locator('.topbar .profiles')).toBeVisible();

  // Check sample preview (id is lease_sample, shell testid is sample-preview-card)
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await expect(sampleCard).toBeVisible();
  await sampleCard.click();
  await expect(page.locator('[data-testid="sample-preview-card"]')).toBeVisible();
});
