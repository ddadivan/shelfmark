import { expect, type Locator, type Page } from '@playwright/test';

const MAX_STEPS = 60;

/**
 * Moves focus with Tab (or Shift+Tab with `reverse`) until `target` has it. Fails with the step
 * count when it is never reached, which means the control is not keyboard reachable.
 */
export async function tabTo(
  page: Page,
  target: Locator,
  options: { readonly reverse?: boolean } = {},
): Promise<void> {
  const key = options.reverse ? 'Shift+Tab' : 'Tab';
  for (let step = 0; step < MAX_STEPS; step++) {
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement).catch(() => false)) {
      return;
    }
    await page.keyboard.press(key);
  }
  await expect(
    target,
    `focus never reached the target in ${MAX_STEPS} ${key} presses`,
  ).toBeFocused();
}

/** Presses an arrow key until `target` has focus (menus, trees, listboxes). */
export async function arrowTo(
  page: Page,
  target: Locator,
  key: 'ArrowDown' | 'ArrowUp' = 'ArrowDown',
): Promise<void> {
  for (let step = 0; step < MAX_STEPS; step++) {
    if (await target.evaluate((el) => el === el.ownerDocument.activeElement).catch(() => false)) {
      return;
    }
    await page.keyboard.press(key);
  }
  await expect(
    target,
    `focus never reached the target in ${MAX_STEPS} ${key} presses`,
  ).toBeFocused();
}

/**
 * The focused element shows a focus indicator: it matches `:focus-visible` and has an outline,
 * or sits in a field wrapper that draws the focus as a border and halo (libs/ui field focus).
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
