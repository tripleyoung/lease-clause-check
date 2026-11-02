import { Button, FlexBox, Typography } from '@montage-ui/core';
import { IconCheck, IconCopy } from '@montage-ui/icon';
import { useState } from 'react';
import type { ItemResult } from '../../shared/types.ts';

export type PackItemInfo = { id: string; title: string; knowledge: string; knowledgeText: string };

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
  oc: string;
  liveConnected: boolean;
  statute: LiveStatuteInfo;
  precedents: LivePrecedentInfo[];
}

const STATUS_META: Record<string, { cls: string; label: string }> = {
  위험: { cls: 'risk', label: '위험' },
  '언급 없음': { cls: 'none', label: '언급 없음 · 확인 필요' },
  보호됨: { cls: 'safe', label: '보호됨' },
};

export function ResultCard({
  item,
  info,
  onConsult,
}: {
  item: ItemResult;
  info?: PackItemInfo;
  onConsult?: (item: ItemResult, title: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [lawData, setLawData] = useState<LawLookupResponse | null>(null);
  const [lawLoading, setLawLoading] = useState(false);

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

  async function loadLiveLaw(open: boolean) {
    if (!open || lawData || lawLoading) return;
    setLawLoading(true);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'law', itemId: item.itemId }),
      });
      if (res.ok) {
        const data = (await res.json()) as LawLookupResponse;
        setLawData(data);
      }
    } catch {
      // 오프라인 또는 조회 실패 시 기본 내장 법령만 표시
    } finally {
      setLawLoading(false);
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
              <FlexBox gap={8} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  color="assistive"
                  size="small"
                  onClick={copy}
                  leadingContent={copied ? <IconCheck /> : <IconCopy />}
                >
                  {copied ? '복사했어요' : '문구 복사'}
                </Button>
                {onConsult && (
                  <Button
                    variant="solid"
                    size="small"
                    onClick={() => onConsult(item, info?.title ?? item.itemId)}
                  >
                    이 조항 대처법 상담하기
                  </Button>
                )}
              </FlexBox>
            </dd>
          </div>
        </dl>
      )}

      <details
        className="law-details"
        onToggle={(e) => loadLiveLaw((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary>근거 법령 원문 및 대법원 판례 ({source})</summary>
        <div className="law-panel">
          {lawData?.statute && (
            <div className="law-meta-bar">
              <span>
                <strong>{lawData.statute.lawName}</strong> · {lawData.statute.ministry}
                {lawData.statute.proclamationNo ? ` · ${lawData.statute.proclamationNo}` : ''}
                {lawData.statute.effectiveDate ? ` (시행 ${lawData.statute.effectiveDate})` : ''}
              </span>
              <a
                href={lawData.statute.officialUrl}
                target="_blank"
                rel="noreferrer"
                className="law-ext-link"
              >
                국가법령정보센터 원문 ↗
              </a>
            </div>
          )}

          <p className="law">{lawData?.statute?.articleText || info?.knowledgeText}</p>

          {lawLoading && (
            <p className="law-loading">법제처 국가법령정보센터(OpenAPI)에서 현행 조문과 대법원 판례를 조회하고 있습니다…</p>
          )}

          {lawData && lawData.precedents.length > 0 && (
            <div className="prec-block" data-testid={`prec-${item.itemId}`}>
              <div className="prec-head">관련 대법원 판례 (국가법령정보센터 실시간 연동)</div>
              <ul className="prec-list">
                {lawData.precedents.map((p) => (
                  <li key={p.id || p.caseNumber} className="prec-item">
                    <div className="prec-title-row">
                      <span className="prec-case">
                        {p.courtName} {p.decisionDate} 선고 <strong>{p.caseNumber}</strong>
                      </span>
                      <a
                        href={p.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="law-ext-link"
                      >
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
        </div>
      </details>
    </article>
  );
}
