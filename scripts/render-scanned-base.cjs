cd /Users/yun-yeowon/workspace/lease-clause-check && node -e '
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1697 } });

  // Read base moj_page-1 and moj_page-2 to data URLs
  const p1 = fs.readFileSync(path.join(process.cwd(), "public/samples/moj_page-1.png")).toString("base64");
  const p2 = fs.readFileSync(path.join(process.cwd(), "public/samples/moj_page-2.png")).toString("base64");

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
  body {
    margin: 0;
    padding: 24px;
    background: #e9eaec;
    font-family: "Pretendard Variable", -apple-system, sans-serif;
    display: flex;
    justify-content: center;
  }
  .scanner-page {
    width: 820px;
    background: #faf9f6;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
    position: relative;
    padding: 40px 48px;
    box-sizing: border-box;
    border: 1px solid #d4d2cb;
    transform: rotate(-0.15deg);
    filter: contrast(102%) brightness(99%);
  }
  .scanner-grain {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.035;
    background-image: radial-gradient(#000 1px, transparent 1px);
    background-size: 4px 4px;
  }
  .header-tag {
    font-size: 11px;
    color: #8a3b8f;
    border: 1px dashed #c07bc5;
    padding: 4px 8px;
    text-align: center;
    margin-bottom: 12px;
    background: #fdf8fe;
  }
  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #111;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }
  .doc-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: 2px;
    color: #111;
  }
  .check-types {
    font-size: 13px;
    font-weight: 700;
    display: flex;
    gap: 12px;
  }
  .parties-lead {
    font-size: 13px;
    font-weight: 600;
    padding: 6px 12px;
    background: #f3f2ee;
    border: 1px solid #d5d3ca;
    margin-bottom: 14px;
  }
  .sec-head {
    font-size: 14px;
    font-weight: 800;
    margin: 12px 0 6px;
    color: #1a1a1a;
  }
  table.ct-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    margin-bottom: 10px;
    background: #fff;
  }
  table.ct-table th, table.ct-table td {
    border: 1px solid #666;
    padding: 6px 8px;
    line-height: 1.4;
  }
  table.ct-table th {
    background: #edece8;
    font-weight: 700;
    text-align: center;
    color: #222;
  }
  .typed-val {
    font-family: "Nanum Myeongjo", "Batang", serif;
    font-size: 13px;
    color: #0b1a30;
    font-weight: 600;
  }
  .typed-hand {
    font-family: "Nanum Myeongjo", "Batang", serif;
    color: #1a2744;
    letter-spacing: -0.2px;
  }
  .clause-box-real {
    border: 2px solid #333;
    padding: 12px 16px;
    font-size: 12.5px;
    line-height: 1.65;
    background: #fff;
    margin-top: 6px;
  }
  .clause-item {
    margin-bottom: 6px;
    position: relative;
    padding-left: 2px;
  }
  .clause-highlight-risk {
    background: rgba(220, 53, 69, 0.12);
    border-left: 3px solid #dc3545;
    padding-left: 6px;
  }
  .clause-highlight-safe {
    background: rgba(40, 167, 69, 0.10);
    border-left: 3px solid #28a745;
    padding-left: 6px;
  }
  .stamp-red {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 2px solid #b31b1b;
    color: #b31b1b;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 900;
    transform: rotate(6deg);
    box-shadow: inset 0 0 0 1px #b31b1b;
    background: rgba(179, 27, 27, 0.05);
  }
  .stamp-sq {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border: 2px solid #b31b1b;
    color: #b31b1b;
    font-size: 10px;
    font-weight: 900;
    transform: rotate(-3deg);
    line-height: 1.1;
    text-align: center;
    background: rgba(179, 27, 27, 0.05);
  }
  .doc-footer-meta {
    margin-top: 14px;
    font-size: 11px;
    color: #777;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
<div class="scanner-page">
  <div class="scanner-grain"></div>
  <div class="header-tag">이 계약서는 법무부가 국토교통부·서울시 및 관련 전문가들과 함께 주택임대차보호법에 근거하여 만들었습니다.</div>
  
  <div class="title-row">
    <div class="doc-title">주택임대차표준계약서</div>
    <div class="check-types">
      <span>☑ 보증금 있는 월세</span>
      <span>☐ 전세</span>
      <span>☐ 월세</span>
    </div>
  </div>

  <div class="parties-lead">
    임대인( <strong>홍길동</strong> )과 임차인( <strong>김영희</strong> )은 아래와 같이 임대차 계약을 체결한다.
  </div>

  <div class="sec-head">[임차주택의 표시]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 14%;">소 재 지</th>
      <td colspan="5" class="typed-val">서울특별시 관악구 신림로 123, 402호 (신림동, 관악파크빌)</td>
    </tr>
    <tr>
      <th>토 지</th>
      <th style="width: 10%;">지목</th>
      <td style="width: 26%;">대</td>
      <th style="width: 12%;">면 적</th>
      <td colspan="2">132.5 ㎡</td>
    </tr>
    <tr>
      <th>건 물</th>
      <th>구조·용도</th>
      <td>철근콘크리트조 · 다세대주택</td>
      <th>전용면적</th>
      <td colspan="2">45.20 ㎡</td>
    </tr>
    <tr>
      <th>임차할부분</th>
      <td colspan="3" class="typed-val">402호 전부 (방2, 거실, 주방, 욕실)</td>
      <th>임차면적</th>
      <td>45.20 ㎡</td>
    </tr>
    <tr>
      <th>계약종류</th>
      <td colspan="5">☑ 신규 계약 &nbsp;&nbsp;&nbsp;&nbsp; ☐ 합의에 의한 재계약 &nbsp;&nbsp;&nbsp;&nbsp; ☐ 계약갱신요구권 행사에 의한 갱신계약</td>
    </tr>
  </table>

  <div class="sec-head">[계약내용 (보증금·차임·관리비)]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 18%;">보 증 금</th>
      <td colspan="4" class="typed-val">금 오천만 원정 (￦ 50,000,000)</td>
    </tr>
    <tr>
      <th>계 약 금</th>
      <td style="width: 35%;" class="typed-val">금 5,000,000원 (계약 시 지불·영수함)</td>
      <th style="width: 16%;">영수인</th>
      <td colspan="2">홍길동 &nbsp;<span class="stamp-red">홍길동</span></td>
    </tr>
    <tr>
      <th>잔 금</th>
      <td class="typed-val">금 45,000,000원 (2026년 3월 15일 지불)</td>
      <th>차임(월세)</th>
      <td colspan="2" class="typed-val">금 650,000원 (매월 25일 후불)</td>
    </tr>
    <tr>
      <th>임대차기간</th>
      <td colspan="4" class="typed-val">2026년 3월 15일부터 2028년 3월 14일까지 (24개월)</td>
    </tr>
    <tr>
      <th>관리비</th>
      <td colspan="4">정액 월 80,000원 (공용전기·계단청소·인터넷 포함, 수도·난방 실비 별도)</td>
    </tr>
  </table>

  <div class="sec-head">[특약사항 및 주요 조항]</div>
  <div class="clause-box-real">
    <div class="clause-item clause-highlight-safe">
      <strong>제2조 (담보권 설정 금지):</strong> 임대인은 잔금 지급일 다음 날까지 이 주택에 저당권 등 담보물권을 설정하지 아니한다.
    </div>
    <div class="clause-item clause-highlight-safe">
      <strong>제4조 (수선 및 원상복구):</strong> 임차인의 통상의 사용에 따른 마모(도배·장판 변색 등 자연 마모)는 원상복구 대상에서 제외한다(대법원 2005다51389).
    </div>
    <div class="clause-item clause-highlight-risk">
      <strong>특약 1항:</strong> 계약 만료 시 보증금은 다음 임차인이 입주한 후에 반환하기로 합의한다.
    </div>
    <div class="clause-item clause-highlight-risk">
      <strong>특약 2항:</strong> 퇴실 시 도배·장판 비용 및 특수 청소비 40만원을 보증금에서 일괄 공제한다.
    </div>
    <div class="clause-item clause-highlight-risk">
      <strong>특약 3항:</strong> 물가상승률을 감안하여 차임은 매년 8%씩 정기 인상하기로 한다.
    </div>
  </div>

  <div class="sec-head" style="margin-top: 14px;">[계약 당사자 및 개업공인중개사 서명·날인]</div>
  <table class="ct-table">
    <tr>
      <th rowspan="2" style="width: 10%;">임대인</th>
      <th style="width: 10%;">주 소</th>
      <td class="typed-hand">서울특별시 서초구 서초대로 50, 102동 301호</td>
      <th style="width: 10%;">주민번호</th>
      <td>800505-1234567</td>
      <td rowspan="2" style="width: 14%; text-align: center;">
        서명/날인<br>
        <span class="stamp-red">홍길동</span>
      </td>
    </tr>
    <tr>
      <th>성 명</th>
      <td class="typed-val">홍 길 동 (전화 010-2468-1357)</td>
      <th>대리인</th>
      <td>-</td>
    </tr>
    <tr>
      <th rowspan="2">임차인</th>
      <th>주 소</th>
      <td class="typed-hand">서울특별시 동작구 상도로 88, 201호</td>
      <th>주민번호</th>
      <td>950812-2345678</td>
      <td rowspan="2" style="text-align: center;">
        서명/날인<br>
        <span class="stamp-red">김영희</span>
      </td>
    </tr>
    <tr>
      <th>성 명</th>
      <td class="typed-val">김 영 희 (전화 010-9876-5432)</td>
      <th>대리인</th>
      <td>-</td>
    </tr>
    <tr>
      <th rowspan="2">중개사</th>
      <th>상 호</th>
      <td class="typed-val">대박공인중개사사무소 (대표 이철수)</td>
      <th>등록번호</th>
      <td>11650-2021-00012</td>
      <td rowspan="2" style="text-align: center;">
        직인<br>
        <span class="stamp-sq">대박<br>공인</span>
      </td>
    </tr>
    <tr>
      <th>소재지</th>
      <td class="typed-hand">서울특별시 관악구 신림로 110</td>
      <th>전 화</th>
      <td>02-888-9999</td>
    </tr>
  </table>

  <div class="doc-footer-meta">
    <span>법무부·국토교통부 표준양식 제2023-1호 준용</span>
    <span>문서확인번호: MOJ-2026-0315-7829-LEAS</span>
    <span>1 / 1 쪽 (공식 스캔본)</span>
  </div>
</div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: "networkidle" });
  const outPath = path.join(process.cwd(), "public/samples/scanned_lease_contract.png");
  await page.locator(".scanner-page").screenshot({ path: outPath });
  console.log("Rendered scanned lease contract to:", outPath);
  await browser.close();
})();
'