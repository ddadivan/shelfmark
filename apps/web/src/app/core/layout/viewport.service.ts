import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, inject, signal, type Signal } from '@angular/core';

/** Same breakpoints as the Sass mixins `phone` and `desktop` (ADR 0015). */
const PHONE_QUERY = '(width < 40em)';
const DESKTOP_QUERY = '(width >= 64em)';

/**
 * The layout breakpoint the viewport is in, for the few places where CSS alone is not enough:
 * what is not shown should not be rendered (and fetch its data), and phone controls use the
 * touch sizes. Without `matchMedia` (tests, server) it assumes a desktop.
 */
@Service()
export class ViewportService {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** Below 40em: the sidebar is a drawer. */
  readonly phone = this.follow(PHONE_QUERY, false);
  /** From 64em: the recent panel has room. */
  readonly desktop = this.follow(DESKTOP_QUERY, true);

  private follow(query: string, fallback: boolean): Signal<boolean> {
    const state = signal(fallback);
    const list = this.document.defaultView?.matchMedia?.(query);
    if (list) {
      state.set(list.matches);
      const onChange = (event: MediaQueryListEvent): void => state.set(event.matches);
      list.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => list.removeEventListener('change', onChange));
    }
    return state.asReadonly();
  }
}
