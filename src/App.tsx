import { IconArrowRight, IconArrowUp, IconChevronDown } from '@montage-ui/icon';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
} from 'react';
import type { CheckResult, ItemResult } from '../shared/types';
import {
  InsightCard,
  Narrator,
  ScoreRing,
  VisualDeck,
  WelcomeStage,
  type DeckItem,
  type Mood,
  type WelcomeFeatureItem,
} from './packages/daon-stage';
import {
  finishLoginIfCallback,
  getAccessToken,
  isLoggedIn,
  logout,
  onyulAuth,
} from './auth';
import {
  AnnotatedDocumentDeckCard,
  SAMPLE_DOCS,
  SamplePreviewCard,
  type SampleDocSpec,
} from './components/DocumentVisualizer';
import { QuestionStatsDonut } from './components/QuestionStatsDonut';
import {
  cachedCheckPost,
  createQuickSession,
  DEFAULT_LOCAL_PROFILES,
  getClientCacheInfo,
  HistoryDrawer,
  LoginAndProfileModal,
  readLocalConversations,
  readLocalProfiles,
  readSavedSession,
  TopbarActions,
  writeLocalConversations,
  writeLocalProfiles,
  writeSavedSession,
  type OnyulProfile,
  type OnyulSession,
  type SavedConversationFull,
  type SerializedTurnRecord,
} from './components/PersonalizationBar';
import { SAMPLES } from './samples';

type ContractType = 'lease' | 'gym';
type TopicKey = 'lease' | 'gym' | 'tax';

interface FoundPii {
  kind: string;
  sample: string;
}

interface LiveStatuteInfo {
  lawName: string;
  article: string;
  ministry: string;
  effectiveDate: string;
  proclamationNo: string;
  articleText: string;
  officialUrl: string;
  sourceType: 'law' | 'admrul';
}

interface LivePrecedentInfo {
  id: string;
  caseNumber: string;
  caseName: string;
  courtName: string;
  decisionDate: string;
  summary: string;
  officialUrl: string;
}

interface LawLookupResponse {
  itemId: string;
  fetchedAt: string;
  liveConnected: boolean;
  statute: LiveStatuteInfo;
  precedents: LivePrecedentInfo[];
}

interface ConsultApiResponse {
  itemId: string;
  itemTitle: string;
  maskedQuestion: string;
  headline: string;
  analysis: string;
  messageDraft: string;
  followups: string[];
  law: LawLookupResponse;
}

interface TaxApiResponse {
  taxLawItemId: string;
  maskedText: string;
  filerType: 'individual_biz' | 'wage_earner' | 'freelancer';
  headline: string;
  vatVerdict: string;
  incomeTaxVerdict: string;
  accountTitle: string;
  evidenceStatus: string;
  analysis: string;
  hometaxGuide: string;
  followups: string[];
  law: LawLookupResponse;
}

interface Turn {
  id: string;
  question: string;
  speech: string;
  mood: Mood;
  deck: DeckItem[];
  followups: string[];
  maskedSummary?: string;
  cached?: boolean;
  serialized?: SerializedTurnRecord;
}

interface AttachedImage {
  name: string;
  dataUrl: string;
}

const TOPICS: Array<{ key: TopicKey; label: string; dotClass: string }> = [
  { key: 'lease', label: '주택 전월세·특약', dotClass: 'profile-chip__dot--lease' },
  { key: 'gym', label: '헬스장·PT 환불', dotClass: 'profile-chip__dot--gym' },
  { key: 'tax', label: '월세·영수증 세무', dotClass: 'profile-chip__dot--tax' },
];

const STARTER_QUESTIONS: Record<
  TopicKey,
  Array<{ tag: string; label: string; prompt: string; mode?: 'check' | 'consult' | 'tax' }>
> = {
  lease: [
    {
      tag: '특약 점검',
      label: '퇴거 시 도배·장판비 40만 원 공제 · 차임 연 8% 인상 특약 점검해 줘',
      prompt: SAMPLES[0].text,
      mode: 'check',
    },
    {
      tag: '법령·판례',
      label: '전입신고 다음 날 집주인이 근저당을 잡으면 내 보증금 대항력은 어떻게 되나요?',
      prompt: '전입신고 다음 날 집주인이 근저당을 설정하면 내 보증금 대항력과 우선변제권 순위는 어떻게 되나요?',
      mode: 'consult',
    },
    {
      tag: '법령·판례',
      label: '계약만료 때 다음 세입자가 들어와야 보증금을 준다는 특약, 효력이 있나요?',
      prompt: '계약서에 다음 임차인이 입주한 후에 보증금을 반환한다고 적혀 있는데 만기일에 바로 돌려받을 수 있나요?',
      mode: 'consult',
    },
    {
      tag: '월세 공제',
      label: '무주택 직장인 월세 75만 원, 연말정산 세액공제로 얼마나 돌려받나요?',
      prompt: '무주택 직장인 총급여 5,800만 원인데 보증금 2,000만 원에 월세 75만 원 내고 있어요. 월세 세액공제 얼마나 받나요?',
      mode: 'tax',
    },
  ],
  gym: [
    {
      tag: '약관 점검',
      label: '중도 해지 시 정상가 차감·위약금 20% 헬스장 계약서 점검해 주세요',
      prompt: SAMPLES[2].text,
      mode: 'check',
    },
    {
      tag: '법령·판례',
      label: 'PT 20회 140만 원 결제 후 5회만 받았는데 환불 불가라고 해요',
      prompt: '헬스장 PT 20회 140만 원 결제 후 5회만 받았는데 계약서에 환불 불가라고 적혀 있다며 거부합니다. 법적으로 환불받을 수 있나요?',
      mode: 'consult',
    },
    {
      tag: '법령·판례',
      label: '헬스장이 갑자기 폐업했을 때 남은 카드 할부금 안 내도 되나요?',
      prompt: '헬스장 12개월권을 신용카드 6개월 할부로 끊었는데 두 달 만에 폐업했어요. 카드 할부 항변권은 어떻게 신청하나요?',
      mode: 'consult',
    },
  ],
  tax: [
    {
      tag: '연말정산',
      label: '무주택 직장인 총급여 5,800만 원 · 월세 75만 원 세액공제 계산',
      prompt: '무주택 세대주 직장인이고 총급여 5,800만 원입니다. 오피스텔 월세 75만 원을 매달 계좌이체 중인데 연말정산 세액공제율과 홈택스 신청 방법이 궁금해요.',
      mode: 'tax',
    },
    {
      tag: '부가세·종소세',
      label: '프리랜서·개인사업자 업무용 노트북 220만 원 카드 영수증 경비 처리',
      prompt: '프리랜서 디자이너인데 업무용 맥북 노트북 220만 원을 신용카드로 결제했습니다. 부가가치세 매입세액공제와 종합소득세 필요경비 처리가 모두 되나요?',
      mode: 'tax',
    },
    {
      tag: '부가세·종소세',
      label: '거래처 결혼식 축의금 20만 원, 청첩장으로 비용 처리 되나요?',
      prompt: '개인사업자인데 거래처 결혼식 축의금 20만 원을 현금으로 내고 모바일 청첩장을 보관 중입니다. 필요경비 인정 한도와 증빙 방법이 궁금해요.',
      mode: 'tax',
    },
  ],
};

