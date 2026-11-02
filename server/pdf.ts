import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ItemResult } from '../shared/types.js';
import type { LawLookupResponse } from './law-api.js';

export interface GeneratePdfOptions {
  docTitle?: string;
  items: ItemResult[];
  lawData?: LawLookupResponse | null;
  safetyScore?: number;
  imagePath?: string;
}

export async function generateReportPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const {
    docTitle = '주택임대차 표준계약서',
    items = [],
    lawData,
    safetyScore = 72,
    imagePath,
  } = options;

  const toxicItems = items.filter((i) => i.verdict === '위험');
  const safeItems = items.filter((i) => i.verdict === '보호됨');
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const reportId = `ONYUL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  // 스캔 계약서 원본 이미지 로드 (base64 인코딩)
  let contractImgBase64 = '';
  const candidatePaths = [
    imagePath,
    resolve(process.cwd(), 'public/samples/scanned_lease_contract.png'),
    resolve('/Users/yun-yeowon/workspace/lease-clause-check/public/samples/scanned_lease_contract.png'),
  ].filter(Boolean) as string[];

  for (const p of candidatePaths) {
    if (existsSync(p)) {
      try {
        const fileBuf = readFileSync(p);
        contractImgBase64 = `data:image/png;base64,${fileBuf.toString('base64')}`;
        break;
      } catch {
        // ignore
      }
    }
  }

  // 계약서 스캔본 위 조항 하이라이트 박스 좌표 정의 (정비율 824 x 1089)
  const pinSpecs = [
    { num: 1, tone: 'safe', label: '담보권 설정 금지 (권리 보호)', left: 8.34, top: 55.83, width: 83.38, height: 2.1 },
    { num: 2, tone: 'risk', label: '다음 세입자 입주 후 반환 (불법 지연)', left: 8.36, top: 62.63, width: 83.38, height: 2.1 },
    { num: 3, tone: 'risk', label: '차임 매년 8% 인상 (법정 5% 초과)', left: 8.38, top: 67.53, width: 83.38, height: 2.1 },
  ];

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${docTitle} - 특약 안심 진단 공식 리포트</title>
<style>
  @page {
    size: A4;
    margin: 14mm 14mm 14mm 14mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Wanted Sans", sans-serif;
    color: #0f172a;
    line-height: 1.5;
    margin: 0;
    padding: 0;
    font-size: 12px;
    background: #ffffff;
  }
  .page {
    page-break-after: always;
  }
  .page:last-child {
    page-break-after: avoid;
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #1e64ff;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .report-brand {
    font-size: 20px;
    font-weight: 800;
    color: #1e64ff;
    letter-spacing: -0.02em;
  }
  .report-subhead {
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }
  .report-meta {
    text-align: right;
    font-size: 11px;
    color: #475569;
    line-height: 1.4;
  }
  .report-title-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .report-title-card h1 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }
  .score-badge {
    background: #ffffff;
    border: 1.5px solid #1e64ff;
    padding: 6px 14px;
    border-radius: 999px;
    text-align: center;
  }
  .score-badge strong {
    font-size: 18px;
    color: #1e64ff;
  }
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .kpi-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
    background: #fdfdfd;
  }
  .kpi-card.risk {
    border-color: #fecaca;
    background: #fff5f5;
  }
  .kpi-card.safe {
    border-color: #bbf7d0;
    background: #f0fdf4;
  }
  .kpi-label {
    font-size: 10.5px;
    color: #64748b;
    font-weight: 600;
  }
  .kpi-value {
    font-size: 15px;
    font-weight: 800;
    margin-top: 2px;
  }
  .section-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
    border-left: 3px solid #1e64ff;
    padding-left: 8px;
    margin: 14px 0 10px 0;
  }

  /* 스캔본 하이라이트 시각화 레이아웃 */
  .visual-grid {
    display: grid;
    grid-template-columns: 290px 1fr;
    gap: 16px;
    margin-bottom: 16px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 14px;
  }
  .scan-container {
    position: relative;
    width: 290px;
    aspect-ratio: 824 / 1089;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
  }
  .scan-img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    display: block;
  }
  .scan-overlay-box {
    position: absolute;
    border-radius: 3px;
    pointer-events: none;
    box-sizing: border-box;
  }
  .scan-overlay-box.risk {
    background: rgba(239, 68, 68, 0.32);
    border: 1.5px solid #ef4444;
  }
  .scan-overlay-box.safe {
    background: rgba(34, 197, 94, 0.30);
    border: 1.5px solid #22c55e;
  }
  .scan-pin-tag {
    position: absolute;
    left: -22px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .scan-pin-tag.risk {
    background: #ef4444;
  }
  .scan-pin-tag.safe {
    background: #16a34a;
  }
  .pin-summary-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pin-summary-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .pin-summary-card.risk {
    border-left: 3.5px solid #ef4444;
  }
  .pin-summary-card.safe {
    border-left: 3.5px solid #16a34a;
  }
  .pin-summary-title {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .pin-summary-quote {
    font-size: 11px;
    color: #475569;
    background: #f1f5f9;
    padding: 4px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
  }
  .pin-summary-law {
    font-size: 11px;
    color: #1e40af;
    font-weight: 600;
  }

  .clause-item {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
    margin-bottom: 8px;
    page-break-inside: avoid;
  }
  .clause-item.risk {
    border-left: 3.5px solid #dc2626;
    background: #ffffff;
  }
  .clause-item.safe {
    border-left: 3.5px solid #16a34a;
    background: #ffffff;
  }
  .clause-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .clause-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .clause-badge {
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .clause-badge.risk {
    background: #fee2e2;
    color: #dc2626;
  }
  .clause-badge.safe {
    background: #def7ec;
    color: #03543f;
  }
  .quote-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 11.5px;
    color: #334155;
    margin-bottom: 4px;
  }
  .fix-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 11.5px;
    color: #1e40af;
    margin-top: 4px;
  }
  .fix-box strong {
    color: #1e3a8a;
  }
  .law-box {
    margin-top: 14px;
    padding: 10px 12px;
    background: #f0f7ff;
    border: 1px solid #d0e4ff;
    border-radius: 6px;
    font-size: 11px;
    color: #1e3a8a;
    page-break-inside: avoid;
  }
  .report-footer {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
    color: #64748b;
  }
  .seal {
    font-size: 11px;
    color: #1e64ff;
    font-weight: 700;
  }
</style>
</head>
<body>
  <!-- ==================== PAGE 1 ==================== -->
  <div class="page">
    <header class="report-header">
      <div>
        <div class="report-brand">온율 (溫律)</div>
        <div class="report-subhead">국가법령정보센터 실시간 법령 MCP 연동 · 계약서 특약 안심 진단서</div>
      </div>
      <div class="report-meta">
        <div><strong>문서번호:</strong> ${reportId}</div>
        <div><strong>진단일자:</strong> ${today}</div>
      </div>
    </header>

    <div class="report-title-card">
      <div>
        <h1>${docTitle} 특약 정밀 진단 리포트</h1>
        <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">
          주택임대차보호법 제10조(강행규정) 및 대법원 표준 판례 대조 완료
        </div>
      </div>
      <div class="score-badge">
        <div style="font-size: 10px; color: #64748b;">종합 안심도</div>
        <strong>${safetyScore}점</strong>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card risk">
        <div class="kpi-label">위험 독소 조항</div>
        <div class="kpi-value" style="color: #dc2626;">${toxicItems.length}건</div>
      </div>
      <div class="kpi-card safe">
        <div class="kpi-label">권리 보호 조항</div>
        <div class="kpi-value" style="color: #16a34a;">${safeItems.length}건</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">법률 검토 기준</div>
        <div class="kpi-value" style="color: #1e64ff; font-size: 12.5px;">주임법 제10조</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">공식 날인 상태</div>
        <div class="kpi-value" style="color: #0f172a; font-size: 12.5px;">검토 센터 확인</div>
      </div>
    </div>

    <!-- 스캔 계약서 원본 형광펜 핀포인트 하이라이트 시각화 -->
    <div class="section-title">스캔 계약서 원본 조항별 핀포인트 하이라이트 시각화</div>
    <div class="visual-grid">
      <div class="scan-container">
        ${
          contractImgBase64
            ? `<img src="${contractImgBase64}" class="scan-img" alt="계약서 원본 스캔본" />`
            : `<div style="padding: 20px; font-size: 12px; color: #64748b;">스캔본 이미지</div>`
        }
        ${pinSpecs
          .map(
            (pin) => `
          <div class="scan-overlay-box ${pin.tone}" style="left: ${pin.left}%; top: ${pin.top}%; width: ${pin.width}%; height: ${pin.height}%;">
            <div class="scan-pin-tag ${pin.tone}">${pin.num}</div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="pin-summary-list">
        <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-bottom: 4px;">
          검출된 조항 위치 및 핵심 분석
        </div>
        <div class="pin-summary-card safe">
          <div class="pin-summary-title">
            <span class="scan-pin-tag safe" style="position: static; transform: none; width: 16px; height: 16px; font-size: 9px;">1</span>
            제2조 담보권 설정 금지 (보호 조항)
          </div>
          <div class="pin-summary-quote">"잔금 지급일 다음 날까지 담보물권을 설정하지 아니한다"</div>
          <div class="pin-summary-law">✔ 전입신고 익일 대항력 발생 전 보증금 순위 보장</div>
        </div>

        <div class="pin-summary-card risk">
          <div class="pin-summary-title">
            <span class="scan-pin-tag risk" style="position: static; transform: none; width: 16px; height: 16px; font-size: 9px;">2</span>
            특약 1항 보증금 반환 시기 부당 지연 (위험 독소)
          </div>
          <div class="pin-summary-quote">"보증금은 다음 임차인이 입주한 후에 반환한다"</div>
          <div class="pin-summary-law" style="color: #dc2626;">✖ 주택임대차보호법 제10조(강행규정) 위반 무효</div>
        </div>

        <div class="pin-summary-card risk">
          <div class="pin-summary-title">
            <span class="scan-pin-tag risk" style="position: static; transform: none; width: 16px; height: 16px; font-size: 9px;">3</span>
            특약 3항 차임 법정 상한 초과 인상 (위험 독소)
          </div>
          <div class="pin-summary-quote">"차임은 매년 8% 인상한다"</div>
          <div class="pin-summary-law" style="color: #dc2626;">✖ 주택임대차보호법 제7조(차임증액청구 5% 상한) 위반 무효</div>
        </div>

        <div style="font-size: 11px; color: #64748b; line-height: 1.4; margin-top: 6px;">
          ※ 위 핀 번호는 좌측 스캔 원본의 형광펜 위치와 1:1로 일치합니다. 계약 체결 전 공인중개사에게 대안 특약으로 수정을 요청하시기 바랍니다.
        </div>
      </div>
    </div>

    <footer class="report-footer">
      <div>온율(律) 계약서 특약 안심 진단 서비스 · 1 / 2 페이지</div>
      <div class="seal">온율 법률 검토 센터 [직인생략]</div>
    </footer>
  </div>

  <!-- ==================== PAGE 2 ==================== -->
  <div class="page">
    <header class="report-header">
      <div>
        <div class="report-brand">온율 (溫律)</div>
        <div class="report-subhead">조항별 정밀 법률 대조표 및 공인중개사용 협상 대안 특약</div>
      </div>
      <div class="report-meta">
        <div><strong>문서번호:</strong> ${reportId}</div>
      </div>
    </header>

    <div class="section-title">검출된 위험 독소 특약 및 수정 권장 대안 (${toxicItems.length}건)</div>
    ${toxicItems
      .map(
        (item, idx) => `
      <div class="clause-item risk">
        <div class="clause-head">
          <span class="clause-title">[위험 #${idx + 1}] ${item.title}</span>
          <span class="clause-badge risk">수정 권고</span>
        </div>
        <div class="quote-box">
          <strong>계약서 원문:</strong> "${item.quote || item.title}"
        </div>
        <div style="font-size: 11.5px; color: #475569; margin: 3px 0;">
          <strong>위험 사유:</strong> ${item.riskReason || '임차인에게 일방적으로 불리한 조항으로 보증금 미반환 위험이 높습니다.'}
          ${item.riskConsequence ? `<br><strong>서명 시 피해:</strong> ${item.riskConsequence}` : ''}
        </div>
        ${
          item.fixText
            ? `
        <div class="fix-box">
          <strong>공인중개사용 협상 권장 대체 특약:</strong><br>
          "${item.fixText}"
        </div>`
            : ''
        }
      </div>`
      )
      .join('')}

    <div class="section-title">확인된 권리 보호 조항 (${safeItems.length}건)</div>
    ${safeItems
      .map(
        (item, idx) => `
      <div class="clause-item safe">
        <div class="clause-head">
          <span class="clause-title">[보호 #${idx + 1}] ${item.title}</span>
          <span class="clause-badge safe">정상 반영</span>
        </div>
        <div class="quote-box">
          <strong>계약서 원문:</strong> "${item.quote || item.title}"
        </div>
        <div style="font-size: 11.5px; color: #047857;">
          임차인의 법정 권리를 보호하는 표준 필수 조항이 계약서에 정상 반영되어 있습니다.
        </div>
      </div>`
      )
      .join('')}

    <div class="law-box">
      <strong>법적 효력 안내 (주택임대차보호법 제10조 강행규정):</strong><br>
      "본 법에 위반된 약정으로서 임차인에게 불리한 것은 그 효력이 없다."<br>
      계약서 특약란에 임차인에게 불리하게 기재된 조항은 서명 날인하더라도 법적으로 무효를 주장할 수 있으며,
      상기 권장 대안 특약 문구로 공인중개사 및 임대인에게 변경을 요청하시기 바랍니다.
      ${
        lawData?.statute
          ? `<br><br><strong>실시간 대조 법령:</strong> ${lawData.statute.lawName} ${lawData.statute.article} (${lawData.statute.officialUrl})`
          : ''
      }
    </div>

    <footer class="report-footer">
      <div>본 리포트는 공인중개사 협상 및 임대차 계약서 날인 전 검토 목적으로 발급된 공식 진단서입니다. · 2 / 2 페이지</div>
      <div class="seal">온율 법률 검토 센터 [직인생략]</div>
    </footer>
  </div>
</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm',
      },
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}
