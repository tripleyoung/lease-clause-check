cd /Users/yun-yeowon/workspace/lease-clause-check && node -e '
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1697 } });

  // 1. Gym contract scan
  const gymHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
  body {
    margin: 0; padding: 24px; background: #e9eaec;
    font-family: "Pretendard Variable", -apple-system, sans-serif;
    display: flex; justify-content: center;
  }
  .scanner-page {
    width: 820px; background: #faf9f6;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
    position: relative; padding: 40px 48px; box-sizing: border-box;
    border: 1px solid #d4d2cb; transform: rotate(0.12deg);
    filter: contrast(102%) brightness(99%);
  }
  .header-tag {
    font-size: 11px; color: #1a56db; border: 1px dashed #7ea5f8;
    padding: 4px 8px; text-align: center; margin-bottom: 12px; background: #f4f7fe;
  }
  .title-row {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px;
  }
  .doc-title { font-size: 25px; font-weight: 900; letter-spacing: 2px; color: #111; }
  .parties-lead {
    font-size: 13px; font-weight: 600; padding: 6px 12px;
    background: #f3f2ee; border: 1px solid #d5d3ca; margin-bottom: 14px;
  }
  .sec-head { font-size: 14px; font-weight: 800; margin: 12px 0 6px; color: #1a1a1a; }
  table.ct-table {
    width: 100%; border-collapse: collapse; font-size: 12.5px;
    margin-bottom: 10px; background: #fff;
  }
  table.ct-table th, table.ct-table td {
    border: 1px solid #666; padding: 6px 8px; line-height: 1.4;
  }
  table.ct-table th { background: #edece8; font-weight: 700; text-align: center; color: #222; }
  .typed-val { font-family: "Nanum Myeongjo", "Batang", serif; font-size: 13px; color: #0b1a30; font-weight: 600; }
  .clause-box-real {
    border: 2px solid #333; padding: 12px 16px; font-size: 12.5px;
    line-height: 1.65; background: #fff; margin-top: 6px;
  }
  .clause-item { margin-bottom: 6px; position: relative; padding: 2px 4px; }
  .clause-highlight-risk { background: rgba(220, 53, 69, 0.12); border-left: 3px solid #dc3545; }
  .clause-highlight-safe { background: rgba(40, 167, 69, 0.10); border-left: 3px solid #28a745; }
  .stamp-red {
    display: inline-flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border: 2px solid #b31b1b; color: #b31b1b;
    border-radius: 50%; font-size: 11px; font-weight: 900;
    transform: rotate(-4deg); background: rgba(179, 27, 27, 0.05);
  }
  .stamp-sq {
    display: inline-flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border: 2px solid #b31b1b; color: #b31b1b;
    font-size: 10px; font-weight: 900; transform: rotate(4deg);
    line-height: 1.1; text-align: center; background: rgba(179, 27, 27, 0.05);
  }
  .doc-footer-meta { margin-top: 14px; font-size: 11px; color: #777; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="scanner-page">
  <div class="header-tag">공정거래위원회 체력단련장 이용 표준약관 제10037호 준용 등록 서식</div>
  <div class="title-row">
    <div class="doc-title">체력단련장(피트니스·PT) 이용계약서</div>
    <div style="font-size: 12px; color: #555;">회원번호: 2026-FIT-0941</div>
  </div>

  <div class="parties-lead">
    사업자( <strong>아레나 피트니스 강남본점</strong> )와 회원( <strong>김민수</strong> )은 아래와 같이 체결한다.
  </div>

  <div class="sec-head">[회원 및 등록 상품 정보]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 14%;">성 명</th>
      <td style="width: 36%;" class="typed-val">김 민 수</td>
      <th style="width: 14%;">생년월일</th>
      <td>1990년 3월 15일 (남)</td>
    </tr>
    <tr>
      <th>연 락 처</th>
      <td class="typed-val">010-9876-5432</td>
      <th>주 소</th>
      <td>서울특별시 서초구 강남대로 101, 502호</td>
    </tr>
    <tr>
      <th>등록프로그램</th>
      <td colspan="3" class="typed-val">12개월 VIP 헬스 회원권 + 1:1 퍼스널 트레이닝(PT) 20회</td>
    </tr>
    <tr>
      <th>이용기간</th>
      <td colspan="3" class="typed-val">2026년 4월 1일부터 2027년 3월 31일까지 (12개월)</td>
    </tr>
  </table>

  <div class="sec-head">[결제 내역]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 20%;">정 상 가 격</th>
      <td>회원권 180만원 + PT 160만원 = 총 340만 원</td>
      <th style="width: 20%;">프로모션 할인가</th>
      <td class="typed-val">총 실결제금액: 1,200,000 원</td>
    </tr>
    <tr>
      <th>결제수단</th>
      <td>현대카드 일시불 (승인번호 48291042)</td>
      <th>사은품 증정</th>
      <td>고급 트레이닝복 1벌, 전용 락커 무료</td>
    </tr>
  </table>

  <div class="sec-head">[이용 약관 및 해지 환불 특약사항]</div>
  <div class="clause-box-real">
    <div class="clause-item clause-highlight-safe">
      <strong>제11조 (중도 해지 환급 기준):</strong> 회원의 사정으로 중도 해지 시 소비자분쟁해결기준에 따라 실제 결제금액을 기준으로 이용일수를 일할 공제하고 총 이용료의 10% 위약금을 제외한 잔여금을 환급한다.
    </div>
    <div class="clause-item clause-highlight-risk">
      <strong>특약 1항 (정상가 차감):</strong> 본 계약은 특별 프로모션 할인가 상품이므로, 중도 해지 시 정상가(월 15만원, PT 회당 8만원) 기준으로 이용 개월을 차감하고 위약금 20%를 공제합니다.
    </div>
    <div class="clause-item clause-highlight-risk">
      <strong>특약 2항 (환불 불가):</strong> 센터 이전, 시설 리모델링 공사 시 회원권은 소멸되며 어떠한 경우에도 환불되지 않습니다.
    </div>
    <div class="clause-item clause-highlight-risk">
      <strong>특약 3항 (사은품 공제):</strong> 무료 증정된 사은품(운동복)은 중도 해지 시 정가 12만원을 일괄 현금 차감합니다.
    </div>
  </div>

  <div class="sec-head" style="margin-top: 14px;">[서명 및 날인]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 14%;">사업자</th>
      <td class="typed-val">아레나 피트니스 강남본점 (대표 박진우) &nbsp; 사업자번호 214-85-12345</td>
      <td style="width: 18%; text-align: center;"><span class="stamp-sq">아레나<br>피트니스</span></td>
    </tr>
    <tr>
      <th>회 원</th>
      <td class="typed-val">김 민 수 (위 약관 설명을 듣고 확인하였습니다)</td>
      <td style="text-align: center;"><span class="stamp-red">김민수</span></td>
    </tr>
  </table>

  <div class="doc-footer-meta">
    <span>공정거래위원회 체력단련장 이용 표준약관 제10037호 준용</span>
    <span>문서확인코드: FTC-GYM-2026-9921</span>
    <span>1 / 1 쪽 (계약서 사본)</span>
  </div>
</div>
</body>
</html>
  `;

  await page.setContent(gymHtml, { waitUntil: "networkidle" });
  await page.locator(".scanner-page").screenshot({ path: path.join(process.cwd(), "public/samples/scanned_gym_contract.png") });
  console.log("Rendered scanned gym contract");

  // 2. Tax receipt scan
  const taxHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
  body {
    margin: 0; padding: 24px; background: #e9eaec;
    font-family: "Pretendard Variable", -apple-system, sans-serif;
    display: flex; justify-content: center;
  }
  .scanner-page {
    width: 820px; background: #faf9f6;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
    position: relative; padding: 40px 48px; box-sizing: border-box;
    border: 1px solid #d4d2cb; transform: rotate(-0.1deg);
    filter: contrast(102%) brightness(99%);
  }
  .header-tag {
    font-size: 11px; color: #00704a; border: 1px dashed #73bda3;
    padding: 4px 8px; text-align: center; margin-bottom: 12px; background: #f3fcf8;
  }
  .title-row {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px;
  }
  .doc-title { font-size: 24px; font-weight: 900; letter-spacing: 1.5px; color: #111; }
  .parties-lead {
    font-size: 13px; font-weight: 600; padding: 6px 12px;
    background: #f3f2ee; border: 1px solid #d5d3ca; margin-bottom: 14px;
  }
  .sec-head { font-size: 14px; font-weight: 800; margin: 12px 0 6px; color: #1a1a1a; }
  table.ct-table {
    width: 100%; border-collapse: collapse; font-size: 12.5px;
    margin-bottom: 10px; background: #fff;
  }
  table.ct-table th, table.ct-table td {
    border: 1px solid #666; padding: 6px 8px; line-height: 1.4;
  }
  table.ct-table th { background: #edece8; font-weight: 700; text-align: center; color: #222; }
  .typed-val { font-family: "Nanum Myeongjo", "Batang", serif; font-size: 13px; color: #0b1a30; font-weight: 600; }
  .clause-box-real {
    border: 2px solid #333; padding: 12px 16px; font-size: 12.5px;
    line-height: 1.65; background: #fff; margin-top: 6px;
  }
  .clause-item { margin-bottom: 6px; position: relative; padding: 2px 4px; }
  .clause-highlight-safe { background: rgba(40, 167, 69, 0.10); border-left: 3px solid #28a745; }
  .clause-highlight-caution { background: rgba(255, 193, 7, 0.15); border-left: 3px solid #ffc107; }
  .stamp-sq {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; border: 2px solid #00704a; color: #00704a;
    font-size: 10px; font-weight: 900; transform: rotate(-2deg);
    line-height: 1.1; text-align: center; background: rgba(0, 112, 74, 0.05);
  }
  .doc-footer-meta { margin-top: 14px; font-size: 11px; color: #777; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="scanner-page">
  <div class="header-tag">조세특례제한법 제95조의2 · 국세청 홈택스 주택임차료(월세) 연말정산 공제 서식</div>
  <div class="title-row">
    <div class="doc-title">주택임차료(월세) 세액공제 신청 및 이체확인서</div>
    <div style="font-size: 12px; color: #555;">발급번호: NTS-2026-RENT-5501</div>
  </div>

  <div class="parties-lead">
    신청인( <strong>박서연</strong> · 무주택 단독 세대주 )의 주택임차료 계좌이체 및 세액공제 적격 명세서
  </div>

  <div class="sec-head">[소득 및 기본 요건]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 16%;">신 청 인</th>
      <td style="width: 34%;" class="typed-val">박 서 연 (주민번호 921103-2345678)</td>
      <th style="width: 16%;">세대주 여부</th>
      <td>무주택 단독 세대주 (적격)</td>
    </tr>
    <tr>
      <th>근로자 총급여</th>
      <td class="typed-val">58,000,000 원 (8천만원 이하 요건 충족)</td>
      <th>적용 공제율</th>
      <td class="typed-val" style="color: #00704a; font-weight: 800;">15 % (지방소득세 별도)</td>
    </tr>
  </table>

  <div class="sec-head">[임차 주택 및 월세 이체 명세]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 16%;">소 재 지</th>
      <td colspan="3" class="typed-val">서울특별시 마포구 백범로 35, 101동 804호 (주거용 오피스텔)</td>
    </tr>
    <tr>
      <th>전용면적</th>
      <td>59.80 ㎡ (국민주택규모 85㎡ 이하)</td>
      <th>기준시가</th>
      <td>2억 8,000만 원 (4억원 이하 요건 충족)</td>
    </tr>
    <tr>
      <th>월세 지급액</th>
      <td class="typed-val">매월 750,000 원 (연간 총 9,000,000 원)</td>
      <th>이체 일자</th>
      <td>매월 25일 (신한은행 110-332-887766)</td>
    </tr>
  </table>

  <div class="sec-head">[세액공제 산출 및 홈택스 제출 가이드]</div>
  <div class="clause-box-real">
    <div class="clause-item clause-highlight-safe">
      <strong>1. 법정 공제 산출:</strong> 연간 월세 지급 총액 9,000,000원 × 공제율 15% = <strong>연간 1,350,000원</strong> 소득세 직접 환급 (지방소득세 10% 포함 시 총 1,485,000원 세금 절감)
    </div>
    <div class="clause-item clause-highlight-safe">
      <strong>2. 공제 한도 준수:</strong> 조세특례제한법상 연간 월세 공제 한도 1,000만 원 이내로 전액 공제 대상에 해당함.
    </div>
    <div class="clause-item clause-highlight-caution">
      <strong>3. 필수 제출 서류 (임대인 동의 불필요):</strong> ① 주민등록표 등본(임대차계약서상 주소지 전입신고 필수), ② 임대차계약서 사본, ③ 계좌이체 영수증(무통장입금증)을 홈택스 간소화에 첨부 제출.
    </div>
  </div>

  <div class="sec-head" style="margin-top: 14px;">[국세청 연말정산 신고 검증]</div>
  <table class="ct-table">
    <tr>
      <th style="width: 20%;">검증 기관</th>
      <td class="typed-val">국세청 홈택스 (연말정산 간소화 연계 검증)</td>
      <td style="width: 18%; text-align: center;"><span class="stamp-sq">국세청<br>홈택스</span></td>
    </tr>
  </table>

  <div class="doc-footer-meta">
    <span>조세특례제한법 제95조의2 제1항 준용</span>
    <span>신고확인일자: 2026-11-02</span>
    <span>1 / 1 쪽 (발급본)</span>
  </div>
</div>
</body>
</html>
  `;

  await page.setContent(taxHtml, { waitUntil: "networkidle" });
  await page.locator(".scanner-page").screenshot({ path: path.join(process.cwd(), "public/samples/scanned_tax_receipt.png") });
  console.log("Rendered scanned tax receipt");

  await browser.close();
})();
'