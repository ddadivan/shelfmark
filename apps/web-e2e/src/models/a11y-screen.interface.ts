import type { Page } from '@playwright/test';
import type { E2eProject } from './e2e-project.type';

export interface A11yScreen {
  /** Test title; unique in the matrix. */
  name: string;
  /** Brings the app to the screen (session, navigation, opening dialogs) and waits for it. */
  open: (page: Page) => Promise<void>;
  /** CSS selector that limits the scan, for example an open dialog; the whole page when absent. */
  include?: string;
  /** axe rule ids turned off for this screen, with the reason documented where it is set. */
  disabledRules?: readonly string[];
  /**
   * Runs on this project only. Set `Desktop` for overlays whose layout is the same on a phone;
   * a screen that is laid out differently on a phone runs on both.
   */
  only?: E2eProject;
}
