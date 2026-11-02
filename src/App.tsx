import { Button, Chip, FlexBox, Typography } from '@montage-ui/core';
import { IconCamera, IconImage } from '@montage-ui/icon';
import { useEffect, useRef, useState } from 'react';
import type { CheckResult, Version } from '../shared/types.ts';
import { ResultCard, type PackItemInfo } from './components/ResultCard.tsx';
import { SAMPLES } from './samples.ts';

type PackInfo = { id: string; name: string; kinds: string[]; itemCount: number; items: PackItemInfo[] };
type MaskResult = { masked: string; found: { kind: string; sample: string }[] };
type OcrResult = { text: string; masked: string; found: { kind: string; sample: string }[] };
type VerdictFilter = 'all' | '위험' | '언급 없음' | '보호됨';

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

const SOURCES = [
  ['전월세 임대차 (11개 항목)', '법제처 국가법령정보센터 · 법무부', '주택임대차보호법 제3조·제4조·제6조의3·제7조·제10조, 민법 제623조, 주택임대차표준계약서'],
  ['헬스장·PT 약관 (7개 항목)', '공정거래위원회 · 한국소비자원', '소비자분쟁해결기준(체력단련장업), 계속거래 등의 해지·해제에 관한 산정기준, 약관규제법'],
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
  const [busy, setBusy] = useState<'mask' | 'check' | 'ocr' | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<VerdictFilter>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const resultRef = useRef<HTMLElement>(null);

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
            주택임대차보호법 · 소비자분쟁해결기준 · 표준계약서 대조
          </Typography>
          <Typography as="p" variant="display1" weight="bold" color="semantic.foreground.neutral.strong" sx={{ margin: '10px 0 14px' }}>
            서명 전 계약서의 불리한 조항을
            <br />
            <span style={{ color: '#5b37ed' }}>근거 법령과 비교</span>해서 알려 드립니다.
          </Typography>
          <Typography variant="body1" color="semantic.foreground.neutral.secondary" sx={{ maxWidth: 680 }}>
            전월세 특약이나 헬스장·PT 약관을 넣으면 주민등록번호·전화번호·계좌번호를 먼저 가린 뒤, 법정 점검 항목별로 위험한 문구와 누락된 보호 조항을 짚어 드립니다.
          </Typography>
        </section>

        <section id="workspace" className="workspace-section" aria-label="계약서 점검 작업대">
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
                <Typography id="step3" as="h2" variant="title3" weight="bold">
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
                <ResultCard key={it.itemId} item={it} info={pack?.items.find((i) => i.id === it.itemId)} />
              ))}
            </div>
          </section>
        )}

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
