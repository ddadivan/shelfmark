import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../core/auth/auth-api.token';
import { AuthStore } from '../core/auth/auth.store';
import { AuthApi } from '../core/auth/models/auth-api.interface';
import { AuthUser } from '../core/auth/models/auth-user.interface';
import { APP_LANG } from '../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../core/i18n/app-transloco.loader';
import { translocoConfig } from '../core/i18n/transloco.config';
import { SearchDialogService } from '../features/search/search-dialog.service';
import AppShellComponent from './app-shell.component';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'a@example.com',
  image: null,
  isDemo: false,
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
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    const store = TestBed.inject(AuthStore);
    await store.ensureLoaded();
    const harness = await RouterTestingHarness.create('/');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.textContent).toContain('Ada Lovelace');
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

  it('opens the search from the header button and from Cmd+K', async () => {
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
        { provide: SearchDialogService, useValue: search },
      ],
    });
    await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
    await TestBed.inject(AuthStore).ensureLoaded();
    const harness = await RouterTestingHarness.create('/');

    (harness.routeNativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[aria-label="Search"]')
      ?.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true }));

    expect(search.open).toHaveBeenCalledTimes(1);
    expect(search.handleShortcut).toHaveBeenCalledTimes(1);
  });
});
