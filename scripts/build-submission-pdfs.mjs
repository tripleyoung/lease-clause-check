import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

async function generateSubmissionPdfs() {
  console.log('Starting submission PDF generation...');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. 00_과제제출_최종안내문.pdf
    console.log('Generating 00_과제제출_최종안내문.pdf...');
    const guidePage = await browser.newPage();
    const mdContent = fs.readFileSync('submission/00_과제제출_최종안내문.md', 'utf-8');

    // Simple markdown formatting helper
    let bodyHtml = mdContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '<br><br>');

    // Wrap in standard clean styled document
    const guideHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>과제제출 최종안내문</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 18mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #1e293b;
      margin: 0;
      padding: 0;
    }
    h1 {
      font-size: 22px;
      color: #0f172a;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 16px;
    }
    h2 {
      font-size: 16px;
      color: #1d4ed8;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    h3 {
      font-size: 14px;
      color: #0f172a;
      margin-top: 14px;
      margin-bottom: 6px;
    }
    li {
      margin-bottom: 4px;
    }
    code {
      font-family: ui-monospace, Menlo, Consolas, monospace;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 12px;
      color: #0f172a;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-family: ui-monospace, Menlo, monospace;
      overflow-x: auto;
      line-height: 1.45;
    }
    hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 18px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

    await guidePage.setContent(guideHtml, { waitUntil: 'networkidle' });
    await guidePage.pdf({
      path: 'submission/00_과제제출_최종안내문.pdf',
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }
    });
    console.log('✓ 00_과제제출_최종안내문.pdf successfully generated.');

    // 2. 01_발표자료_계약서특약점검기.pdf
    console.log('Generating 01_발표자료_계약서특약점검기.pdf...');
    const slidePage = await browser.newPage();
    const slideHtmlPath = path.resolve('submission/01_발표자료_계약서특약점검기.html');
    await slidePage.goto(`file://${slideHtmlPath}`, { waitUntil: 'networkidle' });

    // Emulate screen media to preserve high-contrast dark theme or clean presentation theme
    await slidePage.emulateMedia({ media: 'screen' });

    await slidePage.pdf({
      path: 'submission/01_발표자료_계약서특약점검기.pdf',
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
    });
    console.log('✓ 01_발표자료_계약서특약점검기.pdf successfully generated.');

  } finally {
    await browser.close();
  }
}

generateSubmissionPdfs().catch(err => {
  console.error('Error generating PDFs:', err);
  process.exit(1);
});
