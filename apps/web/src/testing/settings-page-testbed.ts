import type { Type } from '@angular/core';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { AuthUser } from '@shelfmark/contracts';
import { AUTH_API } from '../app/core/auth/auth-api.token';
import { AuthStore } from '../app/core/auth/auth.store';
import type { AuthApi } from '../app/core/auth/models/auth-api.interface';
import { ViewportService } from '../app/core/layout/viewport.service';
import { CUSTOM_THEME_STORAGE_KEY } from '../app/core/theme/models/custom-theme-storage-key.const';
import { MOTION_STORAGE_KEY } from '../app/core/theme/models/motion-storage-key.const';
import { LAYOUT_STORAGE_KEY } from '../app/core/theme/models/layout-storage-key.const';
import { THEME_STORAGE_KEY } from '../app/core/theme/models/theme-storage-key.const';
import { ThemeService } from '../app/core/theme/theme.service';
import { ACCOUNT_DELETION_API } from '../app/features/account-deletion/models/account-deletion-api.const';
import { EXPORT_API } from '../app/features/export/models/export-api.const';
import { ONBOARDING_API } from '../app/features/onboarding/models/onboarding-api.const';
import { loadEnglish, provideTranslocoForTest } from '../app/testing/transloco-testing';

export const SETTINGS_TEST_USER: AuthUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

interface SetupOptions {
  user?: AuthUser;
  phone?: boolean;
}

/** Renders one settings page at `/settings/<path>` with the real translations and mock APIs. */
export async function setupSettingsPage(
  component: Type<unknown>,
  path: string,
  { user = SETTINGS_TEST_USER, phone = false }: SetupOptions = {},
) {
  // No appearance from an earlier spec: the settings load would keep and save it (#273).
  for (const key of [
    THEME_STORAGE_KEY,
    CUSTOM_THEME_STORAGE_KEY,
    MOTION_STORAGE_KEY,
    LAYOUT_STORAGE_KEY,
  ]) {
    localStorage.removeItem(key);
  }
  const onboardingApi = { complete: vi.fn(), reset: vi.fn(() => Promise.resolve()) };
  const exportApi = { download: vi.fn() };
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
        { path: 'privacy', children: [] },
        { path: 'settings', children: [] },
        { path: `settings/${path}`, component },
      ]),
      provideTranslocoForTest(),
      { provide: AUTH_API, useValue: api },
      { provide: ONBOARDING_API, useValue: onboardingApi },
      { provide: ACCOUNT_DELETION_API, useValue: { delete: vi.fn() } },
      { provide: EXPORT_API, useValue: exportApi },
      { provide: ViewportService, useValue: { phone: signal(phone), desktop: signal(!phone) } },
    ],
  });
  await loadEnglish();
  const store = TestBed.inject(AuthStore);
  await store.ensureLoaded();
  const theme = TestBed.inject(ThemeService);
  const harness = await RouterTestingHarness.create(`/settings/${path}`);
  return {
    api,
    exportApi,
    onboardingApi,
    store,
    theme,
    harness,
    root: harness.routeNativeElement as HTMLElement,
  };
}

/** The button whose text contains `text`. */
export function buttonWith(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(text));
}
