const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const OUTPUT_FILE = path.join(__dirname, 'figma-nodes.json');

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
      res.end('File figma-nodes.json not found. Run extraction first.');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🟢 Local Figma nodes data server is running!`);
  console.log(`👉 Figma URL data path: http://localhost:${PORT}/figma-nodes.json`);
  console.log(`👉 Open your Figma plugin and click import`);
  console.log(`ℹ️  Press Ctrl + C to stop the server when done`);
  console.log(`==================================================\n`);
});
