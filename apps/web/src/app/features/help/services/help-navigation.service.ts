import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PATH } from '../../../models/app-path.const';

/** Routes a plain click on a help link without a page load; modified clicks keep the browser's own. */
@Service()
export class HelpNavigationService {
  private readonly router = inject(Router);

  /** The address of an article. */
  articleUrl(id: string): string {
    return `/${APP_PATH.Help}/${id}`;
  }

  /** Routes `url` for a plain left click (`event.preventDefault()`); other clicks are left alone. */
  go(event: MouseEvent, url: string): void {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    void this.router.navigateByUrl(url);
  }
}
