import { BOOT_SKELETON_SELECTOR } from './models/boot-skeleton-selector.const';
import { KEEP_BOOT_SKELETON_DATA } from './models/keep-boot-skeleton-data.const';

/**
 * Takes the static skeleton of `index.html` away (#410). It is an overlay above `<app-root>`, so
 * removing it moves nothing: the page below has been rendered already (`App.renderActivatedPage`).
 */
export function removeBootSkeleton(document: Pick<Document, 'querySelector'>): void {
  document.querySelector(BOOT_SKELETON_SELECTOR)?.remove();
}

/** A route like `/demo` only starts the session and navigates on: its page must not uncover the app. */
export function keepsBootSkeleton(data: Record<string, unknown> | undefined): boolean {
  return data?.[KEEP_BOOT_SKELETON_DATA] === true;
}
