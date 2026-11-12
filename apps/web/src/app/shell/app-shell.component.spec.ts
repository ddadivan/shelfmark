import { LIBRARY_SETTINGS_DEFAULT } from '@shelfmark/contracts';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { NEVER, firstValueFrom, of } from 'rxjs';
import { MOCK_APPEARANCE_DEFAULTS } from '@shelfmark/contracts/testing';
import type { UpdateUserSettingsRequest } from '@shelfmark/contracts';
import { USER_SETTINGS_API } from '../features/settings/models/user-settings-api.const';
import { ToastService } from '@shelfmark/ui';
import { AUTH_API } from '../core/auth/auth-api.token';
import { ONBOARDING_API } from '../features/onboarding/models/onboarding-api.const';
import { ADMIN_API } from '../features/admin/models/admin-api.const';
import { adminApiStub } from '../../testing/admin-api-stub';
import { RATING_API } from '../features/rating/models/rating-api.const';
import { AuthStore } from '../core/auth/auth.store';
import { AuthApi } from '../core/auth/models/auth-api.interface';
import type { AuthUser } from '@shelfmark/contracts';
import { APP_LANG } from '../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../core/i18n/app-transloco.loader';
import { translocoConfig } from '../core/i18n/transloco.config';
import { THEME_PREFERENCE } from '@shelfmark/contracts';
import { ThemeService } from '../core/theme/theme.service';
import { LinkActionsService } from '../features/links/services/link-actions.service';
import { SearchDialogService } from '../features/search/services/search-dialog.service';
import { ShortcutsDialogService } from '../features/shortcuts/shortcuts-dialog.service';
import AppShellComponent from './app-shell.component';

/** The account settings never load here; a change is saved and answered as sent. */
const settingsApi = {
  get: () => NEVER,
  update: (request: UpdateUserSettingsRequest) =>
    of({
      trashRetentionDays: 30 as const,
      folderColours: true,
      pauseHistory: false,
      ...MOCK_APPEARANCE_DEFAULTS,
      ...LIBRARY_SETTINGS_DEFAULT,
      ...request,
    }),
};

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

function menuItem(label: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) =>
    item.textContent?.includes(label),
  );
}

async function openAccountMenu(
  fixture: ComponentFixture<unknown>,
  root: HTMLElement,
): Promise<void> {
  root.querySelector<HTMLButtonElement>('button[aria-label="Account menu"]')?.click();
  await fixture.whenStable();
}

