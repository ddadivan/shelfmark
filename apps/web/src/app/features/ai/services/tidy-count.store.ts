import { effect, inject, Injector, untracked } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { AI_API } from '../models/ai-api.const';
import type { TidyCountState } from '../models/tidy-count-state.interface';
import { AiSettingsStore } from './ai-settings.store';

const initialState: TidyCountState = { total: 0, wanted: false, known: false };

/**
 * How many links Tidy Unsorted would list (`GET /api/ai/tidy/count`, AI-2), for the "Tidy with
 * suggestions" button. Loaded when Unsorted opens while AI is on, again when the pending AI jobs
 * drop to 0 (new suggestions arrived), after a Tidy run and its Undo; 0 while AI is off. A failed
 * read keeps what is known (no AI error is ever shown). The session end forgets it.
 */
export const TidyCountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const injector = inject(Injector);
    const settings = inject(AiSettingsStore);
    let epoch = 0;

    inject(SessionScope).onEnd(() => {
      epoch++;
      patchState(store, initialState);
    });

    return {
      /** Reads the count while AI is on; sets 0 while it is off. */
      async load(): Promise<void> {
        patchState(store, { wanted: true });
        if (!settings.isOn()) {
          // Off is an answer only once the settings are in (`load` of the entry waits for them).
          patchState(store, { total: 0, known: settings.loaded() });
          return;
        }
        const started = epoch;
        try {
          const { total } = await firstValueFrom(injector.get(AI_API).getTidyCount());
          if (started === epoch) {
            patchState(store, { total, known: true });
          }
        } catch {
          // The button keeps the last count; the next load tries again.
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      const settings = inject(AiSettingsStore);
      let pending = untracked(settings.pendingJobs);
      let wasOn = untracked(settings.isOn);
      effect(() => {
        const now = settings.pendingJobs();
        const on = settings.isOn();
        // Jobs finished (new suggestions), or AI was turned on: the count may have changed.
        const changed = (pending > 0 && now === 0) || (on && !wasOn);
        pending = now;
        wasOn = on;
        untracked(() => {
          if (!on) {
            patchState(store, { total: 0 });
          } else if (changed && store.wanted()) {
            void store.load();
          }
        });
      });
    },
  }),
);
