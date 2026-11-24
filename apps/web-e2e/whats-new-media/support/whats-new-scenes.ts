import { join } from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from '../../src/models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from '../../src/support/a11y-flows';
import { SEARCH_BUTTON, SEARCH_FIELD_NAME } from '../../src/support/search-button';
import { viewEntry } from '../../src/support/sidebar';
import { openDataDialog } from '../../src/support/data-menu';
import type { WhatsNewClip } from '../models/whats-new-clip.interface';
import { WHATS_NEW_MEDIA } from '../models/whats-new-media.const';

// The screens of the New items on the mock data (the same flows as the e2e specs). Each returns
// where its crop starts. The 2.2.0 ones (AI) start with the mock AI account on (`seedAi`).

const READING = MOCK_FIXTURE.readingName;
// Same values as MOCK_LINKS_SCENARIO_KEY and its Previews / Showcase scenarios (apps/web).
const SCENARIO_KEY = 'sm-mock-links-scenario';
const SHOWCASE = 'showcase';
const DESCRIPTION = 'Long reads worth a second look';

/** The crop of `crop` size centred on `box`, kept inside the window. */
function centred(box: { x: number; y: number; width: number; height: number }): WhatsNewClip {
  const { viewport, crop } = WHATS_NEW_MEDIA;
  const x = box.x + box.width / 2 - crop.width / 2;
  const y = box.y + box.height / 2 - crop.height / 2;
  return {
    x: Math.round(Math.min(Math.max(x, 0), viewport.width - crop.width)),
    y: Math.round(Math.min(Math.max(y, 0), viewport.height - crop.height)),
  };
}

async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('the element to crop around is not visible');
  }
  return box;
}

async function chooseOption(dialog: Locator, name: string): Promise<void> {
  await dialog
    .locator('label.ui-choice', { has: dialog.page().getByLabel(name, { exact: true }) })
    .click();
}

/** Two feeds next to each other: All links on the left, the Reading folder on the right. */
export async function sideBySide(page: Page): Promise<WhatsNewClip> {
  await openFeed(page);
  await page.getByRole('button', { name: 'Side by side' }).click();
  const right = page.getByRole('region', { name: 'Right: choose a folder' });
  await right.getByRole('option', { name: READING, exact: true }).click();
  const rightHalf = page.getByRole('region', { name: `Right: ${READING}` });
  await expect(rightHalf.locator('ui-card').first()).toBeVisible();
  // The two feeds, without the sidebar: the crop ends at the right edge of the window.
  const left = await boxOf(page.locator('.library__scroll'));
  return { x: Math.round(left.x), y: 0 };
}

