import type { CanDeactivateFn } from '@angular/router';

/** What the guard calls on the Ask page (`AskPage.canLeave`). */
interface LeavablePage {
  canLeave(): Promise<boolean>;
}

/**
 * Leaving the Ask page by route asks "Leave this conversation?" first while something is not stored
 * on the server (`AskLeaveGuard`); with nothing unsaved it lets the navigation through at once.
 */
export const askLeaveGuard: CanDeactivateFn<LeavablePage> = (page) => page.canLeave();
