import { chromium } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function recordComprehensivePcDemo() {
  const videoDir = path.resolve('temp_recordings_comprehensive');
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  console.log('1. Starting Playwright with 1440x900 PC Viewport & Virtual Cursor...');
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

  // 가상 마우스 커서 & 세련된 자막 바 시스템 주입
  await page.evaluate(() => {
    // 1) 스타일 시트 주입
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes rippleAnim {
        0% { transform: scale(0.6); opacity: 1; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      .cursor-ripple {
        position: fixed;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.3);
        border: 2px solid #ef4444;
        pointer-events: none;
        z-index: 100000000;
        animation: rippleAnim 0.45s ease-out forwards;
      }
    `;
    document.head.appendChild(style);

    // 2) 가상 마우스 커서 엘리먼트
    const cursor = document.createElement('div');
    cursor.id = 'virtual-cursor';
    cursor.style.position = 'fixed';
    cursor.style.top = '0';
    cursor.style.left = '0';
    cursor.style.width = '26px';
    cursor.style.height = '26px';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '99999999';
    cursor.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.9, 0.4, 1)';
    cursor.style.transform = 'translate(720px, 450px)';
    cursor.style.filter = 'drop-shadow(0 2px 5px rgba(0,0,0,0.4))';
    cursor.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l7.2 17.5 2.8-6.5 6.5-2.8L3 3z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div style="position: absolute; top: -5px; left: -5px; width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); border: 1.5px solid rgba(239, 68, 68, 0.6); pointer-events: none;"></div>
    `;
    document.body.appendChild(cursor);

    // 3) 자막 오버레이 바
    const caption = document.createElement('div');
    caption.id = 'demo-caption-overlay';
    caption.style.position = 'fixed';
    caption.style.bottom = '32px';
    caption.style.left = '50%';
    caption.style.transform = 'translateX(-50%)';
    caption.style.background = 'rgba(15, 23, 42, 0.94)';
    caption.style.backdropFilter = 'blur(16px)';
    caption.style.color = '#ffffff';
    caption.style.border = '1.5px solid rgba(56, 189, 248, 0.5)';
    caption.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 24px rgba(56, 189, 248, 0.25)';
    caption.style.borderRadius = '9999px';
    caption.style.padding = '13px 30px';
    caption.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif";
    caption.style.fontSize = '16.5px';
    caption.style.fontWeight = '700';
    caption.style.display = 'flex';
    caption.style.alignItems = 'center';
    caption.style.gap = '14px';
    caption.style.zIndex = '99999998';
    caption.style.pointerEvents = 'none';
    caption.style.transition = 'all 0.3s ease';
    caption.innerHTML = `
      <span id="demo-step-badge" style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; padding: 4px 14px; border-radius: 9999px; font-size: 13.5px; font-weight: 800;">안내</span>
      <span id="demo-step-text" style="color: #f8fafc; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">온율(律) 계약서 특약 점검기 시연을 시작합니다</span>
    `;
    document.body.appendChild(caption);

    // 글로벌 함수 등록
    window.moveVirtualCursor = (x, y) => {
      const c = document.getElementById('virtual-cursor');
      if (c) c.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.triggerClickRipple = (x, y) => {
      const r = document.createElement('div');
      r.className = 'cursor-ripple';
      r.style.left = `${x - 18}px`;
      r.style.top = `${y - 18}px`;
      document.body.appendChild(r);
      setTimeout(() => r.remove(), 450);
    };
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
          box.style.borderColor = 'rgba(239, 68, 68, 0.7)';
        } else if (tone === 'green') {
          badge.style.background = 'linear-gradient(135deg, #059669, #10b981)';
          box.style.borderColor = 'rgba(16, 185, 129, 0.7)';
        } else {
          badge.style.background = 'linear-gradient(135deg, #2563eb, #3b82f6)';
          box.style.borderColor = 'rgba(56, 189, 248, 0.5)';
        }
      }
    }, { step, text, tone });
  };

  const moveCursorTo = async (locator, extraOffsetX = 0, extraOffsetY = 0) => {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await locator.boundingBox();
    if (!box) return null;
    const x = box.x + box.width / 2 + extraOffsetX;
    const y = box.y + box.height / 2 + extraOffsetY;
    await page.evaluate(({ x, y }) => window.moveVirtualCursor(x, y), { x, y });
    await page.waitForTimeout(400);
    return { x, y };
  };

  const clickWithCursor = async (locator, extraOffsetX = 0, extraOffsetY = 0) => {
    const coords = await moveCursorTo(locator, extraOffsetX, extraOffsetY);
    if (coords) {
      await page.evaluate(({ x, y }) => window.triggerClickRipple(x, y), coords);
    }
    await locator.click();
    await page.waitForTimeout(600);
  };

  // ========================================================
  // 시연 시나리오 시작 (총 1분 20초 대작 구성)
  // ========================================================

  // [00:00 ~ 00:18] STEP 1: 상담 빅데이터 도넛 차트 둘러보기
  await setCaption('STEP 1 · 상담 빅데이터', '14,280건 실제 의뢰인 상담 통계 — 사회초년생이 가장 많이 당하는 독소 조항 TOP 4');
  console.log('STEP 1: Big data donut chart');
  await page.waitForTimeout(1500);

  // 도넛 차트로 부드럽게 스크롤
  await page.evaluate(() => window.scrollBy({ top: 250, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // 가상 마우스 커서가 도넛 차트로 이동하여 둘러보기
  const donutEl = page.locator('.stats-donut__chart-wrap').first();
  if (await donutEl.isVisible()) {
    await moveCursorTo(donutEl);
    await page.waitForTimeout(1200);
  }

  // '헬스장·PT' 탭 클릭
  await setCaption('STEP 1 · 상담 빅데이터', '헬스장·PT 분야: 위약금 10% 초과 및 정상가 꼼수 차감 등 소비자 피해 분석');
  const gymTab = page.locator('button:has-text("🏋️ 헬스장·PT")');
  if (await gymTab.isVisible()) {
    await clickWithCursor(gymTab);
    await page.waitForTimeout(2000);
  }

  // '주택 전월세' 탭으로 다시 복귀
  await setCaption('STEP 1 · 상담 빅데이터', '주택 전월세 분야: 다음 세입자 특약(38%), 잔금일 근저당(29%), 도배비 부당공제(21%)');
  const leaseTab = page.locator('button:has-text("🏠 주택 전월세")');
  if (await leaseTab.isVisible()) {
    await clickWithCursor(leaseTab);
    await page.waitForTimeout(2000);
  }

  // [00:18 ~ 00:35] STEP 2: 공식 표준 서식 스캔본 1:1 대조 & 핀 인터랙션
  await setCaption('STEP 2 · 서식 1:1 대조', '법무부·국토교통부 표준계약서 공식 서식 위 핀(①~⑤) 매핑으로 위험 위치 사전 확인');
  console.log('STEP 2: Standard scanned doc preview');
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await clickWithCursor(sampleCard);
  await page.waitForTimeout(2000);

  // 스캔본 위 3번 핀(보증금 반환 지연) 클릭
  await setCaption('STEP 2 · 위치 짚기', '스캔 계약서 3번 핀 클릭 ➔ "다음 임차인 입주 후 반환" 불법 지연 특약 위치 짚기', 'red');
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  if (await pin3.isVisible()) {
    await clickWithCursor(pin3);
    await page.waitForTimeout(2200);
  }

  // 스캔본 위 4번 핀(원상복구 과다 전가) 클릭
  await setCaption('STEP 2 · 위치 짚기', '스캔 계약서 4번 핀 클릭 ➔ "퇴실 시 도배비 40만원 보증금 공제" 부당 특약 짚기', 'red');
  const pin4 = page.locator('[data-testid="scan-overlay-pin-4"]');
  if (await pin4.isVisible()) {
    await clickWithCursor(pin4);
    await page.waitForTimeout(2200);
  }

  // [00:35 ~ 00:50] STEP 3: 고해상도 전체화면 열람 모달
  await setCaption('STEP 3 · 고해상도 뷰어', '공식 원본 서식 1:1 대조 모달 — 80%~180% 줌 확대로 계약서 세부 조항 정밀 확인');
  console.log('STEP 3: Fullscreen modal');
  const fsBtn = page.locator('button:has-text("전체화면")').first();
  if (await fsBtn.isVisible()) {
    await clickWithCursor(fsBtn);
    await page.waitForTimeout(2000);

    // 줌 확대 버튼 클릭 (+15%)
    const zoomInBtn = page.locator('button:has-text("➕ 확대")');
    if (await zoomInBtn.isVisible()) {
      await clickWithCursor(zoomInBtn);
      await page.waitForTimeout(1200);
      await clickWithCursor(zoomInBtn);
      await page.waitForTimeout(1800);
    }

    // 닫기
    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await clickWithCursor(closeBtn);
      await page.waitForTimeout(1200);
    }
  }

  // [00:50 ~ 01:05] STEP 4: 정밀 점검 실행
  await setCaption('STEP 4 · AI 법령 점검', '국가법령정보센터 주택임대차보호법 및 대법원 판례 실시간 대조 판정 시작');
  console.log('STEP 4: Precision clause check');
  await page.waitForTimeout(600);
  const startBtn = page.locator('button:has-text("이 스캔 문서로 정밀 점검 시작하기")').first();
  await clickWithCursor(startBtn);

  await page.waitForSelector('.turn', { timeout: 30000 });
  await page.waitForTimeout(2000);

  // 시각화 덱 카드로 스크롤
  await page.evaluate(() => {
    const el = document.querySelector('.annotated-doc-shell');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  await page.waitForTimeout(1800);

  // [01:05 ~ 01:25] STEP 5: 독소 조항 형광펜 하이라이트 & 대안 복사
  await setCaption('STEP 5 · 형광펜 하이라이트', '긴 조항 다 읽지 마세요! [매년 8% 인상] 독소 키워드를 형광펜으로 0.1초 만에 식별!', 'red');
  console.log('STEP 5: Fluorescent highlights');
  const docPin3 = page.locator('[data-testid="doc-pin-3"]');
  if (await docPin3.isVisible()) {
    await clickWithCursor(docPin3);
    await page.waitForTimeout(2800);
  }

  // '대안 문구 복사' 버튼으로 마우스 이동 후 클릭
  await setCaption('STEP 6 · 대안 문구 복사', '공인중개사·집주인에게 서명 전 즉시 요구할 법적 안전 대안 문구 원클릭 복사 (복사됨 ✓)', 'green');
  const copyBtn = page.locator('.pointed-detail button.copy-chip').first();
  if (await copyBtn.isVisible()) {
    await clickWithCursor(copyBtn);
    await page.waitForTimeout(2500);
  }

  // 1번 조항(담보권 설정 금지 - 권리 보호) 클릭
  await setCaption('STEP 7 · 보호 조항 확인', '내 보증금을 지켜주는 [담보물권을 설정하지 아니한다] 필수 권리 보호 조항 대조', 'green');
  const docPin1 = page.locator('[data-testid="doc-pin-1"]');
  if (await docPin1.isVisible()) {
    await clickWithCursor(docPin1);
    await page.waitForTimeout(2800);
  }

  // 2번 조항(보증금 반환 시기 - 다음 세입자 입주 후 반환) 클릭
  await setCaption('STEP 8 · 반환 지연 적발', '대표적 불법 독소 조항 [다음 임차인이 입주한 후에 반환] 즉각 포인터 매핑', 'red');
  const docPin2 = page.locator('[data-testid="doc-pin-2"]');
  if (await docPin2.isVisible()) {
    await clickWithCursor(docPin2);
    await page.waitForTimeout(2800);
  }

  // [01:25 ~ 01:35] STEP 9: 결과 화면에서 스캔문서 1:1 대조 전체화면 & 엔딩
  await setCaption('STEP 9 · 결과 1:1 대조', '실제 스캔 계약서 서식과 AI 진단 결과를 1:1로 실시간 대조 검증');
  const scanFsBtn = page.locator('button:has-text("스캔문서 전체화면")');
  if (await scanFsBtn.isVisible()) {
    await clickWithCursor(scanFsBtn);
    await page.waitForTimeout(2500);

    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await clickWithCursor(closeBtn);
      await page.waitForTimeout(1500);
    }
  }

  // 엔딩 자막
  await setCaption('온율(律) 특약점검기', '사회초년생을 위한 원스톱 계약·법률 안전망 — 시연을 마칩니다');
  await page.waitForTimeout(2500);

  await page.close();
  await context.close();
  await browser.close();

  // 비디오 파일 이동 및 H.264 MP4 인코딩
  const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) throw new Error('No comprehensive PC video recorded!');

  const recordedWebm = path.join(videoDir, files[0]);
  const destWebm = path.resolve('submission/04_시연영상_계약서특약점검기.webm');
  const destMp4 = path.resolve('submission/04_시연영상_계약서특약점검기.mp4');

  fs.copyFileSync(recordedWebm, destWebm);
  console.log('Saved comprehensive WebM to:', destWebm);

  execSync(
    `/opt/homebrew/bin/ffmpeg -y -i "${destWebm}" -c:v libx264 -pix_fmt yuv420p -preset fast -crf 22 "${destMp4}"`,
    { stdio: 'inherit' }
  );
  console.log('Saved comprehensive MP4 to:', destMp4);

  fs.rmSync(videoDir, { recursive: true, force: true });
  console.log('Comprehensive PC demo recording finished successfully!');
}

recordComprehensivePcDemo().catch((err) => {
  console.error('Error during recording:', err);
  process.exit(1);
});
