/**
 * 법제처 국가법령정보 공동활용 OpenAPI (open.law.go.kr) 실시간 연동 모듈.
 * - 1순위: OKE 클러스터에 배포된 Rust Law MCP 멀티플렉서 (`https://webrtc.ugot.uk/law/mcp`, JSON-RPC 2.0 `tools/call`)
 * - 2순위: 로컬 Rust `law-mcp` 바이너리 (`mcp/law-mcp-rs/target/release/law-mcp`)
 * - 3순위: 직접 DRF OpenAPI 호출 및 실측 스냅샷(`LAW_OPENAPI_SNAPSHOT`) 폴백
 */

import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { LAW_OPENAPI_SNAPSHOT } from './law-snapshot.js';

export const DEFAULT_OKE_LAW_MCP_URL = 'https://webrtc.ugot.uk/law/mcp';

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
  engine?: string;
  mcpEndpoint?: string;
  liveConnected: boolean;
  statute: LiveStatuteInfo;
  precedents: LivePrecedentInfo[];
}

interface ItemLawMapping {
  target: 'law' | 'admrul';
  lawId: string;
  jo?: string;
  articlePrefix?: string;
  lawName: string;
  articleLabel: string;
  ministryFallback: string;
  precQuery: string;
  mcpPrecKeyword: string;
}

