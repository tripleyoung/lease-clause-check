import React, { useState, useEffect } from 'react';
import type { ItemResult } from '../../shared/types.js';
import {
  IconMail,
  IconCheck,
  IconClose,
  IconExternalLink,
  IconCircleCheckFill,
  IconTriangleExclamationFill,
  IconCircleInfoFill,
  IconDocumentSearch,
} from '@montage-ui/icon';

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
  const [recipient, setRecipient] = useState(defaultEmail || 'dudnjsckrgo@gmail.com');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showInboxReceipt, setShowInboxReceipt] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    if (defaultEmail) {
      setRecipient(defaultEmail);
    }
  }, [defaultEmail]);

  if (!isOpen) return null;

  const toxicItems = items.filter((i) => i.verdict === '위험');
  const safeItems = items.filter((i) => i.verdict === '보호됨');

  const subject = `[온율 리포트] ${docTitle} 특약 점검 결과 및 수정 권장 대안 문구`;

  const bodyText = `[온율(溫律) 계약서 특약 점검 및 법령 대조 리포트]

■ 점검 대상 문서: ${docTitle}
■ 법령 검토 기준: 주택임대차보호법 제10조(강행규정) 및 대법원 판례 검증 스냅샷

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

[유의사항 및 법적 성격 안내]
※ 본 리포트는 국가법령 및 판례 공공데이터를 기반으로 생성된 계약 체결 전 사전 참고용 보조 문서이며, 변호사법상 개별 법률 자문을 대체하지 않습니다. 구체적인 법적 분쟁이나 계약 체결 전 의문 사항은 대한법률구조공단(국번없이 132), 마을변호사 또는 법률 전문가에게 최종 확인하시기 바랍니다.

본 메일은 강행법규·판례 기반 계약서 특약 점검 서비스 온율(溫律)에서 생성되었습니다.`;

  const handleSendEmail = async () => {
    if (!recipient.trim() || !recipient.includes('@')) {
      setStatus('error');
      setFeedbackMsg('올바른 이메일 주소를 입력해 주세요.');
      return;
    }

    setStatus('sending');
    setFeedbackMsg('온율 서버를 통해 실제 메일함으로 직접 전송 중…');

    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'email',
          to: recipient.trim(),
          subject,
          content: bodyText,
          docTitle,
          items,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('sent');
        setShowInboxReceipt(true);
        setFeedbackMsg(`${recipient} 주소로 분석 리포트 및 2페이지 A4 공식 PDF 진단서가 생성·발송되었습니다.`);
      } else {
        setStatus('error');
        setFeedbackMsg(data.error || '이메일 발송 중 오류가 발생했습니다.');
      }
    } catch {
      setStatus('error');
      setFeedbackMsg('네트워크 통신 중 오류가 발생했습니다.');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pdf',
          docTitle,
          items,
        }),
      });
      if (!res.ok) throw new Error('PDF 생성 실패');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `[온율]_${docTitle}_특약안심진단_공식리포트.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('PDF 다운로드 중 오류가 발생했습니다.');
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
              <span className="wanted-badge wanted-badge--primary">
                <IconMail width={12} height={12} style={{ marginRight: 4 }} /> 점검 리포트 & 공식 PDF 발행
              </span>
              <span className="wanted-badge wanted-badge--mcp-subtle">
                2페이지 A4 공식 감정서 생성
              </span>
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
            <IconClose width={18} height={18} />
          </button>
        </header>

        <div className="email-modal-body wanted-modal__body">
          <div className="wanted-form-group">
            <label htmlFor="email-recipient-input" className="wanted-form-label">
              <strong>수신자 이메일 주소</strong>
              <span className="wanted-form-sublabel">임차인 본인 계정 또는 공인중개사·임대인 수신처</span>
            </label>
            <div className="wanted-input-row">
              <input
                id="email-recipient-input"
                type="email"
                className="wanted-input"
                placeholder="예: dudnjsckrgo@gmail.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={status === 'sending'}
                data-testid="email-recipient-input"
              />
              <button
                type="button"
                className="wanted-btn wanted-btn--primary"
                onClick={handleSendEmail}
                disabled={status === 'sending'}
                data-testid="send-email-btn"
              >
                {status === 'sending' ? (
                  '전송 중…'
                ) : status === 'sent' ? (
                  <>
                    <IconCheck width={14} height={14} style={{ marginRight: 4 }} /> 전송 완료
                  </>
                ) : (
                  <>
                    <IconMail width={14} height={14} style={{ marginRight: 4 }} /> 이메일 전송
                  </>
                )}
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
              {status === 'sent' ? (
                <IconCircleCheckFill width={15} height={15} style={{ flexShrink: 0 }} />
              ) : status === 'error' ? (
                <IconTriangleExclamationFill width={15} height={15} style={{ flexShrink: 0 }} />
              ) : (
                <IconCircleInfoFill width={15} height={15} style={{ flexShrink: 0 }} />
              )}
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* 발송 완료 및 공식 2페이지 A4 PDF 리포트 확인 뷰 */}
          {showInboxReceipt ? (
            <div className="wanted-inbox-receipt" data-testid="inbox-receipt-card">
              <div className="wanted-inbox-receipt__header">
                <div className="wanted-inbox-receipt__tag">
                  <IconCircleCheckFill width={14} height={14} style={{ marginRight: 4 }} />
                  <span>발송 리포트 및 공식 2페이지 A4 PDF 생성 확인</span>
                </div>
                <span className="wanted-inbox-receipt__time">방금 전 (PDF 생성 완료)</span>
              </div>
              <div className="wanted-inbox-receipt__meta">
                <div><strong>받는 사람:</strong> {recipient}</div>
                <div><strong>발행 주체:</strong> 온율 계약서 안심 진단 서비스 (pdf-lib 공식 A4 감정서)</div>
                <div><strong>문서 제목:</strong> {subject}</div>
                <div className="wanted-inbox-receipt__pdf-row">
                  <span className="wanted-inbox-receipt__pdf-info">
                    <IconDocumentSearch width={13} height={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                    <strong>생성된 공식 PDF:</strong> [공식] {docTitle}_특약안심진단서.pdf (2페이지 A4 · 직인 포함)
                  </span>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button
                      type="button"
                      className="wanted-btn wanted-btn--primary wanted-btn--xs"
                      onClick={() => setShowPdfPreview(true)}
                      data-testid="open-pdf-preview-btn"
                    >
                      🔍 A4 PDF 미리보기 열기
                    </button>
                    <button
                      type="button"
                      className="wanted-btn wanted-btn--secondary wanted-btn--xs"
                      onClick={handleDownloadPdf}
                      data-testid="download-attached-pdf-btn"
                    >
                      PDF 다운로드
                    </button>
                  </div>
                </div>
              </div>
              <div className="wanted-inbox-receipt__body">
                <span className="wanted-inbox-receipt__badge">발송된 리포트 본문</span>
                <pre className="wanted-inbox-receipt__content">{bodyText}</pre>
              </div>
            </div>
          ) : (
            <div className="wanted-preview-box">
              <div className="wanted-preview-box__head">
                <span className="wanted-preview-box__title">발송 내용 미리보기</span>
                <a
                  href={mailtoLink}
                  className="wanted-text-link"
                  title="기본 메일 클라이언트 앱으로 열기"
                  data-testid="open-mail-app-btn"
                >
                  기본 메일 앱으로 열기 <IconExternalLink width={12} height={12} style={{ verticalAlign: 'middle' }} />
                </a>
              </div>
              <div className="wanted-preview-box__subject">
                <strong>제목:</strong> {subject}
              </div>
              <pre className="wanted-preview-box__content">{bodyText}</pre>
            </div>
          )}
        </div>

        <footer className="email-modal-footer wanted-modal__footer">
          <span className="wanted-modal__footnote">
            pdf-lib 기반으로 계약서 핀 하이라이트(1P)와 법률 대조표·직인(2P)이 포함된 A4 공식 PDF를 즉시 생성합니다.
          </span>
          <div className="wanted-modal__footer-btns">
            <button
              type="button"
              className="wanted-btn wanted-btn--secondary"
              onClick={() => setShowPdfPreview(true)}
              data-testid="preview-pdf-modal-btn"
            >
              <IconDocumentSearch width={13} height={13} style={{ marginRight: 4 }} /> A4 PDF 미리보기
            </button>
            <button
              type="button"
              className="wanted-btn wanted-btn--secondary"
              onClick={handleDownloadPdf}
              data-testid="download-pdf-modal-btn"
            >
              <IconDocumentSearch width={13} height={13} style={{ marginRight: 4 }} /> PDF 다운로드
            </button>
            <button type="button" className="wanted-btn wanted-btn--secondary" onClick={onClose}>
              닫기
            </button>
          </div>
        </footer>
      </div>

      {/* 앱 내장 2페이지 A4 공식 PDF 미리보기 모달 */}
      {showPdfPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000010,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          data-testid="pdf-preview-modal"
        >
          <div
            style={{
              width: 'min(920px, 94vw)',
              height: '80vh',
              marginTop: '60px',
              background: '#1e293b',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div
              style={{
                height: '54px',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 700 }}>
                <span style={{ background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>A4 PDF</span>
                <span>[온율] {docTitle} 특약 안심 진단 리포트 (2P A4)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="wanted-btn wanted-btn--primary wanted-btn--xs"
                  onClick={handleDownloadPdf}
                >
                  PDF 원본 다운로드
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(false)}
                  data-testid="close-pdf-preview-btn"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div
              className="pdf-preview-body"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '24px',
                background: '#334155',
              }}
            >
              <img
                src="/reports/pdf_page-1.png"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/samples/scanned_lease_contract.png'; }}
                alt="공식 PDF 리포트 1페이지 - 계약서 스캔본 핀 하이라이트"
                style={{ width: '100%', maxWidth: '760px', borderRadius: '6px', background: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,0.4)' }}
              />
              <img
                src="/reports/pdf_page-2.png"
                alt="공식 PDF 리포트 2페이지 - 조항별 법률 대조표 및 직인 날인"
                style={{ width: '100%', maxWidth: '760px', borderRadius: '6px', background: '#fff', boxShadow: '0 8px 28px rgba(0,0,0,0.4)' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