/** A highlighted folder (colour, icon, description): the tinted header block and the sidebar rows. */
export async function folderStyling(page: Page): Promise<WhatsNewClip> {
  await openFeed(page);
  await pickFolderMenuItem(page, READING, 'Color and icon…');
  const dialog = page.getByRole('dialog', { name: READING });
  await chooseOption(dialog, 'Ocean');
  await chooseOption(dialog, 'Star');
  await dialog.getByLabel('Description').fill(DESCRIPTION);
  await dialog.getByRole('switch', { name: 'Highlight with background' }).click();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('treeitem', { name: new RegExp(`^${READING}\\b`) }).click();
  await expect(page).toHaveURL(`/folders/${MOCK_FIXTURE.readingId}`);

  // A second highlighted folder that is not open: the subfolder under Reading.
  await page.getByRole('treeitem', { name: /^Angular\b/ }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Color and icon…' }).click();
  const sub = page.getByRole('dialog', { name: 'Angular' });
  await chooseOption(sub, 'Amber');
  await sub.getByRole('switch', { name: 'Highlight with background' }).click();
  await sub.getByRole('button', { name: 'Save' }).click();
  await expect(sub).toHaveCount(0);

  const banner = page.locator('ui-folder-banner');
  await expect(banner.getByText(DESCRIPTION, { exact: true })).toBeVisible();
  return { x: 0, y: 0 };
}

/** The rule chip in Add link: a youtube.com rule files the next link into Reading with a tag. */
export async function rulesByDomain(page: Page): Promise<WhatsNewClip> {
  await openFeed(page);
  await page.getByRole('button', { name: 'Add link' }).first().click();
  let dialog = page.getByRole('dialog', { name: 'Add link' });
  await dialog.getByLabel('Link', { exact: true }).fill('https://www.youtube.com/watch?v=first');
  await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.mouse.move(0, 0);
  const card = page.locator('ui-card').filter({ hasText: 'youtube.com' }).first();
  await card.getByRole('button', { name: /^Actions for / }).click();
  await page.getByRole('menuitem', { name: 'Create a rule for youtube.com…' }).click();
  const rule = page.getByRole('dialog', { name: 'Add rule' });
  await rule.getByRole('option', { name: READING, exact: true }).click();
  await rule.getByRole('combobox', { name: 'Tags' }).fill('video');
  await page.keyboard.press('Enter');
  await rule.getByRole('button', { name: 'Save rule' }).click();
  await expect(rule).toBeHidden();
  // The toast would cover the dialog's footer.
  await expect(page.getByRole('status').filter({ hasText: 'Rule added' })).toBeHidden({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Add link' }).first().click();
  dialog = page.getByRole('dialog', { name: 'Add link' });
  await dialog.getByLabel('Link', { exact: true }).fill('https://m.youtube.com/watch?v=second');
  await expect(dialog.getByText(`Rule: youtube.com → ${READING}, #video`)).toBeVisible();
  await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
  // The whole window: the dialog with its header, the rule chip, the folder and the tags.
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}

/** The Reminders view of the demo library: one reminder due, one upcoming. */
export async function reminders(page: Page): Promise<WhatsNewClip> {
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [SCENARIO_KEY, SHOWCASE],
  );
  await openFeed(page);
  await viewEntry(page, 'Reminders').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Reminders' })).toBeVisible();
  await expect(page.locator('app-reminder-row').first()).toBeVisible();
  return { x: 0, y: 0 };
}

// --- 2.2.0: the AI release --------------------------------------------------------------------

// Same values as MOCK_AI_STORAGE_KEY and MOCK_AI_ANNOUNCEMENT_KEY in apps/web.
const MOCK_AI_KEY = 'sm-mock-ai';
const AI_SEEDED_FLAG = 'whats-new-ai-seeded';
const VIDEO_URL = 'https://www.youtube.com/watch?v=first';
const AI_WAIT = { timeout: 15_000 } as const;

interface AiAccount {
  readonly ask?: boolean;
  readonly meaningSearch?: boolean;
}

/** The demo library with the mock AI account on (summaries on, Ask and meaning search as given). */
async function openAiLibrary(page: Page, account: AiAccount = {}): Promise<void> {
  const stored = {
    settings: {
      enabled: true,
      summaries: true,
      ask: account.ask ?? false,
      meaningSearch: account.meaningSearch ?? false,
    },
    introSeen: true,
  };
  await page.addInitScript(
    ([scenarioKey, scenario, key, flag, value]) => {
      sessionStorage.setItem(scenarioKey, scenario);
      // The extension banner would take the room of the feed.
      localStorage.setItem('sm-extension-banner-dismissed', '1');
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, '1');
        localStorage.setItem(key, value);
      }
    },
    [SCENARIO_KEY, SHOWCASE, MOCK_AI_KEY, AI_SEEDED_FLAG, JSON.stringify(stored)],
  );
  await openFeed(page);
  await dismissToasts(page);
}

/** Closes the toasts the demo library shows on start (the due reminder), so none covers a screen. */
async function dismissToasts(page: Page): Promise<void> {
  const toasts = page.getByRole('status').filter({ hasText: 'A reminder is due' });
  await expect(toasts.first()).toBeVisible(AI_WAIT);
  await toasts.first().getByRole('button', { name: 'Dismiss' }).click();
  await expect(toasts).toHaveCount(0);
}

/** Add link with a YouTube address after Fill in with AI: title, folder, tags and the summary. */
export async function aiSuggestions(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page);
  await page.getByRole('button', { name: 'Add link' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add link' });
  await dialog.getByLabel('Link', { exact: true }).fill(VIDEO_URL);
  await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
  const fill = dialog.getByRole('button', { name: 'Fill in with AI' });
  await expect(fill).toBeVisible(AI_WAIT);
  await fill.click();
  await expect(dialog.getByLabel('Summary')).not.toHaveValue('', AI_WAIT);
  await expect(dialog.getByRole('combobox', { name: 'Folder' })).not.toContainText('Unsorted');
  await expect(dialog.getByRole('button', { name: /^Remove tag / }).first()).toBeVisible();
  // The whole window: the dialog with its footer button and the filled fields.
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}

/** The Ask drawer with a cited answer and its sources. */
export async function aiAsk(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page, { ask: true });
  await page.getByRole('button', { name: 'Ask your shelf' }).click();
  const panel = page.getByRole('dialog', { name: 'Ask your shelf' });
  const field = panel.getByRole('textbox', { name: 'Ask about your links' });
  await field.fill('Which ramen recipes did I save?');
  await field.press('Enter');
  await expect(panel).toContainText('You saved a few ramen recipes.', AI_WAIT);
  const sources = panel.getByRole('list', { name: 'Sources from your shelf' });
  await expect(sources.getByRole('listitem')).toHaveCount(3, AI_WAIT);
  await expect(panel.getByRole('button', { name: 'Stop' })).toBeHidden(AI_WAIT);
  return { x: WHATS_NEW_MEDIA.viewport.width - WHATS_NEW_MEDIA.crop.width, y: 0 };
}

