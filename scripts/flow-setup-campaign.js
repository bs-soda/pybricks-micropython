const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 8080;
const OUTPUT_FILE = path.join(__dirname, 'figma-nodes.json');

// Helper to run html-to-figma converter on the page
async function capturePage(page) {
  return await page.evaluate(() => {
    if (typeof window.htmlToFigma === 'function') {
      return window.htmlToFigma(document.body);
    } else {
      throw new Error('htmlToFigma library not loaded correctly.');
    }
  });
}

// Helper to inject the html-to-figma script dynamically
async function injectFigmaConverter(page) {
  await page.evaluate(async () => {
    const module = await import('https://cdn.jsdelivr.net/npm/@builder.io/html-to-figma/+esm');
    window.htmlToFigma = module.htmlToFigma;
  });
}

async function runStepByStepJourney() {
  console.log('🚀 Starting Step-by-Step Flow 1 Journey...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  try {
    // 1. Initial Authentication injection
    console.log('🔑 Initializing session credentials...');
    await page.goto('http://localhost:4002/admin/auth', { waitUntil: 'networkidle2', timeout: 10000 });
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'admin');
      localStorage.setItem('agencyBrandId', 'b1');
    });

    // --- STEP 1: Initial Campaigns List Page ---
    console.log('\n📸 Step 1: Loading Campaigns List Page...');
    await page.goto('http://localhost:4002/admin/campaigns', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await injectFigmaConverter(page);

    const step1Data = await capturePage(page);
    results.push({
      name: 'Step 1 - Campaigns List (Initial)',
      data: step1Data,
      connections: [
        { triggerText: 'New campaign', destinationIndex: 1 }
      ]
    });
    console.log('✅ Captured Step 1.');

    // --- STEP 2: Open Create Campaign Dialog ---
    console.log('\n📸 Step 2: Opening "New campaign" dialog...');
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

    // Wait for dialog rendering
    await page.waitForSelector('input[placeholder="Cleansing Balm"]', { visible: true, timeout: 5000 });
    await new Promise(resolve => setTimeout(resolve, 800)); // wait for fade-in animations

    await injectFigmaConverter(page);
    const step2Data = await capturePage(page);
    results.push({
      name: 'Step 2 - New Campaign Dialog (Open)',
      data: step2Data,
      connections: [
        { triggerText: 'Cleansing Balm', destinationIndex: 2 }
      ]
    });
    console.log('✅ Captured Step 2.');

    // --- STEP 3: Form Fields Filled ---
    console.log('\n📸 Step 3: Filling out campaign input parameters...');

    // Fill Campaign Name
    await page.focus('input[placeholder="Cleansing Balm"]');
    await page.keyboard.type('Summer Glow Collection');

    // Fill Product SKU
    await page.focus('input[placeholder="Cleansing Balm 100g"]');
    await page.keyboard.type('Summer Glow Powder 50g');

    // Clear and Fill Commission (change 20 -> 25)
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

    // Clear and Fill Clips (change 3 -> 5)
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

    await new Promise(resolve => setTimeout(resolve, 500)); // wait for state render
    await injectFigmaConverter(page);

    const step3Data = await capturePage(page);
    results.push({
      name: 'Step 3 - Form Parameters Filled',
      data: step3Data,
      connections: [
        { triggerText: 'Create campaign', destinationIndex: 3 }
      ]
    });
    console.log('✅ Captured Step 3.');

    // --- STEP 4: Campaign Created ---
    console.log('\n📸 Step 4: Submitting and creating campaign...');
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

    // Wait for the modal dialog to close and list to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    await injectFigmaConverter(page);

    const step4Data = await capturePage(page);
    results.push({
      name: 'Step 4 - Campaign Added to List',
      data: step4Data
    });
    console.log('✅ Captured Step 4.');

    // Save all steps
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log(`\n🎉 Success! Saved all 4 journey steps to: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Error during step-by-step capture:', error.message);
  } finally {
    await browser.close();
  }
}

function startLocalServer() {
  console.log(`📡 Starting Local Server on port ${PORT}...`);

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/figma-nodes.json') {
      if (fs.existsSync(OUTPUT_FILE)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const fileStream = fs.createReadStream(OUTPUT_FILE);
        fileStream.pipe(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found. Run automation first.');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🟢 Local automated flow server is running!`);
    console.log(`👉 Figma URL data path: http://localhost:${PORT}/figma-nodes.json`);
    console.log(`👉 Open your Figma plugin and click import`);
    console.log(`ℹ️  Press Ctrl + C to stop the server when done`);
    console.log(`==================================================\n`);
  });
}

(async () => {
  await runStepByStepJourney();
  startLocalServer();
})();
