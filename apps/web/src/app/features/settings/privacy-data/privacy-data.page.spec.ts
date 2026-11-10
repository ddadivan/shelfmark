import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { axeViolations } from '../../../../testing/axe';
import { setupSettingsPage } from '../../../../testing/settings-page-testbed';
import PrivacyDataPage from './privacy-data.page';

const setup = () => setupSettingsPage(PrivacyDataPage, 'privacy');

describe('PrivacyDataPage', () => {
  it('links the privacy policy and the export, and states what is kept', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Privacy and data');
    expect(root.querySelector('a[href="/privacy"]')?.getAttribute('aria-label')).toBe(
      'Read the privacy policy',
    );
    expect(root.querySelector('a[href="/settings/import-export"]')).not.toBeNull();
    expect(root.textContent).toContain("We don't sell or share your data");
  });

  it('opens the policy in the app, without a page load', async () => {
    const { root, harness } = await setup();

    root.querySelector<HTMLElement>('a[href="/privacy"]')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/privacy');
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
