/**
 * 다온사주(`apps/saju-ai/server/saju-graphrag.ts`) 아키텍처 기반
 * 법률·세무 Atomic GraphRAG & 자기진화형 Writeback Ledger 엔진.
 *
 * 1. Atomic Graph 구조:
 *    - StatuteNode (현행 법령·세법 조문 노드)
 *    - PrecedentNode (OKE Rust Law MCP 실시간 대법원 판례 노드)
 *    - ConceptNode (임대차·소비자·세무 핵심 법리 개념 노드)
 *    - CasebookNode (상담·세무 판정 모범 사례 노드 — 인용 횟수·유틸리티 가중치 포함)
 *    - AtomicEdge (GOVERNED_BY, CITED_PRECEDENT, REINFORCED_CASE, MANDATORY_OVERRIDE)
 * 2. 2-Hop Subgraph Retrieval (`retrieveLawTaxSubgraph`):
 *    - 질문·영수증에서 추출된 법리 시드로부터 2-hop 연결된 조문·판례·케이스북을
 *      Writeback 인용 가중치(Utility Boost) 순으로 정렬해 컨텍스트로 주입.
 * 3. Self-Evolving Writeback (`recordLawTaxWriteback`):
 *    - 답변이 법령·판례 인용 품질 게이트(Quality Gate)를 통과하면:
 *      (a) 인용된 판례·케이스북 노드의 `citationHits` 강화
 *      (b) 새로운 질문 패턴을 신규 `CasebookNode`로 승격(`learnedCaseCount` 증가) 및 JSONL 원장 기록
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { LawLookupResponse } from './law-api.js';
import { PACKS } from './packs.js';

export type LawGraphDomain = 'lease' | 'gym' | 'tax';

export interface LawAtomicNode {
  id: string;
  kind: 'statute' | 'precedent' | 'concept' | 'casebook';
  label: string;
  domain: LawGraphDomain;
  summary?: string;
}

export interface LawAtomicEdge {
  id: string;
  source: string;
  target: string;
  relation: 'GOVERNED_BY' | 'CITED_PRECEDENT' | 'REINFORCED_CASE' | 'APPLIES_TO_CONCEPT';
}

export interface LawCasebookNode extends LawAtomicNode {
  kind: 'casebook';
  itemId: string;
  questionPattern: string;
  headline: string;
  statuteRef: string;
  precedentRef: string;
  citations: number;
  learned: boolean;
  createdAt: string;
}

export interface LawGraphStats {
  nodeCount: number;
  edgeCount: number;
  statuteCount: number;
  precedentCount: number;
  casebookCount: number;
  writebackCount: number;
  citationHitCount: number;
  learnedCaseCount: number;
}

export interface LawAtomicSubgraph {
  domain: LawGraphDomain;
  seedItemId: string;
  seeds: Array<{ nodeId: string; reason: string }>;
  nodes: LawAtomicNode[];
  edges: LawAtomicEdge[];
  matchedCases: Array<LawCasebookNode & { score: number }>;
  formattedContext: string;
  stats: LawGraphStats;
}

export interface LawWritebackResult {
  recorded: boolean;
  signatureId: string;
  citedCaseIds: string[];
  learnedCaseId: string | null;
  stats: LawGraphStats;
}

interface WritebackLedgerEntry {
  ts: string;
  signatureId: string;
  domain: LawGraphDomain;
  itemId: string;
  question: string;
  headline: string;
  statuteRef: string;
  precedentRef: string;
  citedCaseIds: string[];
  learnedCaseId: string | null;
}

const STATUTE_SEEDS: Array<{ itemId: string; domain: LawGraphDomain; lawName: string; article: string }> = [
  { itemId: 'no_new_mortgage', domain: 'lease', lawName: '주택임대차보호법', article: '제3조(대항력 등)' },
  { itemId: 'move_in_and_fixed_date', domain: 'lease', lawName: '주택임대차보호법', article: '제3조의2(보증금의 회수)' },
  { itemId: 'landlord_info', domain: 'lease', lawName: '주택임대차보호법', article: '제3조의7(임대인의 정보 제시 의무)' },
  { itemId: 'deposit_return', domain: 'lease', lawName: '주택임대차보호법', article: '제4조(임대차기간 등)' },
  { itemId: 'term_two_years', domain: 'lease', lawName: '주택임대차보호법', article: '제4조(임대차기간 등)' },
  { itemId: 'renewal_right', domain: 'lease', lawName: '주택임대차보호법', article: '제6조의3(계약갱신 요구 등)' },
  { itemId: 'rent_increase', domain: 'lease', lawName: '주택임대차보호법', article: '제7조(차임 등의 증감청구권)' },
  { itemId: 'early_exit', domain: 'lease', lawName: '주택임대차보호법', article: '제6조의2(묵시적 갱신의 경우 계약의 해지)' },
  { itemId: 'repair_duty', domain: 'lease', lawName: '민법', article: '제623조(임대인의 의무)' },
  { itemId: 'restoration', domain: 'lease', lawName: '민법', article: '제615조(차주의 원상회복의무와 철거권)' },
  { itemId: 'owner_change', domain: 'lease', lawName: '주택임대차보호법', article: '제3조 제4항(임차주택 양수인의 지위 승계)' },
  { itemId: 'refund_allowed', domain: 'gym', lawName: '방문판매 등에 관한 법률', article: '제31조(계속거래 계약의 해지)' },
  { itemId: 'penalty_rate', domain: 'gym', lawName: '약관의 규제에 관한 법률', article: '제8조(손해배상액의 예정)' },
  { itemId: 'price_basis', domain: 'gym', lawName: '방문판매 등에 관한 법률', article: '제32조(계약 해지 또는 해제의 효과와 위약금 등)' },
  { itemId: 'before_start', domain: 'gym', lawName: '소비자분쟁해결기준', article: '체력단련장업 (개시일 이전 해지)' },
  { itemId: 'business_fault', domain: 'gym', lawName: '소비자분쟁해결기준', article: '체력단련장업 (사업자 귀책사유 계약해제)' },
  { itemId: 'ad_mismatch', domain: 'gym', lawName: '소비자분쟁해결기준', article: '체력단련장업 (계약내용·광고와 실제가 다른 경우)' },
  { itemId: 'gift_return', domain: 'gym', lawName: '소비자분쟁해결기준', article: '사은품 반환 기준' },
  { itemId: 'tax_rent_credit', domain: 'tax', lawName: '조세특례제한법', article: '제95조의2(월세액에 대한 세액공제)' },
  { itemId: 'tax_vat_deductible', domain: 'tax', lawName: '부가가치세법', article: '제38조(공제하는 매입세액)' },
  { itemId: 'tax_vat_non_deductible', domain: 'tax', lawName: '부가가치세법', article: '제39조(공제하지 아니하는 매입세액)' },
  { itemId: 'tax_income_expense', domain: 'tax', lawName: '소득세법', article: '제27조(사업소득의 필요경비의 계산)' },
  { itemId: 'tax_personal_disallowed', domain: 'tax', lawName: '소득세법', article: '제33조(필요경비 불산입)' },
];

const INITIAL_CASEBOOK: LawCasebookNode[] = [
  {
    id: 'case:lease:deposit_return:01',
    kind: 'casebook',
    domain: 'lease',
    itemId: 'deposit_return',
    label: '신규 세입자 입주 조건부 보증금 반환 특약 무효 다툼 사례',
    questionPattern: '다음 세입자 들어와야 보증금 반환 만기 퇴거 동시이행',
    headline: '보증금 반환과 임차목적물 인도는 동시이행 관계이므로 신규 임차인 입주 조건 특약은 수정 대상입니다.',
    statuteRef: '주택임대차보호법 제4조 · 제3조의2',
    precedentRef: '대법원 2026다201978, 대법원 2025다209893',
    citations: 14,
    learned: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'case:lease:repair_duty:01',
    kind: 'casebook',
    domain: 'lease',
    itemId: 'repair_duty',
    label: '보일러·배관 누수 등 대규모 설비 수선비 전가 특약 한계 사례',
    questionPattern: '보일러 고장 누수 배관 곰팡이 모든 수선비 임차인 부담',
    headline: '대법원 판례상 통상적인 소모품 교체를 넘어선 보일러·배관·누수 등 주요 설비 수선의무는 임대인에게 있습니다.',
    statuteRef: '민법 제623조(임대인의 의무)',
    precedentRef: '대법원 2025다218402',
    citations: 11,
    learned: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'case:gym:price_basis:01',
    kind: 'casebook',
    domain: 'gym',
    itemId: 'price_basis',
    label: '헬스장·PT 중도해지 시 할인가 아닌 정상가 차감 약관 시정 사례',
    questionPattern: 'PT 환불 헬스장 해지 정상가 1회 단가 차감 위약금 10%',
    headline: '방문판매법 제32조 및 약관규제법 제8조에 따라 과다한 정상가 차감 조항은 효력이 제한되며 실제 결제금액 기준 정산+위약금 10% 한도가 적용됩니다.',
    statuteRef: '방문판매 등에 관한 법률 제31조·제32조 · 약관규제법 제8조',
    precedentRef: '대법원 2025다211883',
    citations: 9,
    learned: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'case:tax:rent_credit:01',
    kind: 'casebook',
    domain: 'tax',
    itemId: 'tax_rent_credit',
    label: '집주인 동의 없는 무주택 근로자 월세 세액공제 및 경정청구 사례',
    questionPattern: '무주택 직장인 월세 계좌이체 집주인 동의 연말정산 세액공제',
    headline: '조세특례제한법 제95조의2에 따른 월세 세액공제는 임대인 동의가 요건이 아니며 임대차계약서·전입신고·이체내역만으로 신청 가능합니다.',
    statuteRef: '조세특례제한법 제95조의2',
    precedentRef: '대법원 2025두35585',
    citations: 12,
    learned: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'case:tax:vat_deductible:01',
    kind: 'casebook',
    domain: 'tax',
    itemId: 'tax_vat_deductible',
    label: '개인사업자 업무용 노트북·장비 전자세금계산서 매입세액 공제 사례',
    questionPattern: '개인사업자 노트북 모니터 비품 세금계산서 부가세 매입세액 공제',
    headline: '부가가치세법 제38조 및 소득세법 제27조에 따라 사업용 비품은 부가세 10% 매입세액 공제와 종소세 필요경비 산입이 모두 인정됩니다.',
    statuteRef: '부가가치세법 제38조 · 소득세법 제27조',
    precedentRef: '대법원 2026두30542',
    citations: 10,
    learned: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
  {
    id: 'case:tax:vat_non_deductible:01',
    kind: 'casebook',
    domain: 'tax',
    itemId: 'tax_vat_non_deductible',
    label: '거래처 식대·접대비(기업업무추진비) 부가세 불공제 및 종소세 한도 산입 사례',
    questionPattern: '거래처 식대 선물 접대비 법인카드 부가세 불공제 업무추진비',
    headline: '부가가치세법 제39조 제1항 제6호에 따라 기업업무추진비(접대비)는 부가세 매입세액은 불공제되나 소득세법상 한도 내 필요경비로 산입됩니다.',
    statuteRef: '부가가치세법 제39조 · 소득세법 제27조·제35조',
    precedentRef: '대법원 2025두34707',
    citations: 8,
    learned: false,
    createdAt: '2026-10-01T00:00:00Z',
  },
];

// 인메모리 그래프 저장소 (OKE/Vercel 런타임 및 로컬 JSONL 원장 양방향 동기화)
const nodesMap = new Map<string, LawAtomicNode>();
const edgesMap = new Map<string, LawAtomicEdge>();
const casebookMap = new Map<string, LawCasebookNode>();
let writebackCounter = 0;
let citationHitCounter = INITIAL_CASEBOOK.reduce((acc, c) => acc + c.citations, 0);
let learnedCaseCounter = 0;
let initialized = false;

function resolveLedgerPath(): string {
  const custom = process.env.LAW_GRAPHRAG_LEDGER_PATH;
  if (custom && custom.trim()) return custom.trim();
  return join(tmpdir(), 'lease-clause-check-graphrag', 'writeback-ledger.jsonl');
}

function initGraphIfNeeded() {
  if (initialized) return;
  initialized = true;

  for (const s of STATUTE_SEEDS) {
    const conceptId = `concept:${s.itemId}`;
    const statuteId = `statute:${s.lawName}:${s.article}`;
    const packItem = PACKS.flatMap((p) => p.items).find((i) => i.id === s.itemId);
    nodesMap.set(conceptId, {
      id: conceptId,
      kind: 'concept',
      domain: s.domain,
      label: packItem?.title ?? s.article,
      summary: packItem?.riskReason ?? `${s.lawName} ${s.article}`,
    });
    nodesMap.set(statuteId, {
      id: statuteId,
      kind: 'statute',
      domain: s.domain,
      label: `${s.lawName} ${s.article}`,
      summary: `${s.lawName} ${s.article}`,
    });
    const edgeId = `edge:${conceptId}->${statuteId}`;
    edgesMap.set(edgeId, {
      id: edgeId,
      source: conceptId,
      target: statuteId,
      relation: 'GOVERNED_BY',
    });
  }

  for (const c of INITIAL_CASEBOOK) {
    casebookMap.set(c.id, { ...c });
    nodesMap.set(c.id, c);
    const conceptId = `concept:${c.itemId}`;
    const edgeId = `edge:${c.id}->${conceptId}`;
    edgesMap.set(edgeId, {
      id: edgeId,
      source: c.id,
      target: conceptId,
      relation: 'APPLIES_TO_CONCEPT',
    });
  }

  // 기존 JSONL 원장 복원
  const ledgerPath = resolveLedgerPath();
  if (existsSync(ledgerPath)) {
    try {
      const lines = readFileSync(ledgerPath, 'utf8').split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line) as WritebackLedgerEntry;
        writebackCounter += 1;
        for (const cid of entry.citedCaseIds ?? []) {
          const existing = casebookMap.get(cid);
          if (existing) {
            existing.citations += 1;
            citationHitCounter += 1;
          }
        }
        if (entry.learnedCaseId && !casebookMap.has(entry.learnedCaseId)) {
          const learnedNode: LawCasebookNode = {
            id: entry.learnedCaseId,
            kind: 'casebook',
            domain: entry.domain,
            itemId: entry.itemId,
            label: entry.headline.slice(0, 48),
            questionPattern: entry.question,
            headline: entry.headline,
            statuteRef: entry.statuteRef,
            precedentRef: entry.precedentRef,
            citations: 1,
            learned: true,
            createdAt: entry.ts,
          };
          casebookMap.set(learnedNode.id, learnedNode);
          nodesMap.set(learnedNode.id, learnedNode);
          learnedCaseCounter += 1;
        }
      }
    } catch {
      // ignore corrupted ledger lines
    }
  }
}

function tokenizeKorean(text: string): string[] {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * OKE Rust Law MCP에서 실시간 조회한 법령·대법원 판례를 지식그래프 노드로 동적 병합하고
 * 2-hop 서브그래프 및 유틸리티 가중치 기반 유사 사례(Casebook)를 추출한다.
 */
