import { DestroyRef, effect, inject, type Signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Keeps the document title in step with a page label, "<label> · Shelfmark" in the active
 * language, and puts the app's own title back when the page goes. Call it in an injection context.
 */
export function followHelpTitle(label: Signal<string | undefined>): void {
  const title = inject(Title);
  const transloco = inject(TranslocoService);
  const appName = title.getTitle();
  effect(() => {
    const page = label();
    if (page !== undefined && page !== '') {
      title.setTitle(transloco.translate('library.pageTitle.page', { page, app: appName }));
    }
  });
  inject(DestroyRef).onDestroy(() => title.setTitle(appName));
}
