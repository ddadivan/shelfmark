import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../testing/axe';
import { AUTH_API } from '../../../core/auth/auth-api.token';
import { AuthStore } from '../../../core/auth/auth.store';
import { ViewportService } from '../../../core/layout/viewport.service';
import { THEME_STORAGE_KEY } from '../../../core/theme/models/theme-storage-key.const';
import { ACCOUNT_DELETION_API } from '../../account-deletion/models/account-deletion-api.const';
import { ONBOARDING_API } from '../../onboarding/models/onboarding-api.const';
import { SETTINGS_TEST_USER } from '../../../../testing/settings-page-testbed';
import { loadEnglish, provideTranslocoForTest } from '../../../testing/transloco-testing';
import settingsRoutes from '../settings.routes';

async function setup(phone: boolean) {
  localStorage.removeItem(THEME_STORAGE_KEY);
  const phoneSignal = signal(phone);
  const api = {
    getSession: () => Promise.resolve(SETTINGS_TEST_USER),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'sign-in', children: [] },
        { path: 'privacy', children: [] },
        { path: 'settings', children: settingsRoutes },
      ]),
      provideTranslocoForTest(),
      { provide: AUTH_API, useValue: api },
      { provide: ONBOARDING_API, useValue: { complete: vi.fn(), reset: vi.fn() } },
      { provide: ACCOUNT_DELETION_API, useValue: { delete: vi.fn() } },
      { provide: ViewportService, useValue: { phone: phoneSignal } },
    ],
  });
  await loadEnglish();
  await TestBed.inject(AuthStore).ensureLoaded();
  const harness = await RouterTestingHarness.create('/settings');
  return { api, harness, phoneSignal, router: TestBed.inject(Router) };
}

describe('the You list (/settings)', () => {
  afterEach(() => localStorage.removeItem(THEME_STORAGE_KEY));

  it('on a phone lists the account, the sections that touch a phone, help and Sign out', async () => {
    const { harness, router } = await setup(true);
    const root = harness.routeNativeElement as HTMLElement;

    expect(router.url).toBe('/settings');
    expect(root.querySelector('h1')?.textContent).toBe('You');
    expect(root.querySelector('a[href="/settings/account"]')?.textContent).toContain(
      'Ada Lovelace',
    );
    expect(Array.from(root.querySelectorAll('nav a')).map((a) => a.getAttribute('href'))).toEqual([
      '/settings/appearance',
      '/settings/library',
      '/settings/import-export',
      '/settings/privacy',
      '/about',
    ]);
    expect(
      Array.from(root.querySelectorAll('ui-button')).map((b) => b.textContent?.trim()),
    ).toEqual(['How it works', 'Sign out']);
    expect(root.querySelector('nav a[href="/settings/appearance"]')?.textContent).toContain(
      'System',
    );
    expect(root.querySelector('a[href="/privacy"]')?.textContent).toContain('Privacy policy');
    expect(root.textContent).toContain('Shelfmark v1.0');
    expect(await axeViolations(root)).toEqual([]);
  });

  it('signs out', async () => {
    const { api, harness, router } = await setup(true);
    const root = harness.routeNativeElement as HTMLElement;
    const button = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign out'),
    );

    button?.click();
    await harness.fixture.whenStable();

    expect(api.signOut).toHaveBeenCalled();
    expect(router.url).toBe('/sign-in');
  });

  it('on tablet and desktop goes to the first section', async () => {
    const { router } = await setup(false);

    expect(router.url).toBe('/settings/account');
  });

  it('leaves for the first section when the viewport grows past the phone', async () => {
    const { harness, phoneSignal, router } = await setup(true);

    phoneSignal.set(false);
    await harness.fixture.whenStable();

    await vi.waitFor(() => {
      expect(router.url).toBe('/settings/account');
    });
  });
});
