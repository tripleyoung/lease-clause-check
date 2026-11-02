import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function recordPcWithCaptions() {
  const videoDir = path.resolve('temp_recordings_pc_caption');
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  console.log('1. Starting Playwright with Desktop PC viewport (1440x900)...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: videoDir,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  console.log('2. Navigating to http://localhost:5193...');
  await page.goto('http://localhost:5193', { waitUntil: 'networkidle' });

  // 게스트 모드 진입
  const guestBtn = page.locator('button:has-text("로그인 없이 둘러보기 (빠른 체험)")');
  if (await guestBtn.isVisible()) {
    await guestBtn.click();
    await page.waitForTimeout(600);
  }

  // 자막 오버레이 헬퍼 함수 정의 및 페이지에 주입
  await page.evaluate(() => {
    const el = document.createElement('div');
    el.id = 'demo-caption-overlay';
    el.style.position = 'fixed';
    el.style.bottom = '28px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'rgba(15, 23, 42, 0.94)';
    el.style.backdropFilter = 'blur(16px)';
    el.style.color = '#ffffff';
    el.style.border = '1.5px solid rgba(56, 189, 248, 0.5)';
    el.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.2)';
    el.style.borderRadius = '9999px';
    el.style.padding = '12px 28px';
    el.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
    el.style.fontSize = '16px';
    el.style.fontWeight = '700';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '14px';
    el.style.zIndex = '99999999';
    el.style.pointerEvents = 'none';
    el.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
    el.innerHTML = `
      <span id="demo-step-badge" style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">안내</span>
      <span id="demo-step-text" style="color: #f8fafc; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">계약서 특약 점검기 시연을 시작합니다</span>
    `;
    document.body.appendChild(el);
  });

  const setCaption = async (step, text, tone = 'blue') => {
    await page.evaluate(({ step, text, tone }) => {
      const badge = document.getElementById('demo-step-badge');
      const label = document.getElementById('demo-step-text');
      const box = document.getElementById('demo-caption-overlay');
      if (badge && label && box) {
        badge.innerText = step;
        label.innerText = text;
        if (tone === 'red') {
          badge.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
          box.style.borderColor = 'rgba(239, 68, 68, 0.6)';
        } else if (tone === 'green') {
          badge.style.background = 'linear-gradient(135deg, #059669, #10b981)';
          box.style.borderColor = 'rgba(16, 185, 129, 0.6)';
        } else {
          badge.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)';
          box.style.borderColor = 'rgba(56, 189, 248, 0.5)';
        }
      }
    }, { step, text, tone });
  };

  // STEP 1: 14,280건 빅데이터 도넛 차트 설명
  await setCaption('STEP 1 · 상담 빅데이터', '14,280건 실제 의뢰인 상담 통계 — 사회초년생이 가장 많이 당하는 독소 조항 TOP 4');
  console.log('Caption: STEP 1 - Big Data Donut Chart');
  await page.waitForTimeout(1000);

  // 도넛 차트 부드럽게 스크롤
  await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  // STEP 2: 공식 표준 서식 스캔본 1:1 대조 설명
  await setCaption('STEP 2 · 서식 1:1 대조', '법무부·국토교통부 표준계약서 실물 스캔본 위 핀(①~⑤) 매핑으로 위험 위치 사전 확인');
  console.log('Caption: STEP 2 - Standard Scanned Doc Preview');
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await sampleCard.click();
  await page.waitForTimeout(1600);

  // 스캔본 위에서 특약 3번(보증금 반환 지연) 핀 클릭 ➔ 형광펜 확인
  await setCaption('STEP 2 · 위치 짚기', '스캔 계약서 3번 핀 클릭 ➔ "다음 임차인 입주 후 반환" 불법 지연 특약 위치 짚기', 'red');
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  if (await pin3.isVisible()) {
    await pin3.click();
    await page.waitForTimeout(1800);
  }

  // 4번 핀(원상복구 과다 전가) 클릭
  await setCaption('STEP 2 · 위치 짚기', '스캔 계약서 4번 핀 클릭 ➔ "퇴실 시 도배비 40만원 보증금 공제" 부당 특약 짚기', 'red');
  const pin4 = page.locator('[data-testid="scan-overlay-pin-4"]');
  if (await pin4.isVisible()) {
    await pin4.click();
    await page.waitForTimeout(1800);
  }

  // STEP 3: 고해상도 전체화면 열람 설명
  await setCaption('STEP 3 · 고해상도 모달', '공식 원본 서식 1:1 대조 모달 — 80%~180% 줌 확대로 계약서 세부 글자 정밀 확인');
  console.log('Caption: STEP 3 - Fullscreen Scanned Doc');
  const fsBtn = page.locator('button:has-text("전체화면")').first();
  if (await fsBtn.isVisible()) {
    await fsBtn.click();
    await page.waitForTimeout(1500);

    const zoomInBtn = page.locator('button:has-text("➕ 확대")');
    if (await zoomInBtn.isVisible()) {
      await zoomInBtn.click();
      await page.waitForTimeout(800);
      await zoomInBtn.click();
      await page.waitForTimeout(1400);
    }

    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // STEP 4: 정밀 점검 실행
  await setCaption('STEP 4 · AI 법령 점검', '국가법령정보센터 주택임대차보호법 및 대법원 판례 실시간 대조 판정 시작');
  console.log('Caption: STEP 4 - Run Precision Check');
  const startBtn = page.locator('button:has-text("이 스캔 문서로 정밀 점검 시작하기")');
  await startBtn.click();

  await page.waitForSelector('.turn', { timeout: 20000 });
  await page.waitForTimeout(1200);

  // 시각화 덱 카드로 스크롤
  await page.evaluate(() => {
    const el = document.querySelector('.annotated-doc-shell');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  await page.waitForTimeout(1500);

  // STEP 5: 원문 독소 조항 형광펜 하이라이트 설명
  await setCaption('STEP 5 · 형광펜 하이라이트', '긴 조항 다 읽지 마세요! [매년 8% 인상] 독소 키워드를 형광펜으로 0.1초 만에 식별!', 'red');
  console.log('Caption: STEP 5 - Fluorescent Highlighting');
  const docPin3 = page.locator('[data-testid="doc-pin-3"]');
  if (await docPin3.isVisible()) {
    await docPin3.click();
    await page.waitForTimeout(2200);
  }

  // STEP 6: 대안 특약 문구 복사 설명
  await setCaption('STEP 6 · 대안 문구 복사', '공인중개사·집주인에게 서명 전 보낼 법적 안전 대안 문구 원클릭 복사 (복사됨 ✓)', 'green');
  console.log('Caption: STEP 6 - Copy Alternative Clause');
  const copyBtn = page.locator('.pointed-detail button.copy-chip').first();
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(1800);
  }

  // 조항 1번: 권리 보호 조항 확인
  await setCaption('STEP 7 · 보호 조항 확인', '내 보증금을 지켜주는 [담보물권을 설정하지 아니한다] 필수 권리 보호 조항 대조', 'green');
  const docPin1 = page.locator('[data-testid="doc-pin-1"]');
  if (await docPin1.isVisible()) {
    await docPin1.click();
    await page.waitForTimeout(2200);
  }

  // 조항 2번: 보증금 반환 시기 독소 조항 재확인
  await setCaption('STEP 8 · 반환 지연 적발', '대표적 불법 독소 조항 [다음 임차인이 입주한 후에 반환] 즉각 포인터 매핑', 'red');
  const docPin2 = page.locator('[data-testid="doc-pin-2"]');
  if (await docPin2.isVisible()) {
    await docPin2.click();
    await page.waitForTimeout(2200);
  }

  // 마무리 안내
  await setCaption('온율(律) 특약점검기', '사회초년생을 위한 원스톱 계약·법률 안전망 — 시연을 마칩니다');
  await page.waitForTimeout(2000);

  await page.close();
  await context.close();
  await browser.close();

  // 비디오 파일 이동 및 H.264 MP4 인코딩
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) throw new Error('No PC video with caption recorded!');

  const recordedWebm = path.join(videoDir, files[0]);
  const destWebm = path.resolve('submission/04_시연영상_계약서특약점검기.webm');
  const destMp4 = path.resolve('submission/04_시연영상_계약서특약점검기.mp4');

  fs.copyFileSync(recordedWebm, destWebm);
  console.log('Saved captioned WebM to:', destWebm);

  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 "${destMp4}"`,
    { stdio: 'inherit' }
  );
  console.log('Saved captioned MP4 to:', destMp4);

  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log('PC demo recording with step captions finished successfully!');
}

recordPcWithCaptions().catch((err) => {
  console.error('Error during captioned recording:', err);
  process.exit(1);
});
