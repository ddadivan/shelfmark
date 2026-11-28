import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { WEEK_START } from '@shelfmark/contracts';
import { NEVER, of, throwError } from 'rxjs';
import { SETTINGS_TEST_STATS } from '../../../../../testing/settings-test-stats.const';
import { axeViolations } from '../../../../../testing/axe';
import {
  buttonWith,
  SETTINGS_TEST_USER,
  setupSettingsPage,
} from '../../../../../testing/settings-page-testbed';
import { STORAGE_KEY } from '../../../../core/storage/models/storage-key.const';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { ACCOUNT_DELETION_API } from '../../../account-deletion/models/account-deletion-api.const';
import AccountPage from './account.page';

const setup = (user = SETTINGS_TEST_USER, stats = () => of(SETTINGS_TEST_STATS)) =>
  setupSettingsPage(AccountPage, 'account', { user, stats });

describe('AccountPage', () => {
  beforeEach(() => localStorage.removeItem(STORAGE_KEY.ConnectedAccounts));
  afterAll(() => localStorage.removeItem(STORAGE_KEY.ConnectedAccounts));

  describe('the connected accounts while the stats load', () => {
    const slots = (root: HTMLElement) => ({
      rows: root.querySelectorAll('.account__sk-row').length,
      none: root.querySelectorAll('.account__sk-line').length,
    });

    it('holds one row for a real account without a last visit', async () => {
      const { root } = await setup(SETTINGS_TEST_USER, () => NEVER);
      expect(slots(root)).toEqual({ rows: 1, none: 0 });
    });

    it('holds the line of "none" for the demo, which has no linked account', async () => {
      const { root } = await setup({ ...SETTINGS_TEST_USER, isDemo: true }, () => NEVER);
      expect(slots(root)).toEqual({ rows: 0, none: 1 });
    });

    it('follows the count of the last visit', async () => {
      localStorage.setItem(STORAGE_KEY.ConnectedAccounts, '2');
      expect(slots((await setup(SETTINGS_TEST_USER, () => NEVER)).root)).toEqual({
        rows: 2,
        none: 0,
      });
      TestBed.resetTestingModule();
      localStorage.setItem(STORAGE_KEY.ConnectedAccounts, '0');
      expect(slots((await setup(SETTINGS_TEST_USER, () => NEVER)).root)).toEqual({
        rows: 0,
        none: 1,
      });
    });

    it('keeps the count of the accounts it listed for the next visit', async () => {
      await setup(SETTINGS_TEST_USER, () => of({ ...SETTINGS_TEST_STATS, connectedAccounts: [] }));
      expect(localStorage.getItem(STORAGE_KEY.ConnectedAccounts)).toBe('0');
    });
  });

  it('draws the shelf while the stats load: three counts, two lists of five, twelve weeks', async () => {
    const { root } = await setup(SETTINGS_TEST_USER, () => NEVER);
    const loading = root.querySelector('.shelf__loading');

    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.querySelectorAll('.shelf__count')).toHaveLength(3);
    expect(loading?.querySelectorAll('.shelf__site')).toHaveLength(10);
    expect(loading?.querySelectorAll('.shelf__week')).toHaveLength(12);
  });

  it('shows the account from the session, read-only', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Account');
    expect(root.textContent).toContain('Ada Lovelace');
    expect(root.textContent).toContain('ada@example.com');
    expect(root.querySelector('input')).toBeNull();
  });

  it('groups the page: profile, shelf, connected accounts, sign out, delete', async () => {
    const { root } = await setup();
    const headings = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());

    expect(headings).toEqual([
      'Profile',
      'Your shelf',
      'Connected accounts',
      'Sign out',
      'Delete account',
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

  it('shows the empty state for an account with no links, free of axe violations', async () => {
    const { root } = await setup(SETTINGS_TEST_USER, () =>
      of({ ...SETTINGS_TEST_STATS, linkCount: 0, topSites: [], topTags: [], oldestLinkAt: null }),
    );

    expect(root.textContent).toContain('Nothing saved yet');
    expect(root.querySelector('.shelf__counts')).toBeNull();
    expect(await axeViolations(root)).toEqual([]);
  });

  it("asks for weeks that start on the user's first day and asks again when it changes", async () => {
    const { meStatsApi, harness } = await setup();
    const locale = TestBed.inject(LocaleService);

    expect(meStatsApi.get).toHaveBeenLastCalledWith({ firstDay: locale.firstDay() });
    locale.apply({ ...locale.settings(), weekStart: WEEK_START.Sunday });
    await harness.fixture.whenStable();
    expect(meStatsApi.get).toHaveBeenLastCalledWith({ firstDay: 7 });
    locale.apply({ ...locale.settings(), weekStart: WEEK_START.Monday });
    await harness.fixture.whenStable();
    expect(meStatsApi.get).toHaveBeenLastCalledWith({ firstDay: 1 });
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

  it('leaves export to Settings › Your data (Shelf)', async () => {
    const { root } = await setup();

    expect(root.querySelector('#your-data')).toBeNull();
    expect(buttonWith(root, 'Download')).toBeFalsy();
  });

  it('leaves Import and Recent imports to the data menu and the import dialog (#387)', async () => {
    const { root } = await setup();

    expect(root.textContent).not.toContain('Bring in browser bookmarks.');
    expect(buttonWith(root, 'Import')).toBeFalsy();
    expect(root.querySelector('app-recent-imports')).toBeNull();
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

  it('shows only the deletion notice while a deletion is scheduled, and keeps the account', async () => {
    const api = {
      delete: vi.fn(),
      status: vi.fn(() => Promise.resolve({ deletionScheduledAt: '2026-11-30T10:00:00.000Z' })),
      cancel: vi.fn(() => Promise.resolve({ deletionScheduledAt: null })),
    };
    TestBed.overrideProvider(ACCOUNT_DELETION_API, { useValue: api });
    const { root, harness } = await setup();
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Your account will be deleted on');
    });
    expect(root.querySelectorAll('ui-settings-section')).toHaveLength(0);
    expect(await axeViolations(root)).toEqual([]);

    buttonWith(root, 'Keep my account')?.click();
    await harness.fixture.whenStable();
    await vi.waitFor(() => {
      expect(root.textContent).not.toContain('Your account will be deleted on');
    });
    expect(api.cancel).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain('Delete account');
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    expect(await axeViolations(root)).toEqual([]);
  });
});
