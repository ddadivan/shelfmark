import { inject, Service } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { defer, EMPTY, Observable, switchMap } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

/**
 * Preloads lazy routes only for a signed-in user. A guest on the landing or the sign-in screen
 * never preloads (it competes with the first paint, and a guest rarely needs the app chunks);
 * after sign-in the next navigation preloads the rest. Waits for the one session request the
 * guards already make, so it adds no request of its own.
 */
@Service()
export class SignedInPreloadingStrategy implements PreloadingStrategy {
  private readonly auth = inject(AuthStore);

  preload(_route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return defer(() => this.auth.ensureLoaded()).pipe(
      switchMap(() => (this.auth.isSignedIn() ? load() : EMPTY)),
    );
  }
}
