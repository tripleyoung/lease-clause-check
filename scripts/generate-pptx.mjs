import PptxGenJS from 'pptxgenjs';
import path from 'node:path';

async function buildPresentation() {
  console.log('Building PPTX presentation...');
  const pres = new PptxGenJS();

  pres.layout = 'LAYOUT_16x9'; // 10" x 5.625" (16:9)
  pres.title = '계약서 특약 점검기 (Lease Clause Check) 발표자료';
  pres.company = '계약서 특약 점검기 팀';
  pres.author = '윤여원';

  // Palette definitions
  const BG_COLOR = '0F172A';      // Slate 900
  const CARD_BG = '1E293B';       // Slate 800
  const CARD_BORDER = '334155';   // Slate 700
  const TEXT_WHITE = 'F8FAFC';    // Slate 50
  const TEXT_MUTED = '94A3B8';    // Slate 400
  const PRIMARY = '2563EB';       // Blue 600
  const PRIMARY_LIGHT = '60A5FA'; // Blue 400
  const DANGER = 'EF4444';        // Red 500
  const DANGER_BG = '450A0A';     // Red 950
  const SUCCESS = '22C55E';       // Green 500
  const SUCCESS_BG = '052E16';    // Green 950
  const WARNING = 'F59E0B';       // Amber 500

  // Helper for slide header & footer
  function addSlideChrome(slide, slideNum, slideCategory) {
    slide.background = { color: BG_COLOR };

    // Header category / number
    slide.addText(`SLIDE ${slideNum} · ${slideCategory}`, {
      x: 0.6, y: 0.4, w: 6.0, h: 0.3,
      fontSize: 10, bold: true, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });
    slide.addText('1차 프로젝트 최종 발표 (개발 직군)', {
      x: 6.6, y: 0.4, w: 2.8, h: 0.3,
      fontSize: 10, align: 'right', color: TEXT_MUTED, fontFace: 'Pretendard'
    });

    // Divider line
    slide.addShape(pres.ShapeType.line, {
      x: 0.6, y: 0.72, w: 8.8, h: 0,
      line: { color: CARD_BORDER, width: 1 }
    });

    // Footer
    slide.addShape(pres.ShapeType.line, {
      x: 0.6, y: 5.15, w: 8.8, h: 0,
      line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('배포: https://lease-clause-check.vercel.app  |  GitHub: tripleyoung/lease-clause-check', {
      x: 0.6, y: 5.22, w: 8.8, h: 0.3,
      fontSize: 9, color: TEXT_MUTED, fontFace: 'Pretendard'
    });
  }

  // ==========================================
  // SLIDE 1: 문제 정의 (왜 만들었나)
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '01', '문제 정의');

    slide.addText('계약서 특약 점검기 (Lease Clause Check)', {
      x: 0.6, y: 0.9, w: 8.8, h: 0.5,
      fontSize: 22, bold: true, color: TEXT_WHITE, fontFace: 'Pretendard'
    });
    slide.addText('AI 기반 실시간 독소 조항 진단 및 피해 리스크 방어 서비스', {
      x: 0.6, y: 1.4, w: 8.8, h: 0.3,
      fontSize: 13, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });

    // Left Card: 사회초년생의 주거 위기
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 1.85, w: 4.25, h: 3.1,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('🛑 사회초년생의 주거 위기와 독소 특약', {
      x: 0.8, y: 2.05, w: 3.85, h: 0.35,
      fontSize: 13, bold: true, color: 'FCA5A5', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 2026년 임대차 거래의 약 62%가 월세\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  국토부 실거래가 기준 청년 세대의 월세 의존도 급증.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 경험 부족으로 치명적 독소 조항 간과\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  "다음 세입자 입주 시 반환", "보일러·누수 전액 임차인 수리" 등 악의적 특약에 무심코 서명.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 심각한 금전적·주거 피해 직결\n', options: { bold: true, color: 'F87171' } },
      { text: '  보증금 미반환으로 인한 새 집 계약금 몰수, 수백~수천만 원 수리비 독박 발생.', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 2.45, w: 3.85, h: 2.3, fontSize: 10, lineSpacing: 14, fontFace: 'Pretendard' });

    // Right Card: 기존 ChatGPT 등 일반 LLM의 한계
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.15, y: 1.85, w: 4.25, h: 3.1,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('⚠️ ChatGPT 등 일반 AI의 구조적 4대 한계', {
      x: 5.35, y: 2.05, w: 3.85, h: 0.35,
      fontSize: 13, bold: true, color: 'FDE68A', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 비결정론적 누락 (무엇을 빠뜨렸는지 모름)\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  질문할 때마다 답이 달라지고 중요 조항을 임의 누락.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 조문 환각 (Hallucination)\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  존재하지 않는 가짜 법령 조문 번호를 그럴듯하게 지어냄.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 개인정보 무방비 유출\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  계약서의 주민등록번호, 계좌번호, 전화번호가 그대로 노출.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 정량 숫자 계산 오류\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  차임 증액 5% 한도, 위약금 10% 등 단순 어림셈으로 오판.', options: { color: TEXT_MUTED } }
    ], { x: 5.35, y: 2.45, w: 3.85, h: 2.3, fontSize: 10, lineSpacing: 14, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 2: 서비스 소개 & 핵심 가치
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '02', '서비스 소개 & 핵심 가치');

    slide.addText('사회초년생을 위한 원스톱 특약 안전망', {
      x: 0.6, y: 0.85, w: 8.8, h: 0.45,
      fontSize: 20, bold: true, color: TEXT_WHITE, fontFace: 'Pretendard'
    });

    // Box 1: 2대 전문 점검팩
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 1.45, w: 4.25, h: 1.9,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('📋 2대 전문 점검팩 (18개 항목 전수 판정)', {
      x: 0.8, y: 1.6, w: 3.85, h: 0.3,
      fontSize: 12, bold: true, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 전월세 임대차 팩 (11개): ', options: { bold: true, color: TEXT_WHITE } },
      { text: '근저당 설정 금지, 대항력 효력 시점, 보증금 반환 시기, 수선의무(보일러/누수), 5% 증액 한도 등\n', options: { color: TEXT_MUTED } },
      { text: '• 헬스장·PT 약관 팩 (7개): ', options: { bold: true, color: TEXT_WHITE } },
      { text: '위약금 10% 상한, 정상가 차감 꼼수 방지, 개시 전 해지권\n', options: { color: TEXT_MUTED } },
      { text: '• 누락 0건 보장: ', options: { bold: true, color: SUCCESS } },
      { text: '빠진 항목은 임의 누락 없이 "자동 실패"로 강등 표시', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 1.95, w: 3.85, h: 1.3, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });

    // Box 2: 리스크 시각화 & 형광펜
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.15, y: 1.45, w: 4.25, h: 1.9,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('⚠️ 리스크 시각화 & 원티드 디자인 시스템', {
      x: 5.35, y: 1.6, w: 3.85, h: 0.3,
      fontSize: 12, bold: true, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• Montage UI & 아이콘 전용 제어: ', options: { bold: true, color: TEXT_WHITE } },
      { text: '이모지 배제, 아이콘 전용 버튼(복사·전체화면·리셋)으로 전문성 확립\n', options: { color: TEXT_MUTED } },
      { text: '• 네온 형광펜 키워드 하이라이트: ', options: { bold: true, color: TEXT_WHITE } },
      { text: '원문 독소 어구(입주 후 반환, 일괄 공제) 0.1초 식별\n', options: { color: TEXT_MUTED } },
      { text: '• 공식 표준 서식 1:1 대조: ', options: { bold: true, color: TEXT_WHITE } },
      { text: '법무부 표준계약서 실물 스캔본 핀 클릭 펄스 연동', options: { color: TEXT_MUTED } }
    ], { x: 5.35, y: 1.95, w: 3.85, h: 1.3, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });

    // Box 3: 하단 와이드 - 공식 A4 PDF 리포트 & 옴니채널
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 3.5, w: 8.8, h: 1.45,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('✉️ 공식 A4 2페이지 감정 리포트 PDF 발행 & 옴니채널 접근성', {
      x: 0.8, y: 3.65, w: 8.4, h: 0.3,
      fontSize: 12, bold: true, color: '38BDF8', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 공식 2페이지 A4 PDF 리포트: ', options: { bold: true, color: TEXT_WHITE } },
      { text: '계약서 원문 스캔 하이라이트 박스와 법령 MCP 조문이 결합된 감정서 수준 리포트 생성 및 이메일 다이렉트 전송\n', options: { color: TEXT_MUTED } },
      { text: '• 스마트폰 카메라 / 사진 파일 / 클립보드(Ctrl+V) OCR: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'Gemini Multimodal Vision API로 종이 계약서 특약 자동 추출 (클라이언트 1600px 리사이즈)\n', options: { color: TEXT_MUTED } },
      { text: '• Zero-Click 크롬 확장 프로그램: ', options: { bold: true, color: TEXT_WHITE } },
      { text: '국토부 부동산전자계약시스템, 피터팬 등에서 복사 없이 위험 특약 실시간 인라인 밑줄 & 툴팁 안내', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 3.95, w: 8.4, h: 0.9, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 3: 기술 아키텍처 & 설계 판단
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '03', '기술 아키텍처 & 설계 판단');

    slide.addText('결정론적 가드레일과 LLM의 하이브리드 파이프라인', {
      x: 0.6, y: 0.85, w: 8.8, h: 0.45,
      fontSize: 20, bold: true, color: TEXT_WHITE, fontFace: 'Pretendard'
    });

    // Pipeline Steps Box
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 1.4, w: 8.8, h: 1.45,
      rectRadius: 0.08, fill: { color: '090D16' }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText([
      { text: '[1. 입력 유효성 검사] ', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: '20~4000자, 계약서 키워드 사전 필터링 (무의미한 AI 호출 100% 원천 차단)\n', options: { color: TEXT_MUTED } },
      { text: '[2. 개인정보 사전 가림] ', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: '주민번호·전화·계좌·동호수 정규식 치환 및 클라이언트 마스킹 미리보기 제공\n', options: { color: TEXT_MUTED } },
      { text: '[3. 결정론적 규칙 검사] ', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: '증액 5%, 위약금 10% 등 숫자 계산 사전 판정 (Rule Engine)\n', options: { color: TEXT_MUTED } },
      { text: '[4. AI 구조화 판정]    ', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: 'Vercel AI SDK + 서버 조문 번들링 + JSON Schema 출력 강제\n', options: { color: TEXT_MUTED } },
      { text: '[5. 사후 출력 보정]    ', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: '원문에 없는 허위 인용(환각) 걷어내기 & 누락 항목 자동 실패 처리 (Repair)', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 1.5, w: 8.4, h: 1.25, fontSize: 9.5, fontFace: 'Menlo', lineSpacing: 13 });

    // Decision Card 1
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 3.05, w: 4.25, h: 1.9,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('💡 판단 1: 서버 사이드 조문 번들링', {
      x: 0.8, y: 3.2, w: 3.85, h: 0.3,
      fontSize: 12, bold: true, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 도구 호출(Tool Call)의 한계:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  모델이 도구로 조문을 검색해 열람하게 하면 다중 턴 지연으로 Vercel 60초 타임아웃 발생 및 엉뚱한 조항 열람 위험.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 해결: 서버 사이드 조문 패키징\n', options: { bold: true, color: SUCCESS } },
      { text: '  항목별 국가법령정보센터 실제 조문을 1회 호출에 직접 번들링하여 응답 시간 1.5초 → 0.6초로 60% 단축.', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 3.55, w: 3.85, h: 1.3, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });

    // Decision Card 2
    slide.addShape(pres.ShapeType.roundRect, {
      x: 5.15, y: 3.05, w: 4.25, h: 1.9,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('⚡ 판단 2: 4단계 고가용성 Fallback Pool', {
      x: 5.35, y: 3.2, w: 3.85, h: 0.3,
      fontSize: 12, bold: true, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• WIF 기반 단기 OIDC 인증:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  GCP 서비스 계정 환경변수 유출 위험을 원천 차단.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 4단계 Fallback 계층:\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  3.8-flash (1순위) → 3.6-flash → 3.1-flash-lite → flash-lite-latest\n\n', options: { color: 'BAE6FD' } },
      { text: '• maxRetries: 0 즉시 인계:\n', options: { bold: true, color: SUCCESS } },
      { text: '  쿼터 한도(일 20건) 초과 시 0.5초 만에 다음 가용 풀로 즉각 인계하여 무중단 운영 실현.', options: { color: TEXT_MUTED } }
    ], { x: 5.35, y: 3.55, w: 3.85, h: 1.3, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 4: 정량 평가 리포트
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '04', '정량 평가 리포트');

    slide.addText('정답 표 선봉인 기반 v0 → v1 → v2 실측 결과', {
      x: 0.6, y: 0.85, w: 8.8, h: 0.45,
      fontSize: 20, bold: true, color: TEXT_WHITE, fontFace: 'Pretendard'
    });
    slide.addText('정답 표 선봉인 커밋: c5ee656  |  채점 단위: 항목 (Test Split: 20건 / 188개 판정 전수 실측)', {
      x: 0.6, y: 1.35, w: 8.8, h: 0.3,
      fontSize: 10, color: TEXT_MUTED, fontFace: 'Pretendard'
    });

    // Evaluation Table
    const tableRows = [
      [
        { text: '버전', options: { bold: true, fill: '1E3A8A', color: '93C5FD' } },
        { text: '접근 방식', options: { bold: true, fill: '1E3A8A', color: '93C5FD' } },
        { text: '위험 재현율 (놓치지 않음)', options: { bold: true, fill: '1E3A8A', color: '93C5FD' } },
        { text: '위험 정밀도 (헛경고 없음)', options: { bold: true, fill: '1E3A8A', color: '93C5FD' } },
        { text: '전체 정확도', options: { bold: true, fill: '1E3A8A', color: '93C5FD' } },
        { text: '평균 응답 속도', options: { bold: true, fill: '1E3A8A', color: '93C5FD' } }
      ],
      [
        { text: 'v0', options: { bold: true, color: TEXT_WHITE } },
        { text: '단순 질의 (ChatGPT 스타일)', options: { color: TEXT_MUTED } },
        { text: '58.3%', options: { color: TEXT_WHITE } },
        { text: '63.6% (헛경고 8건)', options: { color: 'F87171', bold: true } },
        { text: '83.5%', options: { color: TEXT_WHITE } },
        { text: '1.5초', options: { color: TEXT_MUTED } }
      ],
      [
        { text: 'v1', options: { bold: true, color: TEXT_WHITE } },
        { text: '항목 설명 + 원문 인용 강제', options: { color: TEXT_MUTED } },
        { text: '33.3%', options: { color: TEXT_WHITE } },
        { text: '100.0% (헛경고 0건)', options: { color: '4ADE80', bold: true } },
        { text: '82.4%', options: { color: TEXT_WHITE } },
        { text: '1.0초', options: { color: TEXT_MUTED } }
      ],
      [
        { text: 'v2', options: { bold: true, color: '60A5FA' } },
        { text: '근거 조문 + 규칙 계산 + 출력 보정', options: { color: '93C5FD' } },
        { text: '20.8%', options: { color: TEXT_WHITE } },
        { text: '100.0% (헛경고 0건)', options: { color: '4ADE80', bold: true } },
        { text: '77.7%', options: { color: TEXT_WHITE } },
        { text: '0.6초 (60% 단축)', options: { color: '60A5FA', bold: true } }
      ]
    ];

    slide.addTable(tableRows, {
      x: 0.6, y: 1.7, w: 8.8,
      fill: { color: CARD_BG },
      border: { pt: 1, color: CARD_BORDER },
      align: 'left',
      fontSize: 9.5,
      fontFace: 'Pretendard',
      rowH: [0.35, 0.35, 0.35, 0.35]
    });

    // Insights Box
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 3.35, w: 8.8, h: 1.6,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('📊 핵심 결과 분석 및 비즈니스 인사이트', {
      x: 0.8, y: 3.5, w: 8.4, h: 0.3,
      fontSize: 12, bold: true, color: PRIMARY_LIGHT, fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 헛경고 0건(정밀도 100.0%)의 의의:\n', options: { bold: true, color: SUCCESS } },
      { text: '  v0의 63.6% 정밀도는 정상적인 계약 조항을 위험하다고 오판하여 체결 직전 파기시키는 치명적 부작용 발생.\n  v1/v2는 원문 문장 글자 그대로 인용을 강제하고 허위 인용을 사후 필터링하여 헛경고를 완벽 차단함.\n\n', options: { color: TEXT_MUTED } },
      { text: '• 재현율과 안전성의 균형 (Safety-First):\n', options: { bold: true, color: TEXT_WHITE } },
      { text: '  v2의 낮은 재현율은 모델이 원문을 약간 변형했을 때 "자동 판정 실패"로 엄격 강등했기 때문임.\n  법률 특약 분야에서는 어설픈 헛경고보다 "원문 근거가 명확한 조항만 경고하고 의심 조항은 직접 확인"하게 하는 것이 최선.', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 3.8, w: 8.4, h: 1.05, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 5: AI 활용 & 트러블슈팅
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '05', 'AI 활용 & 트러블슈팅');

    slide.addText('실전 배포 중 마주한 결함과 극복 과정', {
      x: 0.6, y: 0.85, w: 8.8, h: 0.45,
      fontSize: 20, bold: true, color: TEXT_WHITE, fontFace: 'Pretendard'
    });

    // Box 1
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 1.45, w: 8.8, h: 1.05,
      rectRadius: 0.08, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('1. 사용량 초과 정규식의 "generated" 오탐 수정 (TDD로 발견)', {
      x: 0.8, y: 1.55, w: 8.4, h: 0.25,
      fontSize: 11, bold: true, color: 'FCA5A5', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 문제: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'AI SDK 형식 오류 메시지 "No object gene-rate-d" 속 "rate"에 /429|quota|rate/ 가 매칭되어 503 에러로 오인.\n', options: { color: TEXT_MUTED } },
      { text: '• 해결: ', options: { bold: true, color: SUCCESS } },
      { text: '단위 테스트(non-structured response does not throw)로 사전 포착. 형식 오류를 먼저 분기하고 단어 경계(\\b429\\b|quota|rate.?limit)로 엄격화.', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 1.8, w: 8.4, h: 0.65, fontSize: 9, lineSpacing: 12, fontFace: 'Pretendard' });

    // Box 2
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 2.6, w: 8.8, h: 1.05,
      rectRadius: 0.08, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('2. Gemini Multimodal Vision API 규격 최신화', {
      x: 0.8, y: 2.7, w: 8.4, h: 0.25,
      fontSize: 11, bold: true, color: 'FDE68A', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 문제: ', options: { bold: true, color: TEXT_WHITE } },
      { text: 'AI SDK 최신 버전에서 이미지 파트 전송 시 AISDK_DEP_IMAGE_CONTENT_PART Deprecation 경고 발생.\n', options: { color: TEXT_MUTED } },
      { text: '• 해결: ', options: { bold: true, color: SUCCESS } },
      { text: '{ type: "file", data: dataUrl, mediaType } 규격으로 전환하고 Base64 MIME 파서를 탑재해 깨끗한 래스터 이미지 파이프라인 확립.', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 2.95, w: 8.4, h: 0.65, fontSize: 9, lineSpacing: 12, fontFace: 'Pretendard' });

    // Box 3
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 3.75, w: 8.8, h: 1.25,
      rectRadius: 0.08, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('3. Free Tier 쿼터 한도(20건/일) 및 Vercel Timeout 해결 (고가용성 Fallback 체인)', {
      x: 0.8, y: 3.85, w: 8.4, h: 0.25,
      fontSize: 11, bold: true, color: 'BAE6FD', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• 문제: ', options: { bold: true, color: TEXT_WHITE } },
      { text: '3.8 Flash의 일일 20건 제한 초과 시 SDK가 3회 재시도하며 Vercel Serverless Function 504 Timeout 발생.\n', options: { color: TEXT_MUTED } },
      { text: '• 해결: ', options: { bold: true, color: SUCCESS } },
      { text: 'maxRetries: 0 적용으로 0.5초 만에 다음 모델로 넘어가도록 조치하고, 3.8 → 3.6 → 3.1-flash-lite로 이어지는 4단계 Fallback 체인으로 24시간 무중단 가용성 실현.\n', options: { color: TEXT_MUTED } },
      { text: '• 검증 커버리지: ', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: '51개 단위 테스트(node:test) 100% Pass 및 Playwright E2E 2/2 통과 검증 완료.', options: { color: TEXT_WHITE } }
    ], { x: 0.8, y: 4.1, w: 8.4, h: 0.85, fontSize: 9, lineSpacing: 12, fontFace: 'Pretendard' });
  }

  // ==========================================
  // SLIDE 6: 회고 & 향후 로드맵
  // ==========================================
  {
    const slide = pres.addSlide();
    addSlideChrome(slide, '06', '회고 & 향후 로드맵');

    slide.addText('배운 점과 서비스 발전 계획', {
      x: 0.6, y: 0.85, w: 8.8, h: 0.45,
      fontSize: 20, bold: true, color: TEXT_WHITE, fontFace: 'Pretendard'
    });

    // Core Learning Box
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.6, y: 1.4, w: 8.8, h: 1.4,
      rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
    });
    slide.addText('🌟 핵심 교훈: "LLM을 맹신하지 말고 시스템 아키텍처로 통제하라"', {
      x: 0.8, y: 1.55, w: 8.4, h: 0.3,
      fontSize: 12, bold: true, color: 'FDE68A', fontFace: 'Pretendard'
    });
    slide.addText([
      { text: '• LLM은 자연어 문맥 파악에는 뛰어나지만, 정량 수치 계산과 누락 방지에는 구조적 취약점을 가집니다.\n', options: { color: TEXT_WHITE } },
      { text: '• 개인정보 사전 가림(정규식) + 수치 계산(Rule Engine) + 근거 조문 번들링 + 인용 검증 필터(Repair)', options: { bold: true, color: PRIMARY_LIGHT } },
      { text: '의 4중 가드레일이 시스템적으로 유기 결합되어야만 비로소 실전 비즈니스에 쓰일 수 있는 신뢰도를 얻을 수 있음을 체감했습니다.', options: { color: TEXT_MUTED } }
    ], { x: 0.8, y: 1.9, w: 8.4, h: 0.8, fontSize: 9.5, lineSpacing: 13, fontFace: 'Pretendard' });

    // Roadmap 3 items
    const roadmaps = [
      {
        title: '🚀 로드맵 1: 공공데이터 등기부등본 연동',
        desc: '특약뿐만 아니라 집주인의 근저당권, 압류, 가등기, 선순위 채권을 공공데이터포털 API로 실시간 조회하여 보증금 안전율 자동 산출.'
      },
      {
        title: '🚀 로드맵 2: 청년 직거래 플랫폼 제휴',
        desc: '당근마켓 부동산 직거래, 다방, 피터팬 등 청년들이 많이 쓰는 플랫폼에 크롬 확장 프로그램 및 API 플러그인 연계 확대.'
      },
      {
        title: '🚀 로드맵 3: 판례 기반 대안 특약 추천',
        desc: '실제 분쟁 발생 시 세입자가 100% 승소한 대법원 판례 데이터를 벡터 임베딩하여 분쟁 승소율이 검증된 최적의 방어 특약 문구를 추천.'
      }
    ];

    for (let i = 0; i < 3; i++) {
      slide.addShape(pres.ShapeType.roundRect, {
        x: 0.6 + i * 3.0, y: 2.95, w: 2.8, h: 2.05,
        rectRadius: 0.1, fill: { color: CARD_BG }, line: { color: CARD_BORDER, width: 1 }
      });
      slide.addText(roadmaps[i].title, {
        x: 0.75 + i * 3.0, y: 3.1, w: 2.5, h: 0.45,
        fontSize: 10.5, bold: true, color: '60A5FA', fontFace: 'Pretendard'
      });
      slide.addText(roadmaps[i].desc, {
        x: 0.75 + i * 3.0, y: 3.6, w: 2.5, h: 1.3,
        fontSize: 9, color: TEXT_MUTED, lineSpacing: 13, fontFace: 'Pretendard'
      });
    }
  }

  const outputPath = 'submission/01_발표자료_계약서특약점검기.pptx';
  await pres.writeFile({ fileName: outputPath });
  console.log(`✓ PPTX presentation successfully generated: ${outputPath}`);
}

buildPresentation().catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