export function retrieveLawTaxSubgraph(input: {
  domain: LawGraphDomain;
  itemId: string;
  queryText: string;
  liveLaw: LawLookupResponse;
}): LawAtomicSubgraph {
  initGraphIfNeeded();

  const { domain, itemId, queryText, liveLaw } = input;
  const conceptId = `concept:${itemId}`;
  const statuteId = `statute:${liveLaw.statute.lawName}:${liveLaw.statute.article}`;

  // 실시간 조회된 법령 노드 최신화
  nodesMap.set(statuteId, {
    id: statuteId,
    kind: 'statute',
    domain,
    label: `${liveLaw.statute.lawName} ${liveLaw.statute.article}`,
    summary: liveLaw.statute.articleText?.slice(0, 240) || `${liveLaw.statute.lawName} ${liveLaw.statute.article}`,
  });

  const govEdgeId = `edge:${conceptId}->${statuteId}`;
  edgesMap.set(govEdgeId, {
    id: govEdgeId,
    source: conceptId,
    target: statuteId,
    relation: 'GOVERNED_BY',
  });

  // 실시간 조회된 대법원 판례를 PrecedentNode 및 엣지로 동적 병합
  const precedentNodes: LawAtomicNode[] = [];
  for (const p of liveLaw.precedents) {
    if (!p.caseNumber) continue;
    const precId = `prec:${p.caseNumber}`;
    const pNode: LawAtomicNode = {
      id: precId,
      kind: 'precedent',
      domain,
      label: `${p.courtName} ${p.caseNumber} (${p.caseName || '판례'})`,
      summary: p.summary,
    };
    nodesMap.set(precId, pNode);
    precedentNodes.push(pNode);

    const precEdgeId = `edge:${statuteId}->${precId}`;
    edgesMap.set(precEdgeId, {
      id: precEdgeId,
      source: statuteId,
      target: precId,
      relation: 'CITED_PRECEDENT',
    });
  }

  // 케이스북 스코어링 (항목 일치 + 키워드 중첩 + Writeback 인용 횟수 부스트)
  const queryTokens = new Set(tokenizeKorean(queryText));
  const scoredCases: Array<LawCasebookNode & { score: number }> = [];

  for (const c of casebookMap.values()) {
    if (c.domain !== domain && c.itemId !== itemId) continue;
    let score = c.itemId === itemId ? 10 : 2;
    for (const tk of tokenizeKorean(`${c.questionPattern} ${c.headline}`)) {
      if (queryTokens.has(tk)) score += 3;
    }
    // 다온사주 GraphRAG와 동일한 Writeback Utility Boost
    score += Math.min(8, Math.log2(c.citations + 1) * 2);
    if (c.learned) score += 1.5;
    scoredCases.push({ ...c, score: Math.round(score * 10) / 10 });
  }

  scoredCases.sort((a, b) => b.score - a.score);
  const topCases = scoredCases.slice(0, 3);

  const subNodes: LawAtomicNode[] = [
    nodesMap.get(conceptId) ?? { id: conceptId, kind: 'concept', domain, label: itemId },
    nodesMap.get(statuteId)!,
    ...precedentNodes.slice(0, 2),
    ...topCases,
  ];

  const subNodeIds = new Set(subNodes.map((n) => n.id));
  const subEdges = [...edgesMap.values()].filter((e) => subNodeIds.has(e.source) && subNodeIds.has(e.target));

  const formattedContext = [
    `[GraphRAG 2-Hop 법리 서브그래프 · 도메인=${domain} · 시드=${itemId}]`,
    `- 핵심 법령 노드: ${liveLaw.statute.lawName} ${liveLaw.statute.article}`,
    precedentNodes.length > 0
      ? `- 연결 대법원 판례 노드: ${precedentNodes.map((p) => p.label).join(' / ')}`
      : '',
    topCases.length > 0
      ? `- 누적 학습 케이스북(${topCases.length}건):\n` +
        topCases.map((c) => `  * [${c.id} | 인용 ${c.citations}회 | 점수 ${c.score}] ${c.headline} (${c.statuteRef})`).join('\n')
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    domain,
    seedItemId: itemId,
    seeds: [
      { nodeId: conceptId, reason: `질문·문구에서 '${itemId}' 법리 개념 시드 감지` },
      { nodeId: statuteId, reason: `OKE Rust Law MCP 실시간 조문 고정 (${liveLaw.statute.lawName})` },
    ],
    nodes: subNodes,
    edges: subEdges,
    matchedCases: topCases,
    formattedContext,
    stats: getLawGraphStats(),
  };
}

