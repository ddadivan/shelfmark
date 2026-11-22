// Screenshots of every popup state from the development build, with a fake chrome.tabs and a mocked API.
// Usage: npx nx build extension --configuration=development && node apps/extension/scripts/popup-screenshots.mjs dist/apps/extension-dev tmp/extension-shots
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from '@playwright/test';

const [dist, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.png': 'image/png',
};
const server = createServer((req, res) => {
  const path = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = existsSync(path) && !path.endsWith('/') ? path : join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4391, r));
const origin = 'http://127.0.0.1:4391';

const now = Date.now();
const folder = (id, name, colour, icon, parentId = null, position = 0) => ({
  id,
  parentId,
  name,
  colour,
  icon,
  highlighted: false,
  description: null,
  coverLinkId: null,
  coverUrl: null,
  position,
  pinned: false,
  linkCount: 3,
  createdAt: '',
  updatedAt: '',
});
const folders = {
  items: [
    folder('f-work', 'Work', 'ocean', 'briefcase', null, 0),
    folder('f-ng', 'Angular', 'ocean', 'code', 'f-work', 0),
    folder('f-courses', 'Courses', 'ocean', 'graduation-cap', 'f-work', 1),
    folder('f-clothes', 'Clothes', 'clay', 'shirt', null, 1),
    folder('f-recipes', 'Recipes', 'rose', 'cooking-pot', null, 2),
    folder('f-travel', 'Travel', 'teal', 'plane', null, 3),
  ],
  counts: { all: 10, unsorted: 2, favorites: 1 },
};
const tags = {
  items: [
    { id: 't1', name: 'winter', linkCount: 4 },
    { id: 't2', name: 'shopping', linkCount: 9 },
  ],
};
const rules = {
  items: [
    {
      id: 'r1',
      domain: 'cos.com',
      folderId: 'f-clothes',
      folderAvailable: true,
      tags: ['winter'],
      createdAt: '',
    },
  ],
};
const link = {
  id: 'l1',
  kind: 'shopping',
  folderId: 'f-clothes',
  url: 'https://www.cos.com/en/wool-coat-graphite',
  title: 'Wool coat, straight cut, graphite',
  note: null,
  faviconUrl: null,
  imageUrl: null,
  isFavorite: false,
  pinnedInFolderAt: null,
  pinned: false,
  lastOpenedAt: null,
  remindAt: null,
  tags: ['winter', 'shopping'],
  createdAt: new Date(now - 2 * 86400000).toISOString(),
  updatedAt: '',
};
const session = {
  user: { id: 'u1', name: 'D', email: 'x', image: null },
  session: { expiresAt: '' },
};

const scenarios = {
  form: { url: 'https://www.cos.com/en/wool-coat-graphite', recent: ['f-clothes', null, 'f-ng'] },
  picker: {
    url: 'https://www.cos.com/en/wool-coat-graphite',
    after: async (page) => {
      await page.getByRole('button', { name: /Folder:/ }).click();
      await page.waitForTimeout(400);
    },
  },
  saved: {
    url: 'https://www.cos.com/en/wool-coat-graphite',
    after: async (page) => {
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await page.waitForTimeout(900);
    },
  },
  duplicate: { url: 'https://www.cos.com/en/wool-coat-graphite', lookup: link },
  signedOut: { url: 'https://www.cos.com/en/wool-coat-graphite', session: null, wait: 1500 },
  unsupported: { url: 'chrome://extensions/' },
  error: { url: 'https://www.cos.com/en/wool-coat-graphite', offline: true },
  opening: { url: 'https://www.cos.com/en/wool-coat-graphite', delay: 3000, wait: 900 },
};

const browser = await chromium.launch();
for (const scheme of ['light', 'dark']) {
  for (const [name, s] of Object.entries(scenarios)) {
    const context = await browser.newContext({
      viewport: { width: 360, height: 600 },
      colorScheme: scheme,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.addInitScript(
      ({ url, recent }) => {
        globalThis.chrome = {
          tabs: {
            query: async () => [{ url, title: 'Wool coat, straight cut, graphite | COS' }],
            create: async () => ({}),
          },
        };
        if (recent) localStorage.setItem('sm-ext-recent-folders', JSON.stringify(recent));
      },
      { url: s.url, recent: s.recent },
    );
    await page.route('http://localhost:4200/api/**', async (route) => {
      const req = route.request();
      const cors = {
        'access-control-allow-origin': origin,
        'access-control-allow-credentials': 'true',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'GET,POST',
      };
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      if (s.offline) return route.abort('internetdisconnected');
      if (s.delay) await new Promise((r) => setTimeout(r, s.delay));
      const path = new URL(req.url()).pathname;
      const body = {
        '/api/auth/get-session': s.session === undefined ? session : s.session,
        '/api/folders': folders,
        '/api/tags': tags,
        '/api/rules': rules,
        '/api/links/lookup': { link: s.lookup ?? null },
        '/api/links': { ...link, tags: ['winter'], createdAt: new Date().toISOString() },
      }[path];
      return route.fulfill({
        status: 200,
        headers: { ...cors, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    });
    await page.goto(origin + '/index.html');
    await page.waitForTimeout(s.wait ?? 700);
    if (s.after) await s.after(page);
    await page.screenshot({ path: `${out}/${scheme}-${name}.png` });
    await context.close();
  }
}
await browser.close();
server.close();
