import type { Page } from '@playwright/test';
import type { PromoDirector } from '../support/promo-director';

/** What a step gets: the page, whether it runs on the phone, and the pacing helpers. */
export interface PromoContext {
  readonly page: Page;
  readonly phone: boolean;
  readonly director: PromoDirector;
}
