/**
 * DocFlow — Standalone Wi-Fi / Local Network Node.js HTTP Server
 * 
 * Allows users to access DocFlow from mobile browsers over the local Wi-Fi network.
 * Uses only native Node.js modules (http, fs, path, os, url) — zero npm dependencies required!
 * 
 * Usage:
 *   node server.js
 *   node server.js 8080   (to specify a custom port)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const url = require('url');

// Root directory to serve files from
const PUBLIC_DIR = path.resolve(__dirname);

// Port configuration (from CLI argument, environment, or default 3000)
const DEFAULT_PORT = parseInt(process.env.PORT || process.argv[2] || '3000', 10);
const HOST = '0.0.0.0';

// MIME types dictionary covering document formats, code, media, and fonts
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.markdown': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wasm': 'application/wasm'
};

/**
 * Retrieve all active local IPv4 addresses (Wi-Fi, Ethernet, LAN)
 */
function getNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const [name, netList] of Object.entries(interfaces)) {
    if (!netList) continue;
    for (const net of netList) {
      // IPv4 and non-internal loopback
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        addresses.push({
          interface: name,
          address: net.address
        });
      }
    }
  }

  return addresses;
}

/**
 * Handle incoming HTTP requests
 */
function requestHandler(req, res) {
  // Common CORS and security headers for local Wi-Fi testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  // Parse path and sanitize using WHATWG URL API
  let decodedPath;
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    decodedPath = decodeURIComponent(parsedUrl.pathname || '/');
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  // Prevent directory traversal attacks
  let safePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // Check file stat
  fs.stat(safePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>404 — File Not Found</h2><p>${decodedPath}</p><a href="/">Return to DocFlow Home</a></body></html>`);
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Internal Server Error: ${err.message}`);
      }
      return;
    }

    // If request is a directory, serve index.html inside it
    if (stats.isDirectory()) {
      safePath = path.join(safePath, 'index.html');
      fs.stat(safePath, (indexErr, indexStats) => {
        if (indexErr || !indexStats.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Directory index not found');
          return;
        }
        serveFile(req, res, safePath, indexStats);
      });
      return;
    }

    if (stats.isFile()) {
      serveFile(req, res, safePath, stats);
    } else {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
    }
  });
}

/**
 * Stream file with correct MIME type, range support, and cache headers
 */
function serveFile(req, res, filePath, stats) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const totalSize = stats.size;

  // Development cache policy: don't aggressively cache code so mobile sees latest edits
  const isCodeOrDoc = ['.html', '.css', '.js', '.json'].includes(ext);
  const cacheControl = isCodeOrDoc ? 'no-cache, must-revalidate' : 'public, max-age=3600';

  // Support HTTP Range requests (crucial for smooth PDF and media streaming)
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (start >= totalSize || end >= totalSize || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${totalSize}`,
        'Content-Type': 'text/plain; charset=utf-8'
      });
      res.end('Requested range not satisfiable');
      return;
    }

    const chunksize = end - start + 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  } else {
    res.writeHead(200, {
      'Content-Length': totalSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControl
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  }
}

/**
 * Start the server with automatic fallback if the requested port is in use
 */
function startServer(port) {
  const server = http.createServer(requestHandler);

  server.listen(port, HOST, () => {
    const networkList = getNetworkAddresses();

    console.log('\n' + '='.repeat(64));
    console.log('   DocFlow Mobile Wi-Fi Server Running');
    console.log('='.repeat(64));
    console.log(`  Local Computer:   http://localhost:${port}`);

    if (networkList.length > 0) {
      networkList.forEach(net => {
        console.log(`  Mobile Wi-Fi:     http://${net.address}:${port}  (${net.interface})`);
      });
    } else {
      console.log('  Mobile Wi-Fi:     (No active Wi-Fi / LAN connection found)');
    }

    console.log('='.repeat(64));
    console.log('  Instructions for Mobile Access:');
    console.log('  1. Connect your phone or tablet to the SAME Wi-Fi network.');
    console.log('  2. Open Chrome, Safari, or Edge on your phone.');
    if (networkList.length > 0) {
      console.log(`  3. Go to:  http://${networkList[0].address}:${port}`);
    } else {
      console.log('  3. Connect to Wi-Fi to display your mobile address.');
    }
    console.log('  Press Ctrl+C in this terminal to stop the server.');
    console.log('='.repeat(64) + '\n');
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is currently in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

// Start server
startServer(DEFAULT_PORT);