const ITEM_LAW_MAP: Record<string, ItemLawMapping> = {
  no_new_mortgage: {
    target: 'law',
    lawId: '001248',
    jo: '000300',
    articlePrefix: '제3조(',
    lawName: '주택임대차보호법',
    articleLabel: '제3조(대항력 등)',
    ministryFallback: '법무부',
    precQuery: '주택임대차보호법 대항력 근저당권',
    mcpPrecKeyword: '임대차보증금',
  },
  move_in_and_fixed_date: {
    target: 'law',
    lawId: '001248',
    jo: '000302',
    articlePrefix: '제3조의2',
    lawName: '주택임대차보호법',
    articleLabel: '제3조의2(보증금의 회수)',
    ministryFallback: '법무부',
    precQuery: '주택임대차보호법 전입신고 확정일자 우선변제권',
    mcpPrecKeyword: '배당이의',
  },
  landlord_info: {
    target: 'law',
    lawId: '001248',
    jo: '000307',
    articlePrefix: '제3조의7',
    lawName: '주택임대차보호법',
    articleLabel: '제3조의7(임대인의 정보 제시 의무)',
    ministryFallback: '법무부',
    precQuery: '임대차보증금 국세 우선',
    mcpPrecKeyword: '보증금반환',
  },
  deposit_return: {
    target: 'law',
    lawId: '001248',
    jo: '000400',
    articlePrefix: '제4조(',
    lawName: '주택임대차보호법',
    articleLabel: '제4조(임대차기간 등)',
    ministryFallback: '법무부',
    precQuery: '임대차보증금 반환 동시이행',
    mcpPrecKeyword: '보증금반환',
  },
  term_two_years: {
    target: 'law',
    lawId: '001248',
    jo: '000400',
    articlePrefix: '제4조(',
    lawName: '주택임대차보호법',
    articleLabel: '제4조(임대차기간 등)',
    ministryFallback: '법무부',
    precQuery: '주택임대차보호법 제4조 임대차기간',
    mcpPrecKeyword: '임대차보증금',
  },
  renewal_right: {
    target: 'law',
    lawId: '001248',
    jo: '000603',
    articlePrefix: '제6조의3',
    lawName: '주택임대차보호법',
    articleLabel: '제6조의3(계약갱신 요구 등)',
    ministryFallback: '법무부',
    precQuery: '주택임대차 계약갱신요구',
    mcpPrecKeyword: '건물인도',
  },
  rent_increase: {
    target: 'law',
    lawId: '001248',
    jo: '000700',
    articlePrefix: '제7조(',
    lawName: '주택임대차보호법',
    articleLabel: '제7조(차임 등의 증감청구권)',
    ministryFallback: '법무부',
    precQuery: '차임 증액 청구',
    mcpPrecKeyword: '차임',
  },
  early_exit: {
    target: 'law',
    lawId: '001248',
    jo: '000602',
    articlePrefix: '제6조의2',
    lawName: '주택임대차보호법',
    articleLabel: '제6조의2(묵시적 갱신의 경우 계약의 해지)',
    ministryFallback: '법무부',
    precQuery: '주택임대차 묵시적 갱신 해지',
    mcpPrecKeyword: '임대차보증금',
  },
  repair_duty: {
    target: 'law',
    lawId: '001706',
    jo: '062300',
    articlePrefix: '제623조',
    lawName: '민법',
    articleLabel: '제623조(임대인의 의무)',
    ministryFallback: '법무부',
    precQuery: '임대인 수선의무 파손',
    mcpPrecKeyword: '손해배상',
  },
  restoration: {
    target: 'law',
    lawId: '001706',
    jo: '061500',
    articlePrefix: '제615조',
    lawName: '민법',
    articleLabel: '제615조(차주의 원상회복의무와 철거권)',
    ministryFallback: '법무부',
    precQuery: '임대차 원상회복 보증금',
    mcpPrecKeyword: '건물인도',
  },
  owner_change: {
    target: 'law',
    lawId: '001248',
    jo: '000300',
    articlePrefix: '제3조(',
    lawName: '주택임대차보호법',
    articleLabel: '제3조 제4항(임차주택 양수인의 지위 승계)',
    ministryFallback: '법무부',
    precQuery: '임차주택 양수인 임대인 지위 승계',
    mcpPrecKeyword: '임대차보증금',
  },
  refund_allowed: {
    target: 'law',
    lawId: '000354',
    jo: '003100',
    articlePrefix: '제31조(',
    lawName: '방문판매 등에 관한 법률',
    articleLabel: '제31조(계속거래 계약의 해지)',
    ministryFallback: '공정거래위원회',
    precQuery: '방문판매 계속거래 계약 해지 위약금',
    mcpPrecKeyword: '부당이득',
  },
  penalty_rate: {
    target: 'law',
    lawId: '000667',
    jo: '000800',
    articlePrefix: '제8조(',
    lawName: '약관의 규제에 관한 법률',
    articleLabel: '제8조(손해배상액의 예정)',
    ministryFallback: '공정거래위원회',
    precQuery: '약관규제법 과다한 손해배상액 예정 무효',
    mcpPrecKeyword: '약관',
  },
  price_basis: {
    target: 'law',
    lawId: '000354',
    jo: '003200',
    articlePrefix: '제32조(',
    lawName: '방문판매 등에 관한 법률',
    articleLabel: '제32조(계약 해지 또는 해제의 효과와 위약금 등)',
    ministryFallback: '공정거래위원회',
    precQuery: '계속거래 해지 환급 위약금',
    mcpPrecKeyword: '부당이득',
  },
  before_start: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '체력단련장업 (개시일 이전 해지)',
    ministryFallback: '공정거래위원회',
    precQuery: '약관규제법 계약 해지 환불',
    mcpPrecKeyword: '약관',
  },
  business_fault: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '체력단련장업 (사업자 귀책사유 계약해제)',
    ministryFallback: '공정거래위원회',
    precQuery: '이용계약 해제 손해배상 환급',
    mcpPrecKeyword: '손해배상',
  },
  ad_mismatch: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '체력단련장업 (계약내용·광고와 실제가 다른 경우)',
    ministryFallback: '공정거래위원회',
    precQuery: '표시 광고 계약 해제 환급',
    mcpPrecKeyword: '손해배상',
  },
  gift_return: {
    target: 'admrul',
    lawId: '2100000270136',
    lawName: '소비자분쟁해결기준',
    articleLabel: '소비자분쟁해결기준 (사은품 반환 기준)',
    ministryFallback: '공정거래위원회',
    precQuery: '계약 해지 원상회복 반환',
    mcpPrecKeyword: '부당이득',
  },
  tax_rent_credit: {
    target: 'law',
    lawId: '001584',
    articlePrefix: '제95조의2(',
    lawName: '조세특례제한법',
    articleLabel: '제95조의2(월세액에 대한 세액공제)',
    ministryFallback: '기획재정부',
    precQuery: '조세특례제한법 월세 세액공제 주택임대차',
    mcpPrecKeyword: '종합소득세',
  },
  tax_vat_deductible: {
    target: 'law',
    lawId: '001571',
    articlePrefix: '제38조(',
    lawName: '부가가치세법',
    articleLabel: '제38조(공제하는 매입세액)',
    ministryFallback: '기획재정부',
    precQuery: '부가가치세법 제38조 매입세액 공제',
    mcpPrecKeyword: '부가가치세',
  },
  tax_vat_non_deductible: {
    target: 'law',
    lawId: '001571',
    articlePrefix: '제39조(',
    lawName: '부가가치세법',
    articleLabel: '제39조(공제하지 아니하는 매입세액)',
    ministryFallback: '기획재정부',
    precQuery: '부가가치세법 제39조 매입세액 불공제',
    mcpPrecKeyword: '부가가치세',
  },
  tax_income_expense: {
    target: 'law',
    lawId: '001565',
    articlePrefix: '제27조(',
    lawName: '소득세법',
    articleLabel: '제27조(사업소득의 필요경비의 계산)',
    ministryFallback: '기획재정부',
    precQuery: '소득세법 제27조 필요경비 산입',
    mcpPrecKeyword: '종합소득세',
  },
  tax_personal_disallowed: {
    target: 'law',
    lawId: '001565',
    articlePrefix: '제33조(',
    lawName: '소득세법',
    articleLabel: '제33조(필요경비 불산입)',
    ministryFallback: '기획재정부',
    precQuery: '소득세법 제33조 가사경비 필요경비 불산입',
    mcpPrecKeyword: '종합소득세',
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

function extractArticleParagraphs(unit: any): string {
  const paragraphs: string[] = [];
  if (typeof unit?.조문내용 === 'string') {
    paragraphs.push(unit.조문내용.trim());
  }
  const hangList = Array.isArray(unit?.항) ? unit.항 : unit?.항 ? [unit.항] : [];
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
  return paragraphs.join('\n');
}

async function callMcpTool(mcpEndpoint: string, name: string, args: Record<string, unknown>, timeoutMs = 4500): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(mcpEndpoint, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    });
    if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
    const rpc = await res.json();
    const text = rpc?.result?.content?.[0]?.text;
    if (typeof text !== 'string' || text.startsWith('Error ')) {
      throw new Error(text || 'Empty MCP tool output');
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 1순위: OKE 클러스터에 떠 있는 Rust Law MCP 서버 (`https://webrtc.ugot.uk/law/mcp`) 호출
 */
async function tryOkeRustLawMcp(itemId: string, mapping: ItemLawMapping, snapshot?: { statute: LiveStatuteInfo; precedents: LivePrecedentInfo[] }): Promise<LawLookupResponse | null> {
  const mcpEndpoint = process.env.LAW_MCP_HTTP_URL || DEFAULT_OKE_LAW_MCP_URL;
  try {
    let statute: LiveStatuteInfo | null = null;

    if (mapping.target === 'law') {
      const lawData = await callMcpTool(mcpEndpoint, 'get_law', { law_id: mapping.lawId }, 5000);
      const basic = lawData?.법령?.기본정보;
      const unitsRaw = lawData?.법령?.조문?.조문단위;
      const units: any[] = Array.isArray(unitsRaw) ? unitsRaw : unitsRaw ? [unitsRaw] : [];
      const matchedUnit =
        units.find((u) => typeof u?.조문내용 === 'string' && mapping.articlePrefix && u.조문내용.trim().startsWith(mapping.articlePrefix)) ||
        units[0];

      if (basic && matchedUnit) {
        const lawName = basic.법령명_한글 || mapping.lawName;
        const ministry = basic.소관부처?.content || mapping.ministryFallback;
        const effectiveDate = formatDateStr(basic.시행일자);
        const proclamationNo = basic.공포번호 ? `법률 제${basic.공포번호}호` : '';
        statute = {
          lawName,
          article: mapping.articleLabel,
          ministry,
          effectiveDate,
          proclamationNo,
          articleText: extractArticleParagraphs(matchedUnit),
          officialUrl: `https://www.law.go.kr/법령/${encodeURIComponent(lawName)}`,
          sourceType: 'law',
        };
      }
    } else {
      const admData = await callMcpTool(mcpEndpoint, 'search_admin_rule', { query: mapping.lawName }, 4500);
      const admRaw = admData?.AdmRulSearch?.admrul;
      const adm = Array.isArray(admRaw) ? admRaw[0] : admRaw;
      if (adm) {
        statute = {
          lawName: adm.행정규칙명 || mapping.lawName,
          article: mapping.articleLabel,
          ministry: adm.소관부처명 || mapping.ministryFallback,
          effectiveDate: formatDateStr(adm.시행일자),
          proclamationNo: adm.발령번호 ? `${adm.소관부처명 || '공정거래위원회'}고시 제${adm.발령번호}호` : '',
          articleText: '',
          officialUrl: `https://www.law.go.kr/행정규칙/${encodeURIComponent(adm.행정규칙명 || mapping.lawName)}`,
          sourceType: 'admrul',
        };
      }
    }

    if (!statute) return null;

    // 대법원 판례도 OKE Law MCP (`search_precedent` + `get_precedent`)로 조회하되,
    // 본문 검색 판례 스냅샷이 더 정밀한 경우 보강
    let precedents: LivePrecedentInfo[] = snapshot?.precedents ?? [];
    if (precedents.length === 0) {
      try {
        const precSearch = await callMcpTool(mcpEndpoint, 'search_precedent', { query: mapping.mcpPrecKeyword, page: 1 }, 4000);
        const rawList = precSearch?.PrecSearch?.prec;
        const list = (Array.isArray(rawList) ? rawList : rawList ? [rawList] : [])
          .filter((p: any) => p?.법원명 === '대법원' || p?.데이터출처명 === '대법원')
          .slice(0, 2);
        precedents = list.map((p: any) => ({
          id: String(p.판례일련번호 || ''),
          caseNumber: String(p.사건번호 || ''),
          caseName: String(p.사건명 || ''),
          courtName: '대법원',
          decisionDate: formatDateStr(String(p.선고일자 || '')),
          summary: '',
          officialUrl: `https://www.law.go.kr/판례/(${encodeURIComponent(String(p.사건번호 || ''))})`,
        }));
      } catch {
        precedents = [];
      }
    }

    return {
      itemId,
      fetchedAt: new Date().toISOString(),
      oc: process.env.LAW_API_OC || 'tripleyoung',
      engine: 'oke-rust-law-mcp',
      mcpEndpoint,
      liveConnected: true,
      statute,
      precedents,
    };
  } catch {
    return null;
  }
}

async function tryLocalRustLawMcp(itemId: string): Promise<LawLookupResponse | null> {
  const binPath = resolve(process.cwd(), 'mcp/law-mcp-rs/target/release/law-mcp');
  if (!existsSync(binPath)) return null;

  return new Promise((resolvePromise) => {
    execFile(binPath, ['--inspect', itemId], { timeout: 4500 }, (err, stdout) => {
      if (err || !stdout) return resolvePromise(null);
      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed && parsed.statute && parsed.liveConnected) {
          resolvePromise({
            itemId,
            fetchedAt: new Date().toISOString(),
            oc: parsed.oc || 'tripleyoung',
            engine: 'local-rust-law-mcp',
            liveConnected: true,
            statute: parsed.statute,
            precedents: parsed.precedents || [],
          });
          return;
        }
      } catch {
        // ignore parse error
      }
      resolvePromise(null);
    });
  });
}

