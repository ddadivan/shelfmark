import { computed, inject, type Signal } from '@angular/core';
import { AuthStore } from '../../core/auth/auth.store';

/**
 * Whether the landing is shown to a signed-in person (`/about`, #270): sign-in buttons become
 * "Back to my shelf" and the demo button hides. A guest at `/` or `/about` sees the public page.
 */
export function injectSignedIn(): Signal<boolean> {
  const auth = inject(AuthStore);
  return computed(() => auth.user() !== null);
}
