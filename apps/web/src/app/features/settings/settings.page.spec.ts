import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { ACCOUNT_DELETION_API } from '../account-deletion/models/account-deletion-api.const';
import { ONBOARDING_API } from '../onboarding/models/onboarding-api.const';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthApi } from '../../core/auth/models/auth-api.interface';
import type { AuthUser } from '@shelfmark/contracts';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { THEME_PREFERENCE } from '../../core/theme/models/theme-preference.const';
import { THEME_STORAGE_KEY } from '../../core/theme/models/theme-storage-key.const';
import { ThemeService } from '../../core/theme/theme.service';
import SettingsPage from './settings.page';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

async function setup(user: AuthUser = USER) {
  localStorage.removeItem(THEME_STORAGE_KEY);
  const onboardingApi = { complete: vi.fn(), reset: vi.fn(() => Promise.resolve()) };
  const api: AuthApi = {
    getSession: () => Promise.resolve(user),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'sign-in', children: [] },
        { path: 'links', children: [] },
        { path: 'settings', component: SettingsPage },
      ]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: api },
      { provide: ONBOARDING_API, useValue: onboardingApi },
      { provide: ACCOUNT_DELETION_API, useValue: { delete: vi.fn() } },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const store = TestBed.inject(AuthStore);
  await store.ensureLoaded();
  const theme = TestBed.inject(ThemeService);
  const harness = await RouterTestingHarness.create('/settings');
  return {
    api,
    onboardingApi,
    store,
    theme,
    harness,
    root: harness.routeNativeElement as HTMLElement,
  };
}

function radio(root: HTMLElement, label: string): HTMLInputElement {
  const found = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
    (input) => input.closest('label')?.textContent?.includes(label),
  );
  if (!found) {
    throw new Error(`No radio "${label}"`);
  }
  return found;
}

describe('SettingsPage', () => {
  afterEach(() => localStorage.removeItem(THEME_STORAGE_KEY));

  it('shows the account from the session, read-only', async () => {
    const { root } = await setup();

    expect(root.querySelector('h1')?.textContent).toContain('Settings');
    expect(root.textContent).toContain('Ada Lovelace');
    expect(root.textContent).toContain('ada@example.com');
    expect(root.querySelector('input[type="text"], input[type="email"]')).toBeNull();
  });

  it('groups the page as designed: sections, language, tour once, privacy and version', async () => {
    const { root } = await setup();
    const headings = Array.from(root.querySelectorAll('h2')).map((h) => h.textContent?.trim());

    expect(headings).toEqual([
      'Account',
      'Your data',
      'Appearance',
      'Welcome tour',
      'Delete account',
    ]);
    expect(root.textContent?.match(/Welcome tour/g)).toHaveLength(1);
    expect(root.textContent).toContain('Export your data');
    expect(root.textContent).toContain('More languages are coming');
    expect(root.textContent).toContain('English');
    expect(root.querySelector('a[href="/privacy"]')?.textContent).toContain('Privacy policy');
    expect(root.textContent).toContain('Shelfmark v1.0');
  });

  it('applies and persists the theme choice, and shows the current one', async () => {
    const { root, theme, harness } = await setup();

    expect(radio(root, 'System').checked).toBe(true);

    radio(root, 'Dark').click();
    await harness.fixture.whenStable();

    expect(theme.preference()).toBe(THEME_PREFERENCE.Dark);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_PREFERENCE.Dark);
    expect(radio(root, 'Dark').checked).toBe(true);
  });

  it('signs out to the sign-in screen', async () => {
    const { api, store, root, harness } = await setup();
    const signOut = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign out'),
    );

    signOut?.click();
    await harness.fixture.whenStable();

    expect(api.signOut).toHaveBeenCalled();
    expect(store.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });

  it('resets the welcome tour from its own section, one request at a time', async () => {
    const { onboardingApi, store, root, harness } = await setup();
    const button = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Show welcome again'),
    );

    expect(root.textContent).toContain('Welcome tour');
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
    const button = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Delete account'),
    );

    expect(root.querySelector('ui-settings-section .ui-button--danger')).not.toBeNull();
    button?.click();
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    });
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.replaceChildren());
  });

  it('hides "Delete account" for a demo user (the sandbox expires by itself)', async () => {
    const { root } = await setup({ ...USER, isDemo: true });

    expect(root.textContent).not.toContain('Delete account');
  });

  it('goes back to the links', async () => {
    const { root, harness } = await setup();

    root.querySelector<HTMLElement>('a')?.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/links');
  });

  it('has no axe violations', async () => {
    const { root } = await setup();

    // Colour contrast is off (no layout in jsdom).
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
