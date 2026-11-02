import { useState } from 'react';
import type { ItemResult } from '../../shared/types.ts';

export type PackItemInfo = { id: string; title: string; knowledge: string; knowledgeText: string };

const STATUS_META: Record<string, { cls: string; label: string }> = {
  위험: { cls: 'risk', label: '위험 조항' },
  '언급 없음': { cls: 'none', label: '누락 · 확인 필요' },
  보호됨: { cls: 'safe', label: '보호됨' },
};

export function ResultCard({ item, info }: { item: ItemResult; info?: PackItemInfo }) {
  const [copied, setCopied] = useState(false);
  const meta = STATUS_META[item.verdict] ?? { cls: 'none', label: item.verdict };
  const source = item.knowledge.replace(/^knowledge\/[^/]+\//, '').replace('.md#', ' · ');

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.fixText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`card ${meta.cls}`} data-testid={`card-${item.itemId}`}>
      <header className="card-header">
        <div className="card-title-group">
          <span className={`status-indicator ${meta.cls}`} aria-hidden="true" />
          <h3>{info?.title ?? item.itemId}</h3>
        </div>
        <div className="card-meta-group">
          <span className="source-chip">{source}</span>
          <span className={`tag ${meta.cls}`}>{meta.label}</span>
        </div>
      </header>

      {item.autoFailed && (
        <p className="warn">자동 판정에 실패했어요. 이 항목은 직접 확인해 주세요.</p>
      )}

      {item.quote && (
        <div className="quote-block">
          <span className="quote-label">계약서 원문 발췌</span>
          <blockquote>“{item.quote}”</blockquote>
        </div>
      )}

      {item.verdict === '위험' && (item.riskReason || item.riskConsequence) && (
        <div className="risk-analysis-grid">
          {item.riskReason && (
            <div className="analysis-cell reason">
              <div className="analysis-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>왜 위험한가요</span>
              </div>
              <p className="risk-reason">{item.riskReason}</p>
            </div>
          )}
          {item.riskConsequence && (
            <div className="analysis-cell consequence">
              <div className="analysis-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>서명 시 예상 피해</span>
              </div>
              <p className="risk-consequence">{item.riskConsequence}</p>
            </div>
          )}
        </div>
      )}

      {item.verdict !== '보호됨' && (
        <div className="countermeasure-section">
          <div className="ask-box">
            <span className="section-micro-label">서명 전 확인 질문</span>
            <p className="ask">{item.question}</p>
          </div>

          <div className="fix">
            <div className="fix-header">
              <span className="section-micro-label">권장 수정·추가 특약 문구</span>
              <button type="button" className={`copy-btn ${copied ? 'copied' : ''}`} onClick={copy}>
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>복사했어요</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>문구 복사</span>
                  </>
                )}
              </button>
            </div>
            <p className="fix-text">{item.fixText}</p>
          </div>
        </div>
      )}

      <details className="law-details">
        <summary>
          <span>근거 법령 및 기준 원문 ({source})</span>
          <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <p className="law">{info?.knowledgeText}</p>
      </details>
    </article>
  );
}
