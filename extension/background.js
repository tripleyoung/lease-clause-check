// ClauseGuard Background Service Worker
const API_BASE = 'https://lease-clause-check.vercel.app';

// 서버 API 키 부재(503) 또는 오프라인 시 작동하는 로컬 고속 규칙 검사기
const LOCAL_LEASE_RULES = [
  {
    id: 'no_new_mortgage',
    title: '잔금·전입 다음 날까지 근저당 설정 금지',
    riskReason: '세입자의 법적 대항력은 전입신고 및 확정일자 "익일(다음 날) 0시"부터 발생합니다. 잔금 당일 집주인이 대출을 받아 근저당을 설정하면 은행이 세입자보다 선순위(1순위)가 됩니다.',
    riskConsequence: '집이 경매로 넘어갈 경우 은행 대출금이 먼저 변제되고, 내 보증금은 후순위로 밀려 수천만~수억 원의 보증금을 전부 날릴 수 있습니다.',
    riskHints: [/근저당.{0,20}(설정|대출).{0,10}(할 수 있|가능|동의)/, /잔금.{0,15}(대출|담보).{0,15}(실행|설정)/],
    knowledge: '주택임대차보호법 제3조(대항력 등)',
    fix: '임대인은 잔금 지급일 다음 날까지 이 주택에 근저당권 등 어떠한 권리도 새로 설정하지 않으며, 이를 어기면 임차인은 계약을 해제하고 지급한 금액 전부와 그 배액을 청구할 수 있다.',
  },
  {
    id: 'deposit_return',
    title: '보증금 반환 시기',
    riskReason: '보증금 반환은 계약 종료와 동시에 이행되어야 하는 임대인의 당연한 법적 의무입니다. 이를 새 임차인 입주에 묶는 것은 세입자에게 무기한 대기를 강요하는 독소 조항입니다.',
    riskConsequence: '다음 세입자가 구해지지 않으면 보증금을 돌려받지 못해 이사 갈 집의 잔금을 못 치르고, 전세대출 연체이자 폭탄이나 계약금 몰수를 당하게 됩니다.',
    riskHints: [/(새|다음|신규).{0,6}(세입자|임차인).{0,20}(구해|들어|입주).{0,20}(반환|돌려)/, /보증금.{0,20}(반환|돌려).{0,20}(유예|미룰|늦출)/],
    knowledge: '주택임대차보호법 제4조(임대차기간 등)',
    fix: '임대인은 계약 종료일에 임차인의 퇴거와 동시에 보증금 전액을 반환하며, 새 임차인의 입주 여부를 반환 조건으로 삼지 않는다.',
  },
  {
    id: 'renewal_right',
    title: '계약갱신요구권 포기',
    riskReason: '계약갱신요구권은 법이 보장한 권리이며, 주택임대차보호법 제10조(강행규정)에 따라 세입자에게 불리한 포기 약정은 법적으로 무효입니다.',
    riskConsequence: '2년 뒤 더 살고 싶어도 집주인의 무리한 시세 인상이나 일방적 퇴거 요구에 속수무책으로 쫓겨나게 됩니다.',
    riskHints: [/갱신.{0,10}(요구|청구).{0,15}(하지 않|포기|불가|없)/, /(재계약|연장).{0,10}(없|불가).{0,10}(조건|으로 한다)/],
    knowledge: '주택임대차보호법 제6조의3(계약갱신 요구 등)',
    fix: '임차인의 계약갱신요구권은 주택임대차보호법 제6조의3에 따른다(이를 제한하는 약정은 두지 않는다).',
  },
  {
    id: 'rent_increase',
    title: '차임·보증금 증액 한도',
    riskReason: '주택임대차보호법 제7조는 임대료 증액 상한을 약정 금액의 5% 이내로 엄격히 제한하고 있습니다.',
    riskConsequence: '매년 10% 등 집주인이 부르는 대로 과도한 주거비를 물어내야 하며, 감당하지 못할 경우 쫓겨나는 주거 불안에 시달립니다.',
    riskHints: [/(\d{1,2})\s*%.{0,15}(인상|증액|올)/, /(인상|증액).{0,20}(임대인|시세).{0,15}(정|따른|결정)/],
    knowledge: '주택임대차보호법 제7조(차임 등의 증감청구권)',
    fix: '차임과 보증금의 증액은 주택임대차보호법 제7조에 따라 약정한 금액의 20분의 1 이내로 하며, 계약 후 1년 안에는 증액하지 않는다.',
  },
  {
    id: 'repair_duty',
    title: '수선 책임',
    riskReason: '민법 제623조에 따라 보일러 노후화, 배관 누수 등 주요 구조 설비 하자는 임대인의 법적 수선 의무입니다.',
    riskConsequence: '보일러 교체나 아랫집 누수 배상금 등 수백만~수천만 원에 달하는 수리비 폭탄을 세입자가 고스란히 독박 쓰게 됩니다.',
    riskHints: [/(모든|일체의|전부).{0,10}(수리|수선|하자).{0,20}(임차인|세입자).{0,10}(부담|책임)/, /(보일러|누수|배관|결로|곰팡이).{0,30}(임차인|세입자).{0,10}(부담|책임)/],
    knowledge: '민법 제623조(임대인의 의무)',
    fix: '보일러, 누수, 배관 등 주택의 주요 설비 하자는 민법 제623조에 따라 임대인이 비용을 들여 수선하며, 임차인은 고의·과실이 없는 한 책임을 지지 않는다.',
  },
  {
    id: 'early_exit',
    title: '중도 해지 및 과도한 위약금',
    riskReason: '중도 해지 시 신규 임차인 중개보수 부담 외에 수개월 치 월세 강제 몰수나 과도한 위약금 부과는 불공정 약정입니다.',
    riskConsequence: '부득이하게 이사를 가야 할 때 보증금에서 수백만 원의 부당한 위약금이 공제되거나 보증금이 묶이게 됩니다.',
    riskHints: [/(중도|중간).{0,10}(해지|퇴거).{0,30}(위약금|월세.{0,6}개월|보증금.{0,10}(공제|몰수))/],
    knowledge: '주택임대차보호법 제6조의2(계약의 해지)',
    fix: '임차인이 부득이하게 중도 해지할 경우 신규 임차인 중개보수 외의 별도 위약금은 청구하지 않는다.',
  },
];

function fallbackRuleScan(text) {
  const sentences = text
    .split(/\n|(?<=[.다요])\s+(?=\d+\.|[가-힣])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const items = [];
  for (const rule of LOCAL_LEASE_RULES) {
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
        riskReason: rule.riskReason,
        riskConsequence: rule.riskConsequence,
      });
    }
  }

  return { pack: 'lease', version: 'v2-fallback', items };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'check_text') {
    const { text, pack = 'lease', version = 'v2' } = request;

    fetch(`${API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', text, pack, version }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const fallbackData = fallbackRuleScan(text);
          sendResponse({ ok: true, data: fallbackData, fallback: true });
        } else {
          sendResponse({ ok: true, data });
        }
      })
      .catch((err) => {
        const fallbackData = fallbackRuleScan(text);
        sendResponse({ ok: true, data: fallbackData, fallback: true });
      });

    return true;
  }

  if (request.action === 'lookup_law') {
    const { itemId = 'no_new_mortgage' } = request;
    fetch(`${API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'law', itemId }),
    })
      .then((r) => r.json())
      .then((data) => sendResponse({ ok: true, data }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});
