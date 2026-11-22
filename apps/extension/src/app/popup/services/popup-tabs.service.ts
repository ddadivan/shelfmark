import { computed, inject, Service, signal } from '@angular/core';
import { ShelfmarkApiService } from '../../core/api/shelfmark-api.service';
import { BrowserTabsService } from '../../core/chrome/browser-tabs.service';
import { POPUP_STEP } from '../models/popup-step.const';
import { SAVE_MODE } from '../models/save-mode.const';
import type { SaveMode } from '../models/save-mode.type';
import type { TabEntry } from '../models/tab-entry.interface';
import { TABS_LOOKUP_MAX } from '../models/tabs-lookup-max.const';
import { TABS_REQUEST_CONCURRENCY } from '../models/tabs-request-concurrency.const';
import { mapLimit } from '../utils/map-limit';
import { toPopupFailure } from '../utils/to-popup-failure';
import { toTabEntries } from '../utils/to-tab-entries';
import { withoutFragment } from '../utils/without-fragment';

/**
 * "All tabs" of the popup (#569): the switch, the optional `tabs` permission and the list of the
 * window's savable tabs with their ticks. Tab addresses and titles stay in the browser: only the ticked
 * tabs go out, on Save or "Sort with AI". `chrome.tabs.query({ currentWindow: true })` needs no
 * permission but then has no addresses, so it only counts; the first switch to "All tabs" asks Chrome
 * for `tabs` (declined: the popup stays on "This page").
 */
@Service()
export class PopupTabsService {
  private readonly api = inject(ShelfmarkApiService);
  private readonly browser = inject(BrowserTabsService);
  private permitted = false;
  private listed = false;

  readonly mode = signal<SaveMode>(SAVE_MODE.Page);
  /** Tabs in the window (savable ones once the list is known); the switch shows from two. */
  readonly windowCount = signal(0);
  readonly entries = signal<readonly TabEntry[]>([]);
  private readonly ticked = signal<ReadonlySet<string>>(new Set());
  /** The list is being built (the permission was just granted, or the library is being asked). */
  readonly loading = signal(false);

  readonly switchShown = computed(() => this.windowCount() > 1);
  readonly active = computed(() => this.mode() === SAVE_MODE.Tabs);
  readonly selected = computed(() =>
    this.entries().filter((entry) => this.ticked().has(entry.key)),
  );
  readonly selectedCount = computed(() => this.selected().length);
  readonly savedCount = computed(() => this.entries().filter((entry) => entry.saved).length);
  readonly allTicked = computed(
    () => this.entries().length > 0 && this.selectedCount() === this.entries().length,
  );
  readonly someTicked = computed(() => this.selectedCount() > 0 && !this.allTicked());

  /** Counts the window's tabs (no permission needed) for the switch; any failure hides the switch. */
  async init(): Promise<void> {
    try {
      const tabs = await this.browser.windowTabs();
      this.permitted = await this.browser.hasTabsPermission();
      this.windowCount.set(this.permitted ? toTabEntries(tabs).length : tabs.length);
    } catch {
      this.windowCount.set(0);
    }
  }

  /** The switch. Only the first "All tabs" can ask for the permission or the library. */
  async setMode(mode: SaveMode): Promise<void> {
    if (mode === this.mode()) return;
    if (mode === SAVE_MODE.Page || this.listed) {
      this.mode.set(mode);
      return;
    }
    if (!this.permitted) {
      if (!(await this.browser.requestTabsPermission())) return;
      this.permitted = true;
    }
    this.loading.set(true);
    this.mode.set(SAVE_MODE.Tabs);
    try {
      const list = toTabEntries(await this.browser.windowTabs());
      this.windowCount.set(list.length);
      if (list.length < 2) {
        this.mode.set(SAVE_MODE.Page);
        return;
      }
      const saved = await this.findSaved(list);
      const entries = list.map((entry) => ({ ...entry, saved: saved.has(entry.key) }));
      this.entries.set(entries);
      this.ticked.set(new Set(entries.filter((entry) => !entry.saved).map((entry) => entry.key)));
      this.listed = true;
    } catch (error: unknown) {
      this.mode.set(SAVE_MODE.Page);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  toggle(key: string): void {
    this.ticked.update((keys) => {
      const next = new Set(keys);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  /** The "Select all" box: everything when some or none is ticked, none when all are. */
  toggleAll(): void {
    this.ticked.set(
      this.allTicked() ? new Set() : new Set(this.entries().map((entry) => entry.key)),
    );
  }

  isTicked(key: string): boolean {
    return this.ticked().has(key);
  }

  /**
   * Which tabs are in the library already: one lookup each for the first `TABS_LOOKUP_MAX` tabs, a few
   * at a time. A failure other than signed out (a 429, an older API) ends the checks: nothing blocks
   * saving.
   */
  private async findSaved(list: readonly TabEntry[]): Promise<ReadonlySet<string>> {
    const saved = new Set<string>();
    let stopped = false;
    await mapLimit(list.slice(0, TABS_LOOKUP_MAX), TABS_REQUEST_CONCURRENCY, async (entry) => {
      if (stopped) return;
      try {
        const { link } = await this.api.lookup({ url: withoutFragment(entry.url) });
        if (link !== null) saved.add(entry.key);
      } catch (error: unknown) {
        if (toPopupFailure(error, POPUP_STEP.Load) === 'signedOut') throw error;
        stopped = true;
      }
    });
    return saved;
  }
}
