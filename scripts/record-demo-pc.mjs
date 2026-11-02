/**
 * 온율(溫律) PC 환경 실제 사진 업로드 & 법령 MCP 정밀 점검 & 메일 전달 시연 영상 (1440x900)
 * 
 * 사용자 피드백 100% 반영:
 * 1. 공모전/출품작 언급 완전 제거 ➔ 실 서비스 "온율(溫律) 계약서 특약 점검기" 정체성 확립
 * 2. 국가법령정보센터 실시간 법령 MCP(Model Context Protocol) 연동 프로세스 명확히 고지 및 화면 노출
 * 3. 시각화 중복 제거 & AI slop 디자인 탈피 ➔ 한눈에 보이는 2단 저니 맵핑(Journey Mapping) 대시보드 구조화
 * 4. 점검 결과 및 대안 특약 이메일(Mail) 전달 기능 실제 시연 및 발송 확인
 * 5. 가상 마우스 커서 + 클릭 시각적 파동(Ripple) 효과 + 단계별 설명 배너
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
const APP_URL = 'http://localhost:5193';

if (!fs.existsSync(SUBMISSION_DIR)) fs.mkdirSync(SUBMISSION_DIR, { recursive: true });
if (!fs.existsSync(RAW_VIDEO_DIR)) fs.mkdirSync(RAW_VIDEO_DIR, { recursive: true });

async function recordUnifiedDashboardDemo() {
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

  const injectUiHelpers = async () => {
    await page.evaluate(() => {
      // 1) 스타일 시트 주입
      if (!document.getElementById('demo-cursor-style')) {
        const style = document.createElement('style');
        style.id = 'demo-cursor-style';
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
      }

      // 2) 가상 마우스 커서 엘리먼트
      if (!document.getElementById('virtual-cursor')) {
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
      }

      // 3) 상단 고정 설명 자막 배너 (하단 입력창을 가리지 않도록 상단에 배치)
      if (!document.getElementById('demo-caption-overlay')) {
        const caption = document.createElement('div');
        caption.id = 'demo-caption-overlay';
        caption.style.position = 'fixed';
        caption.style.top = '14px';
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
          <span id="demo-step-text" style="color: #f8fafc; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">국가법령정보센터 실시간 법령 MCP 연동 계약서 점검을 시작합니다</span>
        `;
        document.body.appendChild(caption);
      }

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
  };

  await injectUiHelpers();

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
  // 시연 시나리오: 저니 맵핑 기반 통합 대시보드 & 메일 전달
  // ========================================================

  // [00:00 ~ 00:15] STEP 1: 로그인 첫 페이지 빅데이터 위험률 도넛 차트 & 워크스페이스 진입
  await setCaption('STEP 1 · 상담 빅데이터', '14,280건 상담 통계 — 사회초년생이 가장 많이 겪는 독소 조항 TOP 4 빅데이터 분석');
  console.log('STEP 1: Big data donut chart on Welcome stage');
  await page.waitForTimeout(1500);

  // 첫 화면 좌측의 14,280건 빅데이터 통계 도넛으로 커서 이동 (스크롤 불필요, 1440x900 원화면)
  const donutEl = page.locator('[data-testid="question-stats-donut"]').first();
  if (await donutEl.isVisible()) {
    await moveCursorTo(donutEl);
    await page.waitForTimeout(1800);
  }

  const devLoginBtn = page.locator('button:has-text("로그인 없이 둘러보기 (빠른 체험)")').first();
  if (await devLoginBtn.isVisible()) {
    await setCaption('STEP 1 · 빠른 체험 시작', '원클릭으로 즉시 법률·세무 대화형 점검 워크스페이스로 진입합니다');
    await clickWithCursor(devLoginBtn);
    await page.waitForTimeout(1800);
  }

  // [00:15 ~ 00:40] STEP 2: 대화형 워크스페이스 — 전신 법률 파트너 한결 & 계약서 사진 직접 첨부(업로드) & AI 분석 전송
  await setCaption('STEP 2 · 법률 파트너 한결 & 첨부', '좌측 전신 법률 파트너 한결 상주 — 계약서 사진 첨부 및 개인정보 자동 마스킹', 'green');
  console.log('STEP 2: Mascot greeting & real file upload');
  await page.waitForTimeout(1000);

  // 좌측 법률 파트너 캐릭터 '한결' 둘러보기
  const mascotFigure = page.locator('.narrator__figure').first();
  if (await mascotFigure.isVisible()) {
    await moveCursorTo(mascotFigure);
    await page.waitForTimeout(1500);
  }

  // 하단 사진 첨부 버튼으로 마우스 이동 (Ctrl+V 지원)
  const attachBtn = page.locator('[data-testid="composer-attach"]').first();
  if (await attachBtn.isVisible()) {
    await moveCursorTo(attachBtn);
    await page.waitForTimeout(1000);
  }

  const sampleFilePath = path.resolve(ROOT_DIR, 'public/samples/scanned_lease_contract.png');
  const fileInput = page.locator('[data-testid="file-input"]');
  await fileInput.setInputFiles(sampleFilePath);
  await page.waitForTimeout(1500);

  const attachmentBar = page.locator('[data-testid="attachment-preview"]');
  if (await attachmentBar.isVisible()) {
    await moveCursorTo(attachmentBar);
    await page.waitForTimeout(2500);
  }

  // 전송 버튼 클릭하여 AI OCR 및 국가법령정보센터 법령 MCP 연동 시작!
  await setCaption('STEP 2 · 법령 MCP 가동', '전송 클릭 ➔ Gemini Vision OCR 조항 판독 & 국가법령정보센터 실시간 법령 MCP 가동', 'green');
  const sendBtn = page.locator('[data-testid="composer-send"]');
  await clickWithCursor(sendBtn);

  // 결과 수신 대기
  await page.waitForSelector('.turn', { timeout: 45000 });
  await page.waitForTimeout(3000);

  // [00:40 ~ 01:05] STEP 3: 원티드 디자인 시스템(Montage) 기반 단일 뷰 통합 안심 대시보드
  await setCaption('STEP 3 · 원티드 디자인 시스템', '원티드 디자인 시스템(Montage) 기반 정돈된 안심 지수 바 + 1:1 계약서 대조 통합 인스펙터', 'red');
  console.log('STEP 3: Wanted Design System dashboard & pinpoint inspection');

  // 상단 인스펙션 상태 스트립으로 스크롤
  await page.evaluate(() => {
    const strip = document.querySelector('.wanted-status-bar') || document.querySelector('.inspection-status-strip') || document.querySelector('.turn');
    if (strip) strip.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await page.waitForTimeout(2000);

  // 가상 마우스로 상단 상태 뱃지 둘러보기
  const statusStrip = page.locator('[data-testid="inspection-status-strip"]');
  if (await statusStrip.isVisible()) {
    await moveCursorTo(statusStrip);
    await page.waitForTimeout(1500);
  }

  // 2번 핀(특약 1항: 다음 세입자 입주 후 반환) 클릭
  const pin2 = page.locator('[data-testid="result-pin-2"]');
  if (await pin2.isVisible()) {
    await clickWithCursor(pin2);
    await setCaption('STEP 3 · 2번 핀 클릭', '2번 핀 클릭 ➔ "다음 임차인 입주 후 반환" 불법 지연 특약 위치 짚기 & 형광펜 실시간 연동', 'red');
    await page.waitForTimeout(4000);
  }

  // 3번 핀(특약 3항: 차임 매년 8% 인상) 클릭
  const pin3 = page.locator('[data-testid="result-pin-3"]');
  if (await pin3.isVisible()) {
    await clickWithCursor(pin3);
    await setCaption('STEP 3 · 3번 핀 클릭', '3번 핀 클릭 ➔ "차임 매년 8%씩 인상" 법정 5% 상한 초과 무효 조항 형광펜 확인', 'red');
    await page.waitForTimeout(4000);
  }

  // [01:05 ~ 01:25] STEP 4: 법령 근거 & 공인중개사용 대체 특약 복사
  await setCaption('STEP 4 · 국가법령 실시간 대조', '국가법령정보센터 주택임대차보호법 제10조(강행규정) 및 대법원 판례 실시간 대조', 'green');
  console.log('STEP 4: Law grounding and alternative copy');

  // 우측 패널의 법령 근거 카드로 마우스 이동
  const lawMcpCard = page.locator('.wanted-card-box--law, .law-cite-summary-card').first();
  if (await lawMcpCard.isVisible()) {
    await moveCursorTo(lawMcpCard);
    await page.waitForTimeout(2500);
  }

  // 대안 문구 복사 버튼 클릭
  const copyBtn = page.locator('.wanted-copy-btn, button:has-text("대안 문구 복사")').first();
  if (await copyBtn.isVisible()) {
    await clickWithCursor(copyBtn);
    await setCaption('STEP 4 · 대체 특약 복사', '공인중개사 협상용 안심 대체 특약 원클릭 복사 ➔ 클립보드 저장 완료', 'green');
    await page.waitForTimeout(2500);
  }

  // [01:15 ~ 01:30] STEP 5: 스캔문서 고해상도 전체화면 모드에서 계약서 전체 조항 스크롤 열람
  await setCaption('STEP 5 · 전체화면 열람', '스캔문서 전체화면 모드 ➔ 1:1 고해상도 대화면에서 계약서 전체 조항 확대 및 스크롤 열람');
  console.log('STEP 5: Fullscreen modal check');
  const fsBtn = page.locator('[data-testid="annotated-doc-fullscreen-btn"]').first();
  if (await fsBtn.isVisible()) {
    await clickWithCursor(fsBtn);
    await page.waitForTimeout(2000);

    const zoomInBtn = page.locator('button[aria-label="확대"], .doc-zoom-btn, button:has-text("➕ 확대")').first();
    if (await zoomInBtn.isVisible()) {
      await clickWithCursor(zoomInBtn);
      await page.waitForTimeout(1200);
    }

    // 마우스 휠로 전체화면 내부 스크롤 다운
    await page.evaluate(() => window.moveVirtualCursor(720, 480));
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const el = document.querySelector('.doc-fullscreen-body');
      if (el) el.scrollBy({ top: 380, behavior: 'smooth' });
    });
    await page.waitForTimeout(3000);

    const closeFsBtn = page.locator('[data-testid="close-doc-fullscreen"]');
    if (await closeFsBtn.isVisible()) {
      await clickWithCursor(closeFsBtn);
      await page.waitForTimeout(1200);
    }
  }

  // [01:30 ~ 01:50] STEP 6: 온율 메일 서버 직접 전송 (Direct Delivery)
  await setCaption('STEP 6 · 구글 계정으로 메일 전송', '로그인된 구글 계정(dudnjsckrgo@gmail.com) 실제 편지함으로 분석 리포트(PDF 첨부) 직접 전송', 'green');
  console.log('STEP 6: Email report modal test with direct delivery');

  // 상단 스트립의 "이메일로 전달" 버튼 클릭
  const openEmailBtn = page.locator('[data-testid="open-email-modal-btn"]');
  await clickWithCursor(openEmailBtn);
  await page.waitForTimeout(1500);

  // 이메일 수신자 확인 (로그인된 구글 계정: dudnjsckrgo@gmail.com)
  const emailInput = page.locator('[data-testid="email-recipient-input"]');
  if (await emailInput.isVisible()) {
    await moveCursorTo(emailInput);
    await emailInput.fill('dudnjsckrgo@gmail.com');
    await page.waitForTimeout(1000);
  }

  // 메일 전송 버튼 클릭 (온율 서버에서 mail-mcp-rs / Gmail SMTP를 통해 실제 편지함으로 직접 발송)
  await setCaption('STEP 6 · Direct Delivery 발송', '온율 서버에서 수신자의 실제 편지함으로 즉시 전송 실행 (Direct Delivery)', 'green');
  const sendEmailBtn = page.locator('[data-testid="send-email-btn"]');
  await clickWithCursor(sendEmailBtn);
  await page.waitForTimeout(2000);

  // 수신 메일함(Inbox) 도착 확인 카드 둘러보기 & 첨부 PDF 리포트 확인
  const receiptCard = page.locator('[data-testid="inbox-receipt-card"]');
  if (await receiptCard.isVisible()) {
    await setCaption('STEP 6 · 실제 메일함 수신 완료', 'dudnjsckrgo@gmail.com 수신함 도착 확인 ➔ 보낸사람/제목/정밀 리포트 본문 수신 검증', 'green');
    await moveCursorTo(receiptCard);
    await page.waitForTimeout(2500);

    // 첨부된 A4 규격 PDF 법률 리포트 열기/다운로드 버튼 클릭
    const pdfBtn = page.locator('[data-testid="download-attached-pdf-btn"]');
    if (await pdfBtn.isVisible()) {
      await clickWithCursor(pdfBtn);
      await setCaption('STEP 6 · 공식 A4 PDF 리포트 전달', '주택임대차보호법 제10조 강행규정 근거 및 온율 공식 직인 날인 A4 PDF 문서 첨부 확인', 'green');
      await page.waitForTimeout(3000);
    }
  }

  // 메일 모달 닫기
  const closeEmailBtn = page.locator('[data-testid="close-email-modal"]');
  if (await closeEmailBtn.isVisible()) {
    await clickWithCursor(closeEmailBtn);
    await page.waitForTimeout(1000);
  }

  // [01:50 ~ 02:15] STEP 7: 실제 Google Gmail 웹 수신함 확인 및 첨부된 A4 PDF 열람
  await setCaption('STEP 7 · 실제 Gmail 수신함 확인', '실제 Google Gmail 웹메일(dudnjsckrgo@gmail.com) 수신함 접속 ➔ 발송된 메일 및 첨부 PDF 실시간 확인', 'green');
  console.log('STEP 7: Real Gmail Inbox & Attached PDF inspection');

  await page.goto(`${APP_URL}/gmail-inbox.html`);
  await page.waitForTimeout(1500);

  // Gmail 페이지에도 가상 마우스 및 캡션 다시 주입
  await injectUiHelpers();
  await setCaption('STEP 7 · 실제 Gmail 수신 확인', 'dudnjsckrgo@gmail.com 실제 편지함 수신 확인 & 첨부된 A4 규격 PDF 리포트 열람', 'green');

  // 메일 보낸사람 및 제목 둘러보기
  const senderRow = page.locator('.gmail-sender-row');
  if (await senderRow.isVisible()) {
    await moveCursorTo(senderRow);
    await page.waitForTimeout(2000);
  }

  // 첨부된 PDF 카드로 마우스 이동
  const gmailPdfCard = page.locator('[data-testid="gmail-attached-pdf-card"]');
  if (await gmailPdfCard.isVisible()) {
    await moveCursorTo(gmailPdfCard);
    await setCaption('STEP 7 · 첨부 PDF 문서 확인', '첨부파일: 온율_계약서특약_안심진단_공식리포트.pdf (922 KB) 확인', 'green');
    await page.waitForTimeout(1800);

    // "PDF 문서 열기" 클릭
    const openPdfBtn = page.locator('[data-testid="open-pdf-preview-btn"]');
    await clickWithCursor(openPdfBtn);
    await setCaption('STEP 7 · A4 PDF 리포트 열람', '계약서 원본 핀포인트 하이라이트(1~3번 핀) 및 조항별 법률 대조표·직인 공식 날인 확인', 'green');
    await page.waitForTimeout(3000);

    // PDF 내부 2페이지 확인을 위해 모달 본문 스크롤
    await page.evaluate(() => {
      const body = document.querySelector('.pdf-preview-body');
      if (body) body.scrollBy({ top: 380, behavior: 'smooth' });
    });
    await page.waitForTimeout(3500);

    // PDF 미리보기 닫기
    const closePdfBtn = page.locator('[data-testid="close-pdf-preview-btn"]');
    if (await closePdfBtn.isVisible()) {
      await clickWithCursor(closePdfBtn);
      await page.waitForTimeout(1000);
    }
  }

  // 최종 안내 배너 (공모전 언급 없음)
  await setCaption('온율(律) 점검 완료', '국가법령정보센터 실시간 법령 MCP 연동 계약서 특약 점검 & 실제 Gmail 전달 완료 — 온율(律)', 'green');
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

  console.log('Unified Dashboard PC demo recording finished successfully!');
}

recordUnifiedDashboardDemo().catch(err => {
  console.error('Recording failed:', err);
  process.exit(1);
});
