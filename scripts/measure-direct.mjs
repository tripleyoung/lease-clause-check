import { chromium } from 'playwright';

async function measureDirectImage() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Load image into page
  await page.setContent(`
    <html><body style="margin:0; background:#000;">
      <img id="gym" src="http://localhost:5193/samples/scanned_gym_contract.png" />
      <img id="lease" src="http://localhost:5193/samples/scanned_lease_contract.png" />
      <img id="tax" src="http://localhost:5193/samples/scanned_tax_receipt.png" />
    </body></html>
  `);

  await page.waitForLoadState('networkidle');

  const res = await page.evaluate(() => {
    const gym = document.getElementById('gym');
    const lease = document.getElementById('lease');
    const tax = document.getElementById('tax');
    return {
      gym: { w: gym.naturalWidth, h: gym.naturalHeight },
      lease: { w: lease.naturalWidth, h: lease.naturalHeight },
      tax: { w: tax.naturalWidth, h: tax.naturalHeight },
    };
  });

  console.log('Direct image natural dimensions:', res);
  await browser.close();
}

measureDirectImage().catch(console.error);
