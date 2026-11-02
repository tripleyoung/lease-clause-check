import { chromium, devices } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function record() {
  const videoDir = path.resolve('temp_recordings_mobile');
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  console.log('1. Starting Playwright with iPhone 13 mobile viewport (390x844)...');
  const browser = await chromium.launch({ headless: true });

  // 모바일 스마트폰 뷰포트 (390x844) 녹화
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    recordVideo: {
      dir: videoDir,
      size: { width: 390, height: 844 },
    },
  });

  const page = await context.newPage();

  console.log('2. Navigating to http://localhost:5193...');
  await page.goto('http://localhost:5193', { waitUntil: 'networkidle' });

  // 게스트 모드 진입 버튼 클릭 (인트로 화면 0.5초 만에 신속 통과)
  const guestBtn = page.locator('button:has-text("로그인 없이 둘러보기 (빠른 체험)")');
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
    await page.waitForTimeout(600);
  }

  // 이제 온율 메인 홈 화면 진입 완료!
  console.log('3. Displaying Onyul Main Home & Big Data Donut Chart...');
  await page.waitForTimeout(1000);

  // 도넛 차트 부드럽게 스크롤하며 둘러보기
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await page.waitForTimeout(1800);

  // 1) 법무부 주택임대차 표준계약서 샘플 카드 열기
  console.log('4. Opening Lease Sample Preview Card...');
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await sampleCard.click();
  await page.waitForTimeout(1200);

  // 2) 실물 스캔본 위에서 특약 3번(보증금 반환 지연) 핀 클릭 ➔ 형광펜 확인
  console.log('5. Clicking Pin #3 on scanned document (fluorescent highlight preview)...');
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  if (await pin3.isVisible()) {
    await pin3.click();
    await page.waitForTimeout(1500);
  }

  // 특약 4번(원상복구 비용) 핀 클릭 ➔ 형광펜 확인
  const pin4 = page.locator('[data-testid="scan-overlay-pin-4"]');
  if (await pin4.isVisible()) {
    await pin4.click();
    await page.waitForTimeout(1500);
  }

  // 3) 스캔본 전체화면 뷰어 모달 열기
  console.log('6. Opening scanned document fullscreen modal...');
  const fsBtn = page.locator('button:has-text("전체화면")').first();
  if (await fsBtn.isVisible()) {
    await fsBtn.click();
    await page.waitForTimeout(1500);

    // 줌 인
    const zoomInBtn = page.locator('button:has-text("➕ 확대")');
    if (await zoomInBtn.isVisible()) {
      await zoomInBtn.click();
      await page.waitForTimeout(1000);
    }

    // 닫기
    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // 4) 정밀 점검 시작하기
  console.log('7. Starting precision clause check...');
  const startBtn = page.locator('button:has-text("이 스캔 문서로 정밀 점검 시작하기")');
  await startBtn.click();

  // 결과 턴 로딩 대기
  await page.waitForSelector('.turn', { timeout: 20000 });
  await page.waitForTimeout(1200);

  // 5) 시각화 덱 카드로 스크롤
  console.log('8. Scrolling to visualization deck card...');
  await page.evaluate(() => {
    const el = document.querySelector('.annotated-doc-shell');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  await page.waitForTimeout(1500);

  // 특약 3번(차임 증액 한도 - 매년 8% 인상) 클릭 ➔ 빨간 형광펜 확인
  console.log('9. Highlighting toxic clause #3 (매년 8% 인상)...');
  const docPin3 = page.locator('[data-testid="doc-pin-3"]');
  if (await docPin3.isVisible()) {
    await docPin3.click();
    await page.waitForTimeout(1800);
  }

  // 대안 문구 복사 버튼 클릭
  console.log('10. Clicking copy alternative clause button...');
  const copyBtn = page.locator('.pointed-detail button.copy-chip').first();
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(1500);
  }

  // 1번 조항(근저당 설정 금지 - 권리 보호) 클릭 ➔ 초록 형광펜 확인
  console.log('11. Highlighting protective clause #1 (담보물권을 설정하지 아니한다)...');
  const docPin1 = page.locator('[data-testid="doc-pin-1"]');
  if (await docPin1.isVisible()) {
    await docPin1.click();
    await page.waitForTimeout(1800);
  }

  // 2번 조항(보증금 반환 시기 - 다음 임차인 입주 후 반환) 클릭 ➔ 빨간 형광펜 확인
  console.log('12. Highlighting toxic clause #2 (다음 임차인이 입주한 후에 반환)...');
  const docPin2 = page.locator('[data-testid="doc-pin-2"]');
  if (await docPin2.isVisible()) {
    await docPin2.click();
    await page.waitForTimeout(2000);
  }

  // 결과 화면에서 스캔문서 전체화면 1:1 대조 열기
  console.log('13. Demonstrating scanned document fullscreen comparison...');
  const scanFsBtn = page.locator('button:has-text("스캔문서 전체화면")');
  if (await scanFsBtn.isVisible()) {
    await scanFsBtn.click();
    await page.waitForTimeout(1800);

    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  console.log('14. Wrapping up demo recording...');
  await page.waitForTimeout(1500);

  await page.close();
  await context.close();
  await browser.close();

  // 비디오 파일 이동 및 H.264 MP4 인코딩
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) throw new Error('No mobile video recorded!');

  const recordedWebm = path.join(videoDir, files[0]);
  const destWebm = path.resolve('submission/04_시연영상_계약서특약점검기.webm');
  const destMp4 = path.resolve('submission/04_시연영상_계약서특약점검기.mp4');

  fs.copyFileSync(recordedWebm, destWebm);
  console.log('Saved mobile WebM to:', destWebm);

  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 "${destMp4}"`,
    { stdio: 'inherit' }
  );
  console.log('Saved mobile MP4 to:', destMp4);

  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log('Mobile demo recording finished successfully!');
}

record().catch((err) => {
  console.error('Error during mobile record:', err);
  process.exit(1);
});
