/**
 * 법제처 국가법령정보 공동활용 OpenAPI (open.law.go.kr) 실시간 연동 모듈.
 * - 현행 법령(target=law) 조문 및 시행일자·공포번호 조회
 * - 행정규칙(target=admrul) 고시 메타데이터 조회
 * - 대법원 판례(target=prec) 검색 및 판시사항·판결요지 조회
 */

export interface LiveStatuteInfo {
  lawName: string;
  article: string;
  ministry: string;
  effectiveDate: string;
  proclamationNo: string;
  articleText: string;
  officialUrl: string;
  sourceType: 'law' | 'admrul';
}

export interface LivePrecedentInfo {
  id: string;
  caseNumber: string;
  caseName: string;
  courtName: string;
  decisionDate: string;
  summary: string;
  officialUrl: string;
}

export interface LawLookupResponse {
  itemId: string;
  fetchedAt: string;
  oc: string;
  liveConnected: boolean;
  statute: LiveStatuteInfo;
  precedents: LivePrecedentInfo[];
}

interface ItemLawMapping {
  target: 'law' | 'admrul';
  lawId: string;
  jo?: string;
  lawName: string;
  articleLabel: string;
  ministryFallback: string;
  precQuery: string;
}

const ITEM_LAW_MAP: Record<string, ItemLawMapping> = {
  no_new_mortgage: {
    target: 'law',
    lawId: '001248',
    jo: '000300',
    lawName: '주택임대차보호법',
    articleLabel: '제3조(대항력 등)',
    ministryFallback: '법무부',
    precQuery: '주택임대차보호법 대항력 근저당권',
  },
  move_in_and_fixed_date: {
    target: 'law',
    lawId: '001248',
    jo: '000302',
    lawName: '주택임대차보호법',
    articleLabel: '제3조의2(보증금의 회수)',
    ministryFallback: '법무부',
    precQuery: '주택임대차보호법 전입신고 확정일자 우선변제권',
  },
  landlord_info: {
    target: 'law',
    lawId: '001248',
    jo: '000307',
    lawName: '주택임대차보호법',
    articleLabel: '제3조의7(임대인의 정보 제시 의무)',
    ministryFallback: '법무부',
    precQuery: '임대차보증금 국세 우선',
  },
  deposit_return: {
    target: 'law',
    lawId: '001248',
    jo: '000400',
    lawName: '주택임대차보호법',
    articleLabel: '제4조(임대차기간 등)',
    ministryFallback: '법무부',
    precQuery: '임대차보증금 반환 동시이행',
  },
  term_two_years: {
    target: 'law',
    lawId: '001248',
    jo: '000400',
    lawName: '주택임대차보호법',
    articleLabel: '제4조(임대차기간 등)',
    ministryFallback: '법무부',
    precQuery: '주택임대차보호법 제4조 임대차기간',
  },
  renewal_right: {
    target: 'law',
    lawId: '001248',
    jo: '000603',
    lawName: '주택임대차보호법',
    articleLabel: '제6조의3(계약갱신 요구 등)',
    ministryFallback: '법무부',
    precQuery: '주택임대차 계약갱신요구',
  },
  rent_increase: {
    target: 'law',
    lawId: '001248',
    jo: '000700',
    lawName: '주택임대차보호법',
    articleLabel: '제7조(차임 등의 증감청구권)',
    ministryFallback: '법무부',
    precQuery: '차임 증액 청구',
  },
  early_exit: {
    target: 'law',
    lawId: '001248',
    jo: '000602',
    lawName: '주택임대차보호법',
    articleLabel: '제6조의2(묵시적 갱신의 경우 계약의 해지)',
    ministryFallback: '법무부',
    precQuery: '주택임대차 묵시적 갱신 해지',
  },
  repair_duty: {
    target: 'law',
    lawId: '001706',
    jo: '062300',
    lawName: '민법',
    articleLabel: '제623조(임대인의 의무)',
    ministryFallback: '법무부',
    precQuery: '임대인 수선의무 파손',
  },
  restoration: {
    target: 'law',
    lawId: '001706',
    jo: '061500',
    lawName: '민법',
    articleLabel: '제615조(차주의 원상회복의무와 철거권)',
    ministryFallback: '법무부',
    precQuery: '임대차 원상회복 보증금',
  },
  owner_change: {
    target: 'law',
    lawId: '001248',
    jo: '000300',
    lawName: '주택임대차보호법',
    articleLabel: '제3조 제4항(임차주택 양수인의 지위 승계)',
    ministryFallback: '법무부',
    precQuery: '임차주택 양수인 임대인 지위 승계',
  },
  refund_allowed: {
    target: 'law',
    lawId: '000354',
    jo: '003100',
    lawName: '방문판매 등에 관한 법률',
    articleLabel: '제31조(계속거래 계약의 해지)',
    ministryFallback: '공정거래위원회',
    precQuery: '방문판매 계속거래 계약 해지 위약금',
  },
  penalty_rate: {
    target: 'law',
    lawId: '000667',
    jo: '000800',
    lawName: '약관의 규제에 관한 법률',
    articleLabel: '제8조(손해배상액의 예정)',
    ministryFallback: '공정거래위원회',
    precQuery: '약관규제법 과다한 손해배상액 예정 무효',
  },
  price_basis: {
    target: 'law',
    lawId: '000354',
    jo: '003200',
    lawName: '방문판매 등에 관한 법률',
    articleLabel: '제32조(계약 해지 또는 해제의 효과와 위약금 등)',
    ministryFallback: '공정거래위원회',
    precQuery: '계속거래 해지 환급 위약금',
  },
  before_start: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '체력단련장업 (개시일 이전 해지)',
    ministryFallback: '공정거래위원회',
    precQuery: '약관규제법 계약 해지 환불',
  },
  business_fault: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '체력단련장업 (사업자 귀책사유 계약해제)',
    ministryFallback: '공정거래위원회',
    precQuery: '이용계약 해제 손해배상 환급',
  },
  ad_mismatch: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '체력단련장업 (계약내용·광고와 실제가 다른 경우)',
    ministryFallback: '공정거래위원회',
    precQuery: '표시 광고 계약 해제 환급',
  },
  gift_return: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '소비자분쟁해결기준 (사은품 반환 기준)',
    ministryFallback: '공정거래위원회',
    precQuery: '계약 해지 원상회복 반환',
  },
};

