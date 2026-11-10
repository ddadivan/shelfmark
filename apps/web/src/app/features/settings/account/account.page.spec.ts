import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { axeViolations } from '../../../../testing/axe';
import {
  buttonWith,
  SETTINGS_TEST_USER,
  setupSettingsPage,
} from '../../../../testing/settings-page-testbed';
import AccountPage from './account.page';

const setup = (user = SETTINGS_TEST_USER) => setupSettingsPage(AccountPage, 'account', { user });

describe('AccountPage', () => {
  it('shows the account from the session, read-only', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Account');
    expect(root.textContent).toContain('Ada Lovelace');
    expect(root.textContent).toContain('ada@example.com');
    expect(root.querySelector('input')).toBeNull();
  });

  it('groups the page: profile, sign out, welcome tour and the danger section', async () => {
    const { root } = await setup();
    const headings = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());

    expect(headings).toEqual(['Profile', 'Sign out', 'Welcome tour', 'Delete account']);
    expect(root.textContent?.match(/Welcome tour/g)).toHaveLength(1);
  });

  it('signs out to the sign-in screen', async () => {
    const { api, store, root, harness } = await setup();

    buttonWith(root, 'Sign out')?.click();
    await harness.fixture.whenStable();

    expect(api.signOut).toHaveBeenCalled();
    expect(store.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('resets the welcome tour, one request at a time', async () => {
    const { onboardingApi, store, root, harness } = await setup();
    const button = buttonWith(root, 'Show welcome again');

    expect(root.textContent).toContain('See the 3-step introduction again');
    button?.click();
    button?.click();
    await harness.fixture.whenStable();

    expect(onboardingApi.reset).toHaveBeenCalledTimes(1);
    expect(store.user()?.onboardingCompletedAt).toBeNull();
    expect(button?.disabled).toBe(false);
  });

  it('offers "Delete account" in a danger section and opens the confirmation', async () => {
    const { root, harness } = await setup();

    expect(root.querySelector('ui-settings-section[danger] .ui-button--danger')).not.toBeNull();
    buttonWith(root, 'Delete account')?.click();
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    });
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.replaceChildren());
  });

  it('hides "Delete account" for a demo user (the sandbox expires by itself)', async () => {
    const { root } = await setup({ ...SETTINGS_TEST_USER, isDemo: true });

    expect(root.textContent).not.toContain('Delete account');
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