describe('AppShellComponent', () => {
  it('shows the user and signs out to the sign-in screen', async () => {
    const api: AuthApi = {
      getSession: () => Promise.resolve(USER),
      signIn: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'sign-in', children: [] },
          { path: 'settings', children: [] },
          { path: '', component: AppShellComponent },
        ]),
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        { provide: AUTH_API, useValue: api },
        { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
        { provide: USER_SETTINGS_API, useValue: settingsApi },
        { provide: ADMIN_API, useValue: adminApiStub() },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    const store = TestBed.inject(AuthStore);
    await store.ensureLoaded();
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement as HTMLElement;

    // The account button is the avatar; the name is no longer printed in the bar.
    expect(root.querySelector('button[aria-label="Account menu"] ui-avatar')).not.toBeNull();
    expect(root.querySelector('.shell__header')?.textContent).not.toContain('Ada Lovelace');
    await openAccountMenu(harness.fixture, root);
    // The welcome tour shows once; the menu has no way to bring it back (#315).
    expect(menuItem('Settings')).toBeDefined();
    expect(menuItem('Show welcome again')).toBeUndefined();
    menuItem('Sign out')?.click();
    await harness.fixture.whenStable();

    expect(api.signOut).toHaveBeenCalled();
    expect(store.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('opens settings from the account menu', async () => {
    const api: AuthApi = {
      getSession: () => Promise.resolve(USER),
      signIn: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(() => Promise.resolve()),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'settings', children: [] },
          { path: '', component: AppShellComponent },
        ]),
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        { provide: AUTH_API, useValue: api },
        { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
        { provide: USER_SETTINGS_API, useValue: settingsApi },
        { provide: ADMIN_API, useValue: adminApiStub() },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    const harness = await RouterTestingHarness.create('/');

    await openAccountMenu(harness.fixture, harness.routeNativeElement as HTMLElement);
    menuItem('Settings')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/settings');
  });

  it('opens the search from the header pill and from Cmd+K', async () => {
    const api: AuthApi = {
      getSession: () => Promise.resolve(USER),
      signIn: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(() => Promise.resolve()),
    };
    const search = {
      open: vi.fn(),
      handleShortcut: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: AppShellComponent }]),
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        { provide: AUTH_API, useValue: api },
        { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
        { provide: ADMIN_API, useValue: adminApiStub() },
        { provide: SearchDialogService, useValue: search },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    const harness = await RouterTestingHarness.create('/');

    (harness.routeNativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('ui-search-trigger button')
      ?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true }));

    expect(search.open).toHaveBeenCalledTimes(1);
    expect(search.handleShortcut).toHaveBeenCalledTimes(1);
  });

  it('opens the shortcuts from the top bar button and from the ? key', async () => {
    const api: AuthApi = {
      getSession: () => Promise.resolve(USER),
      signIn: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(() => Promise.resolve()),
    };
    const shortcuts = { open: vi.fn(), handleShortcut: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: AppShellComponent }]),
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        { provide: AUTH_API, useValue: api },
        { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
        { provide: ADMIN_API, useValue: adminApiStub() },
        { provide: ShortcutsDialogService, useValue: shortcuts },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    const harness = await RouterTestingHarness.create('/');
    const button = (harness.routeNativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Keyboard shortcuts"]',
    );

    button?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true }));

    expect(button?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(shortcuts.open).toHaveBeenCalledTimes(1);
    expect(shortcuts.handleShortcut).toHaveBeenCalledTimes(1);
  });

  it('hands the toast shortcut to the toasts and leaves the search alone', async () => {
    const api: AuthApi = {
      getSession: () => Promise.resolve(USER),
      signIn: vi.fn(),
      signInDemo: vi.fn(),
      signOut: vi.fn(() => Promise.resolve()),
    };
    const search = { open: vi.fn(), handleShortcut: vi.fn() };
    const toasts = { handleShortcut: vi.fn(() => true) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: AppShellComponent }]),
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        { provide: AUTH_API, useValue: api },
        { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
        { provide: ADMIN_API, useValue: adminApiStub() },
        { provide: SearchDialogService, useValue: search },
        { provide: ToastService, useValue: toasts },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    await RouterTestingHarness.create('/');

    document.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyT', altKey: true, shiftKey: true }),
    );

    expect(toasts.handleShortcut).toHaveBeenCalledTimes(1);
    expect(search.handleShortcut).not.toHaveBeenCalled();
  });

  describe('layout by width', () => {
    const PHONE_QUERY = '(width < 40em)';
    const COMPACT_QUERY = '(width < 64em)';
    const listeners = new Map<string, (event: MediaQueryListEvent) => void>();

    /** `phone`: below 40em (and so below 64em); `tablet`: 40em to 64em, the mobile shell too. */
    async function setup(phone: boolean, tablet = false) {
      listeners.clear();
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: (phone && query === PHONE_QUERY) || ((phone || tablet) && query === COMPACT_QUERY),
        addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
          listeners.set(query, listener),
        removeEventListener: () => listeners.delete(query),
      }));
      const api: AuthApi = {
        getSession: () => Promise.resolve(USER),
        signIn: vi.fn(),
        signInDemo: vi.fn(),
        signOut: vi.fn(() => Promise.resolve()),
      };
      TestBed.configureTestingModule({
        providers: [
          provideRouter([
            {
              path: '',
              component: AppShellComponent,
              children: [
                { path: 'settings', children: [{ path: 'account', children: [] }] },
                { path: 'recent', children: [] },
                { path: 'tags', children: [] },
              ],
            },
          ]),
          provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
          { provide: AUTH_API, useValue: api },
          { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
          { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
          { provide: USER_SETTINGS_API, useValue: settingsApi },
          { provide: ADMIN_API, useValue: adminApiStub() },
        ],
      });
      await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
      await TestBed.inject(AuthStore).ensureLoaded();
      const harness = await RouterTestingHarness.create('/');
      const root = harness.routeNativeElement as HTMLElement;
      return { harness, root };
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const byLabel = (root: ParentNode, label: string) =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

    it('shows the sidebar inline and the header add button from the tablet width', async () => {
      const { root } = await setup(false);

      expect(root.querySelector('.shell__sidebar app-sidebar')).not.toBeNull();
      expect(root.querySelector('.shell__add')).not.toBeNull();
      expect(root.querySelector('.shell__fab')).toBeNull();
    });

    it('swaps the sidebar for the settings nav on the settings pages and back', async () => {
      const { harness, root } = await setup(false);
      const router = TestBed.inject(Router);

      await router.navigateByUrl('/settings/account');
      await harness.fixture.whenStable();

      expect(root.querySelector('.shell__sidebar app-settings-nav')).not.toBeNull();
      expect(root.querySelector('.shell__sidebar app-sidebar')).toBeNull();

      await router.navigateByUrl('/recent');
      await harness.fixture.whenStable();

      expect(root.querySelector('.shell__sidebar app-settings-nav')).toBeNull();
      expect(root.querySelector('.shell__sidebar app-sidebar')).not.toBeNull();
    });

    it('puts the logo in the sidebar card and the pill, theme switch and Add link in the top bar', async () => {
      const { root } = await setup(false);

      expect(root.querySelector('.shell__sidebar .sidebar__logo ui-logo')).not.toBeNull();
      expect(root.querySelector('.shell__header ui-logo')).toBeNull();
      const pill = root.querySelector('.shell__header ui-search-trigger button');
      expect(pill?.textContent).toContain('Search your links');
      expect(byLabel(root, 'Search')).toBeNull();
      expect(
        byLabel(root, 'Switch to dark theme') ?? byLabel(root, 'Switch to light theme'),
      ).not.toBeNull();
      // "Add link" is the only primary button of the bar.
      expect(root.querySelectorAll('.shell__header .ui-button--primary')).toHaveLength(1);
    });

    it('switches the theme from the top bar', async () => {
      const { harness, root } = await setup(false);
      const theme = TestBed.inject(ThemeService);
      theme.setPreference(THEME_PREFERENCE.Light);
      await harness.fixture.whenStable();

      byLabel(root, 'Switch to dark theme')?.click();
      await harness.fixture.whenStable();

      expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
      expect(byLabel(root, 'Switch to light theme')).not.toBeNull();
    });

    const bar = (root: ParentNode) => root.querySelector('ui-tab-bar');
    const tab = (root: ParentNode, name: string) =>
      Array.from(root.querySelectorAll<HTMLElement>('ui-tab-bar a, ui-tab-bar button')).find(
        (item) => item.textContent?.trim() === name,
      );

    it('on a phone has the tab bar and no header, sidebar, menu button or FAB', async () => {
      const { root } = await setup(true);

      expect(bar(root)?.querySelector('nav[aria-label="Main"]')).not.toBeNull();
      expect(root.querySelector('.shell__header')).toBeNull();
      expect(root.querySelector('.shell__sidebar')).toBeNull();
      expect(byLabel(root, 'Open menu')).toBeNull();
      expect(root.querySelector('.shell__fab')).toBeNull();
      expect(
        Array.from(root.querySelectorAll('ui-tab-bar li')).map((item) => item.textContent?.trim()),
      ).toEqual(['Library', 'Search', '', 'Tags', 'You']);
      expect(byLabel(root, 'Add link')).not.toBeNull();
    });

    it('has no tab bar from the desktop width (64em)', async () => {
      const { root } = await setup(false);

      expect(bar(root)).toBeNull();
      expect(root.querySelector('.shell__sidebar')).not.toBeNull();
    });

    it('keeps the mobile shell on a tablet below 64em: tab bar, no sidebar or header (#316)', async () => {
      const { root } = await setup(false, true);

      expect(bar(root)?.querySelector('nav[aria-label="Main"]')).not.toBeNull();
      expect(root.querySelector('.shell__sidebar')).toBeNull();
      expect(root.querySelector('.shell__header')).toBeNull();
    });

    it('marks the tab of the current route with aria-current', async () => {
      const { harness, root } = await setup(true);
      expect(tab(root, 'Library')?.getAttribute('aria-current')).toBe('page');

      await TestBed.inject(Router).navigateByUrl('/settings');
      await harness.fixture.whenStable();

      expect(tab(root, 'You')?.getAttribute('aria-current')).toBe('page');
      expect(tab(root, 'Library')?.hasAttribute('aria-current')).toBe(false);
    });

    it('routes the Tags and You tabs and keeps real hrefs', async () => {
      const { harness, root } = await setup(true);

      expect(tab(root, 'Tags')?.getAttribute('href')).toBe('/tags');
      tab(root, 'Tags')?.click();
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/tags');

      tab(root, 'You')?.click();
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/settings');
    });

    it('opens the search from the Search tab without leaving the page', async () => {
      const { harness, root } = await setup(true);
      const open = vi
        .spyOn(TestBed.inject(SearchDialogService), 'open')
        .mockImplementation(() => undefined);

      tab(root, 'Search')?.click();
      await harness.fixture.whenStable();

      expect(open).toHaveBeenCalled();
      expect(TestBed.inject(Router).url).toBe('/');
    });

    it('opens the add-link flow from the middle button', async () => {
      const { root } = await setup(true);
      const add = vi.spyOn(TestBed.inject(LinkActionsService), 'addLink').mockResolvedValue();

      byLabel(root, 'Add link')?.click();

      expect(add).toHaveBeenCalled();
    });
  });
});

describe('AppShellComponent styles', () => {
  /** The shell's component stylesheet as the browser got it (jsdom keeps the media text). */
  async function shellStyles(): Promise<string> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '', component: AppShellComponent }]),
        provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
        {
          provide: AUTH_API,
          useValue: {
            getSession: () => Promise.resolve(USER),
            signIn: vi.fn(),
            signInDemo: vi.fn(),
            signOut: vi.fn(),
          },
        },
        { provide: ONBOARDING_API, useValue: { complete: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
        { provide: USER_SETTINGS_API, useValue: settingsApi },
        { provide: ADMIN_API, useValue: adminApiStub() },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    return Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .filter((css) => css.includes('shell__main'))
      .join('\n');
  }

  it('leaves 110px under the page in the mobile shell (below 64em) for the floating tab bar', async () => {
    const css = await shellStyles();

    expect(css).toMatch(
      /\(width\s*<\s*64em\)[^{]*\{[^}]*shell__main[^}]*padding-block-end:\s*calc\(6\.875rem/,
    );
    expect(css).not.toContain('position: sticky');
  });
});