export async function lookupLawByItemId(itemId: string): Promise<LawLookupResponse> {
  const cached = CACHE.get(itemId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const mapping = ITEM_LAW_MAP[itemId] ?? ITEM_LAW_MAP.no_new_mortgage;
  const snapshot = LAW_OPENAPI_SNAPSHOT[itemId] ?? LAW_OPENAPI_SNAPSHOT.no_new_mortgage;

  // 1순위: OKE 클러스터에 배포된 Rust Law MCP (`https://webrtc.ugot.uk/law/mcp`) 호출
  const okeMcpResult = await tryOkeRustLawMcp(itemId, mapping, snapshot);
  if (okeMcpResult) {
    CACHE.set(itemId, { expiresAt: Date.now() + CACHE_TTL_MS, data: okeMcpResult });
    return okeMcpResult;
  }

  // 2순위: 로컬 빌드된 Rust law-mcp 바이너리 호출
  const localMcpResult = await tryLocalRustLawMcp(itemId);
  if (localMcpResult) {
    CACHE.set(itemId, { expiresAt: Date.now() + CACHE_TTL_MS, data: localMcpResult });
    return localMcpResult;
  }

  // 3순위: 실측 OpenAPI 스냅샷 폴백
  const fallback: LawLookupResponse = {
    itemId,
    fetchedAt: new Date().toISOString(),
    oc: process.env.LAW_API_OC || 'tripleyoung',
    engine: 'law-mcp-snapshot',
    mcpEndpoint: DEFAULT_OKE_LAW_MCP_URL,
    liveConnected: false,
    statute: snapshot.statute,
    precedents: snapshot.precedents,
  };

  CACHE.set(itemId, { expiresAt: Date.now() + CACHE_TTL_MS, data: fallback });
  return fallback;
}
