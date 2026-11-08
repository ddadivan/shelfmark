import type { Page } from '@playwright/test';

export interface A11yScreen {
  /** Test title; unique in the matrix. */
  name: string;
  /** Brings the app to the screen (session, navigation, opening dialogs) and waits for it. */
  open: (page: Page) => Promise<void>;
  /** CSS selector that limits the scan, for example an open dialog; the whole page when absent. */
  include?: string;
  /** Runs on the phone project only (`phone`) or on the desktop project only (`desktop`). */
  only?: 'phone' | 'desktop';
  /** axe rule ids turned off for this screen, with the reason documented in the matrix. */
  disabledRules?: readonly string[];
}
