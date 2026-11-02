/**
 * 온율(溫律) PC 환경 실제 사진 업로드 & AI 정밀 점검 시연 영상 (1440x900)
 * 
 * 사용자 피드백 100% 반영:
 * 1. 실제 계약서 사진(scanned_lease_contract.png)을 직접 업로드하고 전송하여 AI 실시간 OCR & 법령 대조 실행
 * 2. 업로드된 문서 위에서 2번/3번 독소 조항 핀 클릭 ➔ 단청 빨강 형광펜 하이라이트 실시간 연동
 * 3. 스캔문서 고해상도 전체화면 모달 오픈 ➔ 내부 스크롤로 계약서 전체 및 하단 특약사항 핀 정밀 검증
 * 4. 공인중개사용 대체 특약 복사 & 대법원 판례 해설 정독
 * 5. 가상 마우스 커서 + 클릭 시 시각적 파동(Ripple) 효과 + 상단 안내 자막 배너
 */
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SUBMISSION_DIR = path.resolve(ROOT_DIR, 'submission');
const RAW_VIDEO_DIR = path.resolve(ROOT_DIR, 'temp-recordings');

if (!fs.existsSync(SUBMISSION_DIR)) fs.mkdirSync(SUBMISSION_DIR, { recursive: true });
if (!fs.existsSync(RAW_VIDEO_DIR)) fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });

