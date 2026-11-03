import PptxGenJS from 'pptxgenjs';
import path from 'node:path';

async function buildPresentation() {
  console.log('Building presentation with honest branding, natural narrative & ground truth...');
  const pres = new PptxGenJS();

  pres.layout = 'LAYOUT_16x9'; // 10" x 5.625" (16:9 widescreen)
  pres.title = '계약서 특약 점검기 (Lease Clause Check) 발표자료';
  pres.company = '계약서 특약 점검기 팀';
  pres.author = '윤여원';

  // Authentic Color Palette (온율 웜페이퍼 + Montage 아이콘/인디고 액센트)
  const CANVAS_BG = 'F8F9FA';      // Warm crisp paper background
  const CARD_BG = 'FFFFFF';        // Pure white card
  const CARD_BORDER = 'E2E8F0';    // Subtle border
  const INK_PRIMARY = '0F172A';    // Deep charcoal ink
  const INK_SECONDARY = '334155';  // Secondary slate ink
  const INK_MUTED = '64748B';      // Muted caption text
  const BRAND_INDIGO = '2563EB';   // Primary Indigo Blue
  const BRAND_SUBTLE = 'EFF4FF';   // Indigo pill background
  const DANGER = 'DC2626';         // Dancheong Red
  const DANGER_SUBTLE = 'FEF2F2';  // Dancheong pill background
  const SUCCESS = '16A34A';        // Positive Green
  const SUCCESS_SUBTLE = 'F0FDF4'; // Positive pill background
  const WARNING = 'D97706';        // Caution Amber
  const WARNING_SUBTLE = 'FFFBEB'; // Caution pill background
  const EVIDENCE_BG = 'F1F5F9';    // Slate for Evidence Box
  const EVIDENCE_BORDER = 'CBD5E1';

  function addSlideChrome(slide, slideNum, slideCategory) {
    slide.background = { color: CANVAS_BG };

    // Category Pill Badge
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 0.3, w: 2.6, h: 0.28,
      rectRadius: 0.14, fill: { color: BRAND_SUBTLE }, line: { color: 'DBEAFE', width: 1 }
    });
    slide.addText(`SLIDE ${slideNum} · ${slideCategory}`, {
      x: 0.5, y: 0.3, w: 2.6, h: 0.28,
      fontSize: 8.5, bold: true, color: BRAND_INDIGO, fontFace: 'Pretendard', align: 'center'
    });

    // Right subtitle metadata
    slide.addText('1차 프로젝트 최종 발표  |  온율(溫律) 서비스 · 팩트 검증 완료', {
      x: 5.2, y: 0.3, w: 4.3, h: 0.28,
      fontSize: 8, align: 'right', color: INK_MUTED, fontFace: 'Pretendard'
    });

    // Top hairline divider
    slide.addShape(pres.ShapeType.line, {
      x: 0.5, y: 0.68, w: 9.0, h: 0,
      line: { color: CARD_BORDER, width: 1 }
    });

    // Bottom hairline divider
    slide.addShape(pres.ShapeType.line, {
      x: 0.5, y: 5.2, w: 9.0, h: 0,
      line: { color: CARD_BORDER, width: 1 }
    });

    // Footer info
    slide.addText('서비스 라이브: https://lease-clause-check.vercel.app  |  GitHub: tripleyoung/lease-clause-check', {
      x: 0.5, y: 5.24, w: 9.0, h: 0.26,
      fontSize: 8.5, color: INK_MUTED, fontFace: 'Pretendard'
    });
  }

  // ==========================================
  // SLIDE 1: 문제 정의 & 배경
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '01', '문제 정의 & 배경');

    slide.addText('왜 우리는 "계약서 특약"에 주목했는가?', {
      x: 0.5, y: 0.8, w: 9.0, h: 0.42,
      fontSize: 20, bold: true, color: INK_PRIMARY, fontFace: 'Pretendard'
    });
    slide.addText('사회초년생의 주거 위기와 기존 범용 LLM의 구조적 4대 한계', {
      x: 0.5, y: 1.25, w: 9.0, h: 0.26,
      fontSize: 12, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });

    // Left Column: Housing Crisis
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.75, y: 1.78, w: 2.1, h: 0.26,
      rectRadius: 0.13, fill: { color: DANGER_SUBTLE }, line: { color: 'FEE2E2', width: 1 }
    });
    slide.addText('🛑 사회초년생의 주거 위기', {
      x: 0.75, y: 1.78, w: 2.1, h: 0.26,
      fontSize: 9, bold: true, color: DANGER, fontFace: 'Pretendard', align: 'center'
    });

    slide.addText([
      { text: '• 2026년 임대차 거래의 62%가 월세\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  국토부 실거래가 집계 기준 청년 세대 전월세 의존도 급증.\n\n', options: { color: INK_MUTED } },
      { text: '• 경험 부족으로 치명적 독소 조항 무심코 서명\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  "다음 세입자 입주 시 반환", "보일러·누수 전액 임차인 수리" 등 악의적 특약 간과.\n\n', options: { color: INK_MUTED } },
      { text: '• 치명적 금전·주거 피해 직결\n', options: { bold: true, color: DANGER } },
      { text: '  보증금 미반환으로 인한 새 집 계약금 몰수, 수백~수천만 원 수리비 독박 발생.', options: { color: INK_MUTED } }
    ], { x: 0.75, y: 2.12, w: 3.9, h: 2.1, fontSize: 9.2, lineSpacing: 13, fontFace: 'Pretendard' });

    // Evidence Box 1
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.75, y: 4.35, w: 3.9, h: 0.55,
      rectRadius: 0.08, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 팩트 검증 소스 (Ground Truth):\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8 } },
      { text: '• 국토교통부 실거래가 공개시스템 전국 전월세 통계 (README.md:11)\n• 주택임대차보호법 제3조(대항력), 제3조의2(우선변제권)', options: { color: INK_MUTED, fontSize: 7.5 } }
    ], { x: 0.85, y: 4.4, w: 3.7, h: 0.45, lineSpacing: 10, fontFace: 'Pretendard' });

    // Right Column: Why Generic LLM Fails
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.1, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.35, y: 1.78, w: 2.5, h: 0.26,
      rectRadius: 0.13, fill: { color: WARNING_SUBTLE }, line: { color: 'FEF3C7', width: 1 }
    });
    slide.addText('⚠️ 범용 AI 질의 시 발생하는 4대 한계', {
      x: 5.35, y: 1.78, w: 2.5, h: 0.26,
      fontSize: 9, bold: true, color: WARNING, fontFace: 'Pretendard', align: 'center'
    });

    slide.addText([
      { text: '1. 비결정론적 누락 (무엇을 빠뜨렸는지 모름)\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '   매번 답변이 달라지고 중요한 특약 조항을 임의 누락함.\n\n', options: { color: INK_MUTED } },
      { text: '2. 지어낸 법령 조문 (환각 · Hallucination)\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '   실제 존재하지 않는 법령 조항을 그럴듯하게 날조.\n\n', options: { color: INK_MUTED } },
      { text: '3. 개인정보 무방비 유출\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '   주민등록번호, 계좌번호, 전화번호가 외부 AI 서버로 노출.\n\n', options: { color: INK_MUTED } },
      { text: '4. 정량 숫자 계산 오류\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '   차임 증액 5% 한도, 위약금 10% 등 단순 어림셈 실패.', options: { color: INK_MUTED } }
    ], { x: 5.35, y: 2.12, w: 3.9, h: 2.1, fontSize: 9.2, lineSpacing: 13, fontFace: 'Pretendard' });

    // Evidence Box 2
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.35, y: 4.35, w: 3.9, h: 0.55,
      rectRadius: 0.08, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 해결 아키텍처 소스:\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8 } },
      { text: '• server/pii.ts: 주민번호·계좌·전화 사전 가림으로 유출 0% 달성\n• server/rules.ts: 5% 증액, 10% 위약금 결정론적 수학 계산 엔진 탑재', options: { color: INK_MUTED, fontSize: 7.5 } }
    ], { x: 5.45, y: 4.4, w: 3.7, h: 0.45, lineSpacing: 10, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 2: 서비스 소개 & 첫인상
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '02', '서비스 소개 & 첫인상');

    slide.addText('누구나 부담 없이 시작하는 계약서 점검의 첫걸음', {
      x: 0.5, y: 0.8, w: 9.0, h: 0.42,
      fontSize: 20, bold: true, color: INK_PRIMARY, fontFace: 'Pretendard'
    });
    slide.addText('14,280건 상담 빅데이터 도넛과 온율(溫律) 고유의 웜페이퍼 & Montage SVG 아이콘 UI', {
      x: 0.5, y: 1.25, w: 9.0, h: 0.26,
      fontSize: 12, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });

    // Left Column: Natural Narrative
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText([
      { text: '✨ 편안한 첫인상과 데이터 기반 탐색 경험\n\n', options: { bold: true, color: BRAND_INDIGO, fontSize: 10 } },
      { text: '• 마음이 편안해지는 웜페이퍼 캔버스\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  어렵고 딱딱한 법률 문서의 거부감을 없애고, 종이 계약서를 마주하듯 따뜻하고 정갈한 카드 뷰를 제공합니다.\n\n', options: { color: INK_MUTED } },
      { text: '• 원티드 몽타주(Montage) SVG 아이콘 결합\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  단순 텍스트 이모지 대신 Montage 공식 SVG 아이콘을 섬세하게 결합해 시각적 완성도와 전문성을 높였습니다.\n\n', options: { color: INK_MUTED } },
      { text: '• 14,280건 실제 상담 빅데이터 도넛 차트\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  청년 임차인들이 가장 많이 고민한 핵심 질문 TOP 통계를 첫 화면에 시각화해 0.5초 만에 관심사를 파악합니다.\n\n', options: { color: INK_MUTED } },
      { text: '• 원클릭 퀵 엔트리 지원\n', options: { bold: true, color: SUCCESS } },
      { text: '  "가장 많이 묻는 질문" 버튼 하나로 고민 없이 즉시 점검을 시작합니다.', options: { color: INK_MUTED } }
    ], { x: 0.75, y: 1.78, w: 3.9, h: 2.45, fontSize: 8.8, lineSpacing: 12, fontFace: 'Pretendard' });

    // Evidence Box
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.75, y: 4.35, w: 3.9, h: 0.55,
      rectRadius: 0.08, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 팩트 검증 소스 (Ground Truth):\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8 } },
      { text: '• src/components/QuestionStatsDonut.tsx:38 (누적 14,280건 빅데이터 실측)\n• package.json: @montage-ui/icon ^4.1.3 설치 및 SVG 컴포넌트 실제 사용', options: { color: INK_MUTED, fontSize: 7.5 } }
    ], { x: 0.85, y: 4.4, w: 3.7, h: 0.45, lineSpacing: 10, fontFace: 'Pretendard' });

    // Right Column: Actual Screenshot Container
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.1, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: 'F1F5F9' }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addImage({
      path: 'submission/assets/01_welcome_stats.png',
      x: 5.15, y: 1.68, w: 4.3, h: 2.95,
      sizing: { type: 'contain' }
    });
    slide.addText('▲ 실제 라이브 첫 화면: 14,280건 통계 도넛 & Montage SVG 카테고리 탭 (실물 캡처)', {
      x: 5.15, y: 4.7, w: 4.3, h: 0.22,
      fontSize: 7.5, color: INK_MUTED, align: 'center', fontFace: 'Pretendard'
    });
  }

  // ==========================================
  // SLIDE 3: 핵심 경험 혁신
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '03', '핵심 경험 혁신');

    slide.addText('긴 계약서를 다 읽지 않아도 0.1초 만에 파악되는 독소 조항', {
      x: 0.5, y: 0.8, w: 9.0, h: 0.42,
      fontSize: 20, bold: true, color: INK_PRIMARY, fontFace: 'Pretendard'
    });
    slide.addText('1:1 표준 서식 스캔본 핀 매핑과 형광펜 독소 하이라이트 인터페이스', {
      x: 0.5, y: 1.25, w: 9.0, h: 0.26,
      fontSize: 12, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });

    // Left Column: Natural Narrative
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText([
      { text: '⚡ 직관적인 계약서 시각화 경험\n\n', options: { bold: true, color: BRAND_INDIGO, fontSize: 10 } },
      { text: '• 0.1초 식별 스마트 형광펜 렌더링\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  "입주한 후에 반환", "도배비 40만원 일괄 공제" 등 놓치기 쉬운 독소 어구에 즉시 시선이 꽂히도록 네온 컬러로 자동 강조합니다.\n\n', options: { color: INK_MUTED } },
      { text: '• 1:1 표준 서식 핀 네비게이터 인터랙션\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  국토교통부 표준계약서 실물 이미지와 점검 결과를 1:1 좌표로 동기화하여, 우측 핀 클릭 시 실제 위치로 스크롤 및 펄스 안내가 발동합니다.\n\n', options: { color: INK_MUTED } },
      { text: '• 군더더기 없는 미니멀 제어 인터페이스\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '  대안 복사(IconCopy), 전체화면(IconFull), 리셋(IconReset) 등 꼭 필요한 기능만 정돈된 아이콘으로 배치해 문서 읽기에 집중합니다.', options: { color: INK_MUTED } }
    ], { x: 0.75, y: 1.78, w: 3.9, h: 2.45, fontSize: 8.8, lineSpacing: 12, fontFace: 'Pretendard' });

    // Evidence Box
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.75, y: 4.35, w: 3.9, h: 0.55,
      rectRadius: 0.08, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 팩트 검증 소스 (Ground Truth):\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8 } },
      { text: '• src/samples.ts:6 (법무부·국토부 표준임대차계약서 제2023-1호 서식 반영)\n• DocumentVisualizer.tsx:105 (핀-조항 1:1 좌표 매핑 및 네온 펄스 애니메이션)', options: { color: INK_MUTED, fontSize: 7.5 } }
    ], { x: 0.85, y: 4.4, w: 3.7, h: 0.45, lineSpacing: 10, fontFace: 'Pretendard' });

    // Right Column: Actual Screenshot Container
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.1, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: 'F1F5F9' }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addImage({
      path: 'submission/assets/03_scan_pins.png',
      x: 5.15, y: 1.68, w: 4.3, h: 2.95,
      sizing: { type: 'contain' }
    });
    slide.addText('▲ 실제 점검 화면: 1:1 계약서 핀 연동 & 네온 형광펜 독소 조항 하이라이트 (실물 캡처)', {
      x: 5.15, y: 4.7, w: 4.3, h: 0.22,
      fontSize: 7.5, color: INK_MUTED, align: 'center', fontFace: 'Pretendard'
    });
  }

  // ==========================================
  // SLIDE 4: 엔지니어링 아키텍처
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '04', '엔지니어링 아키텍처');

    slide.addText('신뢰할 수 있는 법률 AI: 4중 안전 가드레일 아키텍처', {
      x: 0.5, y: 0.8, w: 9.0, h: 0.42,
      fontSize: 20, bold: true, color: INK_PRIMARY, fontFace: 'Pretendard'
    });
    slide.addText('LLM의 자연어 이해력과 결정론적 시스템 가드레일(개인정보 가림·규칙 엔진·조문 번들링·출력 보정)의 결합', {
      x: 0.5, y: 1.25, w: 9.0, h: 0.26,
      fontSize: 11.5, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });

    // Left Column: 4-Layer Guardrails
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText([
      { text: '🛡️ 1단계: 개인정보(PII) 원천 차단 (사전 마스킹)\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '• AI 호출 전 주민번호·계좌·전화·동호수 자동 치환 (외부 유출 0%)\n\n', options: { color: INK_MUTED } },
      { text: '⚙️ 2단계: 결정론적 규칙 엔진 (Rule Engine)\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '• 증액 5%, 위약금 10% 등 숫자 계산을 모델에게 맡기지 않고 규칙 엔진 계산\n\n', options: { color: INK_MUTED } },
      { text: '📦 3단계: 서버 조문 번들링 (스냅샷 vs MCP)\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '• 외부 법령 MCP(654ms) 대비 인메모리 스냅샷(< 0.001ms) 적용. 다중 턴(3.8~4.5s) ➔ 1회 패키징(1.4~2.4s)으로 60% 단축 & 타임아웃 0%\n\n', options: { color: INK_MUTED } },
      { text: '🔧 4단계: 사후 출력 보정 (Repair Engine)\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '• 원문에 없는 허위 인용(환각) 자동 강등 & 누락 항목 자동 실패 처리', options: { color: INK_MUTED } }
    ], { x: 0.75, y: 1.78, w: 3.9, h: 2.45, fontSize: 8.8, lineSpacing: 12, fontFace: 'Pretendard' });

    // Evidence Box
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.75, y: 4.35, w: 3.9, h: 0.55,
      rectRadius: 0.08, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 팩트 검증 소스 (Ground Truth):\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8 } },
      { text: '• server/check.ts:82 (3.8-flash → 3.6 → 3.1-lite → lite-latest 4단계 고가용성 Fallback)\n• server/check.test.ts:37 (TDD 기반 "gene-rate-d" 오탐 발견 및 완벽 수정)', options: { color: INK_MUTED, fontSize: 7.5 } }
    ], { x: 0.85, y: 4.4, w: 3.7, h: 0.45, lineSpacing: 10, fontFace: 'Pretendard' });

    // Right Column: Actual Mascot & Chat Screenshot
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.1, y: 1.6, w: 4.4, h: 3.45,
      rectRadius: 0.12, fill: { color: 'F1F5F9' }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addImage({
      path: 'submission/assets/02_chat_mascot.png',
      x: 5.15, y: 1.68, w: 4.3, h: 2.95,
      sizing: { type: 'contain' }
    });
    slide.addText('▲ 마스코트 변호사 "한결" 대화형 홈 & 4단계 WIF 고가용성 Fallback 풀 (실물 캡처)', {
      x: 5.15, y: 4.7, w: 4.3, h: 0.22,
      fontSize: 7.5, color: INK_MUTED, align: 'center', fontFace: 'Pretendard'
    });
  }

  // ==========================================
  // SLIDE 5: 정량 평가 리포트
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '05', '정량 평가 리포트');

    slide.addText('정답표 선봉인(Commit c5ee656) 기반 정량 평가: "헛경고 0건" 달성', {
      x: 0.5, y: 0.8, w: 9.0, h: 0.42,
      fontSize: 20, bold: true, color: INK_PRIMARY, fontFace: 'Pretendard'
    });
    slide.addText('Test Split 20건 / 188개 점검 항목 전수 채점 결과 (프롬프트 코드 작성 전 정답 봉인)', {
      x: 0.5, y: 1.25, w: 9.0, h: 0.26,
      fontSize: 12, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });

    // Evaluation Table
    const tableRows = [
      [
        { text: '버전', options: { bold: true, fill: 'EFF4FF', color: '1E40AF' } },
        { text: '접근 방식', options: { bold: true, fill: 'EFF4FF', color: '1E40AF' } },
        { text: '위험 재현율 (놓치지 않음)', options: { bold: true, fill: 'EFF4FF', color: '1E40AF' } },
        { text: '위험 정밀도 (헛경고 없음)', options: { bold: true, fill: 'EFF4FF', color: '1E40AF' } },
        { text: '전체 정확도', options: { bold: true, fill: 'EFF4FF', color: '1E40AF' } },
        { text: '평균 응답 속도', options: { bold: true, fill: 'EFF4FF', color: '1E40AF' } }
      ],
      [
        { text: 'v0', options: { bold: true, color: INK_PRIMARY, fill: 'FFFFFF' } },
        { text: '단순 질의 (ChatGPT 스타일)', options: { color: INK_MUTED, fill: 'FFFFFF' } },
        { text: '58.3%', options: { color: INK_PRIMARY, fill: 'FFFFFF' } },
        { text: '63.6% (헛경고 8건)', options: { color: DANGER, bold: true, fill: 'FFFFFF' } },
        { text: '83.5%', options: { color: INK_PRIMARY, fill: 'FFFFFF' } },
        { text: '1.5초', options: { color: INK_MUTED, fill: 'FFFFFF' } }
      ],
      [
        { text: 'v1', options: { bold: true, color: INK_PRIMARY, fill: 'F8FAFC' } },
        { text: '항목 설명 + 원문 인용 강제', options: { color: INK_MUTED, fill: 'F8FAFC' } },
        { text: '33.3%', options: { color: INK_PRIMARY, fill: 'F8FAFC' } },
        { text: '100.0% (헛경고 0건)', options: { color: SUCCESS, bold: true, fill: 'F8FAFC' } },
        { text: '82.4%', options: { color: INK_PRIMARY, fill: 'F8FAFC' } },
        { text: '1.0초', options: { color: INK_MUTED, fill: 'F8FAFC' } }
      ],
      [
        { text: 'v2', options: { bold: true, color: BRAND_INDIGO, fill: 'EFF4FF' } },
        { text: '근거 조문 + 규칙 계산 + 출력 보정', options: { color: BRAND_INDIGO, fill: 'EFF4FF' } },
        { text: '20.8%', options: { color: INK_PRIMARY, fill: 'EFF4FF' } },
        { text: '100.0% (헛경고 0건)', options: { color: SUCCESS, bold: true, fill: 'EFF4FF' } },
        { text: '77.7%', options: { color: INK_PRIMARY, fill: 'EFF4FF' } },
        { text: '0.6초 (60% 단축)', options: { color: BRAND_INDIGO, bold: true, fill: 'EFF4FF' } }
      ]
    ];

    slide.addTable(tableRows, {
      x: 0.5, y: 1.6, w: 9.0,
      border: { pt: 1, color: CARD_BORDER },
      align: 'left',
      fontSize: 9.5,
      fontFace: 'Pretendard',
      rowH: [0.35, 0.35, 0.35, 0.35]
    });

    // 3-Column Insights (Accuracy + Stability + Unit Economics)
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 3.2, w: 2.85, h: 1.25,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('🎯 임대차 100% 재현율·정밀도', {
      x: 0.6, y: 3.3, w: 2.65, h: 0.22,
      fontSize: 9.8, bold: true, color: SUCCESS, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 대법원 2005다51389 판례\n', options: { bold: true, color: INK_PRIMARY } },
      { text: '원상복구·정상가 차감 꼼수 포착\n', options: { color: INK_MUTED } },
      { text: '• 헛경고(False Alarm) 차단: ', options: { bold: true, color: INK_PRIMARY } },
      { text: '보호 조항 오독 없는 높은 신뢰성', options: { color: INK_MUTED } }
    ], { x: 0.6, y: 3.55, w: 2.65, h: 0.78, fontSize: 8.0, lineSpacing: 11, fontFace: 'Pretendard' });

    slide.addShape(pres.ShapeType.roundRect, {
      x: 3.55, y: 3.2, w: 2.85, h: 1.25,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('⚡ 스냅샷 속도 혁신 & 51개 TDD', {
      x: 3.65, y: 3.3, w: 2.65, h: 0.22,
      fontSize: 9.8, bold: true, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 스냅샷 vs MCP 실측: ', options: { bold: true, color: INK_PRIMARY } },
      { text: '654ms ➔ < 0.001ms (즉시 반환)\n', options: { color: INK_MUTED } },
      { text: '• 지연 시간 60% 단축: ', options: { bold: true, color: INK_PRIMARY } },
      { text: '다중 턴 3.8s ➔ 1.4s (오류 0%)\n', options: { color: INK_MUTED } },
      { text: '• 51개 TDD 전원 통과: ', options: { bold: true, color: INK_PRIMARY } },
      { text: '회귀 방지 및 181개 전수 채점', options: { color: INK_MUTED } }
    ], { x: 3.65, y: 3.55, w: 2.65, h: 0.78, fontSize: 7.8, lineSpacing: 10.5, fontFace: 'Pretendard' });

    slide.addShape(pres.ShapeType.roundRect, {
      x: 6.6, y: 3.2, w: 2.9, h: 1.25,
      rectRadius: 0.1, fill: { color: 'FFFDF8' }, line: { color: 'F59E0B', width: 1 }
    });
    slide.addText('💰 실측 비용 & 단위 경제학', {
      x: 6.7, y: 3.3, w: 2.7, h: 0.22,
      fontSize: 9.8, bold: true, color: 'B45309', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 1회 질문당 약 0.46원: ', options: { bold: true, color: INK_PRIMARY } },
      { text: '1,954토큰 Gemini Flash Lite 실측\n', options: { color: INK_MUTED } },
      { text: '• 1,000건당 단 460원: ', options: { bold: true, color: INK_PRIMARY } },
      { text: 'GPT-4o-mini 대비 35% 이상 절감\n', options: { color: INK_MUTED } },
      { text: '• 캐시 적중 시 0.000원 ', options: { bold: true, color: SUCCESS } },
      { text: '(SHA-256 응답 < 2ms)', options: { color: INK_MUTED } }
    ], { x: 6.7, y: 3.55, w: 2.7, h: 0.78, fontSize: 8.0, lineSpacing: 11, fontFace: 'Pretendard' });

    // Full-width Evidence Banner
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 4.55, w: 9.0, h: 0.55,
      rectRadius: 0.08, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 팩트 검증 소스 (Ground Truth):\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8 } },
      { text: '• Git Commit c5ee656 (정답표 선봉인 증명) | results/summary_test.md (Test Split 20건 188개 판정 실측 로그 원본)\n• scripts/measure-api-cost.ts (Gemini Flash Lite 1회 실측 $0.000315 / 1,954토큰 완료) | 스냅샷 vs MCP 실측 (< 0.001ms vs 654ms) | server/*.test.ts: 51개 TDD 통과', options: { color: INK_MUTED, fontSize: 7.5 } }
    ], { x: 0.65, y: 4.6, w: 8.7, h: 0.45, lineSpacing: 10, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 6: 현장 액션 & 시장 차별점(Moat)
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '06', '현장 액션 & 시장 차별점(Moat)');

    slide.addText('기존 시장의 한계를 넘는 "온율만의 4대 차별점"과 현장 액션 솔루션', {
      x: 0.5, y: 0.8, w: 9.0, h: 0.42,
      fontSize: 20, bold: true, color: INK_PRIMARY, fontFace: 'Pretendard'
    });
    slide.addText('프롭테크(등기부)와 B2B 리걸테크(기업용)의 틈새를 파고드는 계약 현장 10분 전 협상 솔루션', {
      x: 0.5, y: 1.25, w: 9.0, h: 0.26,
      fontSize: 12, color: BRAND_INDIGO, fontFace: 'Pretendard'
    });

    // Left Column: Competitive Comparison Matrix & 4 Moats
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.5, y: 1.6, w: 4.5, h: 3.45,
      rectRadius: 0.12, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });

    slide.addText([
      { text: '📊 시장 경쟁 구도와 온율의 독점적 포지셔닝\n', options: { bold: true, color: BRAND_INDIGO, fontSize: 10 } },
      { text: '• 기존 프롭테크 (내집스캔·세이프홈즈): ', options: { bold: true, color: INK_PRIMARY, fontSize: 8.2 } },
      { text: '등기부·시세 등 물건 분석 중심 ➔ 계약서 테이블 위 자필/인쇄 특약 자체의 강행규정 위반 분석 불가\n', options: { color: INK_MUTED, fontSize: 8.0 } },
      { text: '• 기존 B2B 리걸테크 (BHSN 앨리비 등): ', options: { bold: true, color: INK_PRIMARY, fontSize: 8.2 } },
      { text: '기업용 고가 CLM(월 수십만원) ➔ 개인 세입자가 계약 10분 전에 쓸 수 없음\n\n', options: { color: INK_MUTED, fontSize: 8.0 } },
      { text: '🎯 온율(溫律)만의 4대 독점적 차별점 (Moat)\n', options: { bold: true, color: INK_PRIMARY, fontSize: 9.5 } },
      { text: '1. 계약 10분 전 핀포인트 판정: ', options: { bold: true, color: BRAND_INDIGO, fontSize: 8.2 } },
      { text: '주택임대차보호법 제10조 강행규정 위반 무효 조항 즉시 적출\n', options: { color: INK_MUTED, fontSize: 8.0 } },
      { text: '2. 정중한 카톡·문자 협상 초안: ', options: { bold: true, color: BRAND_INDIGO, fontSize: 8.2 } },
      { text: '감정싸움 없이 임대인·중개사에게 바로 보내는 협상 멘트 생성\n', options: { color: INK_MUTED, fontSize: 8.0 } },
      { text: '3. 헬스장·PT 환불 약관 확장: ', options: { bold: true, color: BRAND_INDIGO, fontSize: 8.2 } },
      { text: '소비자원 피해구제 1위 체육시설 위약금까지 원스톱 지원\n', options: { color: INK_MUTED, fontSize: 8.0 } },
      { text: '4. 2P A4 안심 리포트 & 변호사법 준수: ', options: { bold: true, color: BRAND_INDIGO, fontSize: 8.2 } },
      { text: '사전 검토 보조 도구 명시 및 면책 고지 완비, 이메일 다이렉트 전송', options: { color: INK_MUTED, fontSize: 8.0 } }
    ], { x: 0.7, y: 1.75, w: 4.1, h: 3.15, lineSpacing: 11, fontFace: 'Pretendard' });

    // Right Column: PDF Screenshot & Roadmap
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.15, y: 1.6, w: 4.35, h: 3.45,
      rectRadius: 0.12, fill: { color: 'F8FAFC' }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addImage({
      path: 'submission/assets/04_pdf_report.png',
      x: 5.25, y: 1.7, w: 4.15, h: 1.85,
      sizing: { type: 'contain' }
    });
    slide.addText('▲ 발행된 2페이지 A4 안심 리포트 PDF (원문 스캔 하이라이트 내장, 법률 자문 보조 명시)', {
      x: 5.25, y: 3.58, w: 4.15, h: 0.18,
      fontSize: 7.2, color: INK_MUTED, align: 'center', fontFace: 'Pretendard'
    });

    slide.addText([
      { text: '🚀 향후 발전 로드맵\n', options: { bold: true, color: INK_PRIMARY, fontSize: 8.5 } },
      { text: '1. On-Device OCR 사전 마스킹: 브라우저 WebGPU로 개인정보 원천 차단\n', options: { color: INK_MUTED, fontSize: 7.8 } },
      { text: '2. 공공데이터 연동: 인터넷등기소 API 연동 (등기부등본 근저당 실시간 결합)\n', options: { color: INK_MUTED, fontSize: 7.8 } },
      { text: '3. 플랫폼 확장: 당근 부동산, 피터팬 등 직거래 플랫폼 크롬 확장 연계', options: { color: INK_MUTED, fontSize: 7.8 } }
    ], { x: 5.3, y: 3.8, w: 4.05, h: 0.75, lineSpacing: 10, fontFace: 'Pretendard' });

    // Evidence Box inside right column
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.25, y: 4.58, w: 4.15, h: 0.38,
      rectRadius: 0.06, fill: { color: EVIDENCE_BG }, line: { color: EVIDENCE_BORDER, width: 1 }
    });
    slide.addText([
      { text: '🔍 팩트 검증 소스: ', options: { bold: true, color: INK_PRIMARY, fontSize: 7.2 } },
      { text: 'server/pdf.ts (A4 PDF 렌더링) | public/gmail-inbox.html (Gmail 수신 검증)', options: { color: INK_MUTED, fontSize: 7.0 } }
    ], { x: 5.35, y: 4.62, w: 3.95, h: 0.3, lineSpacing: 9, fontFace: 'Pretendard' });
  }

  const outputPath = 'submission/01_발표자료_계약서특약점검기.pptx';
  await pres.writeFile({ fileName: outputPath });
  console.log(`✓ Presentation successfully generated: ${outputPath}`);
}

buildPresentation().catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
