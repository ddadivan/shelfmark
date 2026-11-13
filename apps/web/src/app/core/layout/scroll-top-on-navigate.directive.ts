import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { urlPath } from './url-path';

/**
 * Scrolls its host back to the top when the router lands on another page (#352). The app shell
 * scrolls its main column instead of the document, so the router's own scroll restoration (which
 * only moves the window) no longer resets it. A change of the query or fragment alone (sort,
 * filters) keeps the position.
 */
@Directive({ selector: '[appScrollTopOnNavigate]' })
export class ScrollTopOnNavigateDirective {
  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const router = inject(Router);
    let path = urlPath(router.url);
    const subscription = router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const next = urlPath(event.urlAfterRedirects);
        if (next !== path) {
          path = next;
          host.scrollTop = 0;
        }
      });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }
}
