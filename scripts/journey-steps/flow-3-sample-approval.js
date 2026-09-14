const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'flow-3.json');

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
  console.log('🚀 Running Flow 3: Sample Approval & Fulfillment...');
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

    // 2. Open Sample Approvals Page
    console.log('🧭 Navigating to Sample Approvals page...');
    await page.goto('http://localhost:4000/brand/samples', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    await injectFigmaConverter(page);

    // --- STEP 1: Pending Sample Approvals ---
    const step1Data = await capturePage(page);
    results.push({
      name: 'Flow 3 - Step 1: Pending Sample Request',
      data: step1Data,
      connections: [
        { triggerText: 'Approve', destinationIndex: 1 }
      ]
    });

    // --- STEP 2: Approve the Sample for @nong_review ---
    console.log('📸 Step 2: Approving sample request for @nong_review...');
    const clickApproveResult = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li'));
      const nongItem = items.find(li => li.textContent.includes('nong_review'));
      if (nongItem) {
        const buttons = Array.from(nongItem.querySelectorAll('button'));
        const approveBtn = buttons.find(b => b.textContent.includes('Approve'));
        if (approveBtn) {
          approveBtn.click();
          return true;
        }
      }
      return false;
    });

    if (!clickApproveResult) throw new Error('Could not find "Approve" button for @nong_review.');
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Click "Fulfillment" tab trigger
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const fulTab = tabs.find(t => t.textContent.includes('Fulfillment'));
      if (fulTab) {
        fulTab.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 800));
    await injectFigmaConverter(page);

    const step2Data = await capturePage(page);
    results.push({
      name: 'Flow 3 - Step 2: Sample in Fulfillment (Received)',
      data: step2Data
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
      console.log(`🎉 Success! Saved Flow 3 to: ${OUTPUT_FILE}`);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
  })();
}

module.exports = { runFlow };
