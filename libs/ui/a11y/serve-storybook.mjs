// Serves libs/ui/storybook-static with the headers from libs/ui/vercel.json, so the
// a11y run also proves that the production CSP does not block Storybook (ADR 0023).
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../storybook-static');
const port = Number(process.env.STORYBOOK_PORT ?? 6007);
const config = JSON.parse(readFileSync(resolve(import.meta.dirname, '../vercel.json'), 'utf8'));
const all = config.headers.find((rule) => rule.source === '/(.*)');
const headers = Object.fromEntries(all.headers.map(({ key, value }) => [key, value]));

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  let file = join(root, normalize(pathname));
  if (!file.startsWith(root)) {
    response.writeHead(403, headers).end();
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    statSync(file);
  } catch {
    response.writeHead(404, headers).end('Not found');
    return;
  }
  response.writeHead(200, {
    ...headers,
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`storybook-static on http://127.0.0.1:${port}`));