const CACHE = new Map<string, { expiresAt: number; data: LawLookupResponse }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function formatDateStr(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
  }
  return raw;
}

function cleanHtml(raw?: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchStatute(oc: string, mapping: ItemLawMapping): Promise<{ statute: LiveStatuteInfo; connected: boolean }> {
  try {
    if (mapping.target === 'law' && mapping.jo) {
      const url = `https://www.law.go.kr/DRF/lawService.do?OC=${encodeURIComponent(oc)}&target=law&ID=${mapping.lawId}&JO=${mapping.jo}&type=JSON`;
      const data = await fetchJsonWithTimeout(url);
      const basic = data?.법령?.기본정보;
      const unitRaw = data?.법령?.조문?.조문단위;
      const unit = Array.isArray(unitRaw) ? unitRaw[0] : unitRaw;

      if (basic && unit) {
        const paragraphs: string[] = [];
        if (typeof unit.조문내용 === 'string') {
          paragraphs.push(unit.조문내용.trim());
        }
        const hangList = Array.isArray(unit.항) ? unit.항 : unit.항 ? [unit.항] : [];
        for (const h of hangList) {
          if (typeof h?.항내용 === 'string') {
            paragraphs.push(h.항내용.trim());
          }
          const hoList = Array.isArray(h?.호) ? h.호 : h?.호 ? [h.호] : [];
          for (const ho of hoList) {
            if (typeof ho?.호내용 === 'string') {
              paragraphs.push(`  ${ho.호내용.trim()}`);
            }
          }
        }

        const lawName = basic.법령명_한글 || mapping.lawName;
        const ministry = basic.소관부처?.content || mapping.ministryFallback;
        const effectiveDate = formatDateStr(basic.시행일자);
        const proclamationNo = basic.공포번호 ? `법률 제${basic.공포번호}호` : '';

        return {
          connected: true,
          statute: {
            lawName,
            article: mapping.articleLabel,
            ministry,
            effectiveDate,
            proclamationNo,
            articleText: paragraphs.join('\n'),
            officialUrl: `https://www.law.go.kr/법령/${encodeURIComponent(lawName)}`,
            sourceType: 'law',
          },
        };
      }
    }

    // 행정규칙(소비자분쟁해결기준) 조회
    const admUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(oc)}&target=admrul&type=JSON&query=${encodeURIComponent(mapping.lawName)}`;
    const admData = await fetchJsonWithTimeout(admUrl);
    const admRaw = admData?.AdmRulSearch?.admrul;
    const adm = Array.isArray(admRaw) ? admRaw[0] : admRaw;
    if (adm) {
      return {
        connected: true,
        statute: {
          lawName: adm.행정규칙명 || mapping.lawName,
          article: mapping.articleLabel,
          ministry: adm.소관부처명 || mapping.ministryFallback,
          effectiveDate: formatDateStr(adm.시행일자),
          proclamationNo: adm.발령번호 ? `${adm.소관부처명 || '공정거래위원회'}고시 제${adm.발령번호}호` : '',
          articleText: '',
          officialUrl: `https://www.law.go.kr/행정규칙/${encodeURIComponent(adm.행정규칙명 || mapping.lawName)}`,
          sourceType: 'admrul',
        },
      };
    }
  } catch {
    // 네트워크 또는 IP 제한 시 폴백
  }

  return {
    connected: false,
    statute: {
      lawName: mapping.lawName,
      article: mapping.articleLabel,
      ministry: mapping.ministryFallback,
      effectiveDate: '현행',
      proclamationNo: '',
      articleText: '',
      officialUrl: `https://www.law.go.kr/법령/${encodeURIComponent(mapping.lawName)}`,
      sourceType: mapping.target,
    },
  };
}

