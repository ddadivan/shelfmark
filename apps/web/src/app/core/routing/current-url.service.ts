import { computed, inject, Service } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { urlPath } from './url-path';

/** The URL of the page on screen as signals, updated when a navigation ends. Root. */
@Service()
export class CurrentUrl {
  private readonly router = inject(Router);

  /** The full URL: path, query string and fragment. */
  readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** The path only, without query string and fragment. */
  readonly path = computed(() => urlPath(this.url()));
}
