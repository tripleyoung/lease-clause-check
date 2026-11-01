import { useEffect, useState } from 'react';
import type { CheckResult, Version } from '../shared/types.ts';
import { ResultCard, type PackItemInfo } from './components/ResultCard.tsx';
import { SAMPLES } from './samples.ts';

type PackInfo = { id: string; name: string; kinds: string[]; itemCount: number; items: PackItemInfo[] };
type MaskResult = { masked: string; found: { kind: string; sample: string }[] };

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch('/api/check', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: '서버 응답을 읽지 못했어요.' }));
  if (!res.ok) throw new Error(data.error ?? '점검 중 문제가 생겼어요.');
  return data as T;
}

const ORDER: Record<string, number> = { 위험: 0, '언급 없음': 1, 보호됨: 2 };

export function App() {
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [packId, setPackId] = useState('lease');
  const [text, setText] = useState('');
  const [version, setVersion] = useState<Version>('v2');
  const [preview, setPreview] = useState<MaskResult | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState<'mask' | 'check' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/packs')
      .then((r) => r.json())
      .then((d) => setPacks(d.packs))
      .catch(() => setError('점검 종류를 불러오지 못했어요. 새로 고침해 주세요.'));
  }, []);

  const pack = packs.find((p) => p.id === packId);

  function changeText(v: string) {
    setText(v);
    setPreview(null);
    setResult(null);
    setError('');
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
  const counts = result ? { 위험: 0, '언급 없음': 0, 보호됨: 0, ...Object.fromEntries(['위험', '언급 없음', '보호됨'].map((v) => [v, result.items.filter((i) => i.verdict === v).length])) } : null;

  return (
    <div className="page">
      <header className="hero">
        <h1>계약서 특약 점검기</h1>
        <p>특약이나 약관 문구를 붙여 넣으면, 정해진 점검 항목을 하나도 빼지 않고 법령 근거와 함께 짚어 드려요.</p>
      </header>

      <section className="panel" aria-labelledby="step1">
        <h2 id="step1">1. 무슨 계약인가요?</h2>
        <div className="seg" role="radiogroup" aria-label="계약 종류">
          {packs.map((p) => (
            <button key={p.id} role="radio" aria-checked={p.id === packId} className={p.id === packId ? 'on' : ''} onClick={() => { setPackId(p.id); changeText(''); }}>
              {p.name}
              <span className="sub">{p.kinds.join('·')} · {p.itemCount}개 항목</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="step2">
        <h2 id="step2">2. 특약·약관 문구를 붙여 넣어 주세요</h2>
        <textarea
          aria-label="계약 문구"
          value={text}
          onChange={(e) => changeText(e.target.value)}
          placeholder={'예) 특약사항\n1. 보증금은 다음 임차인이 들어오면 반환한다.'}
          rows={8}
        />
        <div className="row">
          <span className="muted">{text.trim().length.toLocaleString('ko-KR')} / 4,000자</span>
          <span className="samples">
            예시 넣기:
            {SAMPLES.filter((s) => s.pack === packId).map((s) => (
              <button key={s.label} className="link" onClick={() => changeText(s.text)}>{s.label}</button>
            ))}
          </span>
        </div>
        <button className="primary" onClick={showPreview} disabled={busy !== null}>
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
          <pre className="masked" data-testid="masked-preview">{preview.masked}</pre>
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
            {busy === 'check' ? '점검하는 중… (10~30초)' : '이 내용으로 점검하기'}
          </button>
        </section>
      )}

      {error && <div className="error" role="alert">{error}</div>}

      {busy === 'check' && <div className="loading" aria-live="polite">항목마다 근거 조문과 대조하고 있어요…</div>}

      {result && (
        <section className="panel" aria-labelledby="step4">
          <h2 id="step4">4. 점검 결과</h2>
          {result.referenceOnly ? (
            <>
              <p className="notice">이 종류는 점검 기준이 없어 참고용이에요.</p>
              <p className="note">{result.note}</p>
            </>
          ) : (
            <>
              <div className="summary" data-testid="summary">
                <span className="pill risk">위험 {counts!['위험']}</span>
                <span className="pill none">언급 없음 {counts!['언급 없음']}</span>
                <span className="pill safe">보호됨 {counts!['보호됨']}</span>
                <span className="muted">{(result.elapsedMs / 1000).toFixed(1)}초 · {result.version}</span>
              </div>
              <div className="cards">
                {items.map((it) => (
                  <ResultCard key={it.itemId} item={it} info={pack?.items.find((i) => i.id === it.itemId)} />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <footer className="foot">
        법률 자문이 아니에요. 계약 전 공인중개사·법률 전문가에게 확인하세요. 근거: 국가법령정보센터 현행 법령(주택임대차보호법, 민법)·소비자분쟁해결기준.
      </footer>
    </div>
  );
}
