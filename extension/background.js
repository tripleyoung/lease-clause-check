// 백그라운드 서비스 워커: 웹페이지(Content Script)와 특약 점검 서버 API 사이의 통신을 중계합니다.
const API_BASE = 'https://lease-clause-check.vercel.app';

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
          sendResponse({ ok: false, error: data.error || '점검 중 문제가 생겼어요.' });
        } else {
          sendResponse({ ok: true, data });
        }
      })
      .catch((err) => {
        sendResponse({ ok: false, error: '서버와 연결하지 못했어요. 네트워크를 확인해 주세요.' });
      });

    return true; // 비동기 응답 유지
  }

  if (request.action === 'mask_text') {
    const { text } = request;

    fetch(`${API_BASE}/api/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mask', text }),
    })
      .then(async (res) => {
        const data = await res.json();
        sendResponse({ ok: res.ok, data });
      })
      .catch((err) => {
        sendResponse({ ok: false, error: err.message });
      });

    return true;
  }
});
