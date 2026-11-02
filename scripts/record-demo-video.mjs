import { chromium, devices } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function record() {
  const videoDir = path.resolve('temp_recordings');
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  console.log('1. Starting Playwright with video recording...');
  const browser = await chromium.launch({
    headless: true,
  });

  // 데스크톱 / 태블릿 느낌의 깔끔한 1280x800 해상도로 녹화 (심사위원 시연 최적 해상도)
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  console.log('2. Navigating to live dev server (http://localhost:5193)...');
  await page.goto('http://localhost:5193', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 게스트 모드 진입
  console.log('3. Entering guest mode...');
  const guestBtn = page.locator('button:has-text("로그인 없이 둘러보기 (빠른 체험)")');
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
    await page.waitForTimeout(1200);
  }

  // 홈 화면 도넛 차트 및 안내 둘러보기
  console.log('4. Showing big data donut stats & sample preview...');
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // 1) 법무부 주택임대차 표준계약서 샘플 카드 클릭
  console.log('5. Clicking lease sample card...');
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await sampleCard.click();
  await page.waitForTimeout(1500);

  // 스캔본 위에서 특약 3번(보증금 반환 지연) 핀 클릭 및 하이라이트 확인
  console.log('6. Interacting with scan document pins...');
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  if (await pin3.isVisible()) {
    await pin3.click();
    await page.waitForTimeout(1500);
  }

  // 4번 핀(원상복구 과다 전가) 클릭
  const pin4 = page.locator('[data-testid="scan-overlay-pin-4"]');
  if (await pin4.isVisible()) {
    await pin4.click();
    await page.waitForTimeout(1500);
  }

  // 전체화면 모달 열기 시연
  console.log('7. Opening fullscreen scanned document modal...');
  const fsBtn = page.locator('button:has-text("전체화면")').first();
  if (await fsBtn.isVisible()) {
    await fsBtn.click();
    await page.waitForTimeout(1500);

    // 줌 인 시연
    const zoomInBtn = page.locator('button:has-text("➕ 확대")');
    if (await zoomInBtn.isVisible()) {
      await zoomInBtn.click();
      await page.waitForTimeout(800);
      await zoomInBtn.click();
      await page.waitForTimeout(1200);
    }

    // 전체화면 닫기
    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // 2) 정밀 점검 시작하기
  console.log('8. Starting precision clause check...');
  const startBtn = page.locator('button:has-text("이 스캔 문서로 정밀 점검 시작하기")');
  await startBtn.click();

  // 결과 턴 로딩 대기
  await page.waitForSelector('.turn', { timeout: 20000 });
  await page.waitForTimeout(1500);

  // 3) 상세 분석 카드 및 형광펜 하이라이트 시연
  console.log('9. Demonstrating fluorescent keyword highlights & pointer...');
  await page.evaluate(() => {
    const el = document.querySelector('.annotated-doc-shell');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  await page.waitForTimeout(1500);

  // 특약 3번(차임 증액 한도 - 매년 8% 인상) 핀 클릭 ➔ 형광펜 확인
  const docPin3 = page.locator('[data-testid="doc-pin-3"]');
  if (await docPin3.isVisible()) {
    await docPin3.click();
    await page.waitForTimeout(1800);
  }

  // 대안 문구 복사 버튼 클릭
  console.log('10. Copying alternative clause text...');
  const copyBtn = page.locator('.pointed-detail button.copy-chip').first();
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(1500);
  }

  // 1번 조항(담보권 설정 금지 - 권리 보호) 클릭 ➔ 초록 형광펜 확인
  const docPin1 = page.locator('[data-testid="doc-pin-1"]');
  if (await docPin1.isVisible()) {
    await docPin1.click();
    await page.waitForTimeout(1800);
  }

  // 2번 조항(보증금 반환 시기 - 다음 임차인 입주 후 반환) 클릭 ➔ 빨간 형광펜 확인
  const docPin2 = page.locator('[data-testid="doc-pin-2"]');
  if (await docPin2.isVisible()) {
    await docPin2.click();
    await page.waitForTimeout(2000);
  }

  // 스캔 실물 1:1 대조 라이트박스 팝업 시연
  console.log('11. Opening interactive scanned document comparison from results...');
  const scanFsBtn = page.locator('button:has-text("스캔문서 전체화면")');
  if (await scanFsBtn.isVisible()) {
    await scanFsBtn.click();
    await page.waitForTimeout(2000);

    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  console.log('12. Wrapping up demo video recording...');
  await page.waitForTimeout(1500);

  await page.close();
  await context.close();
  await browser.close();

  // 녹화된 비디오 파일 찾기
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('No video recorded!');
  }

  const recordedWebm = path.join(videoDir, files[0]);
  const destWebm = path.resolve('submission/04_시연영상_계약서특약점검기.webm');
  const destMp4 = path.resolve('submission/04_시연영상_계약서특약점검기.mp4');

  console.log('13. Moving and encoding high quality video files...');
  fs.copyFileSync(recordedWebm, destWebm);
  console.log('Saved WebM to:', destWebm);

  // ffmpeg로 호환성 높은 H.264 MP4로 인코딩
  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 23 "${destMp4}"`,
    { stdio: 'inherit' }
  );
  console.log('Saved MP4 to:', destMp4);

  // 임시 디렉토리 정리
  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log('Demo video recording finished successfully!');
}

record().catch((err) => {
  console.error('Recording error:', err);
  process.exit(1);
});
