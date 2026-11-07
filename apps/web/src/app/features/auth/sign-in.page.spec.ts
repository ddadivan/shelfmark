import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { AuthApi } from '../../core/auth/models/auth-api.interface';
import { AuthUser } from '../../core/auth/models/auth-user.interface';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { translocoConfig } from '../../core/i18n/transloco.config';
import SignInPage from './sign-in.page';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
};

async function setup(signIn: AuthApi['signIn'] = () => Promise.resolve(USER)) {
  const api: AuthApi = {
    getSession: () => Promise.resolve(null),
    signIn: vi.fn(signIn),
    signInDemo: vi.fn(() => Promise.resolve({ ...USER, isDemo: true })),
    signOut: () => Promise.resolve(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'sign-in', component: SignInPage },
          { path: '**', children: [] },
        ],
        withComponentInputBinding(),
      ),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: api },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const harness = await RouterTestingHarness.create();
  return { api, harness, router: TestBed.inject(Router) };
}

function buttons(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(root.querySelectorAll('button'));
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const found = buttons(root).find((b) => b.textContent?.includes(label));
  if (!found) {
    throw new Error(`No button "${label}"`);
  }
  return found;
}

describe('SignInPage', () => {
  it('offers Google, GitHub and the demo with translated text', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    expect(root.querySelector('h1')?.textContent).toBe('All your links on one shelf');
    expect(buttons(root).map((b) => b.textContent?.trim())).toEqual([
      'Continue with Google',
      'Continue with GitHub',
      'Open the demo',
    ]);
    expect(root.querySelector('ui-notice')).toBeNull();
  });

  it('has no axe violations', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in?reason=session-expired');
    const root = harness.routeNativeElement as HTMLElement;

    // Colour contrast is off (no layout in jsdom); the e2e axe run covers it once #82 lands.
    const results = await axe.run(root, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it.each([
    ['session-expired', 'Your session has expired. Sign in again.'],
    ['demo-expired', 'The demo has ended. Open a new one or sign in.'],
  ])('explains reason=%s', async (reason, text) => {
    const { harness } = await setup();
    await harness.navigateByUrl(`/sign-in?reason=${reason}`);

    expect(
      (harness.routeNativeElement as HTMLElement).querySelector('ui-notice')?.textContent,
    ).toContain(text);
  });

  it('ignores an unknown reason', async () => {
    const { harness } = await setup();
    await harness.navigateByUrl('/sign-in?reason=<b>x</b>');

    expect((harness.routeNativeElement as HTMLElement).querySelector('ui-notice')).toBeNull();
  });

  it('returns to the saved URL after signing in', async () => {
    const { api, harness, router } = await setup();
    await harness.navigateByUrl('/sign-in?returnUrl=%2Flinks%3Ftag%3Da');

    button(harness.routeNativeElement as HTMLElement, 'GitHub').click();
    await harness.fixture.whenStable();

    expect(api.signIn).toHaveBeenCalledWith('github');
    expect(router.url).toBe('/links?tag=a');
  });

  it.each(['https://evil.test', '//evil.test', '/\\evil.test'])(
    'does not follow the unsafe returnUrl %s',
    async (returnUrl) => {
      const { harness, router } = await setup();
      await harness.navigateByUrl(`/sign-in?returnUrl=${encodeURIComponent(returnUrl)}`);

      button(harness.routeNativeElement as HTMLElement, 'Google').click();
      await harness.fixture.whenStable();

      expect(router.url).toBe('/');
    },
  );

  it('opens the demo', async () => {
    const { api, harness, router } = await setup();
    await harness.navigateByUrl('/sign-in');

    button(harness.routeNativeElement as HTMLElement, 'demo').click();
    await harness.fixture.whenStable();

    expect(api.signInDemo).toHaveBeenCalled();
    expect(router.url).toBe('/');
  });

  it('shows a failure notice and stays on the page', async () => {
    const { harness, router } = await setup(() => Promise.reject(new Error('denied')));
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    button(root, 'Google').click();
    await harness.fixture.whenStable();

    expect(root.querySelector('ui-notice')?.textContent).toContain('We could not sign you in');
    expect(router.url).toBe('/sign-in');
  });

  it('shows loading on the chosen button only and locks the others', async () => {
    let finish: (user: AuthUser) => void = () => undefined;
    const { harness } = await setup(() => new Promise<AuthUser>((resolve) => (finish = resolve)));
    await harness.navigateByUrl('/sign-in');
    const root = harness.routeNativeElement as HTMLElement;

    button(root, 'GitHub').click();
    harness.detectChanges();

    expect(button(root, 'GitHub').getAttribute('aria-busy')).toBe('true');
    expect(button(root, 'Google').getAttribute('aria-busy')).not.toBe('true');
    expect(button(root, 'Google').disabled).toBe(true);
    expect(button(root, 'demo').disabled).toBe(true);

    finish(USER);
    await harness.fixture.whenStable();
  });
});
