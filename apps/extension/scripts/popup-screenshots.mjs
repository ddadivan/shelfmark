// Screenshots of every popup state from the development build, with a fake chrome.tabs and a mocked API.
// SHOT_LOCALE=uk-UA checks another language.
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

// All tabs (#569): the window's tabs, the AI answers and the batch answer.
const windowTabs = [
  ['https://www.cos.com/en/wool-coat-graphite', 'Wool coat, straight cut, graphite | COS'],
  ['https://angular.dev/guide/forms/signals', 'Signal Forms in Angular'],
  ['https://angular.dev/guide/zoneless', 'Zoneless change detection'],
  [
    'https://ngrx.io/guide/signals/signal-store/custom-store-features',
    'NgRx SignalStore: custom features',
  ],
  ['https://github.com/angular/angular/issues', 'angular/angular issues'],
  ['https://www.youtube.com/watch?v=abc', 'Signals in 20 minutes, a practical intro - YouTube'],
  ['https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API', 'View transitions API'],
  ['https://web.dev/articles/inp', 'Interaction to Next Paint'],
  ['https://css-tricks.com/guides/container-queries', 'CSS container queries guide'],
  ['chrome://extensions/', 'Extensions'],
  ['https://angular.dev/guide/forms/signals#top', 'Signal Forms in Angular'],
].map(([url, title], id) => ({ id: id + 1, active: id === 0, url, title }));
const aiSettings = {
  settings: { enabled: true, includeNotes: false },
  usage: { linksUsed: 3, linksLimit: 50, resetsOn: '2026-12-01' },
};
const picks = [
  'f-ng',
  'f-ng',
  'f-ng',
  'f-courses',
  'f-travel',
  'f-recipes',
  'f-recipes',
  'f-clothes',
];
const tabsAfter = async (page) => {
  await page.locator('input[type="radio"]').nth(1).check({ force: true });
  await page.waitForTimeout(700);
};
const sortAfter = async (page) => {
  await tabsAfter(page);
  await page.locator('.form__ai-button button').click();
  await page.waitForTimeout(1600);
};

const scenarios = {
  tabs: { url: windowTabs[0].url, window: windowTabs, after: tabsAfter },
  tabsAi: { url: windowTabs[0].url, window: windowTabs, ai: true, after: sortAfter },
  tabsPicker: {
    url: windowTabs[0].url,
    window: windowTabs,
    ai: true,
    after: async (page) => {
      await sortAfter(page);
      await page.locator('.form__folder > ui-button button').click();
      await page.waitForTimeout(400);
    },
  },
  tabsSaved: {
    url: windowTabs[0].url,
    window: windowTabs,
    after: async (page) => {
      await tabsAfter(page);
      await page.locator('.ext-foot-slot button').click();
      await page.waitForTimeout(1200);
    },
  },
  form: { url: 'https://www.cos.com/en/wool-coat-graphite', recent: ['f-clothes', null, 'f-ng'] },
  picker: {
    url: 'https://www.cos.com/en/wool-coat-graphite',
    after: async (page) => {
      await page.locator('.form__folder > ui-button button').click();
      await page.waitForTimeout(400);
    },
  },
  saved: {
    url: 'https://www.cos.com/en/wool-coat-graphite',
    after: async (page) => {
      await page.locator('.ext-foot-slot button').click();
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
      locale: process.env.SHOT_LOCALE ?? 'en-US',
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.addInitScript(
      ({ url, recent, window }) => {
        globalThis.chrome = {
          tabs: {
            query: async (q) =>
              q.currentWindow && !q.active && window
                ? window
                : [{ url, title: 'Wool coat, straight cut, graphite | COS' }],
            create: async () => ({}),
            remove: async () => undefined,
          },
          permissions: { contains: async () => true, request: async () => true },
        };
        if (recent) localStorage.setItem('sm-ext-recent-folders', JSON.stringify(recent));
      },
      { url: s.url, recent: s.recent, window: s.window },
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
      let sent = {};
      try {
        sent = req.postDataJSON() ?? {};
      } catch {
        sent = {};
      }
      if (path === '/api/ai/drafts') {
        const n = Number(String(sent.url).length) % picks.length;
        const index = windowTabs.findIndex((tab) => tab.url === sent.url);
        return route.fulfill({
          status: 202,
          headers: { ...cors, 'content-type': 'application/json' },
          body: JSON.stringify({
            id: sent.draftId,
            status: 'done',
            reason: null,
            summary: null,
            title: null,
            suggestions: [
              {
                id: 'a',
                kind: 'folder',
                state: 'suggested',
                tagName: null,
                folderId: picks[(index < 0 ? n : index) % picks.length],
              },
              {
                id: 'b',
                kind: index % 3 === 0 ? 'new-tag' : 'tag',
                state: 'suggested',
                tagName: ['signals', 'forms', 'css', 'video'][index % 4],
                folderId: null,
              },
            ],
          }),
        });
      }
      if (path === '/api/links/batch') {
        const links = (sent.items ?? []).map((item, i) => ({
          ...link,
          id: `l${i}`,
          url: item.url,
          title: item.title ?? item.url,
          folderId: sent.folderId ?? item.folderId ?? 'f-ng',
          createdAt: new Date().toISOString(),
        }));
        return route.fulfill({
          status: 201,
          headers: { ...cors, 'content-type': 'application/json' },
          body: JSON.stringify({ links, errors: [] }),
        });
      }
      const body = {
        '/api/ai/settings': s.ai ? aiSettings : undefined,
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
