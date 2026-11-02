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
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1>계약서 특약 점검기</h1>
              <p className="brand-sub">주택임대차보호법 · 소비자분쟁해결기준 기반 조항 대조 시스템</p>
            </div>
          </div>
          <div className="trust-pills" aria-label="핵심 보장 기준">
            <span className="trust-pill">개인정보 사전 마스킹</span>
            <span className="trust-pill">원문 인용 검증</span>
            <span className="trust-pill">법령 조문 대조</span>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="panel pack-selector-panel" aria-labelledby="step1">
          <div className="section-head">
            <span className="step-num">STEP 01</span>
            <h2 id="step1">점검할 계약서 유형 선택</h2>
          </div>
          <div className="seg" role="radiogroup" aria-label="계약 종류">
            {packs.map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={p.id === packId}
                className={p.id === packId ? 'on' : ''}
                onClick={() => {
                  setPackId(p.id);
                  changeText('');
                  setImagePreview(null);
                }}
              >
                <div className="seg-top">
                  <span className="seg-title">{p.name}</span>
                  <span className="seg-count">{p.itemCount}개 법정 점검항목</span>
                </div>
                <span className="sub">{p.kinds.join(' · ')}</span>
              </button>
            ))}
          </div>
        </section>

        <div className={`workbench ${result ? 'has-result' : ''}`}>
          <div className="workbench-input">
            <section className="panel document-panel" aria-labelledby="step2">
              <div className="step2-header">
                <div className="section-head">
                  <span className="step-num">STEP 02</span>
                  <h2 id="step2">계약서 원문 입력 또는 사진 스캔</h2>
                </div>
                <div className="image-actions">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    ref={cameraInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                  />
                  <button
                    type="button"
                    className="btn-upload"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={busy !== null}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>카메라 촬영</span>
                  </button>

                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                  />
                  <button
                    type="button"
                    className="btn-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy !== null}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span>이미지 파일</span>
                  </button>
                </div>
              </div>

              <div className="sample-bar">
                <span className="sample-bar-label">샘플 문구 불러오기</span>
                <div className="samples">
                  {SAMPLES.filter((s) => s.pack === packId).map((s) => (
                    <button key={s.label} type="button" className="sample-chip" onClick={() => changeText(s.text)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {imagePreview && (
                <div className="image-preview-container">
                  <div className="image-preview-card">
                    <img src={imagePreview} alt="업로드된 계약서 사진" className="image-thumb" />
                    <div className="image-preview-info">
                      <strong>계약서 이미지 스캔 완료</strong>
                      <span className="muted">문서 내 특약 조항 텍스트를 추출했습니다.</span>
                    </div>
                    <button
                      type="button"
                      className="link-btn-danger"
                      onClick={() => {
                        setImagePreview(null);
                        setText('');
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}

              {busy === 'ocr' && (
                <div className="ocr-loading-box">
                  <span className="spinner" />
                  <span>계약서 이미지에서 특약 조항을 판독하고 있습니다…</span>
                </div>
              )}

              <div className="editor-sheet">
                <textarea
                  aria-label="계약 문구"
                  value={text}
                  onChange={(e) => changeText(e.target.value)}
                  placeholder={
                    '계약서의 특약사항이나 약관 문구를 붙여 넣으세요.\n화면 캡처 이미지를 바로 붙여넣기(Ctrl+V / Cmd+V) 하셔도 자동으로 인식됩니다.\n\n[입력 예시]\n특약사항\n1. 보증금은 다음 임차인이 들어오면 반환한다.\n2. 입주 후 모든 수선비는 임차인이 부담한다.'
                  }
                  rows={8}
                />
                <div className="editor-footer">
                  <span className="char-counter">{text.trim().length.toLocaleString('ko-KR')} / 4,000자</span>
                  <span className="paste-hint">Ctrl+V 이미지 바로 붙여넣기 지원</span>
                </div>
              </div>

              <button type="button" className="primary" onClick={showPreview} disabled={busy !== null}>
                {busy === 'mask' ? '개인정보 마스킹 확인 중…' : '보낼 내용 미리 보기'}
              </button>
            </section>

            {preview && (
              <section ref={previewRef} className="panel privacy-panel" aria-labelledby="step3">
                <div className="privacy-header">
                  <div className="section-head">
                    <span className="step-num">STEP 03</span>
                    <h2 id="step3">개인정보 가림막 검증</h2>
                  </div>
                  <span className={`privacy-badge ${preview.found.length ? 'masked-active' : ''}`}>
                    {preview.found.length
                      ? `민감정보 ${preview.found.length}건 자동 치환됨 (${[...new Set(preview.found.map((f) => f.kind))].join(', ')})`
                      : '노출된 개인정보 없음'}
                  </span>
                </div>
                <p className="privacy-desc">
                  AI 모델에는 원본 계약서의 실명·주민등록번호·연락처·계좌번호가 절대 전송되지 않으며, 아래의 비식별화된 텍스트만 전달됩니다.
                </p>
                <pre className="masked" data-testid="masked-preview">
                  {preview.masked}
                </pre>
                <div className="privacy-actions">
                  <details className="dev">
                    <summary>판정 엔진 설정</summary>
                    <label>
                      점검 방식
                      <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
                        <option value="v0">v0 · 기본 프롬프트</option>
                        <option value="v1">v1 · 항목별 원문 인용 강제</option>
                        <option value="v2">v2 · 법령 근거 + 규칙 선검사 + 서버 보정 (권장)</option>
                      </select>
                    </label>
                  </details>
                  <button type="button" className="primary check-cta" onClick={runCheck} disabled={busy !== null}>
                    {busy === 'check' ? '법령 대조 및 조항 정밀 분석 중…' : '이 내용으로 점검하기'}
                  </button>
                </div>
              </section>
            )}

            {error && (
              <div className="error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          {result && (
            <section ref={resultRef} className="panel result-panel" aria-labelledby="step4">
              <div className="result-header">
                <div className="section-head">
                  <span className="step-num">REPORT</span>
                  <h2 id="step4">계약서 법령 대조 리포트</h2>
                </div>
                <span className="elapsed">분석 소요 {Math.round(result.elapsedMs / 100) / 10}초</span>
              </div>

              {counts && (
                <>
                  <div className="summary-dashboard" role="status">
                    <button
                      type="button"
                      className={`metric-card risk ${filter === '위험' ? 'active' : ''}`}
                      onClick={() => setFilter(filter === '위험' ? 'all' : '위험')}
                    >
                      <span className="metric-label">위험 조항</span>
                      <strong className="metric-val">{counts.위험}건</strong>
                    </button>
                    <button
                      type="button"
                      className={`metric-card none ${filter === '언급 없음' ? 'active' : ''}`}
                      onClick={() => setFilter(filter === '언급 없음' ? 'all' : '언급 없음')}
                    >
                      <span className="metric-label">언급 없음 · 확인 필요</span>
                      <strong className="metric-val">{counts['언급 없음']}건</strong>
                    </button>
                    <button
                      type="button"
                      className={`metric-card safe ${filter === '보호됨' ? 'active' : ''}`}
                      onClick={() => setFilter(filter === '보호됨' ? 'all' : '보호됨')}
                    >
                      <span className="metric-label">보호됨</span>
                      <strong className="metric-val">{counts.보호됨}건</strong>
                    </button>
                  </div>

                  {filter !== 'all' && (
                    <div className="filter-notice">
                      <span>‘{filter}’ 항목만 표시하고 있습니다 ({filteredItems.length}건)</span>
                      <button type="button" className="link" onClick={() => setFilter('all')}>
                        전체 항목 보기 ({allItems.length}건)
                      </button>
                    </div>
                  )}
                </>
              )}

              {result.referenceOnly && (
                <div className="ref-note">
                  <p>
                    <strong>전용 점검팩이 없는 계약 유형입니다.</strong> 일반 계약 원칙을 바탕으로 불리한 조항 여부를 안내해 드립니다.
                  </p>
                  {result.note && <p className="free">{result.note}</p>}
                </div>
              )}

              <div className="cards">
                {filteredItems.map((it) => (
                  <ResultCard key={it.itemId} item={it} info={pack?.items.find((i) => i.id === it.itemId)} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="foot">
        <p>
          본 서비스는 주택임대차보호법·민법·소비자분쟁해결기준 등 공공 법령 문서를 근거로 계약서 조항의 위험도를 사전 점검하는 참고 도구입니다.
          법률 자문을 대체하지 않으므로 중요 계약 체결 전에는 법률 전문가 또는 공인중개사와 반드시 확인하시기 바랍니다.
        </p>
      </footer>
    </div>
  );
}
