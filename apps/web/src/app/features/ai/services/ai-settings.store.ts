import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  AI_BACKFILL_STATE,
  AI_FEATURE_MODE,
  AI_PROVIDER_STATUS,
  AI_SEARCH_STATE,
  type AiBackfillStatus,
  type AiFeatureMode,
  type AiSearchStatus,
  type AskAllowance,
  type AiSettings,
  type AiSettingsResponse,
  type AiTickResponse,
  type UpdateAiSettingsRequest,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { AI_API } from '../models/ai-api.const';
import { AI_SETTINGS_DEFAULT } from '../models/ai-settings-default.const';
import type { AiSettingsState } from '../models/ai-settings-state.interface';

const initialState: AiSettingsState = { response: null, loading: false, error: false };

/**
 * The account's AI side (`/api/ai/settings`, #389), cached for the whole app: the switches of
 * Settings › AI, usage, provider status, pending jobs and "Process existing links". Nothing AI
 * shows while `isOn` is false (or not loaded yet). A change is optimistic and rolls back the
 * fields it changed when the request fails; a response that started before a newer change does
 * not overwrite it. The session end forgets everything and drops responses still in flight.
 */
export const AiSettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ response }) => {
    const settings = computed<AiSettings>(() => response()?.settings ?? AI_SETTINGS_DEFAULT);
    const isOn = computed(() => settings().enabled);
    const mode = (pick: (value: AiSettings) => AiFeatureMode) =>
      computed<AiFeatureMode>(() => (isOn() ? pick(settings()) : AI_FEATURE_MODE.Off));
    const usage = computed(() => response()?.usage ?? null);
    const backfill = computed(() => response()?.backfill ?? null);
    const meaningSearchOn = computed(() => isOn() && settings().meaningSearch);
    const searchStatus = computed(() => response()?.search ?? null);
    return {
      loaded: computed(() => response() !== null),
      settings,
      /** The main switch, as far as it is known (off until loaded). */
      isOn,
      /** Turning AI on opens the first-run intro until it was seen. */
      introSeen: computed(() => response()?.introSeen ?? false),
      /** Folder mode in effect: `off` while AI is off. */
      folderMode: mode((value) => value.folderMode),
      /** Tags mode in effect: `off` while AI is off. */
      tagsMode: mode((value) => value.tagsMode),
      /** Summaries are written for new links. */
      summariesOn: computed(() => isOn() && settings().summaries),
      usage,
      /** This month's links are used up: AI rows show the limit line. */
      limitReached: computed(() => {
        const value = usage();
        return value !== null && value.linksUsed >= value.linksLimit;
      }),
      /** ISO date the monthly count resets, or `null` until loaded. */
      resetsOn: computed(() => usage()?.resetsOn ?? null),
      providerUnavailable: computed(
        () => response()?.providerStatus === AI_PROVIDER_STATUS.Unavailable,
      ),
      pendingJobs: computed(() => response()?.pendingJobs ?? 0),
      backfill,
      /** "Process existing links" exists for the account's tier (allowance above 0). */
      backfillAvailable: computed(() => (usage()?.backfillLimit ?? 0) > 0),
      backfillRunning: computed(() => backfill()?.state === AI_BACKFILL_STATE.Running),
      /** "Search by meaning" in effect (AI-3): AI and the switch on. */
      meaningSearchOn,
      /** Search by meaning readiness ("N of M links ready"), `null` until loaded. */
      searchStatus,
      /** Meaning results and related links may show: switched on and the server says `ready`. */
      meaningReady: computed(
        () => meaningSearchOn() && searchStatus()?.state === AI_SEARCH_STATE.Ready,
      ),
      /** Links are being embedded: the tick runs to move the pass on. */
      searchProcessing: computed(
        () => meaningSearchOn() && searchStatus()?.state === AI_SEARCH_STATE.Processing,
      ),
      /**
       * Ask your shelf may show (AI-4): AI and the Ask switch on. Read from the settings, so an
       * optimistic switch hides or shows the entry points at once.
       */
      askOn: computed(() => isOn() && settings().ask),
      /** Questions left and when they reset, `null` until loaded. */
      askAllowance: computed(() => response()?.ask.allowance ?? null),
    };
  }),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(AI_API);
    const scope = inject(SessionScope);
    let epoch = 0;
    // Bumped by every settings change: a response that started before it must not overwrite it.
    let version = 0;
    let firstLoad: Promise<void> | null = null;

    function patchResponse(patch: Partial<AiSettingsResponse>): void {
      const response = store.response();
      if (response) {
        patchState(store, { response: { ...response, ...patch } });
      }
    }

    async function fetchSettings(): Promise<void> {
      const started = epoch;
      const startedVersion = version;
      patchState(store, { loading: true, error: false });
      try {
        const response = await firstValueFrom(api().getSettings());
        if (started === epoch) {
          patchState(store, {
            response: startedVersion === version ? response : store.response(),
            loading: false,
          });
        }
      } catch {
        if (started === epoch) {
          patchState(store, { loading: false, error: !store.loaded() });
        }
      }
    }

    function applyBackfill(backfill: AiBackfillStatus): void {
      patchResponse({ backfill });
    }

    scope.onEnd(() => {
      epoch++;
      version++;
      firstLoad = null;
      patchState(store, initialState);
    });

    return {
      /** Loads the settings once; a failure can be retried by calling again. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        firstLoad ??= fetchSettings().finally(() => (firstLoad = null));
        return firstLoad;
      },

      /** Re-reads the settings (usage, provider status, backfill). */
      refresh(): Promise<void> {
        return fetchSettings();
      },

      /**
       * Changes settings at once and saves them; resolves false (and puts the changed fields back)
       * when the request fails. `enabled: true` also marks the intro seen, as the API does.
       */
      async update(change: UpdateAiSettingsRequest): Promise<boolean> {
        const current = store.response();
        if (!current) {
          return false;
        }
        const started = epoch;
        const changeVersion = ++version;
        const before = current.settings;
        patchResponse({
          settings: { ...before, ...change },
          introSeen: current.introSeen || change.enabled === true,
        });
        try {
          const response = await firstValueFrom(api().updateSettings(change));
          if (started === epoch && changeVersion === version) {
            patchState(store, { response });
          }
          return true;
        } catch {
          const now = store.response();
          if (started === epoch && now) {
            const reverted = { ...now.settings };
            for (const key of Object.keys(change) as Array<keyof AiSettings>) {
              if (now.settings[key] === change[key]) {
                Object.assign(reverted, { [key]: before[key] });
              }
            }
            patchResponse({
              settings: reverted,
              introSeen: change.enabled === true ? current.introSeen : now.introSeen,
            });
          }
          return false;
        }
      },

      /** Starts "Process existing links"; false when the server refuses or fails. */
      async startBackfill(): Promise<boolean> {
        const started = epoch;
        try {
          const backfill = await firstValueFrom(api().startBackfill());
          if (started === epoch) {
            applyBackfill(backfill);
          }
          return true;
        } catch {
          return false;
        }
      },

      /** Stops "Process existing links"; what was done stays. */
      async stopBackfill(): Promise<boolean> {
        const started = epoch;
        try {
          const backfill = await firstValueFrom(api().stopBackfill());
          if (started === epoch) {
            applyBackfill(backfill);
          }
          return true;
        } catch {
          return false;
        }
      },

      /**
       * Catch-up call while jobs are pending, a backfill runs or links are being embedded; a
       * failure changes nothing.
       */
      async tick(): Promise<AiTickResponse | null> {
        const started = epoch;
        try {
          const response = await firstValueFrom(api().tick());
          if (started === epoch) {
            patchResponse({
              pendingJobs: response.pendingJobs,
              backfill: response.backfill,
              search: response.search,
            });
          }
          return response;
        } catch {
          return null;
        }
      },

      /** A save queued AI jobs, one by default (the tick runs while jobs are pending). */
      jobQueued(count = 1): void {
        patchResponse({ pendingJobs: store.pendingJobs() + count });
      },

      /**
       * A meaning search answered with a newer readiness: keeps "N of M links ready" and the tick
       * in step without another settings read.
       */
      searchStatusSeen(search: AiSearchStatus): void {
        patchResponse({ search });
      },

      /** An Ask stream reported a newer allowance: the "questions left" lines follow it. */
      askAllowanceSeen(allowance: AskAllowance): void {
        const response = store.response();
        if (response) {
          patchResponse({ ask: { ...response.ask, allowance } });
        }
      },

      /** Deletes every AI summary, suggestion and vector; reloads the settings after it. */
      async deleteData(): Promise<boolean> {
        try {
          await firstValueFrom(api().deleteData());
        } catch {
          return false;
        }
        await fetchSettings();
        return true;
      },
    };
  }),
);
