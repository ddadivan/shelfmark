import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { THEME, THEME_ATTRIBUTE } from '../src/lib/theme';

// Runs axe-core (including colour contrast) on every story of the built Storybook, in a real
// browser, under the production CSP from libs/ui/vercel.json (see serve-storybook.mjs).
// Each story and each docs page (auto-generated component docs and the Foundations pages) is
// checked in the light and the dark theme.

interface IndexEntry {
  readonly id: string;
  readonly type: 'story' | 'docs';
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
const themes = Object.values(THEME);

// Storybook internals that cannot be changed from this repository, excluded from the docs pages
// only. Our components and our docs content are never excluded; the props table and the controls
// are checked and re-skinned with tokens in .storybook/foundations.scss instead.
const DOCS_AXE_EXCLUDES: readonly string[] = [
  // The object / array control (react-json-tree) renders <li> rows directly in a <div>, which
  // fails the `listitem` rule. It is Storybook's JSON editor, not our markup.
  '.rejt-tree',
];

function loadStories(): IndexEntry[] {
  const file = new URL('../storybook-static/index.json', import.meta.url);
  const index = JSON.parse(readFileSync(file, 'utf8')) as { entries: Record<string, IndexEntry> };
  return Object.values(index.entries).filter(
    (entry) => entry.type === 'story' || entry.type === 'docs',
  );
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
      await page.goto(
        `/iframe.html?id=${story.id}&viewMode=${story.type === 'docs' ? 'docs' : 'story'}&globals=theme:${theme}`,
      );
      await page.waitForSelector('body.sb-show-main:not(.sb-show-errordisplay)');
      if (story.type === 'docs') {
        await page.waitForSelector('#storybook-docs .sbdocs');
        // A docs page renders its stories inline, each one asynchronously: wait until every
        // story block has rendered its component.
        await page.waitForFunction(
          `[...document.querySelectorAll('#storybook-docs [data-story-block]')].every(
            (block) => block.querySelector('[data-sb-story-uid]')?.childElementCount)`,
        );
      }
      // The theme decorator runs after the first render: wait for it, then for fonts and for any
      // running colour transition, so axe never reads half-way colours.
      await page.waitForFunction(
        `document.documentElement.getAttribute('${THEME_ATTRIBUTE}') === '${theme}'`,
      );
      await page.evaluate(
        `document.fonts.ready.then(() => Promise.all(document.getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined))))`,
      );
      await page.addScriptTag({ path: axePath });
      const excludes = story.type === 'docs' ? DOCS_AXE_EXCLUDES : [];
      const selector = story.type === 'docs' ? '#storybook-docs' : '#storybook-root';
      // Entry animations and ripples can still be mid-fade on a slow runner, and axe blends the
      // half-way colours. A real violation is stable and still fails after the polling window.
      await expect
        .poll(
          async () => {
            const results = await page.evaluate<AxeResult>(
              `(async () => {
                const context = { include: [document.querySelector(${JSON.stringify(selector)})], exclude: ${JSON.stringify(excludes)}.map((selector) => [selector]) };
                // The Storybook a11y addon runs its own axe on render; axe allows one run at a time.
                for (let attempt = 0; attempt < 25; attempt++) {
                  try {
                    return await axe.run(context, {
                      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
                    });
                  } catch (error) {
                    if (!String(error).includes('already running')) throw error;
                    await new Promise((resolve) => setTimeout(resolve, 200));
                  }
                }
                throw new Error('axe stayed busy');
              })()`,
            );
            return results.violations.map(
              (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(' | ')})`,
            );
          },
          { timeout: 3000, intervals: [0, 250, 500, 1000] },
        )
        .toEqual([]);
      expect(await page.evaluate<string[]>(`globalThis.__cspViolations ?? []`)).toEqual([]);
    });
  }
}
