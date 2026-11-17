import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Service, signal } from '@angular/core';
import { AI_TICK_INTERVAL_MS } from '../models/ai-tick-interval.const';
import { AiSettingsStore } from './ai-settings.store';

/**
 * Calls `POST /api/ai/tick` every `AI_TICK_INTERVAL_MS` while AI is on, the page is visible and
 * jobs are pending or "Process existing links" runs (plan 1.4: the per-user catch-up). Stops when
 * the tab is hidden or nothing is left; starts again when either changes. Injecting it is enough.
 */
@Service()
export class AiTickService {
  private readonly store = inject(AiSettingsStore);
  private readonly doc = inject(DOCUMENT);
  private readonly visible = signal(this.doc.visibilityState !== 'hidden');

  /** Whether the tick runs now. */
  readonly active = computed(
    () =>
      this.store.isOn() &&
      this.visible() &&
      (this.store.pendingJobs() > 0 || this.store.backfillRunning()),
  );

  constructor() {
    const onVisibility = () => this.visible.set(this.doc.visibilityState !== 'hidden');
    this.doc.addEventListener('visibilitychange', onVisibility);
    inject(DestroyRef).onDestroy(() =>
      this.doc.removeEventListener('visibilitychange', onVisibility),
    );
    effect((onCleanup) => {
      if (!this.active()) {
        return;
      }
      const timer = setInterval(() => void this.store.tick(), AI_TICK_INTERVAL_MS);
      onCleanup(() => clearInterval(timer));
    });
  }
}
