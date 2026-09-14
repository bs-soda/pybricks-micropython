const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'flow-0.json');

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
  console.log('🚀 Running Flow 0: Authentication Gateway...');
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  try {
    // --- STEP 1: Portal Selector Landing Gateway ---
    console.log('📸 Step 1: Loading Common Portal Selection page...');
    await page.goto('http://localhost:4000/', { waitUntil: 'networkidle2', timeout: 15000 });
    await injectFigmaConverter(page);
    
    const step1Data = await capturePage(page);
    results.push({
      name: 'Flow 0 - Step 1: Portal Selector Gateway',
      data: step1Data,
      connections: [
        { triggerText: 'Agency Admin', destinationIndex: 1 },
        { triggerText: 'Brand Portal', destinationIndex: 2 },
        { triggerText: 'Creator · LINE', destinationIndex: 3 }
      ]
    });

    // --- STEP 2: Agency Admin Login page ---
    console.log('📸 Step 2: Loading Agency Admin Login page...');
    await page.goto('http://localhost:4000/admin/auth', { waitUntil: 'networkidle2' });
    // Pre-fill fields for visualization without submitting
    await page.focus('input[type="email"]');
    await page.keyboard.type('admin@creatorhub.io');
    await page.focus('input[type="password"]');
    await page.keyboard.type('demo1234');
    await new Promise(resolve => setTimeout(resolve, 500));
    await injectFigmaConverter(page);

    const step2Data = await capturePage(page);
    results.push({
      name: 'Flow 0 - Step 2: Agency Admin Sign-in',
      data: step2Data
    });

    // --- STEP 3: Brand Portal Login page ---
    console.log('📸 Step 3: Loading Brand Portal Login page...');
    await page.goto('http://localhost:4000/brand/auth', { waitUntil: 'networkidle2' });
    await page.focus('input[type="email"]');
    await page.keyboard.type('brand@hmeeprung.com');
    await page.focus('input[type="password"]');
    await page.keyboard.type('demo1234');
    await new Promise(resolve => setTimeout(resolve, 500));
    await injectFigmaConverter(page);

    const step3Data = await capturePage(page);
    results.push({
      name: 'Flow 0 - Step 3: Brand Portal Sign-in',
      data: step3Data
    });

    // --- STEP 4: Creator LINE Auth page ---
    console.log('📸 Step 4: Loading Creator Portal LINE auth page...');
    const creatorPage = await browser.newPage();
    await creatorPage.setViewport({ width: 430, height: 932, isMobile: true, hasTouch: true });
    await creatorPage.goto('http://localhost:4000/creator/auth', { waitUntil: 'networkidle2' });
    await injectFigmaConverter(creatorPage);

    const step4Data = await capturePage(creatorPage);
    results.push({
      name: 'Flow 0 - Step 4: Creator LINE Sign-in',
      data: step4Data
    });

    await creatorPage.close();

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
      console.log(`🎉 Success! Saved Flow 0 to: ${OUTPUT_FILE}`);
    } catch (e) {
      console.error(e);
    } finally {
      await browser.close();
    }
  })();
}

module.exports = { runFlow };
