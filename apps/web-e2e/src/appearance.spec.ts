import { type Locator, type Page, type TestInfo } from '@playwright/test';
import { E2E_PROJECT } from './models/e2e-project.const';
import { E2E_TAG } from './models/e2e-tag.const';
import { expectNoBlockingViolations } from './support/axe';
import { seedSession } from './support/mock-session';
import { settled } from './support/settled';
import { expect, test } from './support/test';

// Custom theme and the Animations setting (issue #273). In the mock build the account settings
// live in localStorage (`MockUserSettingsApi`), so a reload and a second tab see them like the
// server's.

/** A radio by its accessible name inside the radiogroup named `group`. */
function choice(page: Page, group: string, name: string): Locator {
  return page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });
}

async function pick(page: Page, group: string, name: string): Promise<void> {
  // A click event on the radio itself: the visually hidden input can sit under the phone tab bar.
  await choice(page, group, name).dispatchEvent('click');
  await expect(choice(page, group, name)).toBeChecked();
}

const token = (page: Page, name: string): Promise<string> =>
  page.evaluate(
    `getComputedStyle(document.documentElement).getPropertyValue('${name}').trim().toLowerCase()`,
  );

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('not rendered');
  return box;
}

/**
 * How far the "+" swatch is from the centre of the last swatch or tile of its row (#415). Beside
 * it: the distance of the centres. On a line of its own under the tiles (a phone): 0, it is then
 * centred on the tile height in a line of its own; anywhere else (on the caption line) Infinity.
 */
async function misalignment(plus: Locator, last: Locator): Promise<number> {
  const a = await boxOf(plus);
  const b = await boxOf(last);
  const middle = (box: Box): number => box.y + box.height / 2;
  if (a.y < b.y + b.height) return Math.abs(middle(a) - middle(b));
  return a.y > b.y + b.height + 16 ? 0 : Number.POSITIVE_INFINITY;
}

