document.getElementById('btn-scan').addEventListener('click', async () => {
  const pack = document.getElementById('pack-select').value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'scan_page', pack }, (response) => {
      window.close(); // 팝업 닫고 웹페이지 내 하이라이트로 집중
    });
  }
});
