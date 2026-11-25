import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { expect, test, type Page } from '@playwright/test';
import { THEME, THEME_ATTRIBUTE } from '../src/lib/models/theme';
import { dsCheckScript, loadDsTokenNames } from './ds-tokens.mjs';

// Runs axe-core (including colour contrast) on every story of the built Storybook, in a real
// browser, under the production CSP from libs/ui/vercel.json (see serve-storybook.mjs).
// Each story and each docs page (auto-generated component docs and the Foundations pages) is
// checked in the light and the dark theme. Each story also runs the DS guard's rendered check
// (ds-tokens.mts, ADR 0062): every painted colour, border colour, font size and radius must be a
// token of the active theme.

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

// Axe rules switched off on docs pages only. An autodocs page renders the primary story twice
// (the "Primary" block and again in the "Stories" list), so a story with a landmark (the
// breadcrumbs `nav`) duplicates it by construction. Each story, including "All variants", is
// still checked for `landmark-unique` on its own page.
const DOCS_AXE_DISABLED_RULES: readonly string[] = ['landmark-unique'];

// Author-accepted contrast gap (ADR 0061 point 7, libs/ui/CLAUDE.md): `--text-muted` on `--pick`
// (the selected card and list row) is 4.42:1 light / 4.49:1 dark. Only `color-contrast` nodes with
// exactly that foreground and background pair are dropped; every other contrast failure still fails.
const ACCEPTED_CONTRAST_PAIRS: readonly (readonly [string, string])[] = [
  ['--text-muted', '--pick'],
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
const dsTokens = loadDsTokenNames();

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
      const disabledRules = story.type === 'docs' ? DOCS_AXE_DISABLED_RULES : [];
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
                    const result = await axe.run(context, {
                      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
                      rules: Object.fromEntries(${JSON.stringify(disabledRules)}.map((id) => [id, { enabled: false }])),
                    });
                    // Resolve each accepted token pair to the colour axe reports (#rrggbb), next to the
                    // node itself, so a dark block inside a light story uses its own theme's tokens.
                    const hex = (token, host) => {
                      const probe = document.createElement('span');
                      probe.style.color = 'var(' + token + ')';
                      host.append(probe);
                      const [r, g, b] = getComputedStyle(probe).color.match(/[0-9.]+/g).map(Number);
                      probe.remove();
                      return '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
                    };
                    const isAccepted = (node) => {
                      const host = document.querySelector(node.target[0]);
                      if (!host) return false;
                      const accepted = ${JSON.stringify(ACCEPTED_CONTRAST_PAIRS)}.map(([fg, bg]) => hex(fg, host) + '/' + hex(bg, host));
                      return node.any.some((check) =>
                        check.data && accepted.includes(String(check.data.fgColor).toLowerCase() + '/' + String(check.data.bgColor).toLowerCase()));
                    };
                    result.violations = result.violations
                      .map((v) => v.id === 'color-contrast' ? { ...v, nodes: v.nodes.filter((node) => !isAccepted(node)) } : v)
                      .filter((v) => v.nodes.length > 0);
                    return result;
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
          { timeout: 10_000, intervals: [0, 250, 500, 1000] },
        )
        .toEqual([]);
      if (story.type === 'story') {
        // Docs pages are Storybook's chrome; the stories are ours. Polled like axe, so a colour
        // still mid-transition settles first.
        await expect
          .poll(async () => page.evaluate<string[]>(dsCheckScript(dsTokens, '#storybook-root')), {
            message: 'off-token values (DS guard, ADR 0062): add a token or mark data-ds-ignore',
            timeout: 10_000,
            intervals: [0, 250, 500, 1000],
          })
          .toEqual([]);
      }
      expect(await page.evaluate<string[]>(`globalThis.__cspViolations ?? []`)).toEqual([]);
    });
  }
}
