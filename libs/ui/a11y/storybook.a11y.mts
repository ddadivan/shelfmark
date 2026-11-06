import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';

// Runs axe-core (including colour contrast) on every story of the built Storybook, in a real
// browser, under the production CSP from libs/ui/vercel.json (see serve-storybook.mjs).
// Each story is checked in the light and the dark theme.

interface IndexEntry {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly name: string;
}

interface AxeResult {
  readonly violations: readonly {
    readonly id: string;
    readonly help: string;
    readonly nodes: readonly { readonly target: readonly unknown[] }[];
  }[];
}

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const themes = ['light', 'dark'] as const;

function loadStories(): IndexEntry[] {
  const file = new URL('../storybook-static/index.json', import.meta.url);
  const index = JSON.parse(readFileSync(file, 'utf8')) as { entries: Record<string, IndexEntry> };
  return Object.values(index.entries).filter((entry) => entry.type === 'story');
}

async function trackCspViolations(page: Page): Promise<void> {
  // String script: this project has no DOM lib, and the code runs in the browser anyway.
  await page.addInitScript(`
    globalThis.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      globalThis.__cspViolations.push(event.violatedDirective + ' ' + event.blockedURI);
    });
  `);
}

const stories = loadStories();

test('the built Storybook lists stories', () => {
  expect(stories.length).toBeGreaterThan(0);
});

test('the manager loads without CSP violations', async ({ page }) => {
  await trackCspViolations(page);
  await page.goto('/');
  await expect(page.locator('#storybook-preview-iframe')).toBeVisible();
  await expect(
    page.frameLocator('#storybook-preview-iframe').locator('#storybook-root, #storybook-docs'),
  ).toHaveCount(2);
  expect(await page.evaluate<string[]>(`globalThis.__cspViolations ?? []`)).toEqual([]);
});

for (const story of stories) {
  for (const theme of themes) {
    test(`${story.title} / ${story.name} (${theme})`, async ({ page }) => {
      await trackCspViolations(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme}`);
      await page.waitForSelector('body.sb-show-main:not(.sb-show-errordisplay)');
      await page.evaluate(`document.fonts.ready.then(() => undefined)`);
      await page.addScriptTag({ path: axePath });
      const results = await page.evaluate<AxeResult>(
        `axe.run(document.querySelector('#storybook-root'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
        })`,
      );
      const messages = results.violations.map(
        (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`,
      );
      expect(messages).toEqual([]);
      expect(await page.evaluate<string[]>(`globalThis.__cspViolations ?? []`)).toEqual([]);
    });
  }
}
