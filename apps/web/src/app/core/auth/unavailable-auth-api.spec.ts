import { TestBed } from '@angular/core/testing';
import { AuthApi } from './models/auth-api.interface';
import { AUTH_PROVIDER } from './models/auth-provider.const';
import { UnavailableAuthApi } from './unavailable-auth-api';

describe('UnavailableAuthApi', () => {
  const api = (): AuthApi => TestBed.inject(UnavailableAuthApi);

  it('is always a guest', async () => {
    expect(await api().getSession()).toBeNull();
  });

  it('reports every sign-in as failed', async () => {
    await expect(api().signIn(AUTH_PROVIDER.Google)).rejects.toThrow();
    await expect(api().signInDemo()).rejects.toThrow();
  });
});
