// fileServer — a tiny HTTP server that serves a project folder so the
// preview iframe can load HTML, CSS, JS, and images via relative paths.
//
// One server per app session. Start/stop is driven by the renderer via IPC.
// The port is chosen automatically (0 = OS picks a free port).

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.txt':  'text/plain; charset=utf-8',
  '.xml':  'application/xml; charset=utf-8',
  '.pdf':  'application/pdf',
  '.wasm': 'application/wasm',
};

let server = null;
let projectRoot = null;
let port = 0;
let baseUrl = null;

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function handleRequest(req, res) {
  // Only allow GET.
  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  // Sanitise the URL path — strip query string and decode.
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');

  // Resolve against project root.
  const filePath = path.join(projectRoot, safePath);

  // Guard: must stay inside project root.
  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Try index.html in directory.
      if (!err && stats && stats.isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        return fs.readFile(indexPath, (err2, data) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 Not Found</h1>');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(data);
          }
        });
      }
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
      return;
    }

    const contentType = getMime(filePath);
    const isHtml = contentType.startsWith('text/html');

    // Cache-Control: no-cache so edits show up immediately.
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    });

    if (isHtml) {
      // Inject a tiny navigation tracker so the detached preview window
      // can follow in-iframe link clicks (postMessage on every load).
      const NAV_TRACKER = `
<script>
(function(){
  // Tell the parent window our current URL on every load.
  try{parent.postMessage({type:"nav",url:location.href},"*")}catch(e){}
  // Intercept external link clicks — open them in the system browser
  // instead of navigating the iframe (which can't load external URLs).
  document.addEventListener("click",function(e){
    var a=e.target.closest("a[href]");
    if(!a)return;
    var href=a.href;
    if(!href||href.startsWith("javascript:"))return;
    var isLocal=href.indexOf(location.origin)===0||href.charAt(0)==="/"||href.charAt(0)==="#"||href.charAt(0)==="?";
    if(!isLocal){
      e.preventDefault();
      try{parent.postMessage({type:"external",url:href},"*")}catch(err){window.open(href,"_blank")}
    }
  },false);
})();
</script>`;
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        // Inject before </body> if present, otherwise append.
        const html = data.toString();
        const bodyClose = html.lastIndexOf('</body>');
        const injected = bodyClose !== -1
          ? html.slice(0, bodyClose) + NAV_TRACKER + html.slice(bodyClose)
          : html + NAV_TRACKER;
        res.end(injected);
      });
    } else {
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on('error', () => {
        res.writeHead(500);
        res.end('Internal Server Error');
      });
    }
  });
}

/**
 * Start the file server for the given project root.
 * Returns { port, url } of the running server.
 * If a server is already running, stops it first.
 */
function start(rootPath) {
  return new Promise((resolve, reject) => {
    if (!rootPath) {
      return reject(new Error('No project root provided'));
    }

    // Stop existing server.
    stop();

    projectRoot = rootPath;
    server = http.createServer(handleRequest);

    // Port 0 = OS picks a free port.
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve({ port, url: baseUrl });
    });

    server.on('error', (err) => {
      server = null;
      projectRoot = null;
      port = 0;
      baseUrl = null;
      reject(err);
    });
  });
}

/**
 * Stop the file server.
 */
function stop() {
  if (server) {
    try { server.close(); } catch { /* ignore */ }
    server = null;
    projectRoot = null;
    port = 0;
    baseUrl = null;
  }
}

/**
 * Get the current server status.
 */
function getStatus() {
  return {
    running: !!server,
    port,
    url: baseUrl,
    projectRoot,
  };
}

module.exports = { start, stop, getStatus };
