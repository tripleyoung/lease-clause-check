import { Button, Chip, FlexBox, Typography } from '@montage-ui/core';
import { IconCamera, IconCheck, IconCopy, IconImage } from '@montage-ui/icon';
import { useEffect, useRef, useState } from 'react';
import type { CheckResult, ItemResult, Version } from '../shared/types.ts';
import { ResultCard, type PackItemInfo } from './components/ResultCard.tsx';
import { SAMPLES } from './samples.ts';

type PackInfo = { id: string; name: string; kinds: string[]; itemCount: number; items: PackItemInfo[] };
type MaskResult = { masked: string; found: { kind: string; sample: string }[] };
type OcrResult = { text: string; masked: string; found: { kind: string; sample: string }[] };
type VerdictFilter = 'all' | '위험' | '언급 없음' | '보호됨';

type ConsultResult = {
  itemId: string;
  itemTitle: string;
  maskedQuestion: string;
  headline: string;
  analysis: string;
  messageDraft: string;
  followups: string[];
  law: {
    engine?: string;
    mcpEndpoint?: string;
    liveConnected: boolean;
    statute: {
      lawName: string;
      article: string;
      ministry: string;
      effectiveDate: string;
      proclamationNo: string;
      officialUrl: string;
    };
    precedents: Array<{
      id: string;
      caseNumber: string;
      caseName: string;
      courtName: string;
      decisionDate: string;
      summary: string;
      officialUrl: string;
    }>;
  };
};

type TaxCheckResult = {
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
  law: ConsultResult['law'];
};

const CONSULT_PRESETS = [
  '집주인이 다음 세입자가 들어와야 보증금을 돌려준다고 특약에 넣자는데 서명해도 되나요?',
  '보일러 배관 누수 수리비를 모든 수선은 세입자 부담이라는 특약 때문에 제가 다 내야 하나요?',
  '헬스장 PT 20회 중 3회만 받고 환불하려는데 할인가가 아닌 정상가로 차감한다는데 맞나요?',
];

const TAX_PRESETS = [
  { label: '무주택 근로자 월세 85만원 이체', text: '무주택 세대주 직장인입니다. 매달 오피스텔 월세 85만원을 임대인 계좌로 무통장 입금하고 있는데 집주인 동의 없이 연말정산 세액공제가 되나요?', filer: 'wage_earner' as const },
  { label: '업무용 노트북 176만원 세금계산서', text: '개인사업자입니다. 업무용 맥북 프로 1,760,000원(부가세 포함)을 구입하고 전자세금계산서를 발급받았습니다.', filer: 'individual_biz' as const },
  { label: '거래처 식대 68,000원 법인카드', text: '거래처 미팅 저녁 식사로 68,000원을 사업용 신용카드로 결제했습니다. 부가세 매입세액 공제와 종소세 경비 처리가 모두 가능한가요?', filer: 'individual_biz' as const },
  { label: '가정용 마트 생필품 92,000원 결제', text: '주말에 가족 식료품과 생필품 92,000원을 사업용 카드로 결제했습니다. 비용 처리가 가능한가요?', filer: 'individual_biz' as const },
];

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: '서버 응답을 읽지 못했어요.' }));
  if (!res.ok) throw new Error(data.error ?? '점검 중 문제가 생겼어요.');
  return data as T;
}

const ORDER: Record<string, number> = { 위험: 0, '언급 없음': 1, 보호됨: 2 };

const LAYERS = [
  [
    '전송 전 개인정보 가림',
    '계약서에 적힌 주민등록번호, 전화번호, 계좌번호, 동·호수를 정규식으로 먼저 가리고, 비식별화된 전문을 눈으로 확인한 뒤에야 AI를 호출합니다.',
  ],
  [
    '법령 원문 + 수치 규칙 대조',
    '임대료 5% 초과 인상이나 위약금 10% 초과 같은 수치 기준은 코드 규칙으로 먼저 판별하고, 법령·분쟁해결기준 원문을 함께 묶어 조항별로 대조합니다.',
  ],
  [
    '원문 인용 검증과 대안 문구',
    'AI가 인용한 문장이 실제 계약서에 없으면 서버가 즉시 무효화해 헛경고를 차단하고, 현장에서 바로 요청할 수 있는 수정 특약 문구를 제공합니다.',
  ],
];

