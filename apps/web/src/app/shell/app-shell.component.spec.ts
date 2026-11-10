import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '@shelfmark/ui';
import { AUTH_API } from '../core/auth/auth-api.token';
import { ONBOARDING_API } from '../features/onboarding/models/onboarding-api.const';
import { RATING_API } from '../features/rating/models/rating-api.const';
import { AuthStore } from '../core/auth/auth.store';
import { AuthApi } from '../core/auth/models/auth-api.interface';
import type { AuthUser } from '@shelfmark/contracts';
import { APP_LANG } from '../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../core/i18n/app-transloco.loader';
import { translocoConfig } from '../core/i18n/transloco.config';
import { THEME_PREFERENCE } from '../core/theme/models/theme-preference.const';
import { ThemeService } from '../core/theme/theme.service';
import { SearchDialogService } from '../features/search/search-dialog.service';
import AppShellComponent from './app-shell.component';

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
        { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
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
        { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
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
        { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
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
        { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
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
    const listeners = new Map<string, (event: MediaQueryListEvent) => void>();

    async function setup(phone: boolean) {
      listeners.clear();
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: phone && query === PHONE_QUERY,
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
            { path: 'settings', children: [] },
            { path: 'recent', children: [] },
            { path: '', component: AppShellComponent },
          ]),
          provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
          { provide: AUTH_API, useValue: api },
          { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
          { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
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

    const drawer = () => document.querySelector('app-mobile-nav');
    const byLabel = (root: ParentNode, label: string) =>
      root.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

    async function openDrawer(harness: { fixture: ComponentFixture<unknown> }, root: HTMLElement) {
      byLabel(root, 'Open menu')?.click();
      await harness.fixture.whenStable();
    }

    it('shows the sidebar inline and the header add button from the tablet width', async () => {
      const { root } = await setup(false);

      expect(root.querySelector('.shell__sidebar app-sidebar')).not.toBeNull();
      expect(root.querySelector('.shell__add')).not.toBeNull();
      expect(root.querySelector('.shell__fab')).toBeNull();
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

    it('on a phone keeps the header with the menu button, logo and search icon', async () => {
      const { root } = await setup(true);

      expect(root.querySelector('.shell__header ui-search-trigger')).toBeNull();
      expect(root.querySelector('.shell__header ui-logo')).not.toBeNull();
      expect(byLabel(root, 'Open menu')).not.toBeNull();
      expect(byLabel(root, 'Search')).not.toBeNull();
    });

    it('on a phone has the add FAB and no inline sidebar or header add button', async () => {
      const { root } = await setup(true);

      expect(root.querySelector('.shell__sidebar')).toBeNull();
      expect(root.querySelector('.shell__add')).toBeNull();
      expect(root.querySelector('.shell__fab')).not.toBeNull();
      expect(byLabel(root, 'Add link')).not.toBeNull();
    });

    it('opens the drawer from the menu button and holds the one sidebar', async () => {
      const { harness, root } = await setup(true);

      await openDrawer(harness, root);

      expect(drawer()?.closest('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
      expect(drawer()?.querySelectorAll('nav[aria-label="Library"]').length).toBe(1);
      expect(document.querySelectorAll('nav[aria-label="Library"]').length).toBe(1);
      expect(byLabel(root, 'Open menu')?.getAttribute('aria-expanded')).toBe('true');
    });

    it('closes when a navigation ends', async () => {
      const { harness, root } = await setup(true);
      await openDrawer(harness, root);
      expect(drawer()).not.toBeNull();

      await TestBed.inject(Router).navigateByUrl('/settings');
      await harness.fixture.whenStable();

      expect(drawer()).toBeNull();
    });

    it('closes when the current route is tapped again (navigation skipped)', async () => {
      const { harness, root } = await setup(true);
      await openDrawer(harness, root);

      await TestBed.inject(Router).navigateByUrl('/');
      await harness.fixture.whenStable();

      expect(drawer()).toBeNull();
    });

    it('closes when the viewport grows past the phone width', async () => {
      const { harness, root } = await setup(true);
      await openDrawer(harness, root);

      listeners.get(PHONE_QUERY)?.({ matches: false } as MediaQueryListEvent);
      await harness.fixture.whenStable();

      expect(drawer()).toBeNull();
      expect(root.querySelector('.shell__sidebar app-sidebar')).not.toBeNull();
    });

    it('closes with the close button', async () => {
      const { harness, root } = await setup(true);
      await openDrawer(harness, root);

      byLabel(document, 'Close menu')?.click();
      await harness.fixture.whenStable();

      expect(drawer()).toBeNull();
    });

    it('opens the Recently opened page from its drawer row and closes the drawer', async () => {
      const { harness, root } = await setup(true);
      await openDrawer(harness, root);
      const row = Array.from(
        drawer()?.querySelectorAll<HTMLElement>('[role="treeitem"], a, button') ?? [],
      ).find((item) => item.textContent?.includes('Recently opened'));

      row?.click();
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/recent');
      expect(drawer()).toBeNull();
    });

    it('has no footer: settings live in the header account menu', async () => {
      const { harness, root } = await setup(true);
      await openDrawer(harness, root);

      expect(byLabel(document, 'Switch theme')).toBeNull();
      expect(drawer()?.querySelector('ui-avatar')).toBeNull();
      expect(drawer()?.querySelector('[slot="foot"]')).toBeNull();
    });
  });
});

describe('AppShellComponent header styles', () => {
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
        { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
        { provide: RATING_API, useValue: { prompt: vi.fn(), record: vi.fn() } },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    return Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .filter((css) => css.includes('shell__header'))
      .join('\n');
  }

  it('sticks the header to the top on a phone only, between the page and the overlays', async () => {
    const css = await shellStyles();

    expect(css).toMatch(/\(width\s*<\s*40em\)/);
    const phone = css.slice(css.search(/@media[^{]*width\s*<\s*40em[^{]*\{[^}]*shell__header/));
    expect(phone).toMatch(/position:\s*sticky/);
    expect(phone).toMatch(/(inset-block-start|top):\s*0/);
    expect(phone).toMatch(/background:\s*var\(--bg\)/);
    const z = Number(/z-index:\s*(\d+)/.exec(phone)?.[1]);
    expect(z).toBeGreaterThan(2);
    expect(z).toBeLessThan(900);
    expect(css.split('position: sticky').length - 1).toBe(1);
  });

  it('fades a shadow in with the scroll position, CSS only', async () => {
    const css = await shellStyles();

    expect(css).toContain('animation-timeline: scroll(root block)');
    expect(css).toContain('shell-header-shadow');
  });
});
