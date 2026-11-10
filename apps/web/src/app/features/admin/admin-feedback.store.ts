import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { FeedbackStatus } from '@shelfmark/contracts';
import { ApiErrorToastService } from '../../core/api/api-error-toast.service';
import { SessionScope } from '../../core/auth/session-scope.service';
import { FEEDBACK_LOAD_STATE } from '../feedback/models/feedback-load-state.const';
import { ADMIN_API } from './models/admin-api.const';
import type { AdminFeedbackState } from './models/admin-feedback-state.interface';
import { ADMIN_LIMIT } from './models/admin-limit.const';
import { type AdminFeedbackItem, type UpdateAdminFeedbackRequest } from '@shelfmark/contracts';

const initialState: AdminFeedbackState = {
  items: [],
  phase: FEEDBACK_LOAD_STATE.Idle,
  nextCursor: null,
  loadingMore: false,
  filter: null,
};

/** The translation key of the toast ("<key>.title" / "<key>.detail") for a failed update. */
const SAVE_FAILED_TOAST = 'admin.feedback.saveFailed';

/**
 * The author's inbox: every user's messages, newest first, in pages of `ADMIN_LIMIT.PageSize`,
 * optionally filtered by status. `update()` is optimistic: the message changes at once and goes
 * back to what it was if the API refuses (with an error toast); the answer of the API replaces
 * the optimistic copy. Dropped when the session ends.
 */
export const AdminFeedbackStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ items, phase }) => ({
    empty: computed(() => phase() === FEEDBACK_LOAD_STATE.Loaded && items().length === 0),
  })),
  withMethods(
    (
      store,
      api = inject(ADMIN_API),
      toast = inject(ApiErrorToastService),
      scope = inject(SessionScope),
    ) => {
      /** Bumped by every fresh load and by `clear()`: an older answer is dropped. */
      let epoch = 0;

      function clear(): void {
        epoch += 1;
        patchState(store, initialState);
      }
      scope.onEnd(clear);

      function replace(id: string, change: (message: AdminFeedbackItem) => AdminFeedbackItem) {
        patchState(store, (state) => ({
          items: state.items.map((item) => (item.id === id ? change(item) : item)),
        }));
      }

      async function load(): Promise<void> {
        epoch += 1;
        const startedIn = epoch;
        patchState(store, {
          items: [],
          nextCursor: null,
          loadingMore: false,
          phase: FEEDBACK_LOAD_STATE.Loading,
        });
        try {
          const filter = store.filter();
          const page = await api.listFeedback({
            limit: ADMIN_LIMIT.PageSize,
            ...(filter === null ? {} : { status: filter }),
          });
          if (startedIn === epoch) {
            patchState(store, {
              items: page.items,
              nextCursor: page.nextCursor,
              phase: FEEDBACK_LOAD_STATE.Loaded,
            });
          }
        } catch {
          if (startedIn === epoch) {
            patchState(store, { phase: FEEDBACK_LOAD_STATE.Failed });
          }
        }
      }

      return {
        /** Loads the first page for the current filter (also a reload after an error). */
        load,
        /** Sets the status filter (`null` for all) and loads the first page again. */
        async setFilter(filter: FeedbackStatus | null): Promise<void> {
          if (filter === store.filter() && store.phase() !== FEEDBACK_LOAD_STATE.Idle) {
            return;
          }
          patchState(store, { filter });
          await load();
        },
        /** Appends the next page; nothing happens on the last page or while one is loading. */
        async loadMore(): Promise<void> {
          const cursor = store.nextCursor();
          if (
            cursor === null ||
            store.loadingMore() ||
            store.phase() !== FEEDBACK_LOAD_STATE.Loaded
          ) {
            return;
          }
          const startedIn = epoch;
          patchState(store, { loadingMore: true });
          try {
            const filter = store.filter();
            const page = await api.listFeedback({
              cursor,
              limit: ADMIN_LIMIT.PageSize,
              ...(filter === null ? {} : { status: filter }),
            });
            if (startedIn === epoch) {
              patchState(store, (state) => ({
                items: [...state.items, ...page.items],
                nextCursor: page.nextCursor,
                loadingMore: false,
              }));
            }
          } catch {
            if (startedIn === epoch) {
              // The cursor stays: the button tries the same page again.
              patchState(store, { loadingMore: false });
              toast.show('admin.feedback.loadMoreFailed');
            }
          }
        },
        /**
         * Saves a status and / or reply. Resolves with whether it worked; on failure the message
         * is back to what it was and the error toast was shown.
         */
        async update(id: string, request: UpdateAdminFeedbackRequest): Promise<boolean> {
          const before = store.items().find((item) => item.id === id);
          if (before === undefined) {
            return false;
          }
          const startedIn = epoch;
          replace(id, (message) => ({
            ...message,
            status: request.status ?? message.status,
            reply: request.reply === undefined ? message.reply : request.reply,
          }));
          try {
            const saved = await api.updateFeedback(id, request);
            if (startedIn === epoch) {
              replace(id, () => saved);
            }
            return true;
          } catch {
            if (startedIn === epoch) {
              replace(id, () => before);
              toast.show(SAVE_FAILED_TOAST);
            }
            return false;
          }
        },
        clear,
      };
    },
  ),
);
