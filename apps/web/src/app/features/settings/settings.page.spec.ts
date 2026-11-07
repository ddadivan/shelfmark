import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../../core/auth/auth-api.token';
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
};

async function setup() {
  localStorage.removeItem(THEME_STORAGE_KEY);
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
        { path: 'links', children: [] },
        { path: 'settings', component: SettingsPage },
      ]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: api },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const store = TestBed.inject(AuthStore);
  await store.ensureLoaded();
  const theme = TestBed.inject(ThemeService);
  const harness = await RouterTestingHarness.create('/settings');
  return { api, store, theme, harness, root: harness.routeNativeElement as HTMLElement };
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
