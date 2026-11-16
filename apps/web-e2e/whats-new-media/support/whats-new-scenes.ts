import { expect, type Locator, type Page } from '@playwright/test';
import { MOCK_FIXTURE } from '../../src/models/mock-fixture.const';
import { openFeed, pickFolderMenuItem } from '../../src/support/a11y-flows';
import { viewEntry } from '../../src/support/sidebar';
import type { WhatsNewClip } from '../models/whats-new-clip.interface';
import { WHATS_NEW_MEDIA } from '../models/whats-new-media.const';

// The screens of the 2.1.0 New items on the mock data (the same flows as the e2e specs: side-by-side,
// folder-details, rules, reminders). Each returns where its crop starts.

const READING = MOCK_FIXTURE.readingName;
// Same values as MOCK_LINKS_SCENARIO_KEY and its Previews / Showcase scenarios (apps/web).
const SCENARIO_KEY = 'sm-mock-links-scenario';
const PREVIEWS = 'previews';
const SHOWCASE = 'showcase';
const DESCRIPTION = 'Long reads worth a second look';

/** A drawn landscape (sky, sun, hills) as the cover of the folder: pleasant in both themes. */
const COVER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb3d5"/><stop offset="0.7" stop-color="#f6d9b0"/></linearGradient>
<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c8fa8"/><stop offset="1" stop-color="#4d7088"/></linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#sky)"/>
<circle cx="930" cy="250" r="86" fill="#fff4d6"/>
<path d="M0 470 L180 330 L330 440 L520 280 L720 450 L900 340 L1100 450 L1280 380 L1280 720 L0 720 Z" fill="url(#far)"/>
<path d="M0 560 Q240 450 480 540 T960 520 T1280 560 L1280 720 L0 720 Z" fill="#3f6b57"/>
<path d="M0 640 Q300 560 620 630 T1280 620 L1280 720 L0 720 Z" fill="#2c4f40"/>
</svg>`;

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

/** A folder with a colour, an icon, a description and a cover, in the sidebar and as the header. */
export async function folderStyling(page: Page): Promise<WhatsNewClip> {
  await page.route(/\/api\/links\/[^/]+\/image\?v=/, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: COVER_SVG }),
  );
  await page.addInitScript(
    ([key, value]) => sessionStorage.setItem(key, value),
    [SCENARIO_KEY, PREVIEWS],
  );
  await openFeed(page);
  await pickFolderMenuItem(page, READING, 'Color and icon…');
  const dialog = page.getByRole('dialog', { name: READING });
  await chooseOption(dialog, 'Ocean');
  await chooseOption(dialog, 'Star');
  await dialog.getByLabel('Description').fill(DESCRIPTION);
  const first = dialog.getByRole('radiogroup', { name: 'Cover' }).locator('label.ui-choice').nth(1);
  await first.scrollIntoViewIfNeeded();
  await first.click();
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
  await expect(banner.locator('img.ui-folder-banner__cover')).toBeVisible();
  return { x: 0, y: 0 };
}

/** The rule chip in Add link: a youtube.com rule files the next link into Reading with a tag. */
export async function rulesByDomain(page: Page): Promise<WhatsNewClip> {
  await openFeed(page);
  await page.getByRole('button', { name: 'Add link' }).first().click();
  let dialog = page.getByRole('dialog', { name: 'Add link' });
  await dialog.getByLabel('Link', { exact: true }).fill('https://www.youtube.com/watch?v=first');
  await expect(dialog.getByLabel('Title', { exact: true })).not.toHaveValue('');
  await dialog.getByRole('button', { name: 'Save link' }).click();
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