async function openAppearance(page: Page): Promise<void> {
  await page.goto('/settings/appearance');
  await expect(page.getByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible();
}

test.describe('appearance: custom theme and animations (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  test('Custom swaps accent, background and corners, and a reload keeps it', async ({ page }) => {
    await openAppearance(page);
    const html = page.locator('html');
    await expect(page.getByText('Start from')).toHaveCount(0);

    await pick(page, 'Theme', 'Custom');
    await expect(html).toHaveAttribute('data-theme', 'custom');
    await expect(html).toHaveAttribute('data-custom-base', 'light');
    // The default custom theme: Ocean on Paper with soft corners.
    expect(await token(page, '--accent')).toBe('#2e6a99');
    expect(await token(page, '--bg')).toBe('#f7f4ee');

    await pick(page, 'Start from', 'Dark');
    await expect(html).toHaveAttribute('data-custom-base', 'dark');
    await expect(html).toHaveCSS('color-scheme', 'dark');
    await pick(page, 'Accent color', 'Rose');
    await pick(page, 'Background', 'Ink');
    await pick(page, 'Corners', 'Square');

    expect(await token(page, '--accent')).toBe('#e79ab2');
    expect(await token(page, '--bg')).toBe('#12141a');
    expect(await token(page, '--radius-md')).toMatch(/^0?\.1875rem$/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 20, 26)');

    await page.reload();

    await expect(html).toHaveAttribute('data-theme', 'custom');
    await expect(html).toHaveAttribute('data-custom-accent', 'rose');
    await expect(html).toHaveAttribute('data-custom-background', 'ink');
    await expect(html).toHaveAttribute('data-custom-corners', 'square');
    await expect(choice(page, 'Accent color', 'Rose')).toBeChecked();

    await page.getByRole('button', { name: 'Reset custom theme' }).click();
    await expect(html).toHaveAttribute('data-custom-base', 'light');
    await expect(html).toHaveAttribute('data-custom-accent', 'ocean');

    // Light stays fixed: the custom attributes go away, the custom theme is kept for later.
    await pick(page, 'Theme', 'Light');
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(html).not.toHaveAttribute('data-custom-accent', /.*/);
    expect(await token(page, '--accent')).toBe('#4f7a4b');
  });

  test('Cancel and Esc drop a previewed colour; own color swatches can be removed with Delete or the ×, with Undo (#350)', async ({
    page,
  }, testInfo) => {
    await openAppearance(page);
    const html = page.locator('html');
    await pick(page, 'Theme', 'Custom');
    const swatch = page.getByRole('button', { name: 'Your own color' });
    const hex = page.getByRole('textbox', { name: 'Hex code' });
    const add = page.getByRole('button', { name: 'Add color', exact: true });

    // Cancel: the preview goes, nothing is kept.
    await swatch.click();
    await hex.fill('#23716c');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(hex).toHaveCount(0);
    await expect(choice(page, 'Accent color', '#23716c')).toHaveCount(0);
    await expect(swatch.locator('.ui-color-picker__plus')).toBeVisible();

    // Two own colors; the second is the accent, so the first can go.
    await swatch.click();
    await hex.fill('#23716c');
    await add.click();
    await expect(hex).toHaveCount(0);
    await swatch.click();
    await hex.fill('#1d4f91');
    await add.click();
    await expect(choice(page, 'Accent color', '#1d4f91')).toBeChecked();
    const first = choice(page, 'Accent color', '#23716c');
    await expect(first).toBeVisible();

    // The "×" shows on hover (never on the colour in use) and removes the swatch.
    test.skip(testInfo.project.use.hasTouch === true, 'the keyboard path is checked on desktop');
    await first.focus();
    await page.keyboard.press('Delete');
    await expect(first).toHaveCount(0);
    const toast = page.getByRole('status').filter({ hasText: 'Color removed' });
    await expect(toast).toBeVisible();
    // The accent in use keeps its colour and its swatch.
    await expect(html).toHaveAttribute('data-custom-accent', 'own');
    await expect(choice(page, 'Accent color', '#1d4f91')).toBeChecked();

    // Undo brings the swatch back.
    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect(choice(page, 'Accent color', '#23716c')).toBeVisible();

    // The colour in use is not removable: no "×", Delete does nothing.
    const inUse = choice(page, 'Accent color', '#1d4f91');
    await inUse.focus();
    await page.keyboard.press('Delete');
    await expect(inUse).toBeVisible();
    await expect(
      page.getByRole('radiogroup', { name: 'Accent color' }).locator('.ui-theme-picker__remove'),
    ).toHaveCount(1);
  });

  test('an own accent color: a readable one applies at once, a faint one gets a passing shade', async ({
    page,
  }) => {
    await openAppearance(page);
    const html = page.locator('html');
    await pick(page, 'Theme', 'Custom');

    const swatch = page.getByRole('button', { name: 'Your own color' });
    await swatch.click();
    await expect(swatch).toHaveAttribute('aria-expanded', 'true');
    const hex = page.getByRole('textbox', { name: 'Hex code' });
    await expect(hex).toBeFocused();
    await expect(page.getByLabel('Choose a color')).toBeVisible();

    // Typing only previews: nothing is applied or kept until "Add color" (#350).
    await hex.fill('#23716c');
    await hex.press('Enter');
    await expect(html).not.toHaveAttribute('data-custom-accent', 'own');
    await expect(choice(page, 'Accent color', '#23716c')).toHaveCount(0);
    // Readable on Paper: it is the accent as soon as it is added.
    await page.getByRole('button', { name: 'Add color', exact: true }).click();
    await expect(html).toHaveAttribute('data-custom-accent', 'own');
    expect(await token(page, '--accent')).toBe('#23716c');
    await expect(choice(page, 'Accent color', 'Ocean')).not.toBeChecked();
    // The colour is a swatch of the account now (#335) and the "+" panel closed.
    await expect(choice(page, 'Accent color', '#23716c')).toBeChecked();
    await expect(swatch).toHaveAttribute('aria-expanded', 'false');
    await expect(swatch.locator('.ui-color-picker__plus')).toBeVisible();
    await expect(hex).toHaveCount(0);

    // Too faint: a typed colour is not changed, a warning offers the nearest shade that keeps
    // 4.5:1 and "Add color" waits (#415).
    await swatch.click();
    await expect(hex).toBeFocused();
    await hex.fill('#f5d0e0');
    await hex.press('Enter');
    await expect(page.getByText(/hard to read on your background/u)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add color', exact: true })).toBeDisabled();
    expect(await token(page, '--accent')).toBe('#23716c');
    const use = page.getByRole('button', { name: /^Use #[0-9a-f]{6}$/u });
    const shade = ((await use.textContent()) ?? '').trim().replace('Use ', '');
    await use.click();
    await expect(page.getByText(/hard to read on your background/u)).toHaveCount(0);
    expect(await token(page, '--accent')).toBe(shade);
    await expectNoBlockingViolations(page, test.info());

    // Esc closes the panel and returns to the swatch; a reload keeps the colour.
    await expect(hex).toHaveCount(0);
    await swatch.click();
    await expect(hex).toBeFocused();
    await hex.press('Escape');
    await expect(swatch).toBeFocused();
    await expect(swatch).toHaveAttribute('aria-expanded', 'false');
    await page.reload();
    await expect(html).toHaveAttribute('data-custom-accent', 'own');
    expect(await token(page, '--accent')).toBe(shade);

    // The dark base draws the same colour in a lighter shade that still reads.
    await pick(page, 'Start from', 'Dark');
    const dark = await token(page, '--accent');
    expect(dark).not.toBe(shade);
    expect(dark).toMatch(/^#[0-9a-f]{6}$/u);
  });

  test(
    'own colour: a palette pick turns into the nearest readable shade, a typed one waits for "Use" (#415)',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openAppearance(page);
      await pick(page, 'Theme', 'Custom');
      const swatch = page.getByRole('button', { name: 'Your own background color' });
      await swatch.click();
      const hex = page.getByRole('textbox', { name: 'Hex code' });
      await expect(hex).toBeFocused();
      const add = page.getByRole('button', { name: 'Add color', exact: true });
      const warning = page.getByText(/Text is hard to read on this background/u);
      const note = page.getByRole('status').filter({ hasText: /Adjusted to #[0-9a-f]{6}/u });

      // Drag to the dark bottom of the area: on the light base text would not read there.
      const area = page.getByRole('group', { name: 'Choose a color' });
      await area.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await settled(page);
      const box = await boxOf(area);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.95, { steps: 4 });
      // While dragging the raw colour is a preview: it cannot be added, no warning flashes.
      await expect(add).toBeDisabled();
      await expect(warning).toHaveCount(0);
      const raw = await hex.inputValue();
      await page.mouse.up();

      // On release the colour is the nearest readable shade: hex, note, Add enabled, no warning.
      await expect(hex).not.toHaveValue(raw);
      const shade = await hex.inputValue();
      expect(shade).toMatch(/^#[0-9a-f]{6}$/u);
      await expect(note).toHaveText(`Adjusted to ${shade} so text stays readable.`);
      await expect(warning).toHaveCount(0);
      await expect(add).toBeEnabled();

      // A typed unreadable hex keeps its value: the warning, Add disabled, until "Use".
      await hex.fill('#3a3f45');
      await expect(hex).toHaveValue('#3a3f45');
      await expect(note).toHaveCount(0);
      await expect(warning).toBeVisible();
      await expect(add).toBeDisabled();
      const use = page.getByRole('button', { name: /^Use #[0-9a-f]{6}$/u });
      const fixed = ((await use.textContent()) ?? '').trim().replace('Use ', '');
      await use.dispatchEvent('click');
      await expect(page.locator('html')).toHaveAttribute('data-custom-background', 'own');
      expect(await token(page, '--bg')).toBe(fixed);
      await expect(choice(page, 'Background', fixed)).toBeChecked();

      // A readable typed hex is added as it is (the closed panel has left first).
      await expect(hex).toHaveCount(0);
      await swatch.click();
      await expect(hex).toBeFocused();
      await hex.fill('#fffdf8');
      await expect(warning).toHaveCount(0);
      await expect(add).toBeEnabled();
      await add.dispatchEvent('click');
      expect(await token(page, '--bg')).toBe('#fffdf8');
    },
  );

  test(
    'the "+" swatch is centred on the swatches and tiles of its row (#415)',
    { tag: E2E_TAG.Phone },
    async ({ page }) => {
      await openAppearance(page);
      await pick(page, 'Theme', 'Custom');
      for (const base of ['Light', 'Dark']) {
        await pick(page, 'Start from', base);
        for (const [group, picker] of [
          ['Accent color', 'Your own color'],
          ['Background', 'Your own background color'],
        ] as const) {
          const plus = page.getByRole('button', { name: picker, exact: true });
          const frames = page
            .getByRole('radiogroup', { name: group })
            .locator('.ui-theme-picker__frame');
          expect(await misalignment(plus, frames.last())).toBeLessThanOrEqual(1);
          // Never wider or taller than the curated round swatches.
          const size = await boxOf(plus);
          expect(size.width).toBeCloseTo(size.height, 0);
          expect([36, 44]).toContain(Math.round(size.width));
        }
      }
    },
  );

  test('another tab follows the change', async ({ page, context }) => {
    await openAppearance(page);
    const other = await context.newPage();
    // Let the other tab's own account load finish first (it would answer the older values): the
    // Library page checks the saved Trash retention only once the account is there.
    await other.goto('/settings/library');
    await expect(other.getByRole('radio', { name: '30 days' })).toBeChecked();

    await pick(page, 'Theme', 'Custom');
    await pick(page, 'Accent color', 'Teal');

    await expect(other.locator('html')).toHaveAttribute('data-theme', 'custom');
    await expect(other.locator('html')).toHaveAttribute('data-custom-accent', 'teal');
    await other.close();
  });

  test('Animations: Reduced removes the card and list morph', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === E2E_PROJECT.Phone, 'the morph is checked on desktop');
    await page.addInitScript(`(() => {
      const start = document.startViewTransition?.bind(document);
      window.__morphs = 0;
      if (start) {
        document.startViewTransition = (cb) => { window.__morphs++; return start(cb); };
      }
    })()`);
    const morphs = (): Promise<number> => page.evaluate<number>('window.__morphs');
    const toggle = async (view: string): Promise<void> => {
      await page.evaluate('window.__morphs = 0');
      await page.getByRole('radio', { name: view, exact: true }).click();
      await expect(page.getByRole('radio', { name: view, exact: true })).toBeChecked();
    };

    await page.goto('/links');
    await expect(page.locator('ui-card').first()).toBeVisible();
    await toggle('List');
    // The morph starts after the render that sets the transition names, so it may come a frame
    // after the radio is checked.
    await expect.poll(morphs).toBeGreaterThan(0);

    await openAppearance(page);
    await pick(page, 'Animations', 'Reduced');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.goto('/links');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('ui-list-item').first()).toBeVisible();

    await toggle('Cards');
    await expect(page.locator('ui-card').first()).toBeVisible();
    expect(await morphs()).toBe(0);
  });

  test('Animations: Reduced stills the landing even when the device allows motion', async ({
    page,
  }) => {
    await openAppearance(page);
    await pick(page, 'Animations', 'Reduced');
    // As a guest (session gone): the landing reads the remembered setting on the first paint.
    await page.evaluate(`localStorage.removeItem('sm-mock-session')`);
    const guest = await page.context().newPage();
    await guest.goto('/');
    expect(await guest.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(
      false,
    );
    await expect(guest.locator('html')).toHaveAttribute('data-motion', 'reduced');
    // The app preview shows its final frame and never moves.
    await expect(guest.locator('.landing-hero-preview__toast')).toHaveCSS('opacity', '1');
    expect(
      await guest
        .locator('.landing-hero-preview')
        .evaluate((el) => el.getAnimations({ subtree: true }).length),
    ).toBe(0);
    await guest.close();
  });
});

/**
 * axe after the animations, scrolled to the end: there the shell keeps room for the phone tab
 * bar, so its glass is not composited over a bright swatch (axe would measure the label on that).
 */
async function scanSettled(page: Page, testInfo: TestInfo): Promise<void> {
  await page.evaluate('scrollTo(0, document.documentElement.scrollHeight)');
  await settled(page);
  await expectNoBlockingViolations(page, testInfo);
}

test.describe('appearance width (mock API, #315)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test('Appearance is wider than the 880px pages; options beside the preview from 1440px, stacked below', async ({
    page,
  }, testInfo) => {
    for (const [width, height] of [
      [1280, 800],
      [1440, 900],
      [1920, 1080],
    ] as const) {
      test.skip(testInfo.project.name !== E2E_PROJECT.Desktop, 'a desktop layout check');
      await page.setViewportSize({ width, height });
      await seedSession(page);
      await page.goto('/settings/library');
      await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();
      const library = await page.locator('app-settings-library-page').boundingBox();
      await openAppearance(page);
      const host = await page.locator('app-settings-appearance-page').boundingBox();
      const options = await page.locator('.appearance__options').boundingBox();
      const preview = await page.locator('.appearance__preview').boundingBox();

      // The other pages keep the 880px column; Appearance takes up to 100rem (#335).
      expect(library?.width).toBeLessThanOrEqual(880.5);
      expect(host?.width).toBeLessThanOrEqual(1600.5);
      expect(host?.width ?? 0).toBeGreaterThan(library?.width ?? 0);
      if (width >= 1440) {
        // From 90em: two columns, the preview right of the options, about 680 : 520.
        expect(preview?.x ?? 0).toBeGreaterThan((options?.x ?? 0) + (options?.width ?? 0));
        const ratio = (options?.width ?? 0) / (preview?.width ?? 1);
        expect(ratio).toBeGreaterThan(1.2);
        expect(ratio).toBeLessThan(1.4);
      } else {
        // Below 90em: one column, the preview on top, the options never squeezed.
        expect(preview?.y ?? 0).toBeLessThan(options?.y ?? 0);
        expect(options?.x).toBeCloseTo(preview?.x ?? 0, 0);
        expect(options?.width ?? 0).toBeGreaterThan(600);
      }
    }
  });
});

test.describe('appearance accessibility (mock API)', () => {
  test.skip(!!process.env['BASE_URL'], 'deployed builds have no mock APIs');

  test.beforeEach(async ({ page }) => {
    await seedSession(page);
  });

  // The plain Light and Dark pages are scanned by a11y-app.spec.ts (`settings appearance`, both
  // themes); this one covers a Custom theme there is no other scan of (#349).
  test('Appearance in a dark Custom theme: no serious or critical axe violations', async ({
    page,
  }, testInfo) => {
    await openAppearance(page);
    await pick(page, 'Theme', 'Custom');
    await pick(page, 'Start from', 'Dark');
    await pick(page, 'Accent color', 'Amber');
    await pick(page, 'Background', 'Black');
    await expect(page.locator('html')).toHaveAttribute('data-custom-background', 'black');
    await scanSettled(page, testInfo);
  });
});
