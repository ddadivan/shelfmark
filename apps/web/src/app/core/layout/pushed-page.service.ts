import { Service, signal } from '@angular/core';

/**
 * A page that is pushed over its tab only in one of its states (the phone Ask page once a
 * conversation runs, Shelf 11-ask): it says so here and the mobile shell hides the top bar and the
 * tab bar as for a pushed URL (`isPushedUrl`). The page clears it when it leaves.
 */
@Service()
export class PushedPage {
  private readonly state = signal(false);
  /** The current page is pushed. */
  readonly active = this.state.asReadonly();

  set(pushed: boolean): void {
    this.state.set(pushed);
  }
}
