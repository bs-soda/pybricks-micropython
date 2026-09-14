const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'flow-1.json');

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
  console.log('🚀 Running Flow 1: Campaign Setup...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  try {
    // 1. Initial Authentication injection
    console.log('🔑 Initializing admin session credentials on Port 4000...');
    await page.goto('http://localhost:4000/admin/auth', { waitUntil: 'networkidle2', timeout: 10000 });
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('agencyBrandId', 'b1');
      localStorage.removeItem('creatorhub-storage'); // Reset state first
    });

    // --- STEP 1: Campaigns List Page ---
    console.log('📸 Step 1: Loading Campaigns List Page...');
    await page.goto('http://localhost:4000/admin/campaigns', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(page);

    const step1Data = await capturePage(page);
    results.push({
      name: 'Flow 1 - Step 1: Campaigns List (Initial)',
      data: step1Data,
      connections: [
        { triggerText: 'New campaign', destinationIndex: 1 }
      ]
    });

    // --- STEP 2: Open Create Campaign Dialog ---
    console.log('📸 Step 2: Opening "New campaign" dialog...');
    const clickOpenResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const newCampBtn = buttons.find(b => b.textContent.includes('New campaign'));
      if (newCampBtn) {
        newCampBtn.click();
        return true;
      }
      return false;
    });

    if (!clickOpenResult) throw new Error('Could not find "+ New campaign" button.');
    await page.waitForSelector('input[placeholder="Cleansing Balm"]', { visible: true, timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 800));

    await injectFigmaConverter(page);
    const step2Data = await capturePage(page);
    results.push({
      name: 'Flow 1 - Step 2: New Campaign Dialog (Open)',
      data: step2Data,
      connections: [
        { triggerText: 'Cleansing Balm', destinationIndex: 2 }
      ]
    });

    // --- STEP 3: Form Fields Filled ---
    console.log('📸 Step 3: Filling out campaign input parameters...');
    await page.focus('input[placeholder="Cleansing Balm"]');
    await page.keyboard.type('Summer Glow Collection');

    await page.focus('input[placeholder="Cleansing Balm 100g"]');
    await page.keyboard.type('Summer Glow Powder 50g');

    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const commInput = inputs.find(i => i.value === '20');
      if (commInput) {
        commInput.value = '';
        commInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.focus('input[value=""]');
    await page.keyboard.type('25');

    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const clipsInput = inputs.find(i => i.value === '3');
      if (clipsInput) {
        clipsInput.value = '';
        clipsInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.focus('input[value=""]');
    await page.keyboard.type('5');

    await new Promise(resolve => setTimeout(resolve, 500));
    await injectFigmaConverter(page);

    const step3Data = await capturePage(page);
    results.push({
      name: 'Flow 1 - Step 3: Form Parameters Filled',
      data: step3Data,
      connections: [
        { triggerText: 'Create campaign', destinationIndex: 3 }
      ]
    });

    // --- STEP 4: Campaign Created ---
    console.log('📸 Step 4: Submitting and creating campaign...');
    const clickSubmitResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const createBtn = buttons.find(b => b.textContent.includes('Create campaign') && !b.disabled);
      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });

    if (!clickSubmitResult) throw new Error('Could not find active "Create campaign" button.');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await injectFigmaConverter(page);

    const step4Data = await capturePage(page);
    results.push({
      name: 'Flow 1 - Step 4: Campaign Added to List',
      data: step4Data
    });

  } finally {
    await page.close();
  }

  return results;
}

// Standalone execution wrapper
if (require.main === module) {
  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    try {
      const results = await runFlow(browser);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      console.log(`🎉 Success! Saved Flow 1 to: ${OUTPUT_FILE}`);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
  })();
}

module.exports = { runFlow };
