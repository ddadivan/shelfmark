import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { fakeCleanupApi } from '../../../../testing/cleanup-report';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { CLEANUP_API } from '../models/cleanup-api.const';
import { CleanupSummaryStore } from './cleanup-summary.store';

describe('CleanupSummaryStore', () => {
  function setup() {
    const api = fakeCleanupApi();
    api.getSummary.mockReturnValue(of({ show: true, duplicates: 2, similarTags: 1 }));
    TestBed.configureTestingModule({ providers: [{ provide: CLEANUP_API, useValue: api }] });
    return { api, store: TestBed.inject(CleanupSummaryStore) };
  }

  it('loads once per session, refreshes only once loaded and forgets on session end', async () => {
    const { api, store } = setup();
    await store.refresh();
    expect(api.getSummary).not.toHaveBeenCalled();
    await store.load();
    await store.load();
    expect(api.getSummary).toHaveBeenCalledTimes(1);
    expect(store.show()).toBe(true);
    api.getSummary.mockReturnValue(of({ show: false, duplicates: 0, similarTags: 0 }));
    await store.refresh();
    expect(store.show()).toBe(false);
    TestBed.inject(SessionScope).end();
    expect(store.summary()).toBeNull();
  });

  it('works without a registered seam (no card)', async () => {
    TestBed.configureTestingModule({});
    const store = TestBed.inject(CleanupSummaryStore);
    await store.load();
    expect(store.show()).toBe(false);
  });
});
