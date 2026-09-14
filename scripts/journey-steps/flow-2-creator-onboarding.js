const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'flow-2.json');

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
  console.log('🚀 Running Flow 2: Creator Onboarding & Sample Request...');
  const creatorPage = await browser.newPage();
  await creatorPage.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });

  const results = [];
  let currentActivePage = creatorPage;

  try {
    // 1. Initial Authentication injection
    console.log('🔑 Initializing creator session credentials on Port 4000...');
    await creatorPage.goto('http://localhost:4000/creator/auth', { waitUntil: 'networkidle2', timeout: 10000 });
    await creatorPage.evaluate(() => {
      localStorage.setItem('userRole', 'creator');
      localStorage.setItem('creatorId', '1'); // Creator @nong_review
    });

    // 2. Open dashboard
    console.log('🧭 Setting up creator dashboard...');
    await creatorPage.goto('http://localhost:4000/creator/dashboard', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Open Admin tab to invite @nong_review
    console.log('🔑 Opening Admin tab on Port 4000 to invite the creator...');
    const adminPage = await browser.newPage();
    currentActivePage = adminPage;
    await adminPage.setViewport({ width: 1440, height: 900 });
    await adminPage.goto('http://localhost:4000/admin/auth', { waitUntil: 'networkidle2' });
    await adminPage.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('agencyBrandId', 'b1');
    });
    
    await adminPage.goto('http://localhost:4000/admin/campaigns/c1', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click "Participants" tab trigger
    console.log('🧭 Switching to Participants tab...');
    await adminPage.click('[id*="trigger-participants"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click the invite button for nong_review in the UI
    console.log('✉️ Inviting creator @nong_review...');
    const clickInviteBtnResult = await adminPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const inviteBtn = buttons.find(b => b.textContent.includes('nong_review'));
      if (inviteBtn) {
        inviteBtn.click();
        return true;
      }
      return false;
    });

    if (!clickInviteBtnResult) throw new Error('Could not find invite button for @nong_review.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await adminPage.close();

    // Reload Creator tab
    currentActivePage = creatorPage;
    await creatorPage.bringToFront();
    await creatorPage.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(creatorPage);

    // --- STEP 1: Creator Dashboard with Offer ---
    const step1Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 2 - Step 1: Campaign Offer Received',
      data: step1Data,
      connections: [
        { triggerText: 'Review offer & sign', destinationIndex: 1 }
      ]
    });

    // --- STEP 2: Briefing & Signature Page ---
    console.log('📸 Step 2: Navigating to briefing page...');
    await creatorPage.click('a[href="/creator/briefing"]');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(creatorPage);

    const step2Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 2 - Step 2: Campaign Briefing & Agreement',
      data: step2Data,
      connections: [
        { triggerText: 'I accept the campaign agreement', destinationIndex: 2 }
      ]
    });

    // --- STEP 3: Accept Terms & Sign ---
    console.log('📸 Step 3: Ticking agreement and signing...');
    await creatorPage.click('input[type="checkbox"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Click "Save Signature"
    const clickSaveResult = await creatorPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.textContent.includes('Save Signature'));
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    });

    if (!clickSaveResult) throw new Error('Could not find "Save Signature" button.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await injectFigmaConverter(creatorPage);

    const step3Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 2 - Step 3: Request Sample (Agreement Signed)',
      data: step3Data,
      connections: [
        { triggerText: 'Request sample product', destinationIndex: 3 }
      ]
    });

    // --- STEP 4: Request Sample ---
    console.log('📸 Step 4: Requesting sample product...');
    const clickRequestResult = await creatorPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reqBtn = buttons.find(b => b.textContent.includes('Request sample product'));
      if (reqBtn) {
        reqBtn.click();
        return true;
      }
      return false;
    });

    if (!clickRequestResult) throw new Error('Could not find "Request sample product" button.');
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(creatorPage);

    const step4Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 2 - Step 4: Sample Requested (Awaiting Approval)',
      data: step4Data
    });

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
      console.log(`🎉 Success! Saved Flow 2 to: ${OUTPUT_FILE}`);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
  })();
}

module.exports = { runFlow };
