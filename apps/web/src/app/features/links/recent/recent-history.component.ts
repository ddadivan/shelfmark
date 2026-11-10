import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RECENT_LINKS_WINDOW_DAYS, type LinkResponse } from '@shelfmark/contracts';
import {
  DialogService,
  EmptyStateComponent,
  HISTORY_HEADING_LEVEL,
  type HistoryHeadingLevel,
  HistoryGroupComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  TOAST_KIND,
  ToastService,
} from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { LinkActionsService } from '../link-actions.service';
import { groupByDay } from './history-days';
import { LinkHistoryRowComponent } from './link-history-row.component';
import { HISTORY_DAY_KIND } from './models/history-day-kind.const';
import type { HistoryDay } from './models/history-day.interface';

/** Placeholders shown while the history loads. */
const SKELETON_COUNT = 5;

/**
 * The links opened in the last 30 days, in local-time day groups: the body of the `/recent` page
 * and of the phone sheet. A link leaves the history with its button (optimistic, a toast reports
 * a failure) or all at once with `clear()` (after a confirmation). The links themselves stay saved.
 */
@Component({
  selector: 'app-recent-history',
  imports: [
    TranslocoPipe,
    EmptyStateComponent,
    HistoryGroupComponent,
    LinkHistoryRowComponent,
    SkeletonComponent,
  ],
  templateUrl: './recent-history.component.html',
  styleUrl: './recent-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentHistoryComponent {
  protected readonly store = inject(LinksStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  /** Level of the day headings: 2 on the page, 3 inside the sheet whose title is the h2. */
  readonly headingLevel = input<HistoryHeadingLevel>(HISTORY_HEADING_LEVEL.Two);
  protected readonly windowDays = RECENT_LINKS_WINDOW_DAYS;
  protected readonly pluralKey = pluralKey;

  /** "Today" is the day the page was opened. */
  private readonly now = signal(new Date());
  protected readonly days = computed(() => groupByDay(this.store.recent(), this.now()));
  protected readonly hasHistory = computed(() => this.store.recent().length > 0);

  private readonly folderNames = computed(
    () => new Map(this.folders.entities().map((folder) => [folder.id, folder.name])),
  );

  constructor() {
    void this.store.loadRecent();
    void this.folders.load();
  }

  protected dayTitle(day: HistoryDay): string {
    switch (day.kind) {
      case HISTORY_DAY_KIND.Today:
        return this.t('links.recent.day.today');
      case HISTORY_DAY_KIND.Yesterday:
        return this.t('links.recent.day.yesterday');
      case HISTORY_DAY_KIND.Week:
        return this.t('links.recent.day.week');
      default:
        return new Intl.DateTimeFormat(this.locale(), {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: day.date.getFullYear() === this.now().getFullYear() ? undefined : 'numeric',
        }).format(day.date);
    }
  }

  /** Name of the folder a link is in; `null` while folders load or for an unsorted link. */
  protected folderName(link: LinkResponse): string | null {
    return link.folderId === null ? null : (this.folderNames().get(link.folderId) ?? null);
  }

  /** Local time of each open, by link id; a day of the earlier week also names the weekday. */
  private readonly times = computed(() => {
    const times = new Map<string, string>();
    for (const day of this.days()) {
      const format = new Intl.DateTimeFormat(this.locale(), {
        weekday: day.kind === HISTORY_DAY_KIND.Week ? 'short' : undefined,
        hour: 'numeric',
        minute: '2-digit',
      });
      for (const link of day.links) {
        times.set(link.id, format.format(new Date(link.lastOpenedAt ?? 0)));
      }
    }
    return times;
  });

  protected timeOf(link: LinkResponse): string {
    return this.times().get(link.id) ?? '';
  }

  protected async remove(link: LinkResponse): Promise<void> {
    if (await this.store.removeFromHistory(link.id)) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('links.recent.removed'),
        detail: link.title,
      });
    } else {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.t('links.recent.removeFailed'),
        detail: link.title,
      });
    }
  }

  /** Asks first, then empties the history; a toast reports the result. */
  async clear(): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t('links.recent.confirm.title'),
      message: this.t('links.recent.confirm.message'),
      confirmLabel: this.t('links.recent.confirm.confirm'),
      cancelLabel: this.t('links.recent.confirm.cancel'),
      closeLabel: this.t('links.recent.confirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    if (await this.store.clearHistory()) {
      this.toasts.show({ kind: TOAST_KIND.Success, title: this.t('links.recent.cleared') });
    } else {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('links.recent.clearFailed') });
    }
  }

  private locale(): string {
    return this.transloco.getActiveLang();
  }

  private t(key: string): string {
    return this.transloco.translate(key);
  }
}
