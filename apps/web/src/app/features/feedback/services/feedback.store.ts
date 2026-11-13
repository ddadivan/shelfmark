import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { FeedbackScreenshotUpload, SendFeedbackRequest } from '@shelfmark/contracts';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { FEEDBACK_API } from '../models/feedback-api.const';
import { FEEDBACK_LOAD_STATE } from '../models/feedback-load-state.const';
import type { FeedbackSendResult } from '../models/feedback-send-result.interface';
import type { FeedbackState } from '../models/feedback-state.interface';

const initialState: FeedbackState = { items: [], phase: FEEDBACK_LOAD_STATE.Idle };

/**
 * The signed-in user's feedback messages (Settings › Your feedback), newest first. `load()` asks
 * the API; `send()` posts a message, then its screenshots one by one (one image per request keeps
 * every body under the platform limit), and puts the saved one on top at once, so the page shows it
 * without another request. A reload that is already running is not started twice. The state is
 * dropped when the session ends.
 */
export const FeedbackStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ items, phase }) => ({
    empty: computed(() => phase() === FEEDBACK_LOAD_STATE.Loaded && items().length === 0),
  })),
  withMethods((store, api = inject(FEEDBACK_API), scope = inject(SessionScope)) => {
    let loading: Promise<void> | null = null;
    /** Bumped by `clear()`: an answer that arrives for an earlier session is dropped. */
    let epoch = 0;

    function clear(): void {
      epoch += 1;
      loading = null;
      patchState(store, initialState);
    }
    scope.onEnd(clear);

    return {
      /** Loads the list (or reloads it). A second call while one runs shares it. */
      load(): Promise<void> {
        if (loading !== null) {
          return loading;
        }
        const startedIn = epoch;
        patchState(store, { phase: FEEDBACK_LOAD_STATE.Loading });
        const run = (async (): Promise<void> => {
          try {
            const items = await api.list();
            if (startedIn === epoch) {
              patchState(store, { items, phase: FEEDBACK_LOAD_STATE.Loaded });
            }
          } catch {
            if (startedIn === epoch) {
              patchState(store, { phase: FEEDBACK_LOAD_STATE.Failed });
            }
          } finally {
            if (startedIn === epoch) {
              loading = null;
            }
          }
        })();
        loading = run;
        return run;
      },
      /** Sends a message and adds it on top of the list. Rejects with the API's `FeedbackSendError`. */
      /**
       * Sends the message, then attaches `screenshots` in order. A failed screenshot does not undo
       * the message (it is already saved): the result counts the ones that did not make it. A
       * failure of the message itself rejects (`FeedbackSendError`).
       */
      async send(
        request: SendFeedbackRequest,
        screenshots: readonly FeedbackScreenshotUpload[] = [],
      ): Promise<FeedbackSendResult> {
        const startedIn = epoch;
        let message = await api.send(request);
        let screenshotsFailed = 0;
        for (const upload of screenshots) {
          try {
            message = await api.attachScreenshot(message.id, upload);
          } catch {
            screenshotsFailed += 1;
          }
        }
        if (startedIn === epoch) {
          const saved = message;
          patchState(store, (state) => ({
            items: [saved, ...state.items.filter((item) => item.id !== saved.id)],
          }));
        }
        return { message, screenshotsFailed };
      },
      clear,
    };
  }),
);
