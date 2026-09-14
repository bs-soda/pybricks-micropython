const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;

console.log(`📡 Initializing Journey Steps Server on port ${PORT}...`);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;
  
  // Route fallback: if they query /figma-nodes.json?flow=N, serve flow-N.json.
  // Otherwise, serve the combined figma-nodes.json file.
  if (pathname === '/figma-nodes.json') {
    if (parsedUrl.query.flow) {
      pathname = `/flow-${parsedUrl.query.flow}.json`;
    } else {
      pathname = '/figma-nodes.json';
    }
  }

  // Extract file name (e.g. flow-1.json or figma-nodes.json)
  const filename = pathname.replace(/^\//, '');
  const filePath = path.join(__dirname, filename);

  const isValidFile = (filename === 'figma-nodes.json') || 
                      (filename === 'figma-components.json') || 
                      (filename.startsWith('flow-') && filename.endsWith('.json'));

  if (isValidFile && fs.existsSync(filePath)) {
    console.log(`📖 Serving flow data from: ${filePath}`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    console.log(`⚠️ Route not found: ${pathname}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`Flow data not found for path: ${pathname}. Available paths: /flow-1.json, /flow-2.json, /flow-3.json, /flow-4.json, /flow-5.json`);
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🟢 Local Flow Server is running!`);
  console.log(`==================================================`);
  console.log(`👉 Flow 1: http://localhost:${PORT}/flow-1.json  (Campaign Setup)`);
  console.log(`👉 Flow 2: http://localhost:${PORT}/flow-2.json  (Creator Onboarding)`);
  console.log(`👉 Flow 3: http://localhost:${PORT}/flow-3.json  (Sample Fulfillment)`);
  console.log(`👉 Flow 4: http://localhost:${PORT}/flow-4.json  (Content Moderation)`);
  console.log(`👉 Flow 5: http://localhost:${PORT}/flow-5.json  (Spark Ads & Reports)`);
  console.log(`==================================================`);
  console.log(`ℹ️  Paste any of these URLs in the Figma plugin and click import`);
  console.log(`ℹ️  Press Ctrl + C to stop the server when done`);
  console.log(`==================================================\n`);
});
