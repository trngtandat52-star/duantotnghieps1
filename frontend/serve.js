const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // Bỏ qua query string để lấy đường dẫn file thực tế
  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Mặc định về index.html nếu truy cập trang chủ /
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Chặn directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(BASE_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Thử tìm file .html nếu không có extension
      if (!path.extname(filePath)) {
        const htmlPath = filePath + '.html';
        if (fs.existsSync(htmlPath)) {
          filePath = htmlPath;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>404 - Không tìm thấy trang</h1><p><a href="/index.html">Về trang chủ</a></p>');
          return;
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>404 - Không tìm thấy file</h1><p><a href="/index.html">Về trang chủ</a></p>');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Lỗi máy chủ đọc file: ' + readErr.message);
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });
});

function startServer(port) {
  server.listen(port, () => {
    const localUrl = `http://localhost:${port}`;
    console.log('\n======================================================');
    console.log(`🌟 Frontend Lunihome (Cửa hàng) đang chạy tại:`);
    console.log(`👉 ${localUrl}`);
    console.log(`======================================================\n`);

    // Tự động mở trình duyệt mặc định trên Windows
    if (process.platform === 'win32') {
      exec(`start "" "${localUrl}"`);
    }
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = currentPort + 1;
    console.log(`⚠️ Cổng ${currentPort} đang bận, tự động thử cổng ${nextPort}...`);
    currentPort = nextPort;
    startServer(currentPort);
  } else {
    console.error('Lỗi khởi động máy chủ:', err);
  }
});

let currentPort = Number(PORT);
startServer(currentPort);

