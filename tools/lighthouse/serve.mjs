// Static SPA server for the Lighthouse run: serves the `e2e` build like production does, with
// brotli / gzip responses (Vercel compresses; the plain file server sends raw bytes, which makes
// the simulated 4G load look about 3x heavier than it is). Adds no other headers: the CSP lives in
// the Vercel middleware, not in the static files. Usage: node tools/lighthouse/serve.mjs <dir> <port>
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = resolve(process.argv[2] ?? 'dist/apps/web-e2e-build/browser');
const port = Number(process.argv[3] ?? 4300);

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
      : /\bbr\b/.test(accepted)
        ? 'br'
        : /\bgzip\b/.test(accepted)
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
}).listen(port, () => console.log(`Available on http://localhost:${port}`));
