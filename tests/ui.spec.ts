import { test, expect } from '@playwright/test';

test('page loads with both packs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '계약서 특약 점검기' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /전월세 임대차 특약/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /헬스장·PT 이용 약관/ })).toBeVisible();
});

test('empty input shows message', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '보낼 내용 미리 보기' }).click();
  await expect(page.getByRole('alert')).toContainText('붙여 넣어 주세요');
});

test('non-contract text is rejected', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('계약 문구').fill('오늘 날씨가 맑고 기온은 20도까지 오르겠습니다. 주말에는 비 소식이 있습니다.');
  await page.getByRole('button', { name: '보낼 내용 미리 보기' }).click();
  await expect(page.getByRole('alert')).toContainText('계약서나 약관 문구가 아닌 것 같아요');
});

test('preview masks personal data before sending', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '월세 특약' }).click();
  await page.getByRole('button', { name: '보낼 내용 미리 보기' }).click();
  const preview = page.getByTestId('masked-preview');
  await expect(preview).toContainText('[주민번호]');
  await expect(preview).toContainText('[전화번호]');
  await expect(preview).not.toContainText('800505-1234567');
  await expect(page.getByRole('button', { name: '이 내용으로 점검하기' })).toBeVisible();
});

test('check without a server key explains the cause and keeps input', async ({ page }) => {
  test.skip(
    !!process.env.GEMINI_API_KEY || !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_WIF_CLIENT_SECRET,
    '키가 있으면 실제 점검이 돈다',
  );
  await page.goto('/');
  await page.getByRole('radio', { name: /헬스장·PT 이용 약관/ }).click();
  await page.getByRole('button', { name: '헬스장 약관' }).click();
  await page.getByRole('button', { name: '보낼 내용 미리 보기' }).click();
  await page.getByRole('button', { name: '이 내용으로 점검하기' }).click();
  await expect(page.getByRole('alert')).toContainText('API_KEY');
  await expect(page.getByLabel('계약 문구')).toHaveValue(/위약금 20%/);
});
