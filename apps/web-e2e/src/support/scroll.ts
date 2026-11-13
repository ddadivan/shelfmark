import { type Page } from '@playwright/test';

/**
 * The main column of the app shell. Since #352 it is the scroll area of the mobile shell (phones
 * and tablets) and of the taller desktop pages; the document itself never scrolls in the shell.
 * String scripts: this project has no DOM lib.
 */
export const SHELL_MAIN = '.shell__main';

/** The document's scroll position (`document.scrollingElement`). */
export function documentScrollTop(page: Page): Promise<number> {
  return page.evaluate<number>('(document.scrollingElement ?? document.documentElement).scrollTop');
}

/** The scroll position of the shell's main column. */
export function mainScrollTop(page: Page): Promise<number> {
  return page.evaluate<number>(`document.querySelector('${SHELL_MAIN}').scrollTop`);
}

/** Scrolls the shell's main column to `top` (what `window.scrollTo` did before #352). */
export async function scrollMainTo(page: Page, top: number): Promise<void> {
  await page.evaluate(`document.querySelector('${SHELL_MAIN}').scrollTo(0, ${top})`);
}

/** Makes the routed page at least `px` tall, so the main column has room to scroll. */
export async function makePageTall(page: Page, px: number): Promise<void> {
  await page.addStyleTag({
    content: `${SHELL_MAIN} > :last-child { min-block-size: ${px}px !important; }`,
  });
}
