const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'flow-5.json');

async function capturePage(page) {
  return await page.evaluate(() => {
    if (typeof window.htmlToFigma === 'function') {
      return window.htmlToFigma(document.body);
    } else {
      throw new Error('htmlToFigma library not loaded correctly.');
    }
  });
}

async function injectFigmaConverter(page) {
  await page.evaluate(async () => {
    const module = await import('https://cdn.jsdelivr.net/npm/@builder.io/html-to-figma/+esm');
    window.htmlToFigma = module.htmlToFigma;
  });
}

async function runFlow(browser) {
  console.log('🚀 Running Flow 5: Spark Ads Sync & Reporting...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  try {
    // 1. Initial Authentication injection
    console.log('🔑 Initializing brand session credentials on Port 4000...');
    await page.goto('http://localhost:4000/brand/auth', { waitUntil: 'networkidle2', timeout: 10000 });
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'brand');
      localStorage.setItem('agencyBrandId', 'b1'); // Brand Hmee Prung
    });

    // 2. Open Campaign c1 detail page
    console.log('🧭 Navigating to Hmee Prung Campaign c1 detail page...');
    await page.goto('http://localhost:4000/brand/campaigns/c1', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Safety net
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('creatorhub-storage') || '{}');
      if (store && store.state) {
        const nong = store.state.creators.find(c => c.id === '1');
        if (nong) {
          if (!nong.clips || nong.clips.length === 0 || nong.clips[0].status !== 'passed') {
            nong.clips = [{ n: 1, status: 'passed', link: 'https://www.tiktok.com/@nong_review/video/1001', sparkCode: 'sp_ads_1001', spark: false, gmv: 14500 }];
            localStorage.setItem('creatorhub-storage', JSON.stringify(store));
          }
        }
      }
    });

    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(page);

    // --- STEP 1: Brand Campaign Details Overview ---
    const step1Data = await capturePage(page);
    results.push({
      name: 'Flow 5 - Step 1: Brand Campaign Details (Overview)',
      data: step1Data,
      connections: [
        { triggerText: 'Report', destinationIndex: 1 }
      ]
    });

    // --- STEP 2: Navigate to Report tab ---
    console.log('📸 Step 2: Clicking Report tab trigger...');
    await page.click('[id*="trigger-report"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await injectFigmaConverter(page);

    const step2Data = await capturePage(page);
    results.push({
      name: 'Flow 5 - Step 2: Campaign Report (Clips Sync Queue)',
      data: step2Data,
      connections: [
        { triggerText: 'Sync Spark', destinationIndex: 2 }
      ]
    });

    // --- STEP 3: Click Sync Spark Ads for @nong_review ---
    console.log('📸 Step 3: Clicking Sync Spark button for @nong_review...');
    const clickSyncResult = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr, .glass, div[class*="rounded-xl"]'));
      const nongRow = rows.find(r => r.textContent.includes('nong_review'));
      if (nongRow) {
        const btn = Array.from(nongRow.querySelectorAll('button')).find(b => b.textContent.includes('Sync Spark'));
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!clickSyncResult) throw new Error('Could not find "Sync Spark" button for @nong_review.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(page);

    const step3Data = await capturePage(page);
    results.push({
      name: 'Flow 5 - Step 3: Spark Ads Synced',
      data: step3Data,
      connections: [
        { triggerText: 'GMV trend', destinationIndex: 3 }
      ]
    });

    // --- STEP 4: Switch to GMV trend chart ---
    console.log('📸 Step 4: Clicking GMV trend tab trigger...');
    await page.click('[id*="trigger-chart"]');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await injectFigmaConverter(page);

    const step4Data = await capturePage(page);
    results.push({
      name: 'Flow 5 - Step 4: GMV Trend Performance Chart',
      data: step4Data
    });

  } finally {
    await page.close();
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const results = await runFlow(browser);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      console.log(`🎉 Success! Saved Flow 5 to: ${OUTPUT_FILE}`);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
  })();
}

module.exports = { runFlow };
