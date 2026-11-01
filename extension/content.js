// ClauseGuard Content Script: 웹페이지 텍스트 탐지, 인라인 위험 하이라이트 주입 및 툴팁 제공

(function () {
  let isScanning = false;
  let pillElement = null;
  let tooltipElement = null;
  let activeResults = null;

  // 1. 툴팁 요소 DOM 생성
  function ensureTooltip() {
    if (tooltipElement) return tooltipElement;
    tooltipElement = document.createElement('div');
    tooltipElement.id = 'clause-guard-tooltip';
    document.body.appendChild(tooltipElement);

    document.addEventListener('click', (e) => {
      if (!tooltipElement.contains(e.target) && !e.target.classList.contains('clause-guard-highlight-risk')) {
        tooltipElement.style.display = 'none';
      }
    });

    return tooltipElement;
  }

  // 2. 우측 하단 플로팅 뱃지 생성
  function createFloatingPill() {
    if (pillElement) return;

    pillElement = document.createElement('div');
    pillElement.id = 'clause-guard-floating-pill';
    pillElement.innerHTML = `<span>🛡️</span> <span>특약 자동 점검</span>`;
    document.body.appendChild(pillElement);

    pillElement.addEventListener('click', () => {
      if (!isScanning) {
        triggerInspection();
      }
    });
  }

  // 3. 페이지 텍스트 추출
  function extractContractText() {
    // 특약사항, 본문, 약관 영역 우선 탐색
    const selectors = ['article', 'main', '.contract', '.agreement', '.terms', '#contract', '#agreement', 'table'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.length > 50) {
        return el.innerText;
      }
    }
    return document.body.innerText;
  }

  // 4. 점검 실행
  function triggerInspection(preferredPack = 'lease') {
    const text = extractContractText();
    if (!text || text.trim().length < 20) {
      alert('점검할 계약서 특약이나 약관 내용을 페이지에서 찾지 못했어요.');
      return;
    }

    isScanning = true;
    pillElement.className = 'scanning';
    pillElement.innerHTML = `<span>⏳</span> <span>특약 정밀 분석 중...</span>`;

    chrome.runtime.sendMessage(
      { action: 'check_text', text: text.slice(0, 4000), pack: preferredPack, version: 'v2' },
      (response) => {
        isScanning = false;

        if (!response || !response.ok) {
          pillElement.className = '';
          pillElement.innerHTML = `<span>⚠️</span> <span>점검 실패 (키/서버 확인)</span>`;
          console.error('[ClauseGuard]', response?.error);
          return;
        }

        const data = response.data;
        activeResults = data;
        const risks = data.items.filter((item) => item.verdict === '위험');

        if (risks.length > 0) {
          pillElement.className = 'has-risk';
          pillElement.innerHTML = `<span>🚨</span> <span>위험 특약 ${risks.length}건 발견!</span>`;
          highlightRisks(risks);
        } else {
          pillElement.className = '';
          pillElement.innerHTML = `<span>✅</span> <span>위험 특약 없음 (${data.items.length}개 항목 검토)</span>`;
        }
      }
    );
  }

  // 5. 위험 조항 문장(quote) 인라인 하이라이트 주입
  function highlightRisks(risks) {
    ensureTooltip();

    for (const risk of risks) {
      if (!risk.quote || risk.quote.length < 5) continue;

      const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = treeWalker.nextNode())) {
        if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(node.parentElement.tagName)) continue;
        if (node.parentElement.classList.contains('clause-guard-highlight-risk')) continue;

        const idx = node.textContent.indexOf(risk.quote);
        if (idx !== -1) {
          const span = document.createElement('span');
          span.className = 'clause-guard-highlight-risk';
          span.dataset.title = risk.title;
          span.dataset.knowledge = risk.knowledge || '';
          span.dataset.fix = risk.fix || '';
          span.dataset.law = risk.knowledgeText || '';

          const matchRange = document.createRange();
          matchRange.setStart(node, idx);
          matchRange.setEnd(node, idx + risk.quote.length);
          matchRange.surroundContents(span);

          span.addEventListener('click', (e) => {
            e.stopPropagation();
            showTooltip(span, risk);
          });

          break; // 한 번 하이라이트 후 다음 위험 항목
        }
      }
    }
  }

  // 6. 툴팁 노출
  function showTooltip(targetSpan, risk) {
    const tooltip = ensureTooltip();
    const rect = targetSpan.getBoundingClientRect();

    tooltip.innerHTML = `
      <div class="cg-tooltip-header">
        <span class="cg-badge-risk">🚨 주의 필요</span>
        <span style="font-size:11px; color:#64748b;">${risk.knowledge?.split('#')[0] || '관련 법령'}</span>
      </div>
      <div class="cg-tooltip-title">${risk.title}</div>
      <div style="font-size:12px; color:#334155; margin-bottom:6px;">"${risk.quote}"</div>
      ${risk.knowledge ? `<div class="cg-tooltip-law"><b>근거:</b> ${risk.knowledge.split('#')[1] || risk.knowledge}</div>` : ''}
      ${risk.fix ? `
        <div class="cg-tooltip-fix">
          <div class="cg-fix-label">💡 이렇게 바꿔달라고 요구하세요:</div>
          <div class="cg-fix-text" id="cg-fix-content">${risk.fix}</div>
          <button class="cg-copy-btn" id="cg-copy-action">대안 문구 복사</button>
        </div>
      ` : ''}
    `;

    tooltip.style.display = 'block';
    const top = rect.bottom + window.scrollY + 8;
    const left = Math.max(16, Math.min(window.innerWidth - 380, rect.left + window.scrollX));
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    const copyBtn = tooltip.querySelector('#cg-copy-action');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(risk.fix);
        copyBtn.innerText = '✓ 복사 완료!';
        setTimeout(() => (copyBtn.innerText = '대안 문구 복사'), 2000);
      });
    }
  }

  // 7. 페이지 초기 로드 시 계약서 키워드 자동 감지
  const pageKeywords = ['특약', '임대차', '임대인', '임차인', '보증금', '차임', '위약금', '환불규정', '수선 의무'];
  const fullText = document.body ? document.body.innerText : '';
  const matchCount = pageKeywords.filter((k) => fullText.includes(k)).length;

  if (matchCount >= 2) {
    createFloatingPill();
  }

  // 8. 팝업에서 보낸 메시지 수신
  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === 'scan_page') {
      createFloatingPill();
      triggerInspection(req.pack || 'lease');
      sendResponse({ started: true });
    }
  });
})();
