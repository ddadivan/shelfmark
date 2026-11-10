import { expect, type Locator, type Page } from '@playwright/test';

const MAX_STEPS = 60;

type FocusKey = 'Tab' | 'Shift+Tab' | 'ArrowDown' | 'ArrowUp';

async function hasFocus(target: Locator): Promise<boolean> {
  // `count()` does not wait, so a target that is not in the DOM fails fast instead of waiting for it.
  return (
    (await target.count()) === 1 &&
    (await target.evaluate((el) => el === el.ownerDocument.activeElement))
  );
}

/**
 * Presses `key` until `target` has focus: Tab / Shift+Tab walk the tab order, the arrows walk
 * inside a menu or tree. Fails with the step count when it is never reached, which means the
 * control is not keyboard reachable.
 */
export async function pressUntilFocused(
  page: Page,
  target: Locator,
  key: FocusKey = 'Tab',
): Promise<void> {
  for (let step = 0; step < MAX_STEPS; step++) {
    if (await hasFocus(target)) {
      return;
    }
    await page.keyboard.press(key);
  }
  await expect(target, `focus never reached the target in ${MAX_STEPS} ${key} presses`).toBeFocused(
    {
      timeout: 1000,
    },
  );
}

/**
 * The focused element shows a focus indicator: it matches `:focus-visible` and has an outline,
 * or sits in a `ui-field-shell` wrapper (libs/ui text fields, selects), which draws the focus as
 * a border and halo (`field-focus` mixin) and removes the outline from the bare input.
 */
export async function expectVisibleFocus(page: Page): Promise<void> {
  const state = await page.evaluate<{ visible: boolean; indicator: boolean; tag: string }>(`(() => {
    const el = document.activeElement;
    if (!el) { return { visible: false, indicator: false, tag: 'none' }; }
    const hasOutline = (node) => {
      const s = getComputedStyle(node);
      return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 && s.outlineColor !== 'rgba(0, 0, 0, 0)';
    };
    const halo = (node) => getComputedStyle(node).boxShadow !== 'none';
    let indicator = hasOutline(el);
    for (let node = el.parentElement, i = 0; !indicator && node && i < 4; node = node.parentElement, i++) {
      indicator = node.matches(':focus-within') && (halo(node) || hasOutline(node));
    }
    return { visible: el.matches(':focus-visible'), indicator, tag: el.tagName.toLowerCase() };
  })()`);
  expect(state, 'the focused element has a visible focus indicator').toMatchObject({
    visible: true,
    indicator: true,
  });
}

/**
 * Options of a listbox are reached with aria-activedescendant: the arrows move `data-active`, not
 * focus. Waits for the list to settle on one active option, then steps until it is `option`.
 */
export async function activeOption(page: Page, option: Locator): Promise<void> {
  const active = page.locator('[role="option"][data-active="true"]');
  for (let step = 0; step < 10; step++) {
    await expect(active).toHaveCount(1);
    if ((await option.getAttribute('data-active')) === 'true') {
      return;
    }
    // Wait for the arrow to move the active option before reading it again; reading right after
    // the key press can see the old state and, with two options, step past the target forever.
    const before = await active.getAttribute('id');
    await page.keyboard.press('ArrowDown');
    await expect(active).not.toHaveAttribute('id', before ?? '');
  }
  await expect(option).toHaveAttribute('data-active', 'true');
}
