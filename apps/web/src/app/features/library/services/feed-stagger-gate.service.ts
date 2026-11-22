import { Service } from '@angular/core';

/**
 * App-wide: whether the first-load card stagger (#564) has already played in this app load. The
 * library page and its feed service are page-scoped, so the flag lives here; it plays once, on the
 * first list that arrives, and never again until a reload.
 */
@Service()
export class FeedStaggerGate {
  private spent = false;

  /** True the first time only. */
  take(): boolean {
    if (this.spent) {
      return false;
    }
    this.spent = true;
    return true;
  }
}
