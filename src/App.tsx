import { useEffect, useRef, useState } from 'react';
import type { CheckResult, Version } from '../shared/types.ts';
import { ResultCard, type PackItemInfo } from './components/ResultCard.tsx';
import { SAMPLES } from './samples.ts';

type PackInfo = { id: string; name: string; kinds: string[]; itemCount: number; items: PackItemInfo[] };
type MaskResult = { masked: string; found: { kind: string; sample: string }[] };
type OcrResult = { text: string; masked: string; found: { kind: string; sample: string }[] };

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/packs')
      .then((r) => r.json())
      .then((d) => setPacks(d.packs))
      .catch(() => setError('점검 종류를 불러오지 못했어요. 새로 고침해 주세요.'));
  }, []);

  // 클립보드 이미지 붙여넣기(Paste) 지원
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runCheck() {
    setBusy('check');
    setError('');
    try {
      setResult(await post<CheckResult>({ action: 'check', pack: packId, text, version }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const items = result ? [...result.items].sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]) : [];
  const counts = result
    ? {
        위험: 0,
        '언급 없음': 0,
        보호됨: 0,
        ...Object.fromEntries(['위험', '언급 없음', '보호됨'].map((v) => [v, result.items.filter((i) => i.verdict === v).length])),
      }
    : null;

  return (
    <div className="page">
      <header className="hero">
        <h1>계약서 특약 점검기</h1>
        <p>계약서 사진을 찍거나 문구를 붙여 넣으면, Gemini AI가 숨은 독소 조항과 구체적 리스크를 정밀 분석해 드려요.</p>
      </header>

      <section className="panel" aria-labelledby="step1">
        <h2 id="step1">1. 무슨 계약인가요?</h2>
        <div className="seg" role="radiogroup" aria-label="계약 종류">
          {packs.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={p.id === packId}
              className={p.id === packId ? 'on' : ''}
              onClick={() => {
                setPackId(p.id);
                changeText('');
                setImagePreview(null);
              }}
            >
              {p.name}
              <span className="sub">
                {p.kinds.join('·')} · {p.itemCount}개 항목
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="step2">
        <div className="step2-header">
          <h2 id="step2" style={{ margin: 0 }}>2. 계약서 사진을 올리거나 문구를 입력해 주세요</h2>
          <div className="image-actions">
            {/* 카메라 촬영 (모바일 친화) */}
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
              📷 사진 찍기
            </button>

            {/* 사진 파일 선택 */}
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
              🖼️ 사진 업로드
            </button>
          </div>
        </div>

        {/* 이미지 업로드 중 또는 미리보기 */}
        {imagePreview && (
          <div className="image-preview-container">
            <div className="image-preview-card">
              <img src={imagePreview} alt="업로드된 계약서 사진" className="image-thumb" />
              <div className="image-preview-info">
                <strong>📸 업로드된 계약서 사진</strong>
                <span className="muted">Gemini Vision AI가 특약 문구를 자동으로 읽어냈습니다.</span>
                <button
                  type="button"
                  className="link-btn-danger"
                  onClick={() => {
                    setImagePreview(null);
                    setText('');
                  }}
                >
                  사진 제거
                </button>
              </div>
            </div>
          </div>
        )}

        {busy === 'ocr' && (
          <div className="ocr-loading-box">
            <span className="spinner" />
            <span>AI가 계약서 사진의 특약 조항을 꼼꼼히 읽고 있어요… (잠시만 기다려 주세요)</span>
          </div>
        )}

        <textarea
          aria-label="계약 문구"
          value={text}
          onChange={(e) => changeText(e.target.value)}
          placeholder={'사진을 찍어 올리거나 특약 문구를 직접 붙여 넣으세요.\n(Ctrl+V로 캡처 이미지를 바로 붙여넣을 수도 있습니다.)\n\n예시)\n특약사항\n1. 보증금은 다음 임차인이 들어오면 반환한다.\n2. 입주 후 모든 수선비는 임차인이 부담한다.'}
          rows={8}
        />
        <div className="row">
          <span className="muted">{text.trim().length.toLocaleString('ko-KR')} / 4,000자</span>
          <span className="samples">
            예시 넣기:
            {SAMPLES.filter((s) => s.pack === packId).map((s) => (
              <button key={s.label} className="link" onClick={() => changeText(s.text)}>
                {s.label}
              </button>
            ))}
          </span>
        </div>
        <button className="primary" onClick={showPreview} disabled={busy !== null || !text.trim()}>
          {busy === 'mask' ? '확인하는 중…' : '보낼 내용 미리 보기'}
        </button>
      </section>

      {preview && (
        <section className="panel" aria-labelledby="step3">
          <h2 id="step3">3. AI에게는 이렇게 보내요</h2>
          <p className="muted">
            {preview.found.length
              ? `개인정보 ${preview.found.length}건을 가렸어요: ${[...new Set(preview.found.map((f) => f.kind))].join(', ')}`
              : '가릴 개인정보는 없었어요.'}
          </p>
          <pre className="masked" data-testid="masked-preview">
            {preview.masked}
          </pre>
          <details className="dev">
            <summary>개발자 보기</summary>
            <label>
              점검 방식
              <select value={version} onChange={(e) => setVersion(e.target.value as Version)}>
                <option value="v0">v0 · 그냥 물어보기</option>
                <option value="v1">v1 · 항목 + 원문 인용</option>
                <option value="v2">v2 · 근거 법령 + 규칙 검사 + 보정</option>
              </select>
            </label>
          </details>
          <button className="primary" onClick={runCheck} disabled={busy !== null}>
            {busy === 'check' ? '점검하는 중… (5~15초)' : '이 내용으로 점검하기'}
          </button>
        </section>
      )}

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <section className="panel result" aria-labelledby="step4">
          <h2 id="step4">4. 점검 결과</h2>
          <p className="elapsed">점검 시간: {Math.round(result.elapsedMs / 100) / 10}초</p>
          {counts && (
            <div className="summary" role="status">
              <span className="badge risk">위험 {counts.위험}건</span>
              <span className="badge none">언급 없음 {counts['언급 없음']}건</span>
              <span className="badge safe">보호됨 {counts.보호됨}건</span>
            </div>
          )}
          {result.referenceOnly && (
            <div className="ref-note">
              <p><strong>점검팩이 없는 계약이에요.</strong> 정해진 항목 대신 일반 원칙으로 불리한 조항을 짚어 드립니다.</p>
              {result.note && <p className="free">{result.note}</p>}
            </div>
          )}
          <div className="cards">
            {items.map((it) => (
              <ResultCard key={it.itemId} item={it} info={pack?.items.find((i) => i.id === it.itemId)} />
            ))}
          </div>
        </section>
      )}

      <footer className="foot">
        <p>이 서비스는 주택임대차보호법과 소비자분쟁해결기준을 바탕으로 불리한 조항을 짚어 주는 참고용 도구예요. 법률 자문이 아니므로 실제 계약 전에는 전문가와 상의해 주세요.</p>
      </footer>
    </div>
  );
}
