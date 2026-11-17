import { TestBed } from '@angular/core/testing';
import type { AdminStatsResponse } from '@shelfmark/contracts';
import { adminApiStub } from '../../../../testing/admin-api-stub';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { buildMockAdminStats } from '../mock/build-mock-admin-stats';
import { ADMIN_API } from '../models/admin-api.const';
import type { AdminApi } from '../models/admin-api.interface';
import { AdminStatsStore } from './admin-stats.store';

function setup(stats: AdminApi['stats']) {
  const api: AdminApi = { ...adminApiStub(true), stats: vi.fn(stats) };
  TestBed.configureTestingModule({ providers: [{ provide: ADMIN_API, useValue: api }] });
  return { api, store: TestBed.inject(AdminStatsStore), scope: TestBed.inject(SessionScope) };
}

const NOW = new Date('2026-11-14T12:00:00Z');

describe('AdminStatsStore', () => {
  it('loads the stats', async () => {
    const full = buildMockAdminStats(NOW);
    const { store } = setup(() => Promise.resolve(full));
    expect(store.phase()).toBe('idle');

    const pending = store.load();
    expect(store.loading()).toBe(true);
    await pending;

    expect(store.stats()).toEqual(full);
    expect(store.loading()).toBe(false);
    expect(store.tooFew()).toBe(false);
  });

  it('knows when there are too few real users to show shares', async () => {
    const { store } = setup(() => Promise.resolve(buildMockAdminStats(NOW, true)));
    await store.load();
    expect(store.tooFew()).toBe(true);
  });

  it('fails and keeps the last numbers for a retry', async () => {
    const full = buildMockAdminStats(NOW);
    let fail = false;
    const { store } = setup(() =>
      fail ? Promise.reject(new Error('down')) : Promise.resolve(full),
    );
    await store.load();
    fail = true;
    await store.load();
    expect(store.failed()).toBe(true);
    expect(store.stats()).toEqual(full);
  });

  it('drops an answer that arrives after the session ended', async () => {
    let resolve: (stats: AdminStatsResponse) => void = () => undefined;
    const { store, scope } = setup(() => new Promise((res) => (resolve = res)));
    const pending = store.load();
    scope.end();
    resolve(buildMockAdminStats(NOW));
    await pending;
    expect(store.stats()).toBeNull();
    expect(store.phase()).toBe('idle');
  });

  it('drops an older answer when a newer load started', async () => {
    const resolvers: ((stats: AdminStatsResponse) => void)[] = [];
    const { store } = setup(() => new Promise((res) => resolvers.push(res)));
    const first = store.load();
    const second = store.load();
    resolvers[1](buildMockAdminStats(NOW, true));
    resolvers[0](buildMockAdminStats(NOW));
    await Promise.all([first, second]);
    expect(store.tooFew()).toBe(true);
  });

  it('drops a failure that arrives after the session ended', async () => {
    let reject: (error: Error) => void = () => undefined;
    const { store, scope } = setup(() => new Promise((_res, rej) => (reject = rej)));
    const pending = store.load();
    scope.end();
    reject(new Error('down'));
    await pending;
    expect(store.failed()).toBe(false);
  });
});
