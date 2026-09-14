const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'figma-components.json');

async function captureElement(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`Element ${sel} not found`);
    if (typeof window.htmlToFigma === 'function') {
      return window.htmlToFigma(el);
    } else {
      throw new Error('htmlToFigma library not loaded correctly.');
    }
  }, selector);
}

async function injectFigmaConverter(page) {
  await page.evaluate(async () => {
    const module = await import('https://cdn.jsdelivr.net/npm/@builder.io/html-to-figma/+esm');
    window.htmlToFigma = module.htmlToFigma;
  });
}

async function run() {
  console.log('🚀 Starting UI Components extraction from playground page...');
  console.log('==================================================');

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  try {
    console.log('🧭 Navigating to components playground on Port 4000...');
    await page.goto('http://localhost:4000/components-playground', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for styles to settle
    
    await injectFigmaConverter(page);

    const componentIds = [
      'comp-button',
      'comp-badge',
      'comp-input',
      'comp-tabs',
      'comp-metriccard',
      'comp-creatoridentity',
      'comp-kanbancard',
      'comp-sidebar',
      'comp-signaturepad',
      'comp-barchart',
      'comp-linechart',
      'comp-phoneframe'
    ];

    const results = [];

    for (const id of componentIds) {
      console.log(`📸 Capturing component container: #${id}...`);
      try {
        const data = await captureElement(page, `#${id}`);
        
        // Clean name (e.g. "comp-button" -> "Button")
        const rawName = id.replace('comp-', '');
        const cleanName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        
        results.push({
          name: `${cleanName}`,
          isComponent: true,
          data: data
        });
      } catch (err) {
        console.error(`⚠️ Failed to capture component #${id}:`, err.message);
      }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    console.log('==================================================');
    console.log(`\n🎉 Success! Extracted components JSON saved to: ${OUTPUT_FILE}`);
    console.log(`📊 Total components captured: ${results.length}`);

  } catch (error) {
    console.error('❌ Extraction compilation failed:', error.message);
  } finally {
    await browser.close();
  }
}

run();
