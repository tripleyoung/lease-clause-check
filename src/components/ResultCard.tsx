import { useState } from 'react';
import type { ItemResult } from '../../shared/types.ts';

export type PackItemInfo = { id: string; title: string; knowledge: string; knowledgeText: string };

const LIGHT: Record<string, { cls: string; label: string }> = {
  위험: { cls: 'risk', label: '위험' },
  '언급 없음': { cls: 'none', label: '언급 없음 · 확인 필요' },
  보호됨: { cls: 'safe', label: '보호됨' },
};

export function ResultCard({ item, info }: { item: ItemResult; info?: PackItemInfo }) {
  const [copied, setCopied] = useState(false);
  const light = LIGHT[item.verdict];
  const source = item.knowledge.replace(/^knowledge\/[^/]+\//, '').replace('.md#', ' ');

  async function copy() {
    try {
      await navigator.clipboard.writeText(item.fixText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className={`card ${light.cls}`} data-testid={`card-${item.itemId}`}>
      <header>
        <span className={`dot ${light.cls}`} aria-hidden />
        <h3>{info?.title ?? item.itemId}</h3>
        <span className={`tag ${light.cls}`}>{light.label}</span>
      </header>
      {item.autoFailed && <p className="warn">자동 판정에 실패했어요. 이 항목은 직접 확인해 주세요.</p>}
      {item.quote && <blockquote>“{item.quote}”</blockquote>}
      <details>
        <summary>근거: {source}</summary>
        <p className="law">{info?.knowledgeText}</p>
      </details>
      {item.verdict !== '보호됨' && (
        <>
          <p className="ask"><strong>물어보세요</strong> {item.question}</p>
          <div className="fix">
            <p><strong>이렇게 넣어 달라고 하세요</strong> {item.fixText}</p>
            <button className="link" onClick={copy}>{copied ? '복사했어요' : '문구 복사'}</button>
          </div>
        </>
      )}
    </article>
  );
}