async function fetchPrecedents(oc: string, precQuery: string): Promise<LivePrecedentInfo[]> {
  try {
    const searchUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${encodeURIComponent(oc)}&target=prec&type=JSON&curt=${encodeURIComponent('대법원')}&search=2&display=2&query=${encodeURIComponent(precQuery)}`;
    const searchData = await fetchJsonWithTimeout(searchUrl);
    const rawList = searchData?.PrecSearch?.prec;
    const list = (Array.isArray(rawList) ? rawList : rawList ? [rawList] : []).slice(0, 2);

    const details = await Promise.all(
      list.map(async (item: any) => {
        const id = String(item.판례일련번호 || '');
        const caseNumber = String(item.사건번호 || '');
        const caseName = String(item.사건명 || '');
        const courtName = String(item.법원명 || item.데이터출처명 || '대법원');
        const decisionDate = formatDateStr(String(item.선고일자 || ''));

        let summary = '';
        if (id) {
          try {
            const detailUrl = `https://www.law.go.kr/DRF/lawService.do?OC=${encodeURIComponent(oc)}&target=prec&ID=${encodeURIComponent(id)}&type=JSON`;
            const detailData = await fetchJsonWithTimeout(detailUrl, 3500);
            const svc = detailData?.PrecService;
            const rawSummary = cleanHtml(svc?.판결요지 || svc?.판시사항 || '');
            summary = rawSummary.length > 320 ? `${rawSummary.slice(0, 320).trim()}…` : rawSummary;
          } catch {
            summary = '';
          }
        }

        return {
          id,
          caseNumber,
          caseName,
          courtName,
          decisionDate,
          summary,
          officialUrl: `https://www.law.go.kr/판례/(${encodeURIComponent(caseNumber)})`,
        };
      }),
    );

    return details.filter((d) => d.caseNumber);
  } catch {
    return [];
  }
}

export async function lookupLawByItemId(itemId: string): Promise<LawLookupResponse> {
  const cached = CACHE.get(itemId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const oc = process.env.LAW_API_OC || 'tripleyoung';
  const mapping = ITEM_LAW_MAP[itemId] ?? ITEM_LAW_MAP.no_new_mortgage;

  const [{ statute, connected }, precedents] = await Promise.all([
    fetchStatute(oc, mapping),
    fetchPrecedents(oc, mapping.precQuery),
  ]);

  const response: LawLookupResponse = {
    itemId,
    fetchedAt: new Date().toISOString(),
    oc,
    liveConnected: connected || precedents.length > 0,
    statute,
    precedents,
  };

  if (response.liveConnected) {
    CACHE.set(itemId, { expiresAt: Date.now() + CACHE_TTL_MS, data: response });
  }

  return response;
}
