const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Parsing CLI arguments
const args = process.argv.slice(2);

const fileIndex = args.indexOf('--file');
const urlIndex = args.indexOf('--url');

const PORT = 8080;
const OUTPUT_FILE = path.join(__dirname, 'figma-nodes.json');

// Helper to extract a friendly name from a URL to use as the Figma Frame name
function getFrameName(urlString) {
  try {
    const parsed = new URL(urlString);
    let name = parsed.pathname;
    if (name.endsWith('/')) {
      name = name.slice(0, -1);
    }
    // Return a clean portal/page name including the port
    const portalName = 
      parsed.port === '4000' ? 'Landing' :
      parsed.port === '4001' ? 'Brand' :
      parsed.port === '4002' ? 'Admin' :
      parsed.port === '4003' ? 'Creator' : 'Unknown';

    return `[${portalName}] ${name.replace(/^\//, '').replace(/\//g, ' - ') || 'Home'}`;
  } catch (e) {
    return urlString;
  }
}

async function extractWebpage(page, urlString) {
  console.log(`📡 Processing target URL: ${urlString}...`);
  try {
    const parsedUrl = new URL(urlString);
    const targetPort = parsedUrl.port;
    
    // 1. First navigate to the auth page of the same portal to establish origin in localStorage
    // (This prevents AuthGuard from redirecting us because we will write session data first)
    if (targetPort && ['4001', '4002', '4003'].includes(targetPort)) {
      const basePath = 
        targetPort === '4001' ? '/brand' :
        targetPort === '4002' ? '/admin' :
        targetPort === '4003' ? '/creator' : '';
      const authInitUrl = `${parsedUrl.origin}${basePath}/auth`;
      console.log(`🔑 Initializing mock authentication on: ${authInitUrl}`);
      
      await page.goto(authInitUrl, { waitUntil: 'networkidle2', timeout: 10000 });
      
      // Inject localStorage authentication state
      await page.evaluate((port) => {
        // Clear old sessions
        localStorage.removeItem('userRole');
        localStorage.removeItem('agencyBrandId');
        localStorage.removeItem('creatorId');

        if (port === '4002') {
          // Admin Console
          localStorage.setItem('userRole', 'admin');
          localStorage.setItem('agencyBrandId', 'b1'); // Default to Brand Hmee Prung
        } else if (port === '4001') {
          // Brand Portal
          localStorage.setItem('userRole', 'brand');
          localStorage.setItem('agencyBrandId', 'b1');
        } else if (port === '4003') {
          // Creator LIFF
          localStorage.setItem('userRole', 'creator');
          localStorage.setItem('creatorId', 'nina');
        }
      }, targetPort);
      
      console.log(`✅ Session injected in localStorage.`);
    }

    // 2. Now navigate to the actual target page
    console.log(`🧭 Navigating to: ${urlString}`);
    await page.goto(urlString, { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Give Next.js client-side rendering (hydration) a moment to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check if we got redirected to auth page unexpectedly
    const currentUrl = page.url();
    if (currentUrl.includes('/auth') && !urlString.includes('/auth')) {
      console.log(`⚠️  Warning: Redirected to auth page! (${currentUrl})`);
    }

    // 3. Inject the html-to-figma library dynamically via ESM
    await page.evaluate(async () => {
      const module = await import('https://cdn.jsdelivr.net/npm/@builder.io/html-to-figma/+esm');
      window.htmlToFigma = module.htmlToFigma;
    });

    console.log('⚡ 3. Converting DOM elements to Figma layers...');
    const figmaJson = await page.evaluate(() => {
      if (typeof window.htmlToFigma === 'function') {
        return window.htmlToFigma(document.body);
      } else {
        throw new Error('htmlToFigma library not loaded correctly.');
      }
    });

    return figmaJson;
  } catch (error) {
    console.error(`❌ Error extracting ${urlString}:`, error.message);
    return null;
  }
}

async function runBatchExtraction() {
  let urls = [];

  // 1. Determine target URLs from file or direct argument
  if (fileIndex !== -1 && args[fileIndex + 1]) {
    const filePath = path.resolve(__dirname, args[fileIndex + 1]);
    console.log(`📖 Reading URLs from file: ${filePath}`);
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      urls = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } else {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
  } else {
    const singleUrl = (urlIndex !== -1 && args[urlIndex + 1]) || 'http://localhost:4000';
    urls = [singleUrl];
  }

  if (urls.length === 0) {
    console.error('❌ No valid URLs to process.');
    process.exit(1);
  }

  console.log(`🚀 Starting extraction for ${urls.length} page(s)...`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const results = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing...`);
    const figmaData = await extractWebpage(page, url);
    if (figmaData) {
      results.push({
        name: getFrameName(url),
        data: figmaData
      });
      console.log(`✅ Extracted successfully!`);
    }
  }

  await browser.close();

  // Save the array of pages/frames
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n🎉 Saved all pages to: ${OUTPUT_FILE}`);
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
        res.end('File not found. Run extraction first.');
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🟢 Local batch server is running!`);
    console.log(`👉 Figma URL data path: http://localhost:${PORT}/figma-nodes.json`);
    console.log(`👉 Open your Figma plugin and click import`);
    console.log(`ℹ️  Press Ctrl + C to stop the server when done`);
    console.log(`==================================================\n`);
  });
}

(async () => {
  await runBatchExtraction();
  startLocalServer();
})();