const SOURCES = [
  ['전월세 임대차 (11개 항목)', '법제처 국가법령정보센터 · 법무부', '주택임대차보호법 제3조·제4조·제6조의3·제7조·제10조, 민법 제623조, 주택임대차표준계약서'],
  ['헬스장·PT 약관 (7개 항목)', '공정거래위원회 · 한국소비자원', '소비자분쟁해결기준(체력단련장업), 계속거래 해지·해제 산정기준, 약관규제법'],
  ['세무·적격증빙 자동 판정', '기획재정부 · 국세청 · 대법원', '부가가치세법 제38조·제39조, 소득세법 제27조·제33조·제160조의2, 조세특례제한법 제95조의2'],
  ['법령 데이터 연동 (OKE MCP)', '법제처 국가법령정보 공동활용 (OpenAPI)', '현행 법령(law) · 대법원 판례(prec) · 행정규칙(admrul) 단일 Rust Law MCP 파드 실시간 대조'],
  ['개인정보 비식별화', '브라우저·서버 정규식 선처리', '주민등록번호, 전화번호, 계좌번호, 동·호수를 AI 호출 전 로컬에서 즉시 치환'],
];

function resizeImage(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(e.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function App() {
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [packId, setPackId] = useState('lease');
  const [text, setText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [version, setVersion] = useState<Version>('v2');
  const [preview, setPreview] = useState<MaskResult | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState<'mask' | 'check' | 'ocr' | 'consult' | 'tax' | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<VerdictFilter>('all');

  const [advisorTab, setAdvisorTab] = useState<'consult' | 'tax'>('consult');
  const [consultItemId, setConsultItemId] = useState<string | undefined>(undefined);
  const [consultQuote, setConsultQuote] = useState('');
  const [consultQuestion, setConsultQuestion] = useState(CONSULT_PRESETS[0]);
  const [consultResult, setConsultResult] = useState<ConsultResult | null>(null);
  const [draftCopied, setDraftCopied] = useState(false);

  const [filerType, setFilerType] = useState<'individual_biz' | 'wage_earner' | 'freelancer'>('wage_earner');
  const [taxText, setTaxText] = useState(TAX_PRESETS[0].text);
  const [taxResult, setTaxResult] = useState<TaxCheckResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const advisorRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/packs')
      .then((r) => r.json())
      .then((d) => setPacks(d.packs))
      .catch(() => setError('점검 종류를 불러오지 못했어요. 새로 고침해 주세요.'));
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [packId]);

  const pack = packs.find((p) => p.id === packId);

  function changeText(v: string) {
    setText(v);
    setPreview(null);
    setResult(null);
    setError('');
  }

  async function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일(jpg, png, webp 등)만 지원해요.');
      return;
    }
    setError('');
    setBusy('ocr');
    setPreview(null);
    setResult(null);

    try {
      const dataUrl = await resizeImage(file);
      setImagePreview(dataUrl);
      const res = await post<OcrResult & MaskResult>({ action: 'ocr', image: dataUrl, pack: packId });
      setText(res.text);
      if (res.masked) {
        setPreview({ masked: res.masked, found: res.found ?? [] });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function showPreview() {
    setBusy('mask');
    setError('');
    setResult(null);
    try {
      setPreview(await post<MaskResult>({ action: 'mask', pack: packId, text }));
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runCheck() {
    setBusy('check');
    setError('');
    setFilter('all');
    try {
      setResult(await post<CheckResult>({ action: 'check', pack: packId, text, version }));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submitConsult(overrideQuestion?: string, overrideItemId?: string, overrideQuote?: string) {
    const q = (overrideQuestion ?? consultQuestion).trim();
    if (!q) return;
    setBusy('consult');
    setError('');
    try {
      const data = await post<ConsultResult>({
        action: 'consult',
        pack: packId,
        itemId: overrideItemId ?? consultItemId,
        question: q,
        quote: overrideQuote ?? consultQuote,
      });
      setConsultResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function handleConsultFromCard(item: ItemResult, title: string) {
    setAdvisorTab('consult');
    setConsultItemId(item.itemId);
    setConsultQuote(item.quote ?? '');
    const q = item.quote
      ? `계약서에 "${item.quote}"라고 적혀 있는데 (${title}), 법적으로 불리한 이유와 상대방에게 수정을 요청할 방법이 궁금합니다.`
      : `"${title}" 항목이 계약서에 빠져 있는데, 어떻게 특약 추가를 요청하면 좋을까요?`;
    setConsultQuestion(q);
    advisorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void submitConsult(q, item.itemId, item.quote ?? '');
  }

  async function copyDraft(draft: string) {
    try {
      await navigator.clipboard.writeText(draft);
      setDraftCopied(true);
      setTimeout(() => setDraftCopied(false), 1800);
    } catch {
      setDraftCopied(false);
    }
  }

  async function submitTax(overrideText?: string, overrideFiler?: 'individual_biz' | 'wage_earner' | 'freelancer') {
    const targetText = (overrideText ?? taxText).trim();
    const targetFiler = overrideFiler ?? filerType;
    if (!targetText) return;
    setBusy('tax');
    setError('');
    try {
      const data = await post<TaxCheckResult>({
        action: 'tax',
        text: targetText,
        filerType: targetFiler,
      });
      setTaxResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const allItems = result ? [...result.items].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]) : [];
  const filteredItems = filter === 'all' ? allItems : allItems.filter((it) => it.verdict === filter);

  const counts = result
    ? {
        위험: 0,
        '언급 없음': 0,
        보호됨: 0,
        ...Object.fromEntries(['위험', '언급 없음', '보호됨'].map((v) => [v, result.items.filter((i) => i.verdict === v).length])),
      }
    : null;

  return (
    <FlexBox flexDirection="column" sx={{ minHeight: '100dvh' }}>
      <FlexBox
        as="header"
        alignItems="center"
        justifyContent="space-between"
        sx={{ height: 56, padding: '0 20px', borderBottom: '1px solid rgba(112,115,124,0.22)', flex: 'none' }}
      >
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <span className="radar-mark" aria-hidden="true" />
          <Typography as="h1" variant="headline1" weight="bold" color="semantic.foreground.neutral.strong" sx={{ margin: 0 }}>
            계약서 특약 점검기
          </Typography>
        </a>
        <nav aria-label="주 메뉴" style={{ display: 'flex', gap: 16, whiteSpace: 'nowrap' }}>
          <a href="#workspace" style={{ textDecoration: 'none' }}>
            <Typography variant="label1" weight="bold" color="semantic.foreground.neutral.strong">
              특약 점검
            </Typography>
          </a>
          <a href="#consult-tax" style={{ textDecoration: 'none' }}>
            <Typography variant="label1" weight="medium" color="semantic.foreground.neutral.tertiary">
              법률 상담·세무 판정
            </Typography>
          </a>
          <a href="/demo-contract.html" style={{ textDecoration: 'none' }}>
            <Typography variant="label1" weight="medium" color="semantic.foreground.neutral.tertiary">
              전자계약 인라인 시험
            </Typography>
          </a>
          <a href="#sources" style={{ textDecoration: 'none' }}>
            <Typography variant="label1" weight="medium" color="semantic.foreground.neutral.tertiary">
              법령 출처
            </Typography>
          </a>
          <a href="#principles" style={{ textDecoration: 'none' }}>
            <Typography variant="label1" weight="medium" color="semantic.foreground.neutral.tertiary">
              작동 원칙
            </Typography>
          </a>
        </nav>
      </FlexBox>

      <main className="page">
        <section className="hero">
          <Typography variant="label2" color="semantic.foreground.neutral.tertiary">
            주택임대차보호법 · 소비자분쟁해결기준 · 국가법령정보센터 기준 대조
          </Typography>
          <Typography as="p" variant="display1" weight="bold" color="semantic.foreground.neutral.strong" sx={{ margin: '12px 0 16px' }}>
            서명 전 계약서의 불리한 조항을
            <br />
            <span style={{ color: '#5b37ed' }}>근거 법령과 비교</span>해서 알려 드립니다.
          </Typography>
          <Typography variant="body1" color="semantic.foreground.neutral.secondary" sx={{ maxWidth: 660 }}>
            전월세 특약이나 헬스장·PT 약관을 넣으면 주민등록번호·전화번호·계좌번호를 먼저 가린 뒤, 법정 점검 항목별로 위험한 문구와 누락된 보호 조항을 짚어 드립니다.
          </Typography>
          <FlexBox gap={12} alignItems="center" sx={{ marginTop: 24, flexWrap: 'wrap' }}>
            <a href="#workspace" style={{ textDecoration: 'none' }}>
              <Button variant="solid" size="large">
                계약서 바로 점검하기
              </Button>
            </a>
            <a href="/demo-contract.html" style={{ textDecoration: 'none' }}>
              <Button variant="outlined" color="assistive" size="large">
                전자계약 인라인 시험 보기
              </Button>
            </a>
          </FlexBox>
        </section>

        <section aria-labelledby="layers-title">
          <Typography id="layers-title" as="h2" variant="title3" weight="bold">
            세 단계로 검증합니다
          </Typography>
          <ol className="cards">
            {LAYERS.map(([title, body], i) => (
              <li key={title} className="card">
                <span className="num">{i + 1}</span>
                <Typography as="h3" variant="headline1" weight="bold">
                  {title}
                </Typography>
                <Typography variant="body2" color="semantic.foreground.neutral.secondary">
                  {body}
                </Typography>
              </li>
            ))}
          </ol>
        </section>

        <section id="workspace" className="workspace-section" aria-labelledby="workspace-title">
          <Typography id="workspace-title" as="h2" variant="title3" weight="bold">
            계약서 점검 작업대
          </Typography>

          <div className="pack-bar" role="radiogroup" aria-label="계약 종류">
            {packs.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === packId}
                className={p.id === packId ? 'pack-tab on' : 'pack-tab'}
                onClick={() => {
                  setPackId(p.id);
                  changeText('');
                  setImagePreview(null);
                }}
              >
                <Typography variant="headline2" weight="bold" color={p.id === packId ? 'semantic.foreground.neutral.strong' : 'semantic.foreground.neutral.secondary'}>
                  {p.name}
                </Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                  {p.kinds.join(' · ')} · {p.itemCount}개 항목
                </Typography>
              </button>
            ))}
          </div>

          <div className="input-card">
            <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
              <FlexBox alignItems="center" gap={8} sx={{ flexWrap: 'wrap' }}>
                <Typography variant="label2" color="semantic.foreground.neutral.tertiary">
                  예시 넣기
                </Typography>
                {SAMPLES.filter((s) => s.pack === packId).map((s) => (
                  <Chip key={s.label} variant="outlined" size="small" onClick={() => changeText(s.text)}>
                    {s.label}
                  </Chip>
                ))}
              </FlexBox>

              <FlexBox alignItems="center" gap={8}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                />
                <Button
                  variant="outlined"
                  color="assistive"
                  size="small"
                  disabled={busy !== null}
                  onClick={() => cameraInputRef.current?.click()}
                  leadingContent={<IconCamera />}
                >
                  사진 촬영
                </Button>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                />
                <Button
                  variant="outlined"
                  color="assistive"
                  size="small"
                  disabled={busy !== null}
                  onClick={() => fileInputRef.current?.click()}
                  leadingContent={<IconImage />}
                >
                  이미지 파일
                </Button>
              </FlexBox>
            </FlexBox>

            {imagePreview && (
              <div className="image-strip">
                <img src={imagePreview} alt="업로드된 계약서 사진" className="image-thumb" />
                <div style={{ flex: 1 }}>
                  <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.strong">
                    계약서 이미지에서 문구를 읽었습니다
                  </Typography>
                  <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                    아래 입력창에서 추출된 문구를 확인하거나 수정할 수 있습니다.
                  </Typography>
                </div>
                <Button
                  variant="outlined"
                  color="assistive"
                  size="small"
                  onClick={() => {
                    setImagePreview(null);
                    setText('');
                  }}
                >
                  제거
                </Button>
              </div>
            )}

            {busy === 'ocr' && (
              <p className="callout">계약서 사진에서 특약 조항을 읽고 있습니다…</p>
            )}

            <textarea
              aria-label="계약 문구"
              value={text}
              onChange={(e) => changeText(e.target.value)}
              placeholder={
                '계약서 특약사항이나 약관 문구를 붙여 넣으세요. (Ctrl+V로 캡처 이미지를 바로 붙여넣어도 됩니다)\n\n예)\n특약사항\n1. 보증금은 다음 임차인이 들어오면 반환한다.\n2. 입주 후 모든 수선비는 임차인이 부담한다.'
              }
              rows={7}
            />

            <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
              <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                {text.trim().length.toLocaleString('ko-KR')} / 4,000자 · 개인정보는 가린 뒤 전송됩니다
              </Typography>
              <Button variant="solid" size="medium" onClick={showPreview} disabled={busy !== null}>
                {busy === 'mask' ? '확인하는 중…' : '보낼 내용 미리 보기'}
              </Button>
            </FlexBox>
          </div>

          {error && (
            <p className="callout" data-level="error" role="alert">
              {error}
            </p>
          )}

          {preview && (
            <section ref={previewRef} className="preview-block" aria-labelledby="step3">
              <FlexBox alignItems="baseline" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
                <Typography id="step3" as="h3" variant="headline1" weight="bold">
                  AI에 전송할 내용 확인
                </Typography>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                  {preview.found.length
                    ? `개인정보 ${preview.found.length}건 가림 완료 (${[...new Set(preview.found.map((f) => f.kind))].join(', ')})`
                    : '감지된 개인정보 없음'}
                </Typography>
              </FlexBox>
              <pre className="masked" data-testid="masked-preview">
                {preview.masked}
              </pre>
              <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
                <details className="dev">
                  <summary>판정 방식 선택 ({version})</summary>
                  <label>
                    방식
                    <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
                      <option value="v0">v0 · 자유 질의</option>
                      <option value="v1">v1 · 항목 + 원문 인용</option>
                      <option value="v2">v2 · 근거 법령 + 규칙 검사 + 보정</option>
                    </select>
                  </label>
                </details>
                <Button variant="solid" size="large" onClick={runCheck} disabled={busy !== null}>
                  {busy === 'check' ? '법령 대조 및 점검 중…' : '이 내용으로 점검하기'}
                </Button>
              </FlexBox>
            </section>
          )}
        </section>

        {result && (
          <section ref={resultRef} className="result-section" aria-labelledby="step4">
            <FlexBox alignItems="baseline" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
              <Typography id="step4" as="h2" variant="title3" weight="bold">
                점검 결과
              </Typography>
              <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                소요 시간 {Math.round(result.elapsedMs / 100) / 10}초 · 항목을 클릭해 필터링할 수 있습니다
              </Typography>
            </FlexBox>

            {counts && (
              <div className="stats" role="status">
                <button
                  type="button"
                  className={`stat ${filter === 'all' ? 'on' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  <Typography variant="caption2" color="semantic.foreground.neutral.tertiary">
                    전체 점검 항목
                  </Typography>
                  <Typography variant="heading2" weight="bold" color="semantic.foreground.neutral.strong">
                    {allItems.length}건
                  </Typography>
                </button>
                <button
                  type="button"
                  className={`stat ${filter === '위험' ? 'on' : ''}`}
                  onClick={() => setFilter(filter === '위험' ? 'all' : '위험')}
                >
                  <Typography variant="caption2" color="semantic.foreground.neutral.tertiary">
                    위험
                  </Typography>
                  <Typography variant="heading2" weight="bold" sx={{ color: '#e52222' }}>
                    {counts.위험}건
                  </Typography>
                </button>
                <button
                  type="button"
                  className={`stat ${filter === '언급 없음' ? 'on' : ''}`}
                  onClick={() => setFilter(filter === '언급 없음' ? 'all' : '언급 없음')}
                >
                  <Typography variant="caption2" color="semantic.foreground.neutral.tertiary">
                    언급 없음 · 확인 필요
                  </Typography>
                  <Typography variant="heading2" weight="bold" sx={{ color: '#9c5800' }}>
                    {counts['언급 없음']}건
                  </Typography>
                </button>
                <button
                  type="button"
                  className={`stat ${filter === '보호됨' ? 'on' : ''}`}
                  onClick={() => setFilter(filter === '보호됨' ? 'all' : '보호됨')}
                >
                  <Typography variant="caption2" color="semantic.foreground.neutral.tertiary">
                    보호됨
                  </Typography>
                  <Typography variant="heading2" weight="bold" sx={{ color: '#0066ff' }}>
                    {counts.보호됨}건
                  </Typography>
                </button>
              </div>
            )}

            {result.referenceOnly && (
              <p className="callout">
                <strong>전용 점검팩이 없는 계약입니다.</strong> 정해진 법령 항목 대신 일반 원칙으로 불리한 조항을 안내해 드립니다.
                {result.note && <span style={{ display: 'block', marginTop: 6 }}>{result.note}</span>}
              </p>
            )}

            <div className="clause-list">
              {filteredItems.map((it) => (
                <ResultCard
                  key={it.itemId}
                  item={it}
                  info={pack?.items.find((i) => i.id === it.itemId)}
                  onConsult={handleConsultFromCard}
                />
              ))}
            </div>
          </section>
        )}

        <section ref={advisorRef} id="consult-tax" className="workspace-section" aria-labelledby="consult-tax-title">
          <FlexBox alignItems="baseline" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
            <div>
              <Typography id="consult-tax-title" as="h2" variant="title3" weight="bold">
                법령·판례 실시간 상담 &amp; 세무 자동 판정
              </Typography>
              <Typography variant="body2" color="semantic.foreground.neutral.secondary" sx={{ marginTop: 4 }}>
                OKE 클러스터 단일 Rust Law MCP 파드(<code>https://webrtc.ugot.uk/law/mcp</code>)에서 현행 법령·세법 조문과 대법원 판례를 실시간 조회해 고정한 뒤, 문자 초안과 후속 질문까지 이어서 안내합니다.
              </Typography>
            </div>
            <span className="mcp-live-badge">OKE Rust Law MCP 연동 · 파드 증설 0</span>
          </FlexBox>

          <div className="pack-bar" role="tablist" aria-label="상담 및 세무 모드 선택">
            <button
              type="button"
              role="tab"
              aria-selected={advisorTab === 'consult'}
              className={advisorTab === 'consult' ? 'pack-tab on' : 'pack-tab'}
              onClick={() => setAdvisorTab('consult')}
            >
              <Typography variant="headline2" weight="bold" color={advisorTab === 'consult' ? 'semantic.foreground.neutral.strong' : 'semantic.foreground.neutral.secondary'}>
                계약·특약 법률 상담
              </Typography>
              <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                법령·대법원 판례 근거 해설 + 상대방 전달용 문자 초안 + 후속 질문 3선
              </Typography>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={advisorTab === 'tax'}
              className={advisorTab === 'tax' ? 'pack-tab on' : 'pack-tab'}
              onClick={() => setAdvisorTab('tax')}
            >
              <Typography variant="headline2" weight="bold" color={advisorTab === 'tax' ? 'semantic.foreground.neutral.strong' : 'semantic.foreground.neutral.secondary'}>
                영수증·계약서 세무 자동 판정
              </Typography>
              <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                부가가치세법·소득세법·조세특례제한법 + 적격증빙(3만원) + 홈택스 실무 가이드
              </Typography>
            </button>
          </div>

          {advisorTab === 'consult' ? (
            <div className="input-card" data-testid="consult-panel">
              <FlexBox alignItems="center" gap={8} sx={{ flexWrap: 'wrap' }}>
                <Typography variant="label2" color="semantic.foreground.neutral.tertiary">
                  자주 묻는 상담
                </Typography>
                {CONSULT_PRESETS.map((q, idx) => (
                  <Chip
                    key={idx}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setConsultItemId(undefined);
                      setConsultQuote('');
                      setConsultQuestion(q);
                      void submitConsult(q, undefined, '');
                    }}
                  >
                    {q.slice(0, 26)}…
                  </Chip>
                ))}
              </FlexBox>

              <textarea
                aria-label="법률 상담 질문"
                value={consultQuestion}
                onChange={(e) => setConsultQuestion(e.target.value)}
                rows={3}
                placeholder="특약 조항이나 계약 분쟁 상황을 입력해 주세요. (주민번호·전화번호·계좌번호는 자동 마스킹됩니다)"
              />

              <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                  국가법령정보센터(open.law.go.kr) 현행 조문·대법원 판례 고정 대조 방식
                </Typography>
                <Button variant="solid" size="medium" disabled={busy !== null} onClick={() => void submitConsult()}>
                  {busy === 'consult' ? '법령·판례 조회 및 상담 생성 중…' : '법령·판례 근거로 상담받기'}
                </Button>
              </FlexBox>

              {consultResult && (
                <div className="advisor-result" data-testid="consult-result">
                  <div className="advisor-headline-box">
                    <div className="advisor-meta-row">
                      <span className="verdict-chip safe">{consultResult.itemTitle}</span>
                      <span className="advisor-law-tag">
                        {consultResult.law.statute.lawName} · {consultResult.law.statute.article}
                      </span>
                      <a
                        href={consultResult.law.statute.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="law-ext-link"
                      >
                        법령 원문 ↗
                      </a>
                    </div>
                    <Typography as="h3" variant="headline1" weight="bold" color="semantic.foreground.neutral.strong" sx={{ marginTop: 8 }}>
                      {consultResult.headline}
                    </Typography>
                    <Typography variant="body2" color="semantic.foreground.neutral.secondary" sx={{ marginTop: 8 }}>
                      {consultResult.analysis}
                    </Typography>
                  </div>

                  <div className="advisor-draft-box">
                    <FlexBox alignItems="center" justifyContent="space-between" gap={8} sx={{ marginBottom: 8 }}>
                      <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.strong">
                        임대인·중개사·사업자 전달용 정중 문자 초안
                      </Typography>
                      <Button
                        variant="outlined"
                        color="assistive"
                        size="small"
                        onClick={() => void copyDraft(consultResult.messageDraft)}
                        leadingContent={draftCopied ? <IconCheck /> : <IconCopy />}
                      >
                        {draftCopied ? '복사 완료' : '문자 초안 복사'}
                      </Button>
                    </FlexBox>
                    <pre className="advisor-draft-text">{consultResult.messageDraft}</pre>
                  </div>

                  {consultResult.law.precedents.length > 0 && (
                    <div className="prec-block">
                      <div className="prec-head">인용된 대법원 판례 (OKE Rust Law MCP 실시간 연동)</div>
                      <ul className="prec-list">
                        {consultResult.law.precedents.slice(0, 2).map((p) => (
                          <li key={p.id || p.caseNumber} className="prec-item">
                            <div className="prec-title-row">
                              <span className="prec-case">
                                {p.courtName} {p.decisionDate} 선고 <strong>{p.caseNumber}</strong>
                              </span>
                              <a href={p.officialUrl} target="_blank" rel="noreferrer" className="law-ext-link">
                                판례 전문 ↗
                              </a>
                            </div>
                            {p.caseName && <div className="prec-name">{p.caseName}</div>}
                            {p.summary && <p className="prec-summary">{p.summary}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="followup-block">
                    <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.secondary">
                      이어서 물어보기 (클릭 시 즉시 법령 대조)
                    </Typography>
                    <div className="followup-list">
                      {consultResult.followups.map((fq, i) => (
                        <button
                          key={i}
                          type="button"
                          className="followup-chip"
                          onClick={() => {
                            setConsultQuestion(fq);
                            void submitConsult(fq, consultResult.itemId, '');
                          }}
                        >
                          <span>Q{i + 1}. {fq}</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="input-card" data-testid="tax-panel">
              <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
                <FlexBox alignItems="center" gap={8} sx={{ flexWrap: 'wrap' }}>
                  <Typography variant="label2" color="semantic.foreground.neutral.tertiary">
                    납세자 유형
                  </Typography>
                  {([
                    ['wage_earner', '근로소득자 (연말정산·월세공제)'],
                    ['individual_biz', '개인사업자 (일반과세·종소세)'],
                    ['freelancer', '프리랜서 (3.3% 사업소득)'],
                  ] as const).map(([id, label]) => (
                    <Chip
                      key={id}
                      variant={filerType === id ? 'solid' : 'outlined'}
                      size="small"
                      onClick={() => setFilerType(id)}
                    >
                      {label}
                    </Chip>
                  ))}
                </FlexBox>
              </FlexBox>

              <FlexBox alignItems="center" gap={8} sx={{ flexWrap: 'wrap' }}>
                <Typography variant="label2" color="semantic.foreground.neutral.tertiary">
                  영수증·거래 예시
                </Typography>
                {TAX_PRESETS.map((preset) => (
                  <Chip
                    key={preset.label}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setFilerType(preset.filer);
                      setTaxText(preset.text);
                      void submitTax(preset.text, preset.filer);
                    }}
                  >
                    {preset.label}
                  </Chip>
                ))}
              </FlexBox>

              <textarea
                aria-label="세무 판정 대상 문구"
                value={taxText}
                onChange={(e) => setTaxText(e.target.value)}
                rows={3}
                placeholder="영수증·거래명세서 내역이나 월세·경비 지출 내역을 입력해 주세요."
              />

              <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
                <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
                  부가가치세법 제38·39조 · 소득세법 제27·33·160조의2 · 조세특례제한법 제95조의2 실시간 대조
                </Typography>
                <Button variant="solid" size="medium" disabled={busy !== null} onClick={() => void submitTax()}>
                  {busy === 'tax' ? '세법 조문·세무 판례 대조 중…' : '세법·홈택스 기준 판정하기'}
                </Button>
              </FlexBox>

              {taxResult && (
                <div className="advisor-result" data-testid="tax-result">
                  <div className="tax-grid">
                    <div className="tax-metric">
                      <span className="tax-metric-label">부가가치세 판정</span>
                      <strong className="tax-metric-val">{taxResult.vatVerdict}</strong>
                    </div>
                    <div className="tax-metric">
                      <span className="tax-metric-label">소득세·연말정산 판정</span>
                      <strong className="tax-metric-val">{taxResult.incomeTaxVerdict}</strong>
                    </div>
                    <div className="tax-metric">
                      <span className="tax-metric-label">권장 계정과목·분류</span>
                      <strong className="tax-metric-val">{taxResult.accountTitle}</strong>
                    </div>
                  </div>

                  <div className="advisor-headline-box">
                    <div className="advisor-meta-row">
                      <span className="advisor-law-tag">
                        {taxResult.law.statute.lawName} · {taxResult.law.statute.article}
                      </span>
                      <a
                        href={taxResult.law.statute.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="law-ext-link"
                      >
                        세법 조문 원문 ↗
                      </a>
                    </div>
                    <Typography as="h3" variant="headline1" weight="bold" color="semantic.foreground.neutral.strong" sx={{ marginTop: 8 }}>
                      {taxResult.headline}
                    </Typography>
                    <Typography variant="body2" color="semantic.foreground.neutral.secondary" sx={{ marginTop: 8 }}>
                      {taxResult.analysis}
                    </Typography>
                  </div>

                  <div className="advisor-draft-box">
                    <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.strong">
                      적격증빙(3만 원 기준) 점검 및 국세청 홈택스(Hometax) 처리 가이드
                    </Typography>
                    <p style={{ margin: '6px 0 4px', fontSize: 13, color: '#171719', fontWeight: 600 }}>
                      · 증빙 상태: {taxResult.evidenceStatus}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(46,47,51,0.88)', lineHeight: 1.6 }}>
                      · 홈택스 경로: {taxResult.hometaxGuide}
                    </p>
                  </div>

                  {taxResult.law.precedents.length > 0 && (
                    <div className="prec-block">
                      <div className="prec-head">관련 대법원 세무 판례 (OKE Rust Law MCP 실시간 연동)</div>
                      <ul className="prec-list">
                        {taxResult.law.precedents.slice(0, 2).map((p) => (
                          <li key={p.id || p.caseNumber} className="prec-item">
                            <div className="prec-title-row">
                              <span className="prec-case">
                                {p.courtName} {p.decisionDate} 선고 <strong>{p.caseNumber}</strong>
                              </span>
                              <a href={p.officialUrl} target="_blank" rel="noreferrer" className="law-ext-link">
                                판례 전문 ↗
                              </a>
                            </div>
                            {p.caseName && <div className="prec-name">{p.caseName}</div>}
                            {p.summary && <p className="prec-summary">{p.summary}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="followup-block">
                    <Typography variant="label2" weight="bold" color="semantic.foreground.neutral.secondary">
                      이어서 물어보기 (클릭 시 세법 조문 즉시 대조)
                    </Typography>
                    <div className="followup-list">
                      {taxResult.followups.map((fq, i) => (
                        <button
                          key={i}
                          type="button"
                          className="followup-chip"
                          onClick={() => {
                            setTaxText(fq);
                            void submitTax(fq, filerType);
                          }}
                        >
                          <span>Q{i + 1}. {fq}</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section id="sources" aria-labelledby="sources-title">
          <Typography id="sources-title" as="h2" variant="title3" weight="bold">
            법령 및 기준 출처
          </Typography>
          <Typography variant="body2" color="semantic.foreground.neutral.secondary">
            모든 판정은 AI의 임의 추측이 아닌 공식 법령과 행정 규칙 원문을 함께 묶어 대조합니다.
          </Typography>
          <table className="sources">
            <thead>
              <tr>
                <th scope="col">대상 영역</th>
                <th scope="col">근거 기관</th>
                <th scope="col">적용 법령 및 기준</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map(([field, org, use]) => (
                <tr key={field}>
                  <td>{field}</td>
                  <td>{org}</td>
                  <td>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section id="principles" aria-labelledby="principles-title">
          <Typography id="principles-title" as="h2" variant="title3" weight="bold">
            지키는 원칙
          </Typography>
          <ul className="principles">
            <li>
              <strong>개인정보를 AI로 보내지 않습니다.</strong> 주민등록번호, 전화번호, 계좌번호, 동·호수는 전송 전에 가려지며, 사용자가 가려진 전문을 직접 확인한 뒤에야 점검이 실행됩니다.
            </li>
            <li>
              <strong>계약서에 없는 문구를 지어내지 않습니다.</strong> AI가 근거로 인용한 문장이 실제 입력 원문에 존재하지 않으면 서버가 즉시 무효화하여 헛경고(환각)를 차단합니다.
            </li>
            <li>
              <strong>법률 자문을 대체하지 않습니다.</strong> 본 도구는 서명 전 위험 신호를 빠르게 점검하는 체크리스트이며, 실제 계약 체결 전에는 공인중개사 또는 법률 전문가와 상의하시기 바랍니다.
            </li>
          </ul>
        </section>

        <footer className="footer">
          <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
            계약서 특약 점검기 · 주택임대차보호법 및 소비자분쟁해결기준 기반 · 디자인 시스템: Montage by Wantedlab (MIT)
          </Typography>
        </footer>
      </main>
    </FlexBox>
  );
}
