import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { EXPORT_FORMAT } from '@shelfmark/contracts';
import { of, throwError } from 'rxjs';
import { SETTINGS_TEST_STATS } from '../../../../../testing/settings-test-stats.const';
import { axeViolations } from '../../../../../testing/axe';
import {
  buttonWith,
  SETTINGS_TEST_USER,
  setupSettingsPage,
} from '../../../../../testing/settings-page-testbed';
import AccountPage from './account.page';

const setup = (user = SETTINGS_TEST_USER, stats = () => of(SETTINGS_TEST_STATS)) =>
  setupSettingsPage(AccountPage, 'account', { user, stats });

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const found = root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) {
    throw new Error(`No button "${label}"`);
  }
  return found;
}

describe('AccountPage', () => {
  it('shows the account from the session, read-only', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Account');
    expect(root.textContent).toContain('Ada Lovelace');
    expect(root.textContent).toContain('ada@example.com');
    expect(root.querySelector('input')).toBeNull();
  });

  it('groups the page: profile, shelf, connected accounts, your data, delete, sign out', async () => {
    const { root } = await setup();
    const headings = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());

    expect(headings).toEqual([
      'Profile',
      'Your shelf',
      'Connected accounts',
      'Your data',
      'Delete account',
      'Sign out',
    ]);
  });

  it('shows the provider photo, with the initials as the fallback', async () => {
    const { root } = await setup({ ...SETTINGS_TEST_USER, image: '/assets/avatar.png' });
    const image = root.querySelector<HTMLImageElement>('ui-avatar img');

    expect(image?.getAttribute('src')).toBe('/assets/avatar.png');
    expect(image?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('shows the shelf: counts, member since, oldest link, top sites and tags, weeks', async () => {
    const { root } = await setup();
    const text = root.textContent ?? '';

    expect(text).toContain('Member since September 2025');
    expect(
      Array.from(root.querySelectorAll('.shelf__count')).map((c) => [
        c.querySelector('dt')?.textContent?.trim(),
        c.querySelector('dd')?.textContent?.trim(),
      ]),
    ).toEqual([
      ['Links', '1,234'],
      ['Folders', '7'],
      ['Tags', '12'],
    ]);
    expect(text).toContain('Oldest link:');
    expect(Array.from(root.querySelectorAll('.shelf__host')).map((h) => h.textContent)).toEqual([
      'github.com',
      'angular.dev',
    ]);
    expect(root.querySelector('.shelf__site ui-favicon img')?.getAttribute('src')).toBe(
      '/api/links/l1/favicon?v=abc',
    );
    expect(Array.from(root.querySelectorAll('.shelf__tag-name')).map((t) => t.textContent)).toEqual(
      ['angular', 'reading'],
    );
    const weeks = root.querySelectorAll('.shelf__week');
    expect(weeks).toHaveLength(12);
    expect(weeks[11].textContent).toContain('Week of Nov 9: 8');
  });

  it('lists the connected provider with its date', async () => {
    const { root } = await setup();

    expect(root.textContent).toContain('GitHub');
    expect(root.textContent).toContain('Connected Sep 14, 2025');
  });

  it('shows the empty state for an account with no links', async () => {
    const { root } = await setup(SETTINGS_TEST_USER, () =>
      of({ ...SETTINGS_TEST_STATS, linkCount: 0, topSites: [], topTags: [], oldestLinkAt: null }),
    );

    expect(root.textContent).toContain('Nothing saved yet');
    expect(root.querySelector('.shelf__counts')).toBeNull();
  });

  it('says when the numbers fail to load and loads them again', async () => {
    let calls = 0;
    const { root, harness } = await setup(SETTINGS_TEST_USER, () =>
      calls++ === 0 ? throwError(() => new Error('down')) : of(SETTINGS_TEST_STATS),
    );

    expect(root.querySelector('[role="alert"]')?.textContent).toContain(
      "Couldn't load your numbers.",
    );
    buttonWith(root, 'Try again')?.click();
    await harness.fixture.whenStable();

    expect(root.querySelector('.shelf__counts')).not.toBeNull();
  });

  it('exports everything from Your data', async () => {
    const { exportApi, root, harness } = await setup();
    exportApi.download.mockReturnValue(of(undefined));

    button(root, 'Download Bookmarks HTML').click();
    await harness.fixture.whenStable();
    button(root, 'Download JSON').click();
    await harness.fixture.whenStable();

    expect(root.querySelector('#your-data')).not.toBeNull();
    expect(exportApi.download).toHaveBeenNthCalledWith(1, EXPORT_FORMAT.Html, {});
    expect(exportApi.download).toHaveBeenNthCalledWith(2, EXPORT_FORMAT.Json, {});
  });

  it('signs out to the sign-in screen', async () => {
    const { api, store, root, harness } = await setup();

    buttonWith(root, 'Sign out')?.click();
    await harness.fixture.whenStable();

    expect(api.signOut).toHaveBeenCalled();
    expect(store.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('has no welcome tour section: the tour shows once (#315)', async () => {
    const { root } = await setup();

    expect(root.textContent).not.toContain('Welcome tour');
    expect(buttonWith(root, 'Show welcome again')).toBeFalsy();
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
    const { root } = await setup({ ...SETTINGS_TEST_USER, isDemo: true }, () =>
      of({ ...SETTINGS_TEST_STATS, connectedAccounts: [] }),
    );

    expect(root.textContent).not.toContain('Delete account');
    expect(root.textContent).toContain("The demo account isn't linked to Google or GitHub.");
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
