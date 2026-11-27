import { computed, DestroyRef, inject, Service } from '@angular/core';
import { pageVisible } from '@shelfmark/ui';
import { AI_TICK_INTERVAL_MS } from '../models/ai-tick-interval.const';
import { AiSettingsStore } from './ai-settings.store';

/**
 * Calls `POST /api/ai/tick` every `AI_TICK_INTERVAL_MS` while AI is on, the page is visible and
 * jobs are pending, "Process existing links" runs or links are being embedded for search by
 * meaning (AI-3; also while the search status reads `unavailable`, so it recovers without a reload)
 * (plan 1.4: the per-user catch-up). Nothing is sent while the tab is hidden or nothing is left.
 * Injecting it is enough.
 *
 * One plain timer reads `active` on every beat instead of an effect that starts and stops a
 * timer: on prod (2.2.0) a started backfill never ticked once an error elsewhere had stopped
 * effects from running again; reading the computed pulls its current value regardless. One tick
 * at a time.
 */
@Service()
export class AiTickService {
  private readonly store = inject(AiSettingsStore);
  private readonly visible = pageVisible();
  private inFlight = false;

  /** Whether the tick runs now. */
  readonly active = computed(
    () =>
      this.store.isOn() &&
      this.visible() &&
      (this.store.pendingJobs() > 0 || this.store.backfillRunning() || this.store.searchPending()),
  );

  constructor() {
    const timer = setInterval(() => void this.beat(), AI_TICK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
    });
  }

  private async beat(): Promise<void> {
    if (this.inFlight || !this.active()) {
      return;
    }
    this.inFlight = true;
    try {
      await this.store.tick();
    } finally {
      this.inFlight = false;
    }
  }
}
