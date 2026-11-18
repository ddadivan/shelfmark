import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, effect, inject, Injector } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { CLEANUP_STATE } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { CLEANUP_API } from '../models/cleanup-api.const';
import { CLEANUP_POLL_INTERVAL_MS } from '../models/cleanup-poll-interval.const';
import type { CleanupReportState } from '../models/cleanup-report-state.interface';
import { CLEANUP_VIEW } from '../models/cleanup-view.const';
import type { CleanupView } from '../models/cleanup-view.type';
import { applyCount, applyRequest, duplicateRows, tagRows } from '../utils/cleanup-rows';
import { CleanupApplyService } from './cleanup-apply.service';

const initialState: CleanupReportState = {
  report: null,
  loading: false,
  failed: false,
  starting: false,
  applying: false,
  includeAi: true,
  deselected: [],
  swapped: [],
};

/**
 * The clean-up page (AI-5, provided by the page): the stored report, which rows the user unchecked
 * (every row starts checked) and which pairs they turned round, and what one apply sends. While the
 * report is `running` it moves the run on every `CLEANUP_POLL_INTERVAL_MS` through the AI tick
 * (AI on) and reads the report again; it stops with the page.
 */
export const CleanupReportStore = signalStore(
  withState(initialState),
  withComputed((store) => {
    const folders = inject(FoldersStore);
    const deselected = computed(() => new Set(store.deselected()));
    const swapped = computed(() => new Set(store.swapped()));
    const duplicates = computed(() =>
      duplicateRows(store.report(), deselected(), (id) => folders.entityMap()[id]?.name ?? null),
    );
    const tags = computed(() => tagRows(store.report(), deselected(), swapped()));
    const view = computed<CleanupView>(() => {
      const report = store.report();
      if (report === null) {
        return store.failed() ? CLEANUP_VIEW.Error : CLEANUP_VIEW.Loading;
      }
      switch (report.state) {
        case CLEANUP_STATE.None:
          return CLEANUP_VIEW.Never;
        case CLEANUP_STATE.Running:
          return CLEANUP_VIEW.Checking;
        case CLEANUP_STATE.Applied:
          return CLEANUP_VIEW.Applied;
        default:
          return duplicates().length + tags().length > 0 ? CLEANUP_VIEW.Report : CLEANUP_VIEW.Tidy;
      }
    });
    return {
      duplicates,
      tags,
      view,
      applyCount: computed(() => applyCount(duplicates(), tags())),
      /** Some row was found by AI: the footer note shows. */
      hasAi: computed(() => duplicates().some((row) => row.ai) || tags().some((row) => row.ai)),
      /** The switch shows only while AI checks can run now. */
      offerAi: computed(() => store.report()?.aiAvailable === true),
    };
  }),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(CLEANUP_API);
    const toasts = inject(ToastService);
    const transloco = inject(TranslocoService);

    async function load(): Promise<void> {
      patchState(store, { loading: true });
      try {
        const report = await firstValueFrom(api().getReport());
        patchState(store, { report, failed: false });
      } catch {
        patchState(store, { failed: true });
      } finally {
        patchState(store, { loading: false });
      }
    }

    return {
      load,

      /** "Check my library" / "Check again": a new run replaces the report and the choices. */
      async run(): Promise<void> {
        if (store.starting()) {
          return;
        }
        patchState(store, { starting: true });
        try {
          const report = await firstValueFrom(
            api().run({ includeAi: store.includeAi() && store.offerAi() }),
          );
          patchState(store, { report, deselected: [], swapped: [] });
        } catch (error) {
          if (error instanceof HttpErrorResponse && error.status === HttpStatusCode.Conflict) {
            // A run is going already (another tab): show it.
            await load();
          } else {
            toasts.show({
              kind: TOAST_KIND.Danger,
              title: transloco.translate('cleanup.runFailed'),
            });
          }
        } finally {
          patchState(store, { starting: false });
        }
      },

      setIncludeAi(includeAi: boolean): void {
        patchState(store, { includeAi });
      },

      /** Checks or unchecks one row (a group or a pair). */
      toggle(id: string, selected: boolean): void {
        const others = store.deselected().filter((entry) => entry !== id);
        patchState(store, { deselected: selected ? others : [...others, id] });
      },

      /** "Keep … instead": turns a pair round (again: back). */
      swap(id: string): void {
        const swapped = store.swapped();
        patchState(store, {
          swapped: swapped.includes(id)
            ? swapped.filter((entry) => entry !== id)
            : [...swapped, id],
        });
      },

      /** "Apply {n} changes": one run of the selected rows; the report is read again after it. */
      async apply(): Promise<void> {
        if (store.applying() || store.applyCount() === 0) {
          return;
        }
        patchState(store, { applying: true });
        try {
          const request = applyRequest(
            store.report(),
            new Set(store.deselected()),
            new Set(store.swapped()),
          );
          if (await injector.get(CleanupApplyService).apply(request, () => void load())) {
            await load();
          }
        } finally {
          patchState(store, { applying: false });
        }
      },
    };
  }),
  withHooks({
    onInit(store) {
      const injector = inject(Injector);
      const settings = inject(AiSettingsStore);
      void settings.load();
      void inject(FoldersStore).load();
      void store.load();
      effect((onCleanup) => {
        if (store.report()?.state !== CLEANUP_STATE.Running) {
          return;
        }
        let busy = false;
        const timer = setInterval(async () => {
          if (busy) {
            return;
          }
          busy = true;
          try {
            if (settings.isOn()) {
              await settings.tick();
            }
            const report = await firstValueFrom(injector.get(CLEANUP_API).getReport());
            patchState(store, { report });
          } catch {
            // A failed poll waits for the next one.
          } finally {
            busy = false;
          }
        }, CLEANUP_POLL_INTERVAL_MS);
        onCleanup(() => clearInterval(timer));
      });
    },
  }),
);