function detectIntent(
  prompt: string,
  topic: TopicKey,
  explicitMode?: 'check' | 'consult' | 'tax',
): 'check' | 'consult' | 'tax' {
  if (explicitMode) return explicitMode;
  const text = prompt.trim();
  const taxPattern =
    /세액공제|소득공제|연말정산|부가세|부가가치세|매입세액|종합소득세|종소세|필요경비|경비\s*처리|현금영수증|세금계산서|홈택스|원천징수|축의금|부의금|접대비/;
  if (taxPattern.test(text)) return 'tax';

  const clausePattern =
    /(?:제\s*\d+\s*조|특약\s*사항|회원\s*약관|12개월\s*회원권|^\s*[1-9][.)]\s+.+\n\s*[2-9][.)]\s+|일체\s*환불하지|전액을?\s*부담한다|반환한다\.|인상한다\.)/m;
  if (clausePattern.test(text) || text.split('\n').length >= 3) return 'check';

  if (topic === 'tax') return 'tax';
  return 'consult';
}

function formatFoundPii(found: FoundPii[]): string | undefined {
  if (!Array.isArray(found) || found.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const item of found) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  }
  const detail = Array.from(counts.entries())
    .map(([k, c]) => `${k} ${c}건`)
    .join(', ');
  return `개인정보 ${found.length}건(${detail})을 자동으로 가린 뒤 안전하게 점검했어요.`;
}

function taxBadgeTone(verdict: string): string {
  if (/가능|세액공제/.test(verdict) && !/불공제|불산입/.test(verdict)) {
    return 'tax-badge tax-badge--eligible';
  }
  if (/한도|조건부/.test(verdict)) {
    return 'tax-badge tax-badge--partial';
  }
  return 'tax-badge tax-badge--ineligible';
}

function safeBearer(token: string): string {
  return /[^\x00-\x7F]/.test(token) ? encodeURI(token) : token;
}

const WELCOME_ITEMS: WelcomeFeatureItem[] = [
  {
    num: '一',
    title: '문서를 가리키며 조항별 정밀 점검',
    detail:
      '계약서·영수증의 위험 조항 위치를 번호 핀으로 직접 짚어 안심 수정 문안까지 알려드려요.',
  },
  {
    num: '二',
    title: '법령·대법원 판례·세법 실시간 대조',
    detail:
      '주택임대차보호법, 약관규제법, 소득세법·부가가치세법 조문을 근거로 정확히 판정해요.',
  },
  {
    num: '三',
    title: '개인정보 자동 보호 · 이전 대화 이어보기',
    detail:
      '성명·주민번호·연락처·계좌번호는 자동으로 가리고, 내 프로필과 상담 기록을 안전하게 보관해요.',
  },
];

