// Static SPA server for the Lighthouse run: serves the `e2e` build like production does, with
// brotli / gzip responses (Vercel compresses; the plain file server sends raw bytes, which makes
// the simulated 4G load look about 3x heavier than it is). Adds no other headers: the CSP lives in
// the Vercel middleware, not in the static files. Listens on loopback only.
// Usage: node tools/lighthouse/serve.mjs <dir> <port>
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = resolve(process.argv[2] ?? 'dist/apps/web-e2e-build/browser');
const port = Number(process.argv[3] ?? 4300);

// Fail fast and loudly when the build is missing, instead of serving 500s that Chrome shows as
// an interstitial.
if (!existsSync(join(root, 'index.html'))) {
  console.error(`No index.html in ${root}: build the e2e bundle first (nx run web:build:e2e).`);
  process.exit(1);
}

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};
const compressible = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.ico']);
const cache = new Map();

/** Accepted codings from `Accept-Encoding`, honouring q-values (`q=0` means refused). */
function accepts(header, coding) {
  for (const part of header.split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (name !== coding) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    return q === undefined ? true : Number(q.slice(2)) > 0;
  }
  return false;
}

async function resolveFile(urlPath) {
  const candidate = normalize(join(root, decodeURIComponent(urlPath)));
  if (candidate !== root && !candidate.startsWith(root + sep)) return null;
  const info = await stat(candidate).catch(() => null);
  if (info?.isFile()) return candidate;
  // SPA fallback for extension-less routes.
  return extname(urlPath) ? null : join(root, 'index.html');
}

async function body(file, encoding) {
  const key = `${file}|${encoding}`;
  let value = cache.get(key);
  if (!value) {
    const raw = await readFile(file);
    value =
      encoding === 'br'
        ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
        : encoding === 'gzip'
          ? gzipSync(raw, { level: 9 })
          : raw;
    cache.set(key, value);
  }
  return value;
}

createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' }).end();
      return;
    }
    const { pathname } = new URL(req.url ?? '/', 'http://localhost');
    const file = await resolveFile(pathname);
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    const ext = extname(file);
    const accepted = String(req.headers['accept-encoding'] ?? '');
    const encoding = !compressible.has(ext)
      ? null
      : accepts(accepted, 'br')
        ? 'br'
        : accepts(accepted, 'gzip')
          ? 'gzip'
          : null;
    const payload = await body(file, encoding);
    const headers = {
      'content-type': types[ext] ?? 'application/octet-stream',
      'content-length': payload.length,
    };
    if (compressible.has(ext)) headers['vary'] = 'Accept-Encoding';
    if (encoding) headers['content-encoding'] = encoding;
    res.writeHead(200, headers).end(req.method === 'HEAD' ? undefined : payload);
  } catch {
    res.writeHead(500).end();
  }
}).listen(port, '127.0.0.1', () => console.log(`Available on http://127.0.0.1:${port}`));
