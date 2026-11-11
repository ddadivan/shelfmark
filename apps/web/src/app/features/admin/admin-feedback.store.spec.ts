import { TestBed } from '@angular/core/testing';
import { adminFeedbackMessage } from '../../../testing/feedback-message';
import { ApiErrorToastService } from '../../core/api/api-error-toast.service';
import { SessionScope } from '../../core/auth/session-scope.service';
import { FEEDBACK_LOAD_STATE } from '../feedback/models/feedback-load-state.const';
import { AdminFeedbackStore } from './admin-feedback.store';
import { ADMIN_API } from './models/admin-api.const';
import type { AdminApi } from './models/admin-api.interface';
import { adminApiStub } from '../../../testing/admin-api-stub';

const FIRST = adminFeedbackMessage({ id: 'a', text: 'first' });
const SECOND = adminFeedbackMessage({ id: 'b', text: 'second' });

function setup(overrides: Partial<AdminApi> = {}) {
  const toast = { show: vi.fn() };
  const api: AdminApi = {
    ...adminApiStub(true),
    listFeedback: vi.fn(() => Promise.resolve({ items: [FIRST, SECOND], nextCursor: null })),
    updateFeedback: vi.fn((id: string) =>
      Promise.resolve({ ...FIRST, id, status: 'done' as const }),
    ),
    ...overrides,
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: ADMIN_API, useValue: api },
      { provide: ApiErrorToastService, useValue: toast },
    ],
  });
  return {
    api,
    toast,
    store: TestBed.inject(AdminFeedbackStore),
    scope: TestBed.inject(SessionScope),
  };
}

describe('AdminFeedbackStore', () => {
  it('loads the first page with the page size and no status', async () => {
    const { api, store } = setup();

    await store.load();

    expect(api.listFeedback).toHaveBeenCalledWith({ limit: 20 });
    expect(store.items()).toEqual([FIRST, SECOND]);
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Loaded);
    expect(store.empty()).toBe(false);
  });

  it('fails softly and recovers on a new load', async () => {
    const listFeedback = vi
      .fn<AdminApi['listFeedback']>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { store } = setup({ listFeedback });

    await store.load();
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Failed);

    await store.load();
    expect(store.empty()).toBe(true);
  });

  it('setFilter reloads from the first page with that status; null shows all again', async () => {
    const { api, store } = setup();
    await store.load();

    await store.setFilter('planned');
    expect(api.listFeedback).toHaveBeenLastCalledWith({ limit: 20, status: 'planned' });
    expect(store.filter()).toBe('planned');

    await store.setFilter(null);
    expect(api.listFeedback).toHaveBeenLastCalledWith({ limit: 20 });
  });

  it('appends the next page with the cursor and the filter, and stops at the last page', async () => {
    const listFeedback = vi
      .fn<AdminApi['listFeedback']>()
      .mockResolvedValueOnce({ items: [FIRST], nextCursor: 'c1' })
      .mockResolvedValueOnce({ items: [SECOND], nextCursor: null });
    const { store } = setup({ listFeedback });
    await store.setFilter('received');

    await store.loadMore();
    expect(listFeedback).toHaveBeenLastCalledWith({ cursor: 'c1', limit: 20, status: 'received' });
    expect(store.items()).toEqual([FIRST, SECOND]);
    expect(store.nextCursor()).toBeNull();

    await store.loadMore();
    expect(listFeedback).toHaveBeenCalledTimes(2);
  });

  it('keeps the cursor and toasts when a next page fails', async () => {
    const listFeedback = vi
      .fn<AdminApi['listFeedback']>()
      .mockResolvedValueOnce({ items: [FIRST], nextCursor: 'c1' })
      .mockRejectedValueOnce(new Error('down'));
    const { store, toast } = setup({ listFeedback });
    await store.load();

    await store.loadMore();

    expect(store.nextCursor()).toBe('c1');
    expect(store.loadingMore()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('admin.feedback.loadMoreFailed');
  });

  describe('update', () => {
    it('changes the message at once and takes the answer of the API', async () => {
      let resolve: (message: typeof FIRST) => void = () => undefined;
      const updateFeedback = vi.fn(() => new Promise<typeof FIRST>((res) => (resolve = res)));
      const { store } = setup({ updateFeedback });
      await store.load();

      const pending = store.update('a', { status: 'planned', reply: 'Soon' });
      expect(store.items()[0]).toMatchObject({ status: 'planned', reply: 'Soon' });
      resolve({ ...FIRST, status: 'planned', reply: 'Soon', updatedAt: 'later' });

      expect(await pending).toBe(true);
      expect(store.items()[0]?.updatedAt).toBe('later');
      expect(store.items()[1]).toEqual(SECOND);
    });

    it('sends only the given fields and clears a reply with null', async () => {
      const { api, store } = setup();
      await store.load();

      await store.update('a', { reply: null });

      expect(api.updateFeedback).toHaveBeenCalledWith('a', { reply: null });
    });

    it('rolls back and shows the error toast when the API refuses', async () => {
      const { store, toast } = setup({
        updateFeedback: vi.fn(() => Promise.reject(new Error('no'))),
      });
      await store.load();

      const ok = await store.update('a', { status: 'done', reply: 'Fixed' });

      expect(ok).toBe(false);
      expect(store.items()[0]).toEqual(FIRST);
      expect(toast.show).toHaveBeenCalledWith('admin.feedback.saveFailed');
    });

    it('does nothing for a message that is not in the list', async () => {
      const { api, store } = setup();
      await store.load();

      expect(await store.update('zzz', { reply: 'x' })).toBe(false);
      expect(api.updateFeedback).not.toHaveBeenCalled();
    });
  });

  it('forgets everything when the session ends', async () => {
    const { store, scope } = setup();
    await store.setFilter('done');

    scope.end();

    expect(store.items()).toEqual([]);
    expect(store.filter()).toBeNull();
    expect(store.phase()).toBe(FEEDBACK_LOAD_STATE.Idle);
  });
});
