import { computed, Service, signal } from '@angular/core';

/**
 * How many panels of the menu layer (menus, popovers, listboxes, sheets) are open right now.
 * A tooltip hides while any is open and stays away until all are closed, so it never covers
 * the items of a menu (`ConnectedOverlay` reports attach and detach).
 */
@Service()
export class OpenMenus {
  private readonly count = signal(0);
  /** True while at least one menu-layer panel is attached. */
  readonly any = computed(() => this.count() > 0);

  /** Called by `ConnectedOverlay` when a counted panel attaches. */
  opened(): void {
    this.count.update((n) => n + 1);
  }

  /** Called by `ConnectedOverlay` when a counted panel detaches. */
  closed(): void {
    this.count.update((n) => Math.max(0, n - 1));
  }
}
