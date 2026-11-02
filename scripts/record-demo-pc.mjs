/**
 * 온율(溫律) PC 환경 정밀 시연 영상 녹화 스크립트 (1440x900 MacBook/PC 해상도)
 * 
 * 사용자 피드백 100% 반영:
 * 1. 실제 계약서 사진 파일 직접 첨부(업로드) 및 개인정보 가림 안내바 테스트
 * 2. 1:1 스캔 서식에서 3번 독소 조항 핀포인트 클릭 시 형광펜 하이라이트 반응 명확화 (기본 1번 -> 3번 클릭)
 * 3. 전체화면 모달 내부에서 위아래로 부드럽게 스크롤하여 하단 특약 핀과 형광펜 문구 정밀 검증
 * 4. 가상 마우스 커서 + 클릭 시 시각적 파동(Ripple) 효과
 * 5. 상단 안내 자막 배너 실시간 표출
 * 6. 약 1분 35초~1분 45초의 넉넉한 호흡으로 쾌적한 가독성 확보
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

async function recordComprehensivePCDemo() {
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

    // 3) 상단 고정 설명 자막 배너 (가독성 높은 짙은 슬레이트 + 블루/레드 뱃지)
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
  // 시연 시나리오 시작 (총 약 95~105초 정밀 구성)
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

  // [00:15 ~ 00:32] STEP 2: 실제 계약서 사진 파일 직접 첨부(업로드) 테스트!
  await setCaption('STEP 2 · 실제 파일 첨부', '계약서 사진 직접 첨부 테스트 ➔ 개인정보 자동 마스킹 및 첨부 상태 실시간 확인', 'green');
  console.log('STEP 2: Real file upload test');
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
  await page.waitForTimeout(1200);

  // 첨부 바 확인 & 마우스로 첨부 바 둘러보기
  const attachmentBar = page.locator('[data-testid="attachment-preview"]');
  if (await attachmentBar.isVisible()) {
    await setCaption('STEP 2 · 개인정보 보호', 'scanned_lease_contract.png 첨부 완료 ➔ 이름·주민번호 브라우저 자동 가림 준비', 'green');
    await moveCursorTo(attachmentBar);
    await page.waitForTimeout(3000); // 사용자가 첨부 바를 충분히 인지할 수 있도록 머무름

    // 공식 표준 서식 1:1 대조 및 전체화면 시연을 위해 첨부 파일 닫기 클릭
    const removeBtn = page.locator('.attachment-bar__remove');
    if (await removeBtn.isVisible()) {
      await clickWithCursor(removeBtn);
      await page.waitForTimeout(1200);
    }
  }

  // [00:32 ~ 00:52] STEP 3: 공식 표준 서식 1:1 대조 & 3번 독소 조항 핀포인팅
  await setCaption('STEP 3 · 공식 서식 대조', '법무부·국토부 표준계약서 원본 위 조항 위치 핀(①~⑤) 매핑으로 사전 검토');
  console.log('STEP 3: Standard doc preview and pin 3 pinpointing');
  const sampleCard = page.locator('[data-testid="sample-card-lease_sample"]');
  await clickWithCursor(sampleCard);
  await page.waitForTimeout(2000);

  // 현재 기본 선택은 1번(안심) 조항!
  // 이제 가상 마우스가 스캔본 위 3번 핀(보증금 반환 지연)으로 이동하여 찰칵 클릭!
  await setCaption('STEP 3 · 3번 핀 클릭', '스캔 계약서 3번 핀 클릭 ➔ "다음 임차인 입주 후 반환" 불법 지연 특약 위치 짚기 & 형광펜 확인', 'red');
  const pin3 = page.locator('[data-testid="scan-overlay-pin-3"]');
  if (await pin3.isVisible()) {
    await clickWithCursor(pin3);
    await page.waitForTimeout(3500); // 3번 핀 툴팁과 하단 요약 바의 단청 빨강 형광펜을 정독할 수 있도록 충분히 머무름
  }

  // 4번 핀(원상복구 과다 전가)도 클릭하여 하이라이트 전환 확인
  await setCaption('STEP 3 · 4번 핀 클릭', '스캔 계약서 4번 핀 클릭 ➔ "퇴실 시 도배비 40만원 보증금 공제" 부당 특약 짚기', 'red');
  const pin4 = page.locator('[data-testid="scan-overlay-pin-4"]');
  if (await pin4.isVisible()) {
    await clickWithCursor(pin4);
    await page.waitForTimeout(3000);
  }

  // [00:52 ~ 01:20] STEP 4: 고해상도 전체화면 열람 & 문서 내부 스크롤 & 하이라이트 확인
  await setCaption('STEP 4 · 전체화면 스크롤', '스캔문서 전체화면 모드 ➔ 1:1 고해상도 대화면에서 계약서 전체 조항 스크롤 열람');
  console.log('STEP 4: Fullscreen modal with scrolling and pin check');
  const fsBtn = page.locator('[data-testid="open-doc-fullscreen-btn"]').first();
  await clickWithCursor(fsBtn);
  await page.waitForTimeout(2000);

  // 줌 115%로 확대하여 가독성 극대화
  const zoomInBtn = page.locator('button:has-text("➕ 확대")');
  if (await zoomInBtn.isVisible()) {
    await clickWithCursor(zoomInBtn);
    await page.waitForTimeout(1500);
  }

  // ★ 사용자 요청 핵심 반영: 전체화면 모달 내부(.doc-fullscreen-body)를 위에서 아래로 스무스하게 스크롤 다운!
  await setCaption('STEP 4 · 문서 정밀 스크롤', '마우스 휠로 계약서 하단으로 스크롤하여 3번·4번·5번 특약사항 위치 정밀 확인');
  
  // 마우스 커서를 전체화면 문서 중앙으로 이동
  await page.evaluate(() => window.moveVirtualCursor(720, 480));
  await page.waitForTimeout(800);

  // 문서 상단 -> 하단 특약사항 영역으로 1차 스크롤
  await page.evaluate(() => {
    const el = document.querySelector('.doc-fullscreen-body');
    if (el) el.scrollBy({ top: 380, behavior: 'smooth' });
  });
  await page.waitForTimeout(3000);

  // 전체화면 안에서 3번 핀(fs-pin-3)을 직접 클릭!
  await setCaption('STEP 4 · 전체화면 핀 검증', '전체화면에서 3번 핀 클릭 ➔ 하단 플로팅 바에 형광펜 쳐진 독소 조항 텍스트 실시간 연동', 'red');
  const fsPin3 = page.locator('[data-testid="fs-pin-3"]');
  if (await fsPin3.isVisible()) {
    await clickWithCursor(fsPin3);
    await page.waitForTimeout(3500); // 하단 플로팅 바의 단청 빨강 형광펜 문구 정독
  }

  // 전체화면 하단 "이 스캔 문서로 정밀 점검 시작하기" 버튼 클릭!
  await setCaption('STEP 4 · 정밀 점검 실행', '이 스캔 문서로 정밀 점검 시작하기 클릭 ➔ AI 법령 대조 분석 프로세스 가동');
  const fsStartCheckBtn = page.locator('[data-testid="fs-start-check-btn"]');
  await clickWithCursor(fsStartCheckBtn);

  // 점검 완료 대기
  await page.waitForSelector('.turn', { timeout: 35000 });
  await page.waitForTimeout(2500);

  // [01:20 ~ 01:45] STEP 5: 정밀 점검 결과 화면 & 형광펜 독소 조항 & 대체 특약 복사
  await setCaption('STEP 5 · 독소 조항 검출', 'AI 법령 점검 완료 ➔ 주임법 제10조 강행규정 위반 판정 & 형광펜 단청 빨강 하이라이트', 'red');
  console.log('STEP 5: Precision results & fluorescent highlight check');

  // 시각화 덱 카드로 스크롤
  await page.evaluate(() => {
    const deck = document.querySelector('.annotated-deck') || document.querySelector('.result-card');
    if (deck) deck.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(3500);

  // 형광펜으로 강조된 독소 문구로 마우스 이동
  const kwEl = page.locator('.kw-highlight--risk').first();
  if (await kwEl.isVisible()) {
    await moveCursorTo(kwEl);
    await page.waitForTimeout(3000);
  }

  // 공인중개사용 대체 특약 복사 버튼 클릭
  await setCaption('STEP 5 · 대체 특약 복사', '공인중개사 협상용 안심 대체 특약 원클릭 복사 ➔ 임대인 분쟁 방지 표준 문구', 'green');
  const copyBtn = page.locator('.action-card__copy-btn, .pill-btn:has-text("대체 특약 복사")').first();
  if (await copyBtn.isVisible()) {
    await clickWithCursor(copyBtn);
    await page.waitForTimeout(3000); // '복사 완료' 토스트 노출 대기
  }

  // 하단 대법원 판례 및 법적 근거 해설로 스크롤
  await setCaption('STEP 5 · 대법원 판례 근거', '국가법령정보센터 주택임대차보호법 제10조 및 대법원 2005다51389 판례 근거 제시');
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(4000);

  // 최종 안내 배너
  await setCaption('온율(律) 점검 완료', '국가법령·판례 기반 임대차 계약서 안심 점검 완료 — 공모전 출품작 온율', 'green');
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

  console.log('Comprehensive PC demo recording finished successfully!');
}

recordComprehensivePCDemo().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});