/** Ask as a chat (2.3.0): a find that answers with the count and the links as cards. */
export async function askChat(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page, { ask: true });
  await page.getByRole('button', { name: 'Ask your shelf' }).click();
  const panel = page.getByRole('dialog', { name: 'Ask your shelf' });
  const field = panel.getByRole('textbox', { name: 'Ask about your links' });
  await field.fill('Find my design links');
  await field.press('Enter');
  const cards = panel.getByRole('list', { name: 'Links found' });
  await expect(cards.getByRole('listitem').first()).toBeVisible(AI_WAIT);
  await expect(panel.getByRole('button', { name: 'Stop' })).toBeHidden(AI_WAIT);
  return { x: WHATS_NEW_MEDIA.viewport.width - WHATS_NEW_MEDIA.crop.width, y: 0 };
}

/** Search for "signals": word matches, then the "Related by meaning" group. */
export async function aiSearch(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page, { meaningSearch: true });
  const field = page.getByRole('combobox', { name: SEARCH_FIELD_NAME });
  if (!(await field.isVisible())) {
    await page.getByRole('button', { name: SEARCH_BUTTON }).first().click();
  }
  await field.fill('signals');
  const list = page.getByRole('listbox', { name: 'Search results' });
  const related = list.getByRole('group', { name: 'Related by meaning' });
  await expect(related.getByRole('option').first()).toBeVisible(AI_WAIT);
  // The word matches fill the panel: scroll until the meaning group shows under them.
  await related.getByRole('option').last().scrollIntoViewIfNeeded();
  return centred(await boxOf(list));
}

/** The feed with AI summaries on the cards of the demo library. */
export async function aiSummaries(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page);
  const summarised = page
    .locator('ui-card')
    .filter({ has: page.getByRole('img', { name: /Generated by AI/ }) });
  await expect(summarised.first()).toBeVisible(AI_WAIT);
  const left = await boxOf(page.locator('.library__scroll'));
  return { x: Math.round(left.x), y: 0 };
}

// A real Chrome export (the import parser's fixture), resolved from this file.
const CHROME_EXPORT = join(
  __dirname,
  '../../../web/src/app/features/import/utils/fixtures/chrome-bookmarks.html',
);

/** Import (2.4.0): a bookmarks file grouped by topic with AI, before anything is written. */
export async function importGroups(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page);
  await openDataDialog(page, 'Import links');
  const dialog = page.getByRole('dialog', { name: 'Import links' });
  await dialog.locator('input[type="file"]').setInputFiles(CHROME_EXPORT);
  const review = page.getByRole('dialog', { name: 'chrome-bookmarks.html' });
  await review.getByText('Let AI sort them by topic').click();
  await review.getByRole('button', { name: 'Group' }).click();
  await expect(review.getByText(/groups for \d+ links/u)).toBeVisible(AI_WAIT);
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}

/** Saved views (2.4.0): a phrase fills the filter rows, with the live count. */
export async function newViewPhrase(page: Page): Promise<WhatsNewClip> {
  await openAiLibrary(page);
  await page
    .getByRole('toolbar', { name: 'Saved views' })
    .getByRole('button', { name: 'Save this view' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'New view' });
  await dialog
    .getByRole('textbox', { name: 'Describe what to show' })
    .fill('Angular videos, newest first');
  await dialog.getByRole('button', { name: 'Compose' }).click();
  await expect(dialog.getByText(/Found \d+ links?/u)).toBeVisible(AI_WAIT);
  await expect(dialog.getByRole('button', { name: 'Change' })).toBeVisible();
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}

