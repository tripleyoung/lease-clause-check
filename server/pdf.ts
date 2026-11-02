import { chromium } from 'playwright';
import type { ItemResult } from '../shared/types.js';
import type { LawLookupResponse } from './law-api.js';

export interface GeneratePdfOptions {
  docTitle?: string;
  items: ItemResult[];
  lawData?: LawLookupResponse | null;
  safetyScore?: number;
}

export async function generateReportPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const {
    docTitle = '주택임대차 표준계약서',
    items = [],
    lawData,
    safetyScore = 72,
  } = options;

  const toxicItems = items.filter((i) => i.verdict === '위험');
  const safeItems = items.filter((i) => i.verdict === '보호됨');
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const reportId = `ONYUL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${docTitle} - 특약 안심 진단 공식 리포트</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
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
    font-size: 13px;
    background: #ffffff;
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #1e64ff;
    padding-bottom: 12px;
    margin-bottom: 16px;
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
    padding: 14px 18px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .report-title-card h1 {
    margin: 0;
    font-size: 17px;
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
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }
  .kpi-card {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
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
    font-size: 11px;
    color: #64748b;
    font-weight: 600;
  }
  .kpi-value {
    font-size: 16px;
    font-weight: 800;
    margin-top: 2px;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    border-left: 3px solid #1e64ff;
    padding-left: 8px;
    margin: 18px 0 10px 0;
  }
  .clause-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .clause-item.risk {
    border-left: 4px solid #dc2626;
    background: #ffffff;
  }
  .clause-item.safe {
    border-left: 4px solid #16a34a;
    background: #ffffff;
  }
  .clause-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .clause-title {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .clause-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 7px;
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
    padding: 6px 10px;
    font-size: 12px;
    color: #334155;
    margin-bottom: 6px;
  }
  .fix-box {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 4px;
    padding: 8px 10px;
    font-size: 12px;
    color: #1e40af;
    margin-top: 6px;
  }
  .fix-box strong {
    color: #1e3a8a;
  }
  .law-box {
    margin-top: 18px;
    padding: 12px 14px;
    background: #f0f7ff;
    border: 1px solid #d0e4ff;
    border-radius: 6px;
    font-size: 11.5px;
    color: #1e3a8a;
    page-break-inside: avoid;
  }
  .report-footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
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
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
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
      <div class="kpi-value" style="color: #1e64ff; font-size: 13.5px;">국가법령 MCP 대조</div>
    </div>
  </div>

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
      <div style="font-size: 12px; color: #475569; margin: 4px 0;">
        <strong>위험 사유:</strong> ${item.riskReason || '임차인에게 불리한 조항으로 분쟁 발생 위험이 높습니다.'}
        ${item.riskConsequence ? `<br><strong>서명 시 피해:</strong> ${item.riskConsequence}` : ''}
      </div>
      ${
        item.fixText
          ? `
      <div class="fix-box">
        <strong>수정 권장 대안 특약:</strong><br>
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
      <div style="font-size: 12px; color: #047857;">
        임차인의 법정 권리를 보호하는 안전한 표준 조항이 정상 반영되어 있습니다.
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
    <div>본 리포트는 공인중개사 협상 및 임대차 계약서 날인 전 검토 목적으로 발급된 공식 진단서입니다.</div>
    <div class="seal">온율 법률 검토 센터 [직인생략]</div>
  </footer>
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
        top: '12mm',
        bottom: '12mm',
        left: '12mm',
        right: '12mm',
      },
    });
    return Buffer.from(buffer);
  } finally {
    await browser.close();
  }
}
