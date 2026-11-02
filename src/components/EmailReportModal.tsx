import React, { useState } from 'react';
import type { ItemResult } from '../../shared/types.js';

export interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  docTitle?: string;
  items: ItemResult[];
}

export function EmailReportModal({
  isOpen,
  onClose,
  defaultEmail = '',
  docTitle = '임대차계약서',
  items,
}: EmailReportModalProps) {
  const [recipient, setRecipient] = useState(defaultEmail || '');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!isOpen) return null;

  const toxicItems = items.filter((i) => i.verdict === '위험');
  const safeItems = items.filter((i) => i.verdict === '보호됨');

  const subject = `[온율 리포트] ${docTitle} 특약 점검 결과 및 수정 권장 대안 문구`;

  const bodyText = `[온율(溫律) 계약서 특약 점검 및 법령 대조 리포트]

■ 점검 대상 문서: ${docTitle}
■ 법령 검토 기준: 국가법령정보센터 실시간 법령 MCP (주택임대차보호법 제10조 강행규정)

1. 위험 독소 조항 검출 내역 (${toxicItems.length}건):
${toxicItems
  .map(
    (t, idx) =>
      `  [${idx + 1}] ${t.title}\n` +
      `  - 원문: "${t.quote}"\n` +
      `  - 위험 사유: ${t.riskReason || '임차인에게 불리한 조항'}\n` +
      `  - 권장 대안 특약: ${t.fixText || '표준계약서 권고 조항 적용'}\n`
  )
  .join('\n')}

2. 권리 보호 조항 확인 내역 (${safeItems.length}건):
${safeItems
  .map(
    (s, idx) =>
      `  [${idx + 1}] ${s.title}\n` +
      `  - 원문: "${s.quote}"\n` +
      `  - 보호 내용: 임차인 권리 확보 표준 조항\n`
  )
  .join('\n')}

3. 법적 대응 가이드:
주택임대차보호법 제10조(강행규정)에 따라 본 법에 위반된 약정으로서 임차인에게 불리한 것은 그 효력이 없습니다.
상기 권장 대안 특약 문구로 수정을 요청하시길 권장합니다.

본 메일은 국가법령정보센터 실시간 법령 MCP 연동 계약서 특약 점검 서비스 온율(律)에서 생성되었습니다.`;

  const handleSendEmail = async () => {
    if (!recipient.trim() || !recipient.includes('@')) {
      setStatus('error');
      setFeedbackMsg('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    setStatus('sending');
    setFeedbackMsg('이메일 리포트를 전송하고 있습니다…');

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'email',
          to: recipient.trim(),
          subject,
          content: bodyText,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('sent');
        setFeedbackMsg(`${recipient} 주소로 점검 리포트가 안전하게 발송되었습니다.`);
      } else {
        setStatus('error');
        setFeedbackMsg(data.error || '이메일 발송 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setStatus('error');
      setFeedbackMsg('네트워크 통신 중 오류가 발생했습니다.');
    }
  };

  const mailtoLink = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(bodyText)}`;

  return (
    <div
      className="email-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="점검 결과 이메일 전달"
      data-testid="email-report-modal"
    >
      <div className="email-modal-card wanted-modal">
        <header className="email-modal-header wanted-modal__header">
          <div>
            <div className="wanted-modal__badge-row">
              <span className="wanted-badge wanted-badge--primary">점검 리포트 전송</span>
              <span className="wanted-badge wanted-badge--mcp-subtle">서버 직접 전송 (Direct Delivery)</span>
            </div>
            <h3 className="wanted-modal__title">계약서 점검 결과 및 수정 대안 특약 발송</h3>
          </div>
          <button
            type="button"
            className="wanted-modal__close-btn"
            onClick={onClose}
            aria-label="닫기"
            data-testid="close-email-modal"
          >
            ✕
          </button>
        </header>

        <div className="email-modal-body wanted-modal__body">
          <div className="wanted-form-group">
            <label htmlFor="email-recipient-input" className="wanted-form-label">
              <strong>수신자 이메일 주소</strong>
              <span className="wanted-form-sublabel">임차인 본인 보관용 또는 공인중개사·임대인 수신처</span>
            </label>
            <div className="wanted-input-row">
              <input
                id="email-recipient-input"
                type="email"
                className="wanted-input"
                placeholder="예: client@safe-lease.kr 또는 realtor@agency.kr"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={status === 'sending' || status === 'sent'}
                data-testid="email-recipient-input"
              />
              <button
                type="button"
                className="wanted-btn wanted-btn--primary"
                onClick={handleSendEmail}
                disabled={status === 'sending' || status === 'sent'}
                data-testid="send-email-btn"
              >
                {status === 'sending' ? '전송 중…' : status === 'sent' ? '전송 완료 ✓' : '이메일 전송'}
              </button>
            </div>
          </div>

          {feedbackMsg && (
            <div
              className={`wanted-alert wanted-alert--${
                status === 'sent' ? 'success' : status === 'error' ? 'error' : 'info'
              }`}
              data-testid="email-feedback-banner"
            >
              <span className="wanted-alert__indicator" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          <div className="wanted-preview-box">
            <div className="wanted-preview-box__head">
              <span className="wanted-preview-box__title">발송 내용 미리보기</span>
              <a
                href={mailtoLink}
                className="wanted-text-link"
                title="기본 메일 클라이언트 앱으로 열기"
                data-testid="open-mail-app-btn"
              >
                기본 메일 앱으로 열기 ↗
              </a>
            </div>
            <div className="wanted-preview-box__subject">
              <strong>제목:</strong> {subject}
            </div>
            <pre className="wanted-preview-box__content">{bodyText}</pre>
          </div>
        </div>

        <footer className="email-modal-footer wanted-modal__footer">
          <span className="wanted-modal__footnote">
            온율 서버(mail.ugot.uk)를 통해 상대방의 실제 편지함으로 분석 리포트와 협상 대안 특약이 안전하게 직접 전달됩니다.
          </span>
          <button type="button" className="wanted-btn wanted-btn--secondary" onClick={onClose}>
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