export function App() {
  const initialTopic = (): TopicKey => {
    if (typeof window === 'undefined') return 'lease';
    if (window.location.pathname.startsWith('/tax')) return 'tax';
    return 'lease';
  };

  const [phase, setPhase] = useState<'boot' | 'signed-out' | 'ready'>(() =>
    isLoggedIn() || readSavedSession() !== null ? 'ready' : 'signed-out',
  );
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [session, setSession] = useState<OnyulSession | null>(() => readSavedSession());
  const [profiles, setProfiles] = useState<OnyulProfile[]>(() => readLocalProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(
    () => readLocalProfiles()[0]?.id ?? DEFAULT_LOCAL_PROFILES[0].id,
  );
  const [conversations, setConversations] = useState<SavedConversationFull[]>(() =>
    readLocalConversations(),
  );
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [cacheStats, setCacheStats] = useState(() => getClientCacheInfo());

  const [topic, setTopic] = useState<TopicKey>(initialTopic);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<SampleDocSpec | null>(null);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingLine, setLoadingLine] = useState('');
  const [streamText, setStreamText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const followupRef = useRef<HTMLDetailsElement>(null);

  const activeTurn = turns[turnIndex] ?? null;
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) ??
    profiles.find((p) => p.topic === topic) ??
    DEFAULT_LOCAL_PROFILES[0];

  const syncAuthToSession = async () => {
    const token = await getAccessToken();
    if (!token) return;
    if (token === 'dev') {
      const existing = readSavedSession();
      if (!existing) {
        const nextSession = createQuickSession('온율 회원');
        setSession(nextSession);
      }
      return;
    }
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'account' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.account) {
          const nextSession: OnyulSession = {
            token,
            userId: data.account.userId || 'ugot-member',
            name: data.account.name || '온율 회원',
            email: data.account.email,
            provider: 'ugot',
          };
          writeSavedSession(nextSession);
          setSession(nextSession);
        }
      }
    } catch {
      // ignore offline account error
    }
  };

  useEffect(() => {
    finishLoginIfCallback()
      .then(async (didFinish) => {
        if (didFinish || isLoggedIn()) {
          await syncAuthToSession();
          setPhase('ready');
        } else if (readSavedSession()) {
          setPhase('ready');
        } else {
          setPhase('signed-out');
        }
      })
      .catch(() => {
        setLoginNotice('로그인 중 문제가 생겼어요. 다시 시도해 주세요.');
        setPhase('signed-out');
      });
  }, []);

  useEffect(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.token) headers.Authorization = `Bearer ${safeBearer(session.token)}`;
    fetch('/api/check', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'account' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (Array.isArray(data.profiles) && data.profiles.length > 0 && session) {
          setProfiles(data.profiles);
          writeLocalProfiles(data.profiles);
        }
      })
      .catch(() => {
        // ignore offline account sync error
      });
  }, [session?.token]);

  const handleSelectClauseForSpeech = (speech: string, mood: 'worry' | 'joy' | 'thinking') => {
    setTurns((prev) =>
      prev.map((t, i) => (i === turnIndex ? { ...t, speech, mood } : t)),
    );
    setStreamText(speech);
    setStreaming(true);
    setTimeout(() => setStreaming(false), 1200);
  };

  useEffect(() => {
    if (!activeTurn) {
      setStreamText('');
      setStreaming(false);
      return;
    }
    setStreamText(activeTurn.speech);
    setStreaming(true);
    const timer = setTimeout(() => {
      setStreaming(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, [activeTurn?.id]);

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readImageFile(file);
    e.target.value = '';
  };

  const readImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedImage({
          name: file.name || '계약서·영수증 사진.png',
          dataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          readImageFile(file);
          return;
        }
      }
    }
  };

  const buildCheckTurn = (
    questionLabel: string,
    result: CheckResult,
    lawData: LawLookupResponse | null,
    maskedSummary?: string,
    sampleDoc?: SampleDocSpec,
    uploadedImageUrl?: string,
  ): Turn => {
    const riskItems = result.items.filter((i) => i.verdict === '위험');
    const protectItems = result.items.filter((i) => i.verdict === '보호됨');
    const missingItems = result.items.filter((i) => i.verdict === '언급 없음');

    const red = riskItems.length;
    const green = protectItems.length;
    const amber = missingItems.length;
    const total = Math.max(1, result.items.length);
    const safetyScore = Math.max(18, Math.min(100, Math.round(100 - red * 24 - amber * 4)));

    const mood: Mood = red > 0 ? 'worry' : green > 0 ? 'joy' : 'thinking';
    const firstRisk: ItemResult | undefined = riskItems[0];

    const headline =
      red > 0
        ? `주의가 필요한 위험 특약 ${red}건이 발견되었어요`
        : green > 0
          ? `위험 특약 없이 보호 조항 ${green}건이 확인되었어요`
          : `특약 원문을 점검해 보완할 조항을 정리했어요`;

    const speechParts: string[] = [
      `**${headline}.**`,
      red > 0
        ? `점검 항목 ${total}개 중 **수정 권장(위험) ${red}건**, **보호됨 ${green}건**, **특약 미기재 ${amber}건**이에요.`
        : `점검 항목 ${total}개 중 **보호 조항 ${green}건**이 확인되었고 독소 조항은 발견되지 않았어요.`,
    ];

    if (firstRisk) {
      speechParts.push(
        `오른쪽 계약서 문서에서 **①번 조항("${firstRisk.title ?? firstRisk.itemId}")**을 가리키고 있어요. 원문의 **"${firstRisk.quote}"** 문구는 ${firstRisk.riskReason ?? '법정 기준보다 불리할 수 있어요.'} 문서의 다른 번호(①~④)를 눌러보시면 해당 위치도 바로 짚어 드릴게요!`,
      );
    }

    const matchedDoc =
      sampleDoc ??
      SAMPLE_DOCS.find((d) => d.topic === (result.pack === 'gym' ? 'gym' : 'lease'));

    const deck: DeckItem[] = [
      {
        key: 'annotated-doc',
        label: '문서 위치 · 포인터 해설',
        node: (
          <AnnotatedDocumentDeckCard
            doc={matchedDoc}
            uploadedImageUrl={uploadedImageUrl}
            items={result.items}
            onSelectClauseForSpeech={handleSelectClauseForSpeech}
            onCopyAlternative={(key, text) => void copyText(key, text)}
            copiedKey={copiedKey}
          />
        ),
      },
      {
        key: 'summary',
        label: '계약 안전도 · 요약',
        node: (
          <section className="visual-card" aria-label="계약서 특약 안전도 및 점검 요약">
            <header>
              <span className="visual-card__eyebrow">계약서 특약 점검 요약</span>
              <h3 className="visual-card__title">{headline}</h3>
            </header>
            <div className="today">
              <ScoreRing
                value={safetyScore}
                size="large"
                label="계약 안전도"
                tone={red > 0 ? 'negative' : 'positive'}
              />
              <div className="today__subs">
                <ScoreRing
                  value={red}
                  max={total}
                  size="small"
                  label="위험 특약"
                  tone="negative"
                />
                <ScoreRing
                  value={green}
                  max={total}
                  size="small"
                  label="보호 조항"
                  tone="positive"
                />
                <ScoreRing
                  value={amber}
                  max={total}
                  size="small"
                  label="보완 가능"
                  tone="caution"
                />
              </div>
            </div>
          </section>
        ),
      },
    ];

    riskItems.forEach((item, idx) => {
      const copyKey = `clause-${item.itemId}-${idx}`;
      deck.push({
        key: copyKey,
        label: `위험 특약 ${idx + 1} · ${item.title ?? item.itemId}`,
        node: (
          <section className="visual-card" aria-label={item.title ?? item.itemId}>
            <header>
              <span className="visual-card__eyebrow">🔴 수정 권장 특약</span>
              <h3 className="visual-card__title">{item.title ?? item.itemId}</h3>
            </header>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)' }}>
              {item.riskReason} {item.riskConsequence}
            </p>
            <div className="clause-compare">
              <div className="clause-box clause-box--risk">
                <span className="clause-box__label">계약서 원문 인용</span>
                <p className="clause-box__text">{item.quote || '원문 특약 조항'}</p>
              </div>
              <div className="clause-box clause-box--safe">
                <span className="clause-box__label">
                  <span>권장 대안 특약 문구</span>
                  <button
                    type="button"
                    className="copy-chip"
                    onClick={() => void copyText(copyKey, item.fixText)}
                  >
                    {copiedKey === copyKey ? '복사됨 ✓' : '대안 문구 복사'}
                  </button>
                </span>
                <p className="clause-box__text">{item.fixText}</p>
              </div>
            </div>
            {idx === 0 && lawData && (
              <div className="law-cite-list">
                <div className="law-cite-item">
                  <strong>
                    <span>
                      ⚖️ {lawData.statute.lawName} · {lawData.statute.article}
                    </span>
                    <a href={lawData.statute.officialUrl} target="_blank" rel="noreferrer">
                      국가법령정보센터 ↗
                    </a>
                  </strong>
                  <span>{lawData.statute.articleText}</span>
                </div>
                {lawData.precedents[0] && (
                  <div className="law-cite-item">
                    <strong>
                      <span>
                        🏛️ 대법원 {lawData.precedents[0].caseNumber}
                      </span>
                      <a href={lawData.precedents[0].officialUrl} target="_blank" rel="noreferrer">
                        판례 원문 ↗
                      </a>
                    </strong>
                    <span>{lawData.precedents[0].summary}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        ),
      });
    });

    if (protectItems.length > 0 || missingItems.length > 0) {
      deck.push({
        key: 'checklist-card',
        label: '서명 전 체크리스트',
        node: (
          <InsightCard
            eyebrow="서명 전 확인 질문"
            title="임대인·사업자에게 꼭 확인해 보세요"
            content={{
              kind: 'checklist',
              items: [
                ...riskItems.map((r) => `${r.title}: "${r.question}"`),
                ...missingItems.slice(0, 3).map((m) => `${m.title}: "${m.fixText}" 특약 추가 권장`),
              ].slice(0, 5),
            }}
          />
        ),
      });
    }

    const followups =
      result.pack === 'gym'
        ? [
            '환불 불가 약관이 적혀 있어도 법적으로 무효로 주장할 수 있나요?',
            '헬스장·PT 해지 시 위약금 10%와 이용일수 정산 기준은 어떻게 되나요?',
            '사업자에게 보낼 정중한 해지·환불 요청 문자 초안을 써 주세요',
          ]
        : [
            '집주인에게 이 독소 조항을 수정해 달라고 정중하게 보낼 문자 초안 써 줘',
            '전입신고와 확정일자를 받으면 보증금 대항력은 언제부터 생기나요?',
            '무주택 직장인인데 월세 세액공제는 얼마나 돌려받을 수 있나요?',
          ];

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const speech = speechParts.join('\n\n');
    return {
      id: turnId,
      question: questionLabel,
      speech,
      mood,
      deck,
      followups,
      maskedSummary,
      serialized: {
        id: turnId,
        question: questionLabel,
        speech,
        mood,
        mode: 'check',
        maskedSummary,
        followups,
        checkPayload: {
          result,
          lawData,
          sampleDocId: matchedDoc?.id,
          uploadedImageUrl,
        },
      },
    };
  };

  const buildConsultTurn = (
    questionLabel: string,
    result: ConsultApiResponse,
    maskedSummary?: string,
  ): Turn => {
    const speechParts = [
      `**${result.headline}**`,
      result.analysis,
      `오른쪽 카드에서 **${result.law.statute.lawName} ${result.law.statute.article}** 원문과 대법원 판례, 그리고 바로 복사해 보낼 수 있는 **협의 문자 초안**을 확인해 보세요.`,
    ];

    const msgCopyKey = `msg-${Date.now()}`;
    const deck: DeckItem[] = [
      {
        key: 'statutes-precedents',
        label: '법령·대법원 판례',
        node: (
          <section className="visual-card" aria-label="관련 법령 및 대법원 판례">
            <header>
              <span className="visual-card__eyebrow">국가법령정보센터 실시간 법령 · 대법원 판례</span>
              <h3 className="visual-card__title">{result.headline}</h3>
            </header>
            <div className="law-cite-list">
              <div className="law-cite-item">
                <strong>
                  <span>
                    📘 {result.law.statute.lawName} ({result.law.statute.article})
                  </span>
                  <a href={result.law.statute.officialUrl} target="_blank" rel="noreferrer">
                    법령 원문 ↗
                  </a>
                </strong>
                <span>{result.law.statute.articleText}</span>
              </div>
              {result.law.precedents.map((pr, idx) => (
                <div key={`pr-${idx}`} className="law-cite-item">
                  <strong>
                    <span>
                      🏛️ {pr.courtName} {pr.caseNumber} · {pr.caseName}
                    </span>
                    <a href={pr.officialUrl} target="_blank" rel="noreferrer">
                      판례 원문 ↗
                    </a>
                  </strong>
                  <span>{pr.summary}</span>
                </div>
              ))}
            </div>
          </section>
        ),
      },
      {
        key: 'message-template',
        label: '전달용 문자 초안',
        node: (
          <section className="visual-card" aria-label="전달용 문자 초안">
            <header>
              <span className="visual-card__eyebrow">임대인 · 중개사 · 사업자 협의용</span>
              <h3 className="visual-card__title">바로 복사해 보낼 수 있는 문자·카톡 초안</h3>
            </header>
            <div className="clause-box clause-box--safe">
              <span className="clause-box__label">
                <span>권장 협의 메시지</span>
                <button
                  type="button"
                  className="copy-chip"
                  onClick={() => void copyText(msgCopyKey, result.messageDraft)}
                >
                  {copiedKey === msgCopyKey ? '복사됨 ✓' : '문자 초안 복사'}
                </button>
              </span>
              <p className="clause-box__text">{result.messageDraft}</p>
            </div>
          </section>
        ),
      },
    ];

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const speech = speechParts.join('\n\n');
    return {
      id: turnId,
      question: questionLabel,
      speech,
      mood: 'calm',
      deck,
      followups: result.followups ?? [],
      maskedSummary,
      serialized: {
        id: turnId,
        question: questionLabel,
        speech,
        mood: 'calm',
        mode: 'consult',
        maskedSummary,
        followups: result.followups ?? [],
        consultPayload: { result },
      },
    };
  };

  const buildTaxTurn = (
    questionLabel: string,
    result: TaxApiResponse,
    maskedSummary?: string,
  ): Turn => {
    const speechParts = [
      `**${result.headline}**`,
      result.analysis,
      `부가가치세는 **${result.vatVerdict}**, 종합소득세·연말정산은 **${result.incomeTaxVerdict}** 대상이에요. 오른쪽 카드에서 **홈택스 신청 경로**와 **적격증빙 기준**을 확인해 보세요.`,
    ];

    const deck: DeckItem[] = [
      {
        key: 'tax-verdict',
        label: '세무·공제 판정표',
        node: (
          <section className="visual-card" aria-label="세무 및 공제 판정표">
            <header>
              <span className="visual-card__eyebrow">부가가치세 · 종합소득세 · 연말정산 판정</span>
              <h3 className="visual-card__title">{result.headline}</h3>
            </header>
            <div className="tax-verdict-grid">
              <div className="tax-verdict-item">
                <span className={taxBadgeTone(result.vatVerdict)}>
                  부가세 · {result.vatVerdict}
                </span>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
                  계정과목: {result.accountTitle}
                </p>
              </div>
              <div className="tax-verdict-item">
                <span className={taxBadgeTone(result.incomeTaxVerdict)}>
                  소득세 · {result.incomeTaxVerdict}
                </span>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
                  증빙 상태: {result.evidenceStatus}
                </p>
              </div>
              <div className="tax-verdict-item">
                <span className="tax-badge tax-badge--eligible">홈택스 실무 가이드</span>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
                  {result.hometaxGuide}
                </p>
              </div>
            </div>
          </section>
        ),
      },
      {
        key: 'tax-statutes',
        label: '관련 세법·판례',
        node: (
          <section className="visual-card" aria-label="관련 세법 조문 및 판례">
            <header>
              <span className="visual-card__eyebrow">국가법령정보센터 세법 · 대법원 판례</span>
              <h3 className="visual-card__title">
                {result.law.statute.lawName} ({result.law.statute.article})
              </h3>
            </header>
            <div className="law-cite-list">
              <div className="law-cite-item">
                <strong>
                  <span>
                    🧾 {result.law.statute.lawName} · {result.law.statute.article}
                  </span>
                  <a href={result.law.statute.officialUrl} target="_blank" rel="noreferrer">
                    법령 원문 ↗
                  </a>
                </strong>
                <span>{result.law.statute.articleText}</span>
              </div>
              {result.law.precedents[0] && (
                <div className="law-cite-item">
                  <strong>
                    <span>
                      🏛️ {result.law.precedents[0].courtName} {result.law.precedents[0].caseNumber}
                    </span>
                    <a href={result.law.precedents[0].officialUrl} target="_blank" rel="noreferrer">
                      판례 원문 ↗
                    </a>
                  </strong>
                  <span>{result.law.precedents[0].summary}</span>
                </div>
              )}
            </div>
          </section>
        ),
      },
    ];

    const turnId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const speech = speechParts.join('\n\n');
    return {
      id: turnId,
      question: questionLabel,
      speech,
      mood: 'joy',
      deck,
      followups: result.followups ?? [],
      maskedSummary,
      serialized: {
        id: turnId,
        question: questionLabel,
        speech,
        mood: 'joy',
        mode: 'tax',
        maskedSummary,
        followups: result.followups ?? [],
        taxPayload: { result },
      },
    };
  };

  const rehydrateTurn = (rec: SerializedTurnRecord): Turn => {
    if (rec.mode === 'check' && rec.checkPayload?.result) {
      const sampleDoc = SAMPLE_DOCS.find((d) => d.id === rec.checkPayload?.sampleDocId);
      const built = buildCheckTurn(
        rec.question,
        rec.checkPayload.result as CheckResult,
        (rec.checkPayload.lawData as LawLookupResponse | null) ?? null,
        rec.maskedSummary,
        sampleDoc,
        rec.checkPayload.uploadedImageUrl,
      );
      return { ...built, id: rec.id, cached: true };
    }
    if (rec.mode === 'consult' && rec.consultPayload?.result) {
      const built = buildConsultTurn(
        rec.question,
        rec.consultPayload.result as ConsultApiResponse,
        rec.maskedSummary,
      );
      return { ...built, id: rec.id, cached: true };
    }
    if (rec.mode === 'tax' && rec.taxPayload?.result) {
      const built = buildTaxTurn(
        rec.question,
        rec.taxPayload.result as TaxApiResponse,
        rec.maskedSummary,
      );
      return { ...built, id: rec.id, cached: true };
    }
    return {
      id: rec.id,
      question: rec.question,
      speech: rec.speech,
      mood: rec.mood,
      deck: [],
      followups: rec.followups ?? [],
      maskedSummary: rec.maskedSummary,
      cached: true,
      serialized: rec,
    };
  };

  const appendAndSaveTurn = (nextTurn: Turn) => {
    setTurns((prev) => {
      const next = [...prev, nextTurn];
      setTurnIndex(next.length - 1);

      const convId = currentConvId ?? `conv-${Date.now()}`;
      if (!currentConvId) setCurrentConvId(convId);

      const serializedTurns = next
        .map((t) => t.serialized)
        .filter((s): s is SerializedTurnRecord => Boolean(s));

      const savedConv: SavedConversationFull = {
        id: convId,
        profileId: activeProfile.id,
        profileName: activeProfile.name,
        topic,
        title: next[0]?.question || nextTurn.question,
        updatedAt: new Date().toISOString(),
        turns: serializedTurns,
      };

      setConversations((prevConvs) => {
        const filtered = prevConvs.filter((c) => c.id !== convId);
        const updated = [savedConv, ...filtered].slice(0, 40);
        writeLocalConversations(updated);
        return updated;
      });

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.token) headers.Authorization = `Bearer ${safeBearer(session.token)}`;
      void fetch('/api/check', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'conversations_save',
          conversation: savedConv,
        }),
      }).catch(() => {
        // ignore network save error
      });

      return next;
    });
    setCacheStats(getClientCacheInfo());
  };

  const submitQuery = async (
    rawText: string,
    explicitMode?: 'check' | 'consult' | 'tax',
    overrideImage?: AttachedImage | null,
    sampleDoc?: SampleDocSpec,
  ) => {
    const imageToUse = overrideImage !== undefined ? overrideImage : attachedImage;
    const trimmed = rawText.trim();
    if ((!trimmed && !imageToUse) || busy) return;

    setBusy(true);
    setPreviewDoc(null);
    setInput('');
    if (overrideImage === undefined) {
      setAttachedImage(null);
    }

    try {
      let workingText = trimmed;
      let maskedSummary: string | undefined;

      if (imageToUse) {
        setLoadingLine('사진에서 글자를 읽고 성명·주민번호·연락처 등 개인정보를 가리는 중이에요…');
        const ocrRes = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ocr',
            image: imageToUse.dataUrl,
          }),
        });
        const ocrData = await ocrRes.json();
        if (ocrData.masked) {
          workingText = trimmed
            ? `${trimmed}\n\n${ocrData.masked}`
            : String(ocrData.masked);
          if (Array.isArray(ocrData.found)) {
            maskedSummary = formatFoundPii(ocrData.found);
          }
        }
      } else {
        const maskRes = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mask',
            text: workingText,
          }),
        });
        if (maskRes.ok) {
          const maskData = await maskRes.json();
          if (maskData.masked) {
            workingText = String(maskData.masked);
          }
          if (Array.isArray(maskData.found)) {
            maskedSummary = formatFoundPii(maskData.found);
          }
        }
      }

      const mode = detectIntent(
        workingText,
        topic,
        imageToUse && !explicitMode
          ? /영수증|승인번호|부가세|공급가액|세액공제|세금계산서/.test(workingText)
            ? 'tax'
            : 'check'
          : explicitMode,
      );

      const questionTitle =
        imageToUse && !trimmed
          ? `📷 ${imageToUse.name} 점검`
          : workingText.split('\n')[0].slice(0, 48);

      if (mode === 'tax') {
        setLoadingLine('조세특례제한법·소득세법·부가가치세법 기준과 공제 요건을 계산하고 있어요…');
        const filerType = /프리랜서/.test(workingText)
          ? 'freelancer'
          : /사업자|거래처|축의금|접대/.test(workingText)
            ? 'individual_biz'
            : activeProfile.filerType || 'wage_earner';
        const { data, cached } = await cachedCheckPost<TaxApiResponse>(
          {
            action: 'tax',
            filerType,
            text: workingText,
          },
          session?.token,
        );
        const nextTurn = buildTaxTurn(questionTitle, data, maskedSummary);
        appendAndSaveTurn({ ...nextTurn, cached });
      } else if (mode === 'check') {
        setLoadingLine('계약서 조항을 한 줄씩 읽고 국가법령정보센터 법령·대법원 판례와 대조하고 있어요…');
        const pack: ContractType =
          topic === 'gym' || /헬스|PT|피트니스|회원권|트레이닝/.test(workingText) ? 'gym' : 'lease';
        const { data, cached } = await cachedCheckPost<CheckResult>(
          {
            action: 'check',
            pack,
            text: workingText,
            version: 'v2',
          },
          session?.token,
        );
        const firstRisk = data.items.find((i) => i.verdict === '위험');
        let lawData: LawLookupResponse | null = null;
        if (firstRisk) {
          try {
            const lawResp = await cachedCheckPost<LawLookupResponse>(
              { action: 'law', itemId: firstRisk.itemId },
              session?.token,
            );
            lawData = lawResp.data;
          } catch {
            // ignore law lookup error
          }
        }
        const nextTurn = buildCheckTurn(
          questionTitle,
          data,
          lawData,
          maskedSummary,
          sampleDoc,
          imageToUse?.dataUrl,
        );
        appendAndSaveTurn({ ...nextTurn, cached });
      } else {
        setLoadingLine('국가법령정보센터 실시간 법령과 대법원 판례를 찾아 답변을 정리하고 있어요…');
        const pack =
          topic === 'gym' || /헬스|PT|피트니스|회원권/.test(workingText) ? 'gym' : 'lease';
        const { data, cached } = await cachedCheckPost<ConsultApiResponse>(
          {
            action: 'consult',
            pack,
            question: workingText,
          },
          session?.token,
        );
        const nextTurn = buildConsultTurn(questionTitle, data, maskedSummary);
        appendAndSaveTurn({ ...nextTurn, cached });
      }
    } catch {
      const fallbackTurn: Turn = {
        id: `turn-${Date.now()}`,
        question: trimmed || '문의 내용',
        speech:
          '일시적으로 응답이 지연되었어요. 다시 한 번 질문해 주시거나 계약서·영수증 사진을 올려주시면 바로 살펴볼게요.',
        mood: 'worry',
        deck: [],
        followups: [],
      };
      setTurns((prev) => {
        const next = [...prev, fallbackTurn];
        setTurnIndex(next.length - 1);
        return next;
      });
    } finally {
      setBusy(false);
      setLoadingLine('');
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitQuery(input);
  };

  const openSamplePreview = (doc?: SampleDocSpec) => {
    const target = doc ?? SAMPLE_DOCS.find((d) => d.topic === topic) ?? SAMPLE_DOCS[0];
    setTopic(target.topic);
    setPreviewDoc(target);
  };

  const handleQuickSignIn = (name: string, email?: string) => {
    onyulAuth.devLogin();
    const nextSession = createQuickSession(name, email);
    setSession(nextSession);
    setPersonalizationOpen(false);
    setPhase('ready');
  };

  const handleSignOut = () => {
    void logout({ endSession: false });
    writeSavedSession(null);
    setSession(null);
    setPersonalizationOpen(false);
    setPhase('signed-out');
  };

  const handleSaveProfile = (profileInput: Omit<OnyulProfile, 'id'> & { id?: string }) => {
    const id = profileInput.id || `prof-${Date.now()}`;
    const saved: OnyulProfile = {
      id,
      name: profileInput.name,
      topic: profileInput.topic,
      filerType: profileInput.filerType,
      memo: profileInput.memo,
    };
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const next = idx >= 0 ? prev.map((p, i) => (i === idx ? saved : p)) : [...prev, saved];
      writeLocalProfiles(next);
      return next;
    });
    setActiveProfileId(id);
    setTopic(saved.topic);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.token) headers.Authorization = `Bearer ${safeBearer(session.token)}`;
    void fetch('/api/check', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'profiles_save', profile: saved }),
    }).catch(() => {});
  };

  const handleSelectSavedConversation = (conv: SavedConversationFull) => {
    const restored = conv.turns.map(rehydrateTurn);
    setTopic(conv.topic);
    setActiveProfileId(conv.profileId);
    setCurrentConvId(conv.id);
    setPreviewDoc(null);
    setTurns(restored);
    setTurnIndex(Math.max(0, restored.length - 1));
  };

  const handleDeleteConversation = (convId: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== convId);
      writeLocalConversations(next);
      return next;
    });
    if (currentConvId === convId) {
      setCurrentConvId(null);
      setTurns([]);
      setTurnIndex(0);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.token) headers.Authorization = `Bearer ${safeBearer(session.token)}`;
    void fetch('/api/check', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'conversations_delete', conversationId: convId }),
    }).catch(() => {});
  };

  const mascotState = (() => {
    if (busy) {
      return {
        mood: 'thinking' as Mood,
        line: loadingLine || '법령과 대법원 판례를 꼼꼼히 살피고 있어요…',
        text: loadingLine || '법령과 대법원 판례를 꼼꼼히 살피고 있어요…',
        streaming: true,
        messageId: 'loading',
      };
    }
    if (activeTurn) {
      return {
        mood: activeTurn.mood,
        line: activeTurn.speech,
        text: streamText || activeTurn.speech,
        streaming,
        messageId: activeTurn.id,
      };
    }
    if (previewDoc) {
      const previewSpeech = `선택하신 **[${previewDoc.title}]** 문서를 먼저 펼쳐보았어요!\n\n문서 상단의 **주민등록번호·연락처·계좌번호**는 자동으로 가려두었습니다. 오른쪽 문서 시트에서 **①~${previewDoc.clauses.length}번 조항 위치**를 확인하신 뒤 아래 **[🔍 이 문서 가리키며 정밀 점검 시작하기]** 버튼을 누르면 조항 하나하나를 짚어가며 설명해 드릴게요.`;
      return {
        mood: 'thinking' as Mood,
        line: previewSpeech,
        text: previewSpeech,
        streaming: false,
        messageId: `preview-${previewDoc.id}`,
      };
    }
    const greetingPrefix = session ? `${session.name} 님, 반가워요! ` : '안녕하세요, ';
    const memoNote = activeProfile.memo ? ` (현재 맞춤 설정: **${activeProfile.memo}**)` : '';
    const welcomeByTopic: Record<TopicKey, string> = {
      lease: `${greetingPrefix}온율의 법률·세무 파트너 **한결**이에요.${memoNote} **전월세 계약서 사진**을 찍어 올리거나 아래 **샘플 문서 카드**를 눌러 미리보기로 확인해 보세요. 성명·주민번호 같은 개인정보는 먼저 가린 뒤 **관련 법령과 대법원 판례**로 명쾌하게 짚어 드릴게요.`,
      gym: `${greetingPrefix}법률·세무 파트너 **한결**이에요.${memoNote} **헬스장·PT 계약서 사진**이나 아래 **약관 샘플**을 눌러 미리보기로 살펴보세요. **방문판매법·약관규제법** 기준에 맞는지, 얼마를 돌려받을 수 있는지 문서를 가리키며 정리해 드릴게요.`,
      tax: `${greetingPrefix}법률·세무 파트너 **한결**이에요.${memoNote} **월세 계약서나 카드 영수증 사진**을 올리거나 **세무 샘플 명세서**를 눌러 미리보기로 확인해 보세요. **부가가치세·종합소득세·연말정산 세액공제** 여부를 한눈에 판정해 드릴게요.`,
    };
    return {
      mood: 'calm' as Mood,
      line: welcomeByTopic[topic],
      text: welcomeByTopic[topic],
      streaming: false,
      messageId: `welcome-${topic}-${session?.userId ?? 'guest'}-${activeProfile.id}`,
    };
  })();

  const starters = STARTER_QUESTIONS[topic];

  if (phase === 'signed-out') {
    return (
      <WelcomeStage
        auth={onyulAuth}
        brandSeal="律"
        brandTitle="온율 · 계약·법률·세무"
        heroImage="/hero-law.webp"
        mascotMood="calm"
        eyebrow="溫律 · 온율 계약·법률·세무"
        headline={
          <>
            반갑습니다.
            <br />내 편이 되어주는 법률·세무 파트너 <span>한결</span>입니다.
          </>
        }
        lede={
          <>
            어려운 계약서 특약과 영수증 세무 처리도 걱정하지 마세요.{' '}
            <b>국가법령정보센터 법령과 대법원 판례</b>를 근거로 문서를 가리키며 쉽게 짚어
            드릴게요.
          </>
        }
        items={WELCOME_ITEMS}
        loginButtonLabel="계정으로 시작하기"
        devLoginLabel="로그인 없이 둘러보기 (빠른 체험)"
        finePrint="로그인하면 맞춤 프로필(임차인·헬스회원·세무유형)과 이전 상담 내역이 계정에 자동 저장됩니다."
        initialNotice={loginNotice}
        onSignedIn={() => {
          void syncAuthToSession();
          setPhase('ready');
        }}
      >
        <div style={{ marginTop: '20px' }}>
          <QuestionStatsDonut
            onSelectCategory={(question) => {
              onyulAuth.devLogin();
              void syncAuthToSession();
              setPhase('ready');
              setInput(question);
            }}
            onOpenSample={(docId) => {
              onyulAuth.devLogin();
              void syncAuthToSession();
              setPhase('ready');
              const found = SAMPLE_DOCS.find((d) => d.id === docId);
              if (found) openSamplePreview(found);
            }}
          />
        </div>
      </WelcomeStage>
    );
  }

  return (
    <div className="app app--chat">
      <header className="topbar">
        <button
          type="button"
          className="brand"
          onClick={() => {
            setTurns([]);
            setTurnIndex(0);
            setCurrentConvId(null);
            setPreviewDoc(null);
          }}
        >
          <span className="brand__seal" aria-hidden="true">
            律
          </span>
          <span className="brand__title">온율 · 계약·법률·세무</span>
        </button>

        <nav className="profiles" aria-label="상담 분야 및 맞춤 프로필 선택">
          <ul className="profiles__list">
            {TOPICS.map((t) => (
              <li key={t.key}>
                <button
                  type="button"
                  className={
                    topic === t.key ? 'profile-chip profile-chip--active' : 'profile-chip'
                  }
                  onClick={() => {
                    setTopic(t.key);
                    const matchedProf = profiles.find((p) => p.topic === t.key);
                    if (matchedProf) setActiveProfileId(matchedProf.id);
                    setPreviewDoc(null);
                  }}
                >
                  <span className={`profile-chip__dot ${t.dotClass}`} aria-hidden="true" />
                  <span>{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <TopbarActions
          session={session}
          convCount={conversations.length}
          cacheHits={cacheStats.hits}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenPersonalization={() => setPersonalizationOpen(true)}
        />
      </header>

      <HistoryDrawer
        open={historyOpen}
        currentConvId={currentConvId}
        conversations={conversations}
        onClose={() => setHistoryOpen(false)}
        onSelectConversation={handleSelectSavedConversation}
        onDeleteConversation={handleDeleteConversation}
        onStartNewConversation={() => {
          setTurns([]);
          setTurnIndex(0);
          setCurrentConvId(null);
          setPreviewDoc(null);
        }}
      />

      <LoginAndProfileModal
        open={personalizationOpen}
        session={session}
        activeProfile={activeProfile}
        savedConvCount={conversations.length}
        cacheStats={cacheStats}
        onClose={() => setPersonalizationOpen(false)}
        onSignInQuick={handleQuickSignIn}
        onSignOut={handleSignOut}
        onSaveProfile={handleSaveProfile}
      />

      <div className="layout layout--chat">
        <aside className="stage stage--chat" aria-label="한결의 법률·세무 브리핑">
          <Narrator
            mood={mascotState.mood}
            line={mascotState.line}
            text={mascotState.text}
            streaming={mascotState.streaming}
            messageId={mascotState.messageId}
          />
        </aside>

        <main className="main">
          <div className="chat">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              data-testid="file-input"
            />

            {!activeTurn && previewDoc && (
              <SamplePreviewCard
                doc={previewDoc}
                busy={busy}
                onClose={() => setPreviewDoc(null)}
                onStartCheck={(doc) => void submitQuery(doc.rawText, doc.mode, undefined, doc)}
              />
            )}

            {!activeTurn && !previewDoc && (
              <section className="suggest" aria-label="시작 안내 및 추천 질문">
                <div className="suggest__header">
                  <span className="suggest__eyebrow">무엇이든 편하게 물어보세요</span>
                  <h2 className="suggest__title">
                    계약서·영수증 사진을 올리거나 샘플 문서를 눌러 미리보기로 살펴보세요
                  </h2>
                </div>

                {/* 누적 의뢰인 질문 통계 원(도넛) 차트 */}
                <QuestionStatsDonut
                  onSelectCategory={(question) => {
                    setInput(question);
                    inputRef.current?.focus();
                  }}
                  onOpenSample={(docId) => {
                    const found = SAMPLE_DOCS.find((d) => d.id === docId);
                    if (found) openSamplePreview(found);
                  }}
                />

                <div
                  className="photo-dropcard"
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div className="photo-dropcard__text">
                    <strong>📷 계약서 · 영수증 사진 바로 첨부하기 (Ctrl+V 붙여넣기 지원)</strong>
                    <span>
                      성명·주민등록번호·연락처·계좌번호는 브라우저에서 자동으로 가린 뒤 안전하게 분석해요
                    </span>
                  </div>
                  <div className="photo-dropcard__actions">
                    <button
                      type="button"
                      className="pill-btn pill-btn--primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      사진 고르기
                    </button>
                    <button
                      type="button"
                      className="pill-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSamplePreview();
                      }}
                      data-testid="sample-btn"
                    >
                      샘플 문서 미리보기
                    </button>
                  </div>
                </div>

                {/* 3종 샘플 문서 미리보기 카드 */}
                <div className="sample-cards-row" aria-label="샘플 문서 미리보기 목록">
                  {SAMPLE_DOCS.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="sample-card-mini"
                      onClick={() => openSamplePreview(doc)}
                      data-testid={`sample-card-${doc.id}`}
                    >
                      <div className="sample-card-mini__top">
                        <span className="sample-card-mini__badge">{doc.badge}</span>
                        <span className="sample-card-mini__preview-tag">📄 미리보기</span>
                      </div>
                      <strong>{doc.docHeader}</strong>
                      <span>{doc.subtitle}</span>
                    </button>
                  ))}
                </div>

                <ul>
                  {starters.map((s) => (
                    <li key={s.label}>
                      <button
                        type="button"
                        className="suggest__item"
                        disabled={busy}
                        onClick={() => void submitQuery(s.prompt, s.mode)}
                      >
                        <span>
                          <span className="suggest__item-tag">{s.tag}</span>
                          {s.label}
                        </span>
                        <IconArrowRight />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {activeTurn && (
              <section className="turn" aria-label="현재 풀이 및 시각화 카드">
                <header className="turn__question">
                  <button
                    type="button"
                    className="turn__step"
                    onClick={() => setTurnIndex((i) => Math.max(0, i - 1))}
                    disabled={turnIndex === 0}
                    aria-label="이전 질문"
                  >
                    ◀
                  </button>
                  <p title={activeTurn.question}>
                    {turns.length > 1 && (
                      <span className="turn__count">
                        {turnIndex + 1}/{turns.length}
                      </span>
                    )}
                    {activeTurn.question}
                  </p>
                  <button
                    type="button"
                    className="turn__step"
                    onClick={() => setTurnIndex((i) => Math.min(turns.length - 1, i + 1))}
                    disabled={turnIndex >= turns.length - 1}
                    aria-label="다음 질문"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    className="turn__reset"
                    onClick={() => {
                      setTurns([]);
                      setTurnIndex(0);
                      setPreviewDoc(null);
                    }}
                  >
                    처음으로
                  </button>
                </header>

                {(activeTurn.maskedSummary || activeTurn.cached) && (
                  <div className="mask-banner" role="status">
                    <span>
                      {activeTurn.maskedSummary
                        ? `🔒 ${activeTurn.maskedSummary}`
                        : '🔒 개인정보 보호 점검 완료'}
                    </span>
                    {activeTurn.cached && (
                      <span className="cache-pill">⚡ 캐시에서 즉시 불러옴</span>
                    )}
                  </div>
                )}

                <VisualDeck items={activeTurn.deck} />
              </section>
            )}

            <div className="dock">
              {activeTurn && activeTurn.followups.length > 0 && !busy && (
                <details ref={followupRef} className="followup">
                  <summary className="followup__toggle">
                    <span>이어서 물어보기</span>
                    <IconChevronDown />
                  </summary>
                  <ul className="next-questions" aria-label="이어서 물어볼 만한 질문">
                    {activeTurn.followups.map((q) => (
                      <li key={q}>
                        <button
                          type="button"
                          onClick={() => {
                            followupRef.current?.removeAttribute('open');
                            void submitQuery(q);
                          }}
                        >
                          {q}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {attachedImage && (
                <div className="attachment-bar" data-testid="attachment-preview">
                  <div className="attachment-bar__left">
                    <img
                      src={attachedImage.dataUrl}
                      alt={attachedImage.name}
                      className="attachment-bar__thumb"
                    />
                    <div className="attachment-bar__meta">
                      <strong>{attachedImage.name}</strong>
                      <span>전송 버튼을 누르면 개인정보를 자동으로 가린 뒤 바로 점검해요</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="attachment-bar__remove"
                    onClick={() => setAttachedImage(null)}
                    aria-label="첨부 이미지 지우기"
                  >
                    ×
                  </button>
                </div>
              )}

              <form className="composer" onSubmit={handleSubmit}>
                <button
                  type="button"
                  className="composer__attach"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={busy}
                  aria-label="계약서 또는 영수증 사진 첨부"
                  data-testid="composer-attach"
                >
                  <span aria-hidden="true">📷</span>
                  <span>사진 첨부</span>
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing &&
                      (input.trim() || attachedImage)
                    ) {
                      e.preventDefault();
                      void submitQuery(input);
                    }
                  }}
                  placeholder={
                    attachedImage
                      ? '사진과 함께 물어볼 내용을 적거나 바로 전송을 눌러주세요'
                      : '계약서·영수증 사진을 첨부하거나 특약·법률·세금 질문을 적어보세요'
                  }
                  disabled={busy}
                  aria-label="한결에게 질문하기"
                  data-testid="composer-input"
                />
                <button
                  className="composer__send"
                  type="submit"
                  disabled={busy || (!input.trim() && !attachedImage)}
                  aria-label="보내기"
                  data-testid="composer-send"
                >
                  <IconArrowUp />
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
