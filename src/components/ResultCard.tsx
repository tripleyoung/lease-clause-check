import { Button, FlexBox, Typography } from '@montage-ui/core';
import { IconCheck, IconCopy } from '@montage-ui/icon';
import { useState } from 'react';
import type { ItemResult } from '../../shared/types.ts';

export type PackItemInfo = { id: string; title: string; knowledge: string; knowledgeText: string };

const STATUS_META: Record<string, { cls: string; label: string }> = {
  위험: { cls: 'risk', label: '위험' },
  '언급 없음': { cls: 'none', label: '언급 없음 · 확인 필요' },
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
    <article className={`clause-row ${meta.cls}`} data-testid={`card-${item.itemId}`}>
      <FlexBox alignItems="center" justifyContent="space-between" gap={12} sx={{ flexWrap: 'wrap' }}>
        <FlexBox alignItems="center" gap={10}>
          <span className={`dot ${meta.cls}`} aria-hidden="true" />
          <Typography as="h3" variant="headline1" weight="bold" color="semantic.foreground.neutral.strong" sx={{ margin: 0 }}>
            {info?.title ?? item.itemId}
          </Typography>
          <Typography variant="caption1" color="semantic.foreground.neutral.tertiary">
            {source}
          </Typography>
        </FlexBox>
        <span className={`verdict-chip ${meta.cls}`}>{meta.label}</span>
      </FlexBox>

      {item.autoFailed && (
        <p className="callout" data-level="high">
          자동 판정에 실패했어요. 이 항목은 직접 확인해 주세요.
        </p>
      )}

      {item.quote && (
        <blockquote className="clause-quote">
          “{item.quote}”
        </blockquote>
      )}

      {item.verdict !== '보호됨' && (
        <dl className="clause-spec">
          {item.verdict === '위험' && item.riskReason && (
            <div className="spec-item">
              <dt>판정 이유</dt>
              <dd className="risk-reason">{item.riskReason}</dd>
            </div>
          )}
          {item.verdict === '위험' && item.riskConsequence && (
            <div className="spec-item">
              <dt>예상 불이익</dt>
              <dd className="risk-consequence">{item.riskConsequence}</dd>
            </div>
          )}
          <div className="spec-item">
            <dt>물어볼 질문</dt>
            <dd className="ask">{item.question}</dd>
          </div>
          <div className="spec-item">
            <dt>대안 문구</dt>
            <dd className="fix">
              <span>{item.fixText}</span>
              <Button
                variant="outlined"
                color="assistive"
                size="small"
                onClick={copy}
                leadingContent={copied ? <IconCheck /> : <IconCopy />}
                sx={{ flexShrink: 0 }}
              >
                {copied ? '복사했어요' : '문구 복사'}
              </Button>
            </dd>
          </div>
        </dl>
      )}

      <details className="law-details">
        <summary>근거 법령 원문 ({source})</summary>
        <p className="law">{info?.knowledgeText}</p>
      </details>
    </article>
  );
}
