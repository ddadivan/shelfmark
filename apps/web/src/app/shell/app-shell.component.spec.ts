import { TestBed } from '@angular/core/testing';
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
import AppShellComponent from './app-shell.component';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'a@example.com',
  image: null,
  isDemo: false,
};

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
    const signOut = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Sign out'),
    );
    signOut?.click();
    await harness.fixture.whenStable();

    expect(api.signOut).toHaveBeenCalled();
    expect(store.isSignedIn()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/sign-in');
  });
});
