import { chromium } from 'playwright';
import fs from 'fs';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.goto('https://www.naukri.com/software-engineer-jobs-in-bangalore', {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(4000);
  const html = await page.content();
  fs.writeFileSync('naukri.html', html);
  await browser.close();
  console.log('Dumped Naukri HTML');
}
test().catch(console.error);
