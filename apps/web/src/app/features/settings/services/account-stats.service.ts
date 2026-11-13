import { computed, inject, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import type { MeStatsResponse } from '@shelfmark/contracts';
import { LocaleService } from '../../../core/i18n/locale.service';
import { AUTH_PROVIDER_VIEW } from '../models/auth-provider-view.const';
import type { ConnectedAccountView } from '../models/connected-account-view.interface';
import { ME_STATS_API } from '../models/me-stats-api.const';
import type { ShelfCount } from '../models/shelf-count.interface';
import type { WeekBarView } from '../models/week-bar-view.interface';
import { weekBars } from '../utils/week-bars';

/**
 * The Account page's "Your shelf" numbers and connected accounts (`GET /api/me/stats`, #352),
 * loaded once per visit and written out in the active language (dates through `LocaleService`).
 * The weekly chart starts its weeks on the user's first day (`LocaleService.firstDay`).
 * Scoped to the page through its `providers`.
 */
@Service()
export class AccountStatsService {
  private readonly api = inject(ME_STATS_API);
  private readonly locale = inject(LocaleService);
  /** Reloads when the first day of the week changes (Settings › Language, or the region). */
  private readonly resource = rxResource({
    params: () => ({ firstDay: this.locale.firstDay() }),
    stream: ({ params }) => this.api.get(params),
  });

  private readonly stats = computed<MeStatsResponse | undefined>(() =>
    this.resource.hasValue() ? this.resource.value() : undefined,
  );

  readonly loading = computed(() => this.resource.isLoading() && this.stats() === undefined);
  readonly failed = computed(
    () => this.resource.error() !== undefined && !this.resource.isLoading(),
  );
  readonly loaded = computed(() => this.stats() !== undefined);
  /** A new account: nothing saved yet. */
  readonly empty = computed(() => this.stats()?.linkCount === 0);

  readonly counts = computed<ShelfCount[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    return [
      {
        labelKey: 'settings.account.shelf.links',
        value: this.locale.formatNumber(stats.linkCount),
      },
      {
        labelKey: 'settings.account.shelf.folders',
        value: this.locale.formatNumber(stats.folderCount),
      },
      { labelKey: 'settings.account.shelf.tags', value: this.locale.formatNumber(stats.tagCount) },
    ];
  });

  readonly topSites = computed(() =>
    (this.stats()?.topSites ?? []).map((site) => ({
      ...site,
      letter: site.host.charAt(0),
      countText: this.locale.formatNumber(site.count),
    })),
  );

  readonly topTags = computed(() =>
    (this.stats()?.topTags ?? []).map((tag) => ({
      ...tag,
      countText: this.locale.formatNumber(tag.count),
    })),
  );

  readonly weeks = computed<WeekBarView[]>(() => {
    const stats = this.stats();
    if (!stats) {
      return [];
    }
    const format = this.locale.dateTimeFormat({ month: 'short', day: 'numeric', timeZone: 'UTC' });
    return weekBars(stats.weeklyLinks).map((bar) => ({
      ...bar,
      label: format.format(new Date(`${bar.weekStart}T00:00:00Z`)),
    }));
  });

  /** "September 2025" */
  readonly memberSince = computed(() => {
    const stats = this.stats();
    return stats
      ? this.locale
          .dateTimeFormat({ month: 'long', year: 'numeric' })
          .format(new Date(stats.memberSince))
      : null;
  });

  /** "3 months ago" */
  readonly oldestLink = computed(() => {
    const oldest = this.stats()?.oldestLinkAt;
    return oldest ? this.locale.formatRelative(oldest, Date.now()) : null;
  });

  readonly connectedAccounts = computed<ConnectedAccountView[]>(() =>
    (this.stats()?.connectedAccounts ?? []).map((account) => ({
      provider: account.provider,
      ...AUTH_PROVIDER_VIEW[account.provider],
      date: this.locale.formatDate(account.connectedAt),
    })),
  );

  reload(): void {
    this.resource.reload();
  }
}
