import { TestBed } from '@angular/core/testing';
import { SessionScope } from '../../core/auth/session-scope.service';
import { AdminStore } from './admin.store';
import { ADMIN_API } from './models/admin-api.const';
import type { AdminApi } from './models/admin-api.interface';
import { adminApiStub } from '../../../testing/admin-api-stub';

function setup(isAdmin: AdminApi['isAdmin']) {
  const api: AdminApi = { ...adminApiStub(), isAdmin: vi.fn(isAdmin) };
  TestBed.configureTestingModule({ providers: [{ provide: ADMIN_API, useValue: api }] });
  return { api, store: TestBed.inject(AdminStore), scope: TestBed.inject(SessionScope) };
}

describe('AdminStore', () => {
  it('is not an admin until the status answered', () => {
    const { store } = setup(() => Promise.resolve(true));

    expect(store.isAdmin()).toBe(false);
    expect(store.admin()).toBeNull();
  });

  it('asks once and remembers the answer', async () => {
    const { api, store } = setup(() => Promise.resolve(true));

    expect(await Promise.all([store.check(), store.check()])).toEqual([true, true]);
    expect(await store.check()).toBe(true);

    expect(api.isAdmin).toHaveBeenCalledTimes(1);
    expect(store.isAdmin()).toBe(true);
  });

  it('treats a failing status call as no', async () => {
    const { store } = setup(() => Promise.reject(new Error('down')));

    expect(await store.check()).toBe(false);
    expect(store.admin()).toBe(false);
  });

  it('forgets the answer when the session ends and asks again for the next user', async () => {
    const { api, store, scope } = setup(() => Promise.resolve(true));
    await store.check();

    scope.end();
    expect(store.admin()).toBeNull();
    await store.check();

    expect(api.isAdmin).toHaveBeenCalledTimes(2);
  });

  it('drops an answer that arrives after the session ended', async () => {
    let resolve: (admin: boolean) => void = () => undefined;
    const { store, scope } = setup(() => new Promise((res) => (resolve = res)));

    const pending = store.check();
    scope.end();
    resolve(true);
    await pending;

    expect(store.admin()).toBeNull();
  });
});