/** Link kinds (2.4.0): the type select with its ten kinds (no AI: the dialog opens on the rows). */
export async function linkKinds(page: Page): Promise<WhatsNewClip> {
  await openFeed(page);
  await page
    .getByRole('toolbar', { name: 'Saved views' })
    .getByRole('button', { name: 'Save this view' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'New view' });
  await dialog.getByRole('combobox', { name: 'Type' }).click();
  await expect(page.getByRole('option', { name: 'Recipe', exact: true })).toBeVisible();
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}

// The framed page of the link preview shot: a plain article, drawn locally (nothing leaves the machine).
const PREVIEW_ARTICLE = `<!doctype html><html><head><title>Angular overview</title><style>
body{margin:0;font:18px/1.6 system-ui,sans-serif;color:#1f2328;background:#fff}
header{padding:20px 48px;border-bottom:1px solid #e5e7eb;font-weight:600}
main{max-width:640px;margin:40px auto;padding:0 32px}h1{font-size:34px;line-height:1.2;margin:0 0 16px}
p{margin:0 0 16px;color:#424a53}</style></head><body><header>angular.dev</header><main>
<h1>What is Angular?</h1>
<p>Angular is a web framework that helps you build fast, reliable applications that scale with your team.</p>
<p>Signals give you fine-grained reactivity, standalone components keep things simple, and the CLI takes care of the build.</p>
<p>Start with the tutorial, then read the guides on components, templates and dependency injection.</p>
</main></body></html>`;

/** Link preview (2.5.0): a click on a card opens the page beside the feed, the sidebar stays. */
export async function linkPreview(page: Page): Promise<WhatsNewClip> {
  await page
    .context()
    .route(/^https:\/\/(?!localhost|127\.0\.0\.1)/u, (route) =>
      route.request().resourceType() === 'document'
        ? route.fulfill({ contentType: 'text/html', body: PREVIEW_ARTICLE })
        : route.abort(),
    );
  await openFeed(page);
  await page.locator('app-link-card', { hasText: 'Angular overview' }).first().click();
  const panel = page.getByRole('region', { name: 'Preview: Angular overview' });
  await expect(
    panel.frameLocator('iframe').getByRole('heading', { name: 'What is Angular?' }),
  ).toBeVisible();
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}

// The framed page of the related links shot, drawn locally like the link preview one.
const ZONELESS_ARTICLE = `<!doctype html><html><head><title>Zoneless change detection, explained</title><style>
body{margin:0;font:18px/1.6 system-ui,sans-serif;color:#1f2328;background:#fff}
header{padding:20px 48px;border-bottom:1px solid #e5e7eb;font-weight:600}
main{max-width:640px;margin:40px auto;padding:0 32px}h1{font-size:34px;line-height:1.2;margin:0 0 16px}
p{margin:0 0 16px;color:#424a53}</style></head><body><header>angular.dev</header><main>
<h1>Zoneless Angular</h1>
<p>Angular can run without zone.js: change detection is scheduled by signals, events and async pipes instead.</p>
<p>Dropping the zone makes bundles smaller, stack traces cleaner and rendering easier to reason about.</p>
<p>New applications are zoneless by default; existing ones can switch with provideZonelessChangeDetection().</p>
</main></body></html>`;

/** Related links (2.6.0): the link preview of a guide with its "Related" popover open. */
export async function relatedInPreview(page: Page): Promise<WhatsNewClip> {
  await page
    .context()
    .route(/^https:\/\/(?!localhost|127\.0\.0\.1)/u, (route) =>
      route.request().resourceType() === 'document'
        ? route.fulfill({ contentType: 'text/html', body: ZONELESS_ARTICLE })
        : route.abort(),
    );
  await openAiLibrary(page, { meaningSearch: true });
  await page
    .locator('app-link-card', { hasText: 'Zoneless change detection, explained' })
    .first()
    .click();
  const panel = page.getByRole('region', { name: 'Preview: Zoneless change detection, explained' });
  await expect(
    panel.frameLocator('iframe').getByRole('heading', { name: 'Zoneless Angular' }),
  ).toBeVisible();
  await panel.getByRole('button', { name: /^Related · \d+$/ }).click(AI_WAIT);
  const related = page.getByRole('dialog', { name: 'Related on your shelf' });
  await expect(related.getByRole('listitem').first()).toBeVisible();
  // The popover opening keeps a short-lived animation alive that `settled` would wait on forever: let it end first.
  await page.mouse.move(0, 0);
  await page.waitForTimeout(4000);
  return { x: 0, y: 0, ...WHATS_NEW_MEDIA.viewport };
}
