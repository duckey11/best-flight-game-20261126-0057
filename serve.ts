// serve.ts - server statis kecil Node (http), hanya melayani file di bawah game/.
// Port 8080 default (env PORT). Untuk play-test lokal: node serve.ts
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(join(fileURLToPath(import.meta.url), '..'));
const gameDir = join(here, 'game');
const port = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = resolve(join(gameDir, normalize(rel).replace(/^(\.\.[/\\])+/, '')));
    if (!file.startsWith(gameDir) || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('error');
  }
});

server.listen(port, () => console.log('Skymail Run on http://localhost:' + port + '/'));