async function recordLiveUploadDemo() {
  console.log('1. Starting Playwright with 1440x900 PC Viewport & Virtual Cursor...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--window-size=1440,900',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: RAW_VIDEO_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();

  console.log('2. Navigating to http://localhost:5193...');
  await page.goto('http://localhost:5193', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 가상 마우스 및 캡션 오버레이 주입
  await page.evaluate(() => {
    // 1) 스타일 시트 주입
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes rippleAnim {
        0% { transform: scale(0.6); opacity: 1; }
        100% { transform: scale(2.4); opacity: 0; }
      }
      .cursor-ripple {
        position: fixed;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.35);
        border: 2.5px solid #ef4444;
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
    cursor.style.transition = 'transform 0.45s cubic-bezier(0.2, 0.9, 0.4, 1)';
    cursor.style.transform = 'translate(720px, 450px)';
    cursor.style.filter = 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))';
    cursor.innerHTML = `
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l7.2 17.5 2.8-6.5 6.5-2.8L3 3z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div style="position: absolute; top: -5px; left: -5px; width: 34px; height: 34px; border-radius: 50%; background: rgba(239, 68, 68, 0.2); border: 1.5px solid rgba(239, 68, 68, 0.6); pointer-events: none;"></div>
    `;
    document.body.appendChild(cursor);

    // 3) 상단 고정 설명 자막 배너
    const caption = document.createElement('div');
    caption.id = 'demo-caption-overlay';
    caption.style.position = 'fixed';
    caption.style.bottom = '32px';
    caption.style.left = '50%';
    caption.style.transform = 'translateX(-50%)';
    caption.style.background = 'rgba(15, 23, 42, 0.95)';
    caption.style.backdropFilter = 'blur(16px)';
    caption.style.color = '#ffffff';
    caption.style.border = '1.5px solid rgba(56, 189, 248, 0.5)';
    caption.style.boxShadow = '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 24px rgba(56, 189, 248, 0.25)';
    caption.style.borderRadius = '9999px';
    caption.style.padding = '13px 32px';
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

    window.moveVirtualCursor = (x, y) => {
      const c = document.getElementById('virtual-cursor');
      if (c) c.style.transform = `translate(${x}px, ${y}px)`;
    };
    window.triggerClickRipple = (x, y) => {
      const r = document.createElement('div');
      r.className = 'cursor-ripple';
      r.style.left = `${x - 19}px`;
      r.style.top = `${y - 19}px`;
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
    await page.waitForTimeout(450);
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
  // 시연 시나리오: 실제 파일 업로드 ➔ 실시간 점검 파이프라인
  // ========================================================

  // [00:00 ~ 00:15] STEP 1: 빅데이터 위험률 도넛 차트 둘러보기 & 빠른 체험 진입
  await setCaption('STEP 1 · 상담 빅데이터', '14,280건 실제 상담 통계 — 사회초년생이 가장 많이 겪는 독소 조항 TOP 4 분석');
  console.log('STEP 1: Big data donut chart');
  await page.waitForTimeout(1500);

  // 도넛 차트로 스크롤
  await page.evaluate(() => window.scrollBy({ top: 220, behavior: 'smooth' }));
  await page.waitForTimeout(1200);

  const donutEl = page.locator('.stats-donut__chart-wrap').first();
  if (await donutEl.isVisible()) {
    await moveCursorTo(donutEl);
    await page.waitForTimeout(1500);
  }

  // '로그인 없이 둘러보기 (빠른 체험)' 버튼 클릭하여 대화형 워크스페이스 진입
  const devLoginBtn = page.locator('button:has-text("로그인 없이 둘러보기 (빠른 체험)")').first();
  if (await devLoginBtn.isVisible()) {
    await setCaption('STEP 1 · 빠른 체험 시작', '원클릭으로 즉시 법률·세무 대화형 점검 워크스페이스로 진입합니다');
    await clickWithCursor(devLoginBtn);
    await page.waitForTimeout(1800);
  }

  // [00:15 ~ 00:40] STEP 2: 실제 계약서 사진 직접 첨부(업로드) & AI 분석 전송!
  await setCaption('STEP 2 · 실제 파일 첨부', '계약서 사진 직접 첨부(scanned_lease_contract.png) ➔ 개인정보 자동 마스킹 준비', 'green');
  console.log('STEP 2: Real file upload and send');
  await page.waitForTimeout(1000);

  const photoDropCard = page.locator('.photo-dropcard').first();
  if (await photoDropCard.isVisible()) {
    await moveCursorTo(photoDropCard);
    await page.waitForTimeout(1000);
  }

  // 실제 계약서 사진(scanned_lease_contract.png) 업로드 트리거
  const sampleFilePath = path.resolve(ROOT_DIR, 'public/samples/scanned_lease_contract.png');
  const fileInput = page.locator('[data-testid="file-input"]');
  await fileInput.setInputFiles(sampleFilePath);
  await page.waitForTimeout(1500);

  // 첨부 바 확인 & 마우스로 첨부 바 둘러보기
  const attachmentBar = page.locator('[data-testid="attachment-preview"]');
  if (await attachmentBar.isVisible()) {
    await moveCursorTo(attachmentBar);
    await page.waitForTimeout(2500);
  }

  // ★ 전송 버튼 클릭하여 실제 업로드 분석 시작!
  await setCaption('STEP 2 · AI 실시간 분석', '전송 버튼 클릭 ➔ Gemini Vision 실시간 OCR 특약 추출 & 개인정보 자동 마스킹 가동', 'green');
  const sendBtn = page.locator('[data-testid="composer-send"]');
  await clickWithCursor(sendBtn);

  // AI OCR 분석 및 법령 대조 완료 대기
  await page.waitForSelector('.turn', { timeout: 45000 });
  await page.waitForTimeout(3000);

  // [00:40 ~ 01:05] STEP 3: 업로드된 계약서 실물 1:1 대조 & 2번/3번 독소 조항 핀포인팅
  await setCaption('STEP 3 · 업로드 계약서 대조', '업로드된 계약서 원본 위 조항 핀포인팅 ➔ 2번 독소 조항 클릭으로 위험 식별', 'red');
  console.log('STEP 3: Uploaded document pinpoint check');

  // 시각화 카드로 스크롤
  await page.evaluate(() => {
    const deck = document.querySelector('.annotated-deck') || document.querySelector('.turn');
    if (deck) deck.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(2000);

  // 2번 핀(특약 1항: 다음 세입자 입주 후 반환) 클릭
  const pin2 = page.locator('[data-testid="result-pin-2"]');
  if (await pin2.isVisible()) {
    await clickWithCursor(pin2);
    await setCaption('STEP 3 · 2번 핀 클릭', '2번 핀 클릭 ➔ "다음 임차인이 입주한 후에 반환" 불법 지연 독소 조항 단청 빨강 형광펜 확인', 'red');
    await page.waitForTimeout(4000); // 사용자가 형광펜 문구를 충분히 읽을 수 있도록 머무름
  }

  // 3번 핀(특약 3항: 차임 매년 8% 인상) 클릭
  const pin3 = page.locator('[data-testid="result-pin-3"]');
  if (await pin3.isVisible()) {
    await clickWithCursor(pin3);
    await setCaption('STEP 3 · 3번 핀 클릭', '3번 핀 클릭 ➔ "차임 매년 8%씩 인상" 법정 5% 상한 초과 무효 조항 형광펜 확인', 'red');
    await page.waitForTimeout(4000);
  }

  // [01:05 ~ 01:30] STEP 4: 업로드 문서 고해상도 전체화면 열람 & 내부 스크롤
  await setCaption('STEP 4 · 전체화면 스크롤', '스캔문서 전체화면 모드 ➔ 1:1 고해상도 대화면에서 계약서 전체 조항 스크롤 열람');
  console.log('STEP 4: Fullscreen modal with scrolling on uploaded contract');
  const fsBtn = page.locator('[data-testid="annotated-doc-fullscreen-btn"]').first();
  if (await fsBtn.isVisible()) {
    await clickWithCursor(fsBtn);
    await page.waitForTimeout(2000);

    // 줌 115%로 확대
    const zoomInBtn = page.locator('button:has-text("➕ 확대")');
    if (await zoomInBtn.isVisible()) {
      await clickWithCursor(zoomInBtn);
      await page.waitForTimeout(1500);
    }

    // 마우스 휠로 전체화면 내부 스크롤 다운!
    await setCaption('STEP 4 · 문서 정밀 스크롤', '마우스 휠로 계약서 하단으로 스크롤하여 2번·3번 특약사항 위치 정밀 확인');
    await page.evaluate(() => window.moveVirtualCursor(720, 480));
    await page.waitForTimeout(800);

    await page.evaluate(() => {
      const el = document.querySelector('.doc-fullscreen-body');
      if (el) el.scrollBy({ top: 380, behavior: 'smooth' });
    });
    await page.waitForTimeout(3500);

    // 전체화면 닫기
    const closeBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeBtn.isVisible()) {
      await clickWithCursor(closeBtn);
      await page.waitForTimeout(1500);
    }
  }

  // [01:30 ~ 01:50] STEP 5: 정밀 점검 결과 화면 & 형광펜 독소 조항 & 대체 특약 복사
  await setCaption('STEP 5 · 독소 조항 판정', 'AI 법령 점검 ➔ 주택임대차보호법 제10조 강행규정 위반 판정 & 대체 특약 복사', 'red');
  console.log('STEP 5: Results & copy alternative');

  // 대안 문구 복사 버튼 클릭
  const copyBtn = page.locator('button:has-text("대안 문구 복사"), .action-card__copy-btn').first();
  if (await copyBtn.isVisible()) {
    await clickWithCursor(copyBtn);
    await setCaption('STEP 5 · 대체 특약 복사', '공인중개사 협상용 안심 대체 특약 원클릭 복사 ➔ 클립보드 저장 완료', 'green');
    await page.waitForTimeout(3000);
  }

  // 하단 판례 해설로 스크롤
  await setCaption('STEP 5 · 대법원 판례 근거', '국가법령정보센터 주택임대차보호법 제10조 및 대법원 2005다51389 판례 근거 제시');
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(4000);

  // 최종 안내 배너
  await setCaption('온율(律) 점검 완료', '실제 계약서 사진 업로드 ➔ 실시간 AI 법령 점검 완료 — 공모전 출품작 온율', 'green');
  await page.waitForTimeout(3500);

  console.log('Finished scenario. Closing context to flush video file...');
  await page.close();
  await context.close();
  await browser.close();

  // 녹화된 WebM 파일 탐색
  const files = fs.readdirSync(RAW_VIDEO_DIR).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('No recorded video file found in ' + RAW_VIDEO_DIR);
  }
  files.sort((a, b) => {
    return fs.statSync(path.join(RAW_VIDEO_DIR, b)).mtimeMs - fs.statSync(path.join(RAW_VIDEO_DIR, a)).mtimeMs;
  });
  const latestWebm = path.join(RAW_VIDEO_DIR, files[0]);
  const destWebm = path.join(SUBMISSION_DIR, '04_시연영상_계약서특약점검기.webm');
  const destMp4 = path.join(SUBMISSION_DIR, '04_시연영상_계약서특약점검기.mp4');

  fs.copyFileSync(latestWebm, destWebm);
  console.log('Saved comprehensive WebM to:', destWebm);

  // ffmpeg로 호환성 100% H.264 MP4로 트랜스코딩
  const ffmpegCmd = `ffmpeg -y -i "${destWebm}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart "${destMp4}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log('Saved comprehensive MP4 to:', destMp4);

  console.log('Live Upload PC demo recording finished successfully!');
}

recordLiveUploadDemo().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});
