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

  // 3. 페이지 텍스트 추출 (드래그한 선택 영역 우선, 없으면 계약서 컨테이너 또는 본문 전체)
  function extractContractText() {
    const selected = window.getSelection()?.toString()?.trim();
    if (selected && selected.length >= 10) return selected;

    const candidates = Array.from(
      document.querySelectorAll(
        'article, main, .contract, .agreement, .terms, #postViewArea, .se-main-container, .entry-content, form, table, body'
      )
    );
    for (const el of candidates) {
      const text = el.innerText || '';
      if (
        text.length > 50 &&
        (text.includes('특약') || text.includes('임대') || text.includes('보증금') || text.includes('위약금') || text.includes('환불'))
      ) {
        return text;
      }
    }
    return document.body ? document.body.innerText : '';
  }

  // 오프라인 / 서버 키 부재 시 자동 작동하는 규칙 검사 엔진
  const LOCAL_RULES = [
    {
      id: 'no_new_mortgage',
      title: '잔금·전입 다음 날까지 근저당 설정 금지',
      riskHints: [/근저당.{0,20}(설정|대출).{0,10}(할 수 있|가능|동의)/, /잔금.{0,15}(대출|담보).{0,15}(실행|설정)/],
      knowledge: '주택임대차보호법 제3조(대항력 등)',
      fix: '임대인은 잔금 지급일 다음 날까지 이 주택에 근저당권 등 어떠한 권리도 새로 설정하지 않으며, 이를 어기면 임차인은 계약을 해제하고 지급한 금액 전부와 그 배액을 청구할 수 있다.',
    },
    {
      id: 'deposit_return',
      title: '보증금 반환 시기',
      riskHints: [/(새|다음|신규).{0,6}(세입자|임차인).{0,20}(구해|들어|입주).{0,20}(반환|돌려)/, /보증금.{0,20}(반환|돌려).{0,20}(유예|미룰|늦출)/],
      knowledge: '주택임대차보호법 제4조(임대차기간 등)',
      fix: '임대인은 계약 종료일에 임차인의 퇴거와 동시에 보증금 전액을 반환하며, 새 임차인의 입주 여부를 반환 조건으로 삼지 않는다.',
    },
    {
      id: 'renewal_right',
      title: '계약갱신요구권 포기',
      riskHints: [/갱신.{0,10}(요구|청구).{0,15}(하지 않|포기|불가|없)/, /(재계약|연장).{0,10}(없|불가).{0,10}(조건|으로 한다)/],
      knowledge: '주택임대차보호법 제6조의3(계약갱신 요구 등)',
      fix: '임차인의 계약갱신요구권은 주택임대차보호법 제6조의3에 따른다(이를 제한하는 약정은 두지 않는다).',
    },
    {
      id: 'rent_increase',
      title: '차임·보증금 증액 한도',
      riskHints: [/(\d{1,2})\s*%.{0,15}(인상|증액|올)/, /(인상|증액).{0,20}(임대인|시세).{0,15}(정|따른|결정)/],
      knowledge: '주택임대차보호법 제7조(차임 등의 증감청구권)',
      fix: '차임과 보증금의 증액은 주택임대차보호법 제7조에 따라 약정한 금액의 20분의 1 이내로 하며, 계약 후 1년 안에는 증액하지 않는다.',
    },
    {
      id: 'repair_duty',
      title: '수선 책임',
      riskHints: [/(모든|일체의|전부).{0,10}(수리|수선|하자).{0,20}(임차인|세입자).{0,10}(부담|책임)/, /(보일러|누수|배관|결로|곰팡이).{0,30}(임차인|세입자).{0,10}(부담|책임)/],
      knowledge: '민법 제623조(임대인의 의무)',
      fix: '보일러, 누수, 배관 등 주택의 주요 설비 하자는 민법 제623조에 따라 임대인이 비용을 들여 수선하며, 임차인은 고의·과실이 없는 한 책임을 지지 않는다.',
    },
    {
      id: 'early_exit',
      title: '중도 해지 및 과도한 위약금',
      riskHints: [/(중도|중간).{0,10}(해지|퇴거).{0,30}(위약금|월세.{0,6}개월|보증금.{0,10}(공제|몰수))/],
      knowledge: '주택임대차보호법 제6조의2(계약의 해지)',
      fix: '임차인이 부득이하게 중도 해지할 경우 신규 임차인 중개보수 외의 별도 위약금은 청구하지 않는다.',
    },
  ];

  function localRuleScan(rawText) {
    const sentences = rawText
      .split(/\n|(?<=[.다요])\s+(?=\d+\.|[가-힣])/)
      .map((s) => s.trim())
      .filter(Boolean);

    const items = [];
    for (const rule of LOCAL_RULES) {
      let hitQuote = '';
      for (const s of sentences) {
        if (rule.id === 'rent_increase') {
          const matches = [...s.matchAll(/(\d{1,3})\s*%/g)].map((m) => Number(m[1]));
          if (matches.length > 0 && Math.max(...matches) > 5) {
            hitQuote = s;
            break;
          }
        }
        if (rule.riskHints.some((re) => re.test(s))) {
          hitQuote = s;
          break;
        }
      }

      if (hitQuote) {
        items.push({
          itemId: rule.id,
          title: rule.title,
          verdict: '위험',
          quote: hitQuote,
          knowledge: rule.knowledge,
          fix: rule.fix,
        });
      }
    }
    return { pack: 'lease', version: 'v2-rule', items };
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

    const applyResults = (data) => {
      activeResults = data;
      const risks = (data.items || []).filter((item) => item.verdict === '위험');

      if (risks.length > 0) {
        pillElement.className = 'has-risk';
        pillElement.innerHTML = `<span>🚨</span> <span>위험 특약 ${risks.length}건 발견!</span>`;
        highlightRisks(risks);
      } else {
        pillElement.className = '';
        pillElement.innerHTML = `<span>✅</span> <span>위험 특약 없음 (${(data.items || []).length}개 항목 검토)</span>`;
      }
    };

    chrome.runtime.sendMessage(
      { action: 'check_text', text: text.slice(0, 4000), pack: preferredPack, version: 'v2' },
      (response) => {
        isScanning = false;

        if (!response || !response.ok) {
          // 서버 응답 부재 또는 환경변수 키 없을 시 로컬 규칙 엔진으로 즉시 폴백
          const fallbackData = localRuleScan(text);
          applyResults(fallbackData);
          return;
        }

        applyResults(response.data);
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
  const pageKeywords = ['특약', '임대차', '임대인', '임차인', '보증금', '차임', '위약금', '환불규정', '수선 의무', '계약서', '약관'];
  const fullText = document.body ? document.body.innerText : '';
  const matchCount = pageKeywords.filter((k) => fullText.includes(k)).length;

  if (matchCount >= 1) {
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
