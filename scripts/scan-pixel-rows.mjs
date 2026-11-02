import { chromium } from 'playwright';

async function scanPixelRows() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5193');
  await page.waitForLoadState('networkidle');

  const rows = await page.evaluate(async () => {
    async function getBoxes(imgUrl, w, h) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      await new Promise(r => img.onload = r);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // We look for the clause box borders and colored highlights
      // In gym: .clause-box-real has border #333, and .clause-highlight-safe / risk have reddish / greenish background
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Scan Y from 40% to 85%
      const startY = Math.floor(h * 0.40);
      const endY = Math.floor(h * 0.85);
      const startX = Math.floor(w * 0.08);
      const endX = Math.floor(w * 0.92);

      const coloredRows = [];
      for (let y = startY; y < endY; y++) {
        let hasReddish = false;
        let hasGreenish = false;
        let darkCount = 0;
        for (let x = startX; x < endX; x++) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          // red highlight: r > 210, g < 200, b < 200
          if (r > 200 && g < 180 && b < 185) hasReddish = true;
          // green highlight: g > 190 && r < 180
          if (g > 180 && r < 170 && b < 180) hasGreenish = true;
          // dark text
          if (r < 60 && g < 60 && b < 60) darkCount++;
        }
        coloredRows.push({ y, hasReddish, hasGreenish, darkCount });
      }
      return coloredRows;
    }

    return {
      gymRows: await getBoxes('/samples/scanned_gym_contract.png', 822, 891),
      leaseRows: await getBoxes('/samples/scanned_lease_contract.png', 824, 1089),
      taxRows: await getBoxes('/samples/scanned_tax_receipt.png', 822, 751)
    };
  });

  // Analyze gym
  function findSegments(rows, totalH) {
    const segments = [];
    let cur = null;
    for (const r of rows) {
      const isHighlighted = r.hasReddish || r.hasGreenish;
      if (isHighlighted) {
        if (!cur) cur = { startY: r.y, endY: r.y, type: r.hasReddish ? 'risk' : 'safe' };
        else cur.endY = r.y;
      } else {
        if (cur && (r.y - cur.endY > 4)) {
          segments.push({
            top: Number(((cur.startY / totalH) * 100).toFixed(2)),
            height: Number((((cur.endY - cur.startY + 2) / totalH) * 100).toFixed(2)),
            type: cur.type,
            startY: cur.startY,
            endY: cur.endY
          });
          cur = null;
        }
      }
    }
    if (cur) {
      segments.push({
        top: Number(((cur.startY / totalH) * 100).toFixed(2)),
        height: Number((((cur.endY - cur.startY + 2) / totalH) * 100).toFixed(2)),
        type: cur.type,
      });
    }
    return segments;
  }

  console.log('GYM SEGMENTS:', findSegments(rows.gymRows, 891));
  console.log('LEASE SEGMENTS:', findSegments(rows.leaseRows, 1089));
  console.log('TAX SEGMENTS:', findSegments(rows.taxRows, 751));

  await browser.close();
}

scanPixelRows().catch(console.error);
