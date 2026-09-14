const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'flow-4.json');

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
  console.log('🚀 Running Flow 4: Clip Submission & Moderation...');
  const creatorPage = await browser.newPage();
  await creatorPage.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });

  const results = [];
  let currentActivePage = creatorPage;

  try {
    // 1. Setup creator session
    console.log('🔑 Initializing creator session credentials on Port 4000...');
    await creatorPage.goto('http://localhost:4000/creator/auth', { waitUntil: 'networkidle2', timeout: 10000 });
    await creatorPage.evaluate(() => {
      localStorage.setItem('userRole', 'creator');
      localStorage.setItem('creatorId', '1'); // @nong_review
    });

    // 2. Open creator dashboard
    console.log('🧭 Navigating to creator dashboard...');
    await creatorPage.goto('http://localhost:4000/creator/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Safety net
    await creatorPage.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('creatorhub-storage') || '{}');
      if (store && store.state) {
        const nong = store.state.creators.find(c => c.id === '1');
        if (nong && (nong.status === 'sample_approved' || nong.status === 'sample_shipped')) {
          nong.status = 'sample_received';
          nong.sample = { status: 'received' };
          nong.clips = [];
          localStorage.setItem('creatorhub-storage', JSON.stringify(store));
        }
      }
    });

    await creatorPage.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(creatorPage);

    // --- STEP 1: Clip Submission (Form Open) ---
    const step1Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 4 - Step 1: Creator Video Submission (Empty)',
      data: step1Data,
      connections: [
        { triggerText: '+ Submit clip', destinationIndex: 1 }
      ]
    });

    // --- STEP 2: Fill Form & Submit ---
    console.log('📸 Step 2: Filling out clip submission form...');
    await creatorPage.focus('input[placeholder="https://www.tiktok.com/@you/video/…"]');
    await creatorPage.keyboard.type('https://www.tiktok.com/@nong_review/video/1001');

    await creatorPage.focus('input[placeholder="#SPARK-ADS-CODE"]');
    await creatorPage.keyboard.type('sp_ads_1001');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click "+ Submit clip" button
    const clickSubmitResult = await creatorPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const subBtn = buttons.find(b => b.textContent.includes('+ Submit clip'));
      if (subBtn && !subBtn.disabled) {
        subBtn.click();
        return true;
      }
      return false;
    });

    if (!clickSubmitResult) throw new Error('Could not find active "+ Submit clip" button.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(creatorPage);

    const step2Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 4 - Step 2: Creator Dashboard (Clip Submitted)',
      data: step2Data,
      connections: [
        { triggerText: '1 submitted', destinationIndex: 2 }
      ]
    });

    // --- STEP 3: Admin Moderation Page ---
    console.log('📸 Step 3: Opening Admin Console Moderation page...');
    const adminPage = await browser.newPage();
    currentActivePage = adminPage;
    await adminPage.setViewport({ width: 1440, height: 900 });
    await adminPage.goto('http://localhost:4000/admin/auth', { waitUntil: 'networkidle2' });
    await adminPage.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('agencyBrandId', 'b1');
    });

    await adminPage.goto('http://localhost:4000/admin/moderation', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await injectFigmaConverter(adminPage);

    const step3Data = await capturePage(adminPage);
    results.push({
      name: 'Flow 4 - Step 3: Agency Moderation Queue',
      data: step3Data,
      connections: [
        { triggerText: '✓ Approve → Brand', destinationIndex: 3 }
      ]
    });

    // --- STEP 4: Approve the Clip for @nong_review ---
    console.log('📸 Step 4: Approving the submitted clip for @nong_review...');
    const clickApproveResult = await adminPage.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass.flex, div[class*="rounded-xl"]'));
      const nongCard = cards.find(c => c.textContent.includes('nong_review'));
      if (nongCard) {
        const buttons = Array.from(nongCard.querySelectorAll('button'));
        const appBtn = buttons.find(b => b.textContent.includes('Approve'));
        if (appBtn) {
          appBtn.click();
          return true;
        }
      }
      return false;
    });

    if (!clickApproveResult) throw new Error('Could not find "✓ Approve → Brand" button for @nong_review.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(adminPage);

    const step4Data = await capturePage(adminPage);
    results.push({
      name: 'Flow 4 - Step 4: Moderation Queue (Approved)',
      data: step4Data
    });

    await adminPage.close();

  } finally {
    await creatorPage.close();
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const results = await runFlow(browser);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      console.log(`🎉 Success! Saved Flow 4 to: ${OUTPUT_FILE}`);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
  })();
}

module.exports = { runFlow };
