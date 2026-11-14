import { BOOT_SKELETON_SELECTOR } from './models/boot-skeleton-selector.const';

/**
 * Takes the static skeleton of `index.html` away (#410). It is an overlay above `<app-root>`, so
 * removing it moves nothing: the page below has been rendered already (`App.renderActivatedPage`).
 */
export function removeBootSkeleton(document: Pick<Document, 'querySelector'>): void {
  document.querySelector(BOOT_SKELETON_SELECTOR)?.remove();
}
