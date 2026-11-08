import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideTransloco, TranslocoService } from '@jsverse/transloco';
import type { AuthUser } from '@shelfmark/contracts';
import { DialogService } from '@shelfmark/ui';
import axe from 'axe-core';
import { firstValueFrom } from 'rxjs';
import { AUTH_API } from '../../core/auth/auth-api.token';
import { AuthStore } from '../../core/auth/auth.store';
import type { AuthApi } from '../../core/auth/models/auth-api.interface';
import { AppTranslocoLoader } from '../../core/i18n/app-transloco.loader';
import { APP_LANG } from '../../core/i18n/models/app-lang.const';
import { translocoConfig } from '../../core/i18n/transloco.config';
import { LinksStore } from '../../stores/links.store';
import { AccountDeletionService } from './account-deletion.service';
import { ACCOUNT_DELETION_API } from './models/account-deletion-api.const';
import type { AccountDeletionApi } from './models/account-deletion-api.interface';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
  onboardingCompletedAt: '2020-01-01T00:00:00.000Z',
};

async function setup(user: AuthUser = USER, remove: AccountDeletionApi['delete'] = vi.fn()) {
  const deleteApi = vi.fn(remove);
  const auth: AuthApi = {
    getSession: () => Promise.resolve(user),
    signIn: vi.fn(),
    signInDemo: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: '', children: [] },
        { path: 'settings', children: [] },
      ]),
      provideTransloco({ config: translocoConfig, loader: AppTranslocoLoader }),
      { provide: AUTH_API, useValue: auth },
      { provide: ACCOUNT_DELETION_API, useValue: { delete: deleteApi } },
    ],
  });
  await firstValueFrom(TestBed.inject(TranslocoService).load(APP_LANG.En));
  const store = TestBed.inject(AuthStore);
  await store.ensureLoaded();
  await TestBed.inject(Router).navigateByUrl('/settings');
  return { store, deleteApi, service: TestBed.inject(AccountDeletionService) };
}

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-dialog-container');
}

async function opened(): Promise<HTMLElement> {
  await vi.waitFor(() => {
    TestBed.tick();
    expect(container()).not.toBeNull();
  });
  return container() as HTMLElement;
}

function buttonByText(text: string): HTMLButtonElement {
  const found = Array.from(container()?.querySelectorAll('button') ?? []).find((b) =>
    b.textContent?.includes(text),
  );
  if (!found) {
    throw new Error(`No button "${text}"`);
  }
  return found;
}

async function type(value: string): Promise<void> {
  const input = container()?.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error('No input');
  }
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  TestBed.tick();
  await Promise.resolve();
}

async function submit(): Promise<void> {
  buttonByText('Delete account').click();
  await vi.waitFor(() => TestBed.tick());
}

describe('AccountDeletionService', () => {
  afterEach(() => {
    TestBed.inject(DialogService);
    document.querySelectorAll('.cdk-overlay-container').forEach((e) => e.replaceChildren());
  });

  it('does nothing for a demo user and for a guest', async () => {
    const { service } = await setup({ ...USER, isDemo: true });

    await service.open();

    expect(container()).toBeNull();
  });

  it('keeps the delete button disabled until the typed email matches', async () => {
    const { service, deleteApi } = await setup();
    void service.open();
    await opened();

    expect(buttonByText('Delete account').disabled).toBe(true);
    await type('ada@exampl.com');
    expect(buttonByText('Delete account').disabled).toBe(true);
    await type('  ADA@example.com ');
    expect(buttonByText('Delete account').disabled).toBe(false);
    expect(deleteApi).not.toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { service } = await setup();
    void service.open();
    const dialog = await opened();

    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false } } });

    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  it('deletes, clears the stores, goes to the landing page and confirms', async () => {
    const { service, store, deleteApi } = await setup();
    const links = TestBed.inject(LinksStore);
    const reset = vi.spyOn(links, 'reset');
    const open = service.open();
    await opened();

    await type('ada@example.com');
    await submit();
    await open;

    expect(deleteApi).toHaveBeenCalledWith({ email: 'ada@example.com' });
    expect(store.isSignedIn()).toBe(false);
    expect(reset).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/');
    await vi.waitFor(() => {
      TestBed.tick();
      expect(document.body.textContent).toContain('Your account and all your data were deleted.');
    });
  });

  it.each([
    [400, 'does not match your account'],
    [429, 'Too many attempts'],
    [503, 'We could not delete your account'],
  ])('shows an inline error for %i and stays signed in', async (status, text) => {
    const { service, store } = await setup(USER, () =>
      Promise.reject(new HttpErrorResponse({ status })),
    );
    void service.open();
    await opened();

    await type('ada@example.com');
    await submit();

    await vi.waitFor(() => {
      TestBed.tick();
      expect(container()?.querySelector('ui-notice')?.textContent).toContain(text);
    });
    expect(store.isSignedIn()).toBe(true);
    expect(buttonByText('Delete account').disabled).toBe(false);
  });

  it('closes the dialog on a 401 without clearing anything itself', async () => {
    const { service, store } = await setup(USER, () =>
      Promise.reject(new HttpErrorResponse({ status: 401 })),
    );
    const open = service.open();
    await opened();

    await type('ada@example.com');
    await submit();
    await open;

    expect(container()).toBeNull();
    expect(store.isSignedIn()).toBe(true);
  });
});
