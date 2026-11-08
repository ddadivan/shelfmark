import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AUTH_ENDPOINT, AUTH_PROVIDER, DEMO_ENDPOINT, type AuthUser } from '@shelfmark/contracts';
import { BetterAuthApi } from './better-auth-api';
import { DemoSignInError } from './demo-sign-in-error';
import { DEMO_ERROR } from './models/demo-error.const';
import { NAVIGATE } from './navigate.token';

const USER: AuthUser = {
  id: 'u1',
  name: 'Ada',
  email: 'a@example.com',
  image: null,
  isDemo: false,
  demoExpiresAt: null,
};
const GOOGLE_URL = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=x';
const FAILURE = { status: 500, statusText: 'Server Error' };

function setup() {
  const navigate = vi.fn<(url: string) => void>();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: NAVIGATE, useValue: navigate },
    ],
  });
  return {
    navigate,
    http: TestBed.inject(HttpTestingController),
    api: TestBed.inject(BetterAuthApi),
    origin: globalThis.location.origin,
  };
}

describe('BetterAuthApi', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  describe('getSession', () => {
    it('returns the user of the session', async () => {
      const { api, http } = setup();

      const result = api.getSession();
      const req = http.expectOne(AUTH_ENDPOINT.GetSession);
      expect(req.request.method).toBe('GET');
      req.flush({ user: USER, session: { expiresAt: '2030-01-01T00:00:00.000Z' } });

      expect(await result).toEqual(USER);
    });

    it('returns null for a guest', async () => {
      const { api, http } = setup();

      const result = api.getSession();
      http.expectOne(AUTH_ENDPOINT.GetSession).flush(null);

      expect(await result).toBeNull();
    });

    it('rejects when the request fails', async () => {
      const { api, http } = setup();

      const result = api.getSession();
      http.expectOne(AUTH_ENDPOINT.GetSession).flush({}, FAILURE);

      await expect(result).rejects.toBeDefined();
    });
  });

  describe('signIn', () => {
    it('posts same-origin callback URLs and navigates to the provider', async () => {
      const { api, http, navigate, origin } = setup();

      const result = api.signIn(AUTH_PROVIDER.Google, '/links?x=1');
      const req = http.expectOne(AUTH_ENDPOINT.SignInSocial);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        provider: 'google',
        callbackURL: `${origin}/links?x=1`,
        errorCallbackURL: `${origin}/sign-in?returnUrl=%2Flinks%3Fx%3D1`,
      });
      req.flush({ url: GOOGLE_URL, redirect: true });

      expect(await result).toBeNull();
      expect(navigate).toHaveBeenCalledWith(GOOGLE_URL);
    });

    it.each([null, '//evil.example', 'https://evil.example', '/\\evil.example'])(
      'falls back to the home page for the return URL %s',
      async (returnUrl) => {
        const { api, http, origin } = setup();

        const result = api.signIn(AUTH_PROVIDER.GitHub, returnUrl);
        const req = http.expectOne(AUTH_ENDPOINT.SignInSocial);
        expect(req.request.body).toEqual({
          provider: 'github',
          callbackURL: `${origin}/`,
          errorCallbackURL: `${origin}/sign-in`,
        });
        req.flush({ url: 'https://github.com/login/oauth/authorize', redirect: true });
        await result;
      },
    );

    it.each([
      'https://evil.example/phish',
      'http://accounts.google.com/o/oauth2/v2/auth',
      'javascript:alert(1)',
      'https://github.com/login/oauth/authorize',
    ])('does not navigate to %s', async (url) => {
      const { api, http, navigate } = setup();

      const result = api.signIn(AUTH_PROVIDER.Google, null);
      http.expectOne(AUTH_ENDPOINT.SignInSocial).flush({ url, redirect: true });

      await expect(result).rejects.toThrow();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('rejects a response without a URL', async () => {
      const { api, http, navigate } = setup();

      const result = api.signIn(AUTH_PROVIDER.Google, null);
      http.expectOne(AUTH_ENDPOINT.SignInSocial).flush({});

      await expect(result).rejects.toThrow();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('rejects when the request fails', async () => {
      const { api, http, navigate } = setup();

      const result = api.signIn(AUTH_PROVIDER.Google, null);
      http
        .expectOne(AUTH_ENDPOINT.SignInSocial)
        .flush({ code: 'INVALID_CALLBACKURL' }, { status: 403, statusText: 'Forbidden' });

      await expect(result).rejects.toBeDefined();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('signInDemo', () => {
    const DEMO_USER: AuthUser = {
      ...USER,
      id: 'demo1',
      isDemo: true,
      demoExpiresAt: '2030-01-02T00:00:00.000Z',
    };

    it('posts an empty JSON body to the demo endpoint and returns the demo user (201)', async () => {
      const { api, http } = setup();

      const result = api.signInDemo();
      const req = http.expectOne(DEMO_ENDPOINT.Create);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush(
        { user: DEMO_USER, session: { expiresAt: '2030-01-02T00:00:00.000Z' } },
        { status: 201, statusText: 'Created' },
      );

      expect(await result).toEqual(DEMO_USER);
    });

    it.each([
      [429, DEMO_ERROR.RateLimited],
      [503, DEMO_ERROR.Unavailable],
    ])('maps %i to a typed error', async (status, kind) => {
      const { api, http } = setup();

      const result = api.signInDemo();
      http.expectOne(DEMO_ENDPOINT.Create).flush(null, { status, statusText: 'No' });

      const error: unknown = await result.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DemoSignInError);
      expect((error as DemoSignInError).kind).toBe(kind);
    });

    it('rejects with the plain error for other failures', async () => {
      const { api, http } = setup();

      const result = api.signInDemo();
      http.expectOne(DEMO_ENDPOINT.Create).flush(null, FAILURE);

      const error: unknown = await result.catch((e: unknown) => e);
      expect(error).not.toBeInstanceOf(DemoSignInError);
      expect(error).toBeDefined();
    });

    it('rejects when the response has no demo user', async () => {
      const { api, http } = setup();

      const result = api.signInDemo();
      http.expectOne(DEMO_ENDPOINT.Create).flush({ user: USER, session: null });

      await expect(result).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('resolves when the server confirms', async () => {
      const { api, http } = setup();

      const result = api.signOut();
      const req = http.expectOne(AUTH_ENDPOINT.SignOut);
      expect(req.request.method).toBe('POST');
      req.flush({ success: true });

      await expect(result).resolves.toBeUndefined();
    });

    it('rejects when the server does not confirm', async () => {
      const { api, http } = setup();

      const result = api.signOut();
      http.expectOne(AUTH_ENDPOINT.SignOut).flush({ success: false });

      await expect(result).rejects.toThrow();
    });

    it('rejects when the request fails', async () => {
      const { api, http } = setup();

      const result = api.signOut();
      http.expectOne(AUTH_ENDPOINT.SignOut).flush({}, FAILURE);

      await expect(result).rejects.toBeDefined();
    });
  });
});