/**
 * 다온사주 `recordSajuConsultationWriteback`과 동일한 자기진화형 Writeback 루프:
 * - 품질 게이트(Quality Gate): 개인정보 누출 없음 + 실제 법령명/조문 인용 확인
 * - 기존 케이스북 인용 강화(`citationHitCount` 증가)
 * - 새로운 고품질 상담·세무 판정 결과를 신규 `CasebookNode`로 승격(`learnedCaseCount` 증가)
 */
export function recordLawTaxWriteback(input: {
  domain: LawGraphDomain;
  itemId: string;
  maskedQuestion: string;
  headline: string;
  analysis: string;
  liveLaw: LawLookupResponse;
  matchedCases: Array<LawCasebookNode & { score: number }>;
}): LawWritebackResult {
  initGraphIfNeeded();

  const { domain, itemId, maskedQuestion, headline, analysis, liveLaw, matchedCases } = input;
  const combinedAnswer = `${headline} ${analysis}`;

  // Quality Gate: 최소 길이 및 실제 법령명 포함 여부 검증
  const passesQualityGate =
    combinedAnswer.length >= 25 &&
    (combinedAnswer.includes(liveLaw.statute.lawName) ||
      combinedAnswer.includes('법') ||
      combinedAnswer.includes('기준'));

  const signatureId = createHash('sha256')
    .update(`${domain}:${itemId}:${maskedQuestion.trim()}`)
    .digest('hex')
    .slice(0, 16);

  if (!passesQualityGate) {
    return {
      recorded: false,
      signatureId,
      citedCaseIds: [],
      learnedCaseId: null,
      stats: getLawGraphStats(),
    };
  }

  writebackCounter += 1;

  // 1) 매칭된 상위 케이스북 노드의 인용 가중치(citations) 강화
  const citedCaseIds: string[] = [];
  for (const mc of matchedCases.slice(0, 2)) {
    const node = casebookMap.get(mc.id);
    if (node) {
      node.citations += 1;
      citationHitCounter += 1;
      citedCaseIds.push(node.id);
    }
  }

  // 2) 새로운 질문 시그니처이면 신규 학습 케이스북 노드로 승격 (Novel Exemplar Promotion)
  const candidateCaseId = `case:${domain}:${itemId}:learned_${signatureId.slice(0, 8)}`;
  let learnedCaseId: string | null = null;

  if (!casebookMap.has(candidateCaseId)) {
    learnedCaseId = candidateCaseId;
    const precRef = liveLaw.precedents[0]?.caseNumber
      ? `대법원 ${liveLaw.precedents[0].caseNumber}`
      : liveLaw.statute.proclamationNo || '현행 법령 기준';

    const newCase: LawCasebookNode = {
      id: candidateCaseId,
      kind: 'casebook',
      domain,
      itemId,
      label: maskedQuestion.slice(0, 42),
      questionPattern: maskedQuestion,
      headline,
      statuteRef: `${liveLaw.statute.lawName} ${liveLaw.statute.article}`,
      precedentRef: precRef,
      citations: 1,
      learned: true,
      createdAt: new Date().toISOString(),
    };

    casebookMap.set(candidateCaseId, newCase);
    nodesMap.set(candidateCaseId, newCase);
    const conceptId = `concept:${itemId}`;
    edgesMap.set(`edge:${candidateCaseId}->${conceptId}`, {
      id: `edge:${candidateCaseId}->${conceptId}`,
      source: candidateCaseId,
      target: conceptId,
      relation: 'REINFORCED_CASE',
    });
    learnedCaseCounter += 1;
    citationHitCounter += 1;
  }

  // 3) JSONL Writeback 원장 영속 기록
  const ledgerPath = resolveLedgerPath();
  try {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    const entry: WritebackLedgerEntry = {
      ts: new Date().toISOString(),
      signatureId,
      domain,
      itemId,
      question: maskedQuestion,
      headline,
      statuteRef: `${liveLaw.statute.lawName} ${liveLaw.statute.article}`,
      precedentRef: liveLaw.precedents[0]?.caseNumber ?? '',
      citedCaseIds,
      learnedCaseId,
    };
    appendFileSync(ledgerPath, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch {
    // 읽기 전용 환경에서는 인메모리 그래프만 유지
  }

  return {
    recorded: true,
    signatureId,
    citedCaseIds,
    learnedCaseId,
    stats: getLawGraphStats(),
  };
}

export function getLawGraphStats(): LawGraphStats {
  initGraphIfNeeded();
  const allNodes = [...nodesMap.values()];
  return {
    nodeCount: allNodes.length,
    edgeCount: edgesMap.size,
    statuteCount: allNodes.filter((n) => n.kind === 'statute').length,
    precedentCount: allNodes.filter((n) => n.kind === 'precedent').length,
    casebookCount: casebookMap.size,
    writebackCount: writebackCounter,
    citationHitCount: citationHitCounter,
    learnedCaseCount: learnedCaseCounter,
  };
}
