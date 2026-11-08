import { expect, type Page } from '@playwright/test';
import { LANDING_HEADLINE } from '../models/landing-headline.const';

/**
 * Opens the landing and waits until the sections below the hero are rendered: they are deferred
 * (idle, then staggered timers up to the footer at 450 ms), so the last section (finale) and the
 * footer (`contentinfo`) appear after the first paint; the default expect timeout covers that.
 * Measure or scan only after this.
 */
export async function gotoLandingLoaded(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: LANDING_HEADLINE })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Empty your Saved Messages.' }),
  ).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
}
