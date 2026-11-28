import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LINK_OPEN_TARGET, type LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  CardComponent,
  DialogService,
  EmptyStateComponent,
  FaviconComponent,
  ICON_SIZE,
  IconComponent,
  ListItemComponent,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
  MeterComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { LocaleService } from '../../core/i18n/locale.service';
import { ViewportService } from '../../core/layout/viewport.service';
import { pluralKey } from '../../core/i18n/plural-key';
import { APP_PATH } from '../../models/app-path.const';
import { PREVIEW_QUERY_PARAM } from '../../models/preview-query-param.const';
import { LinksStore } from '../../stores/links.store';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { LinkActionsService } from '../links/services/link-actions.service';
import { linkHost, ownImageUrl, safeHref, siteLetter } from '../links/utils/link-view';
import { RediscoverStore } from '../rediscover/services/rediscover.store';
import type { RemindOption } from '../reminders/models/remind-option.interface';
import { ReminderActionsService } from '../reminders/services/reminder-actions.service';
import { ReminderFormatService } from '../reminders/services/reminder-format.service';
import { remindPresets } from '../reminders/utils/remind-presets';
import { RevisitService } from './services/revisit.service';

/**
 * `/revisit` (Shelf `02-save-revisit.html`, "Revisit"): the queue for coming back. Due reminders
 * with Done and Snooze, Continue reading (Reader progress), Forgotten this week with Open, Later
 * and Not interested, and the last links opened; "Nothing waiting" when every group is empty.
 */
@Component({
  selector: 'app-revisit-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    FaviconComponent,
    IconComponent,
    ListItemComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
    MeterComponent,
    SkeletonComponent,
  ],
  providers: [RevisitService],
  templateUrl: './revisit.page.html',
  styleUrl: './revisit.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class RevisitPage {
  protected readonly revisit = inject(RevisitService);
  private readonly reminderActions = inject(ReminderActionsService);
  private readonly format = inject(ReminderFormatService);
  private readonly linkActions = inject(LinkActionsService);
  private readonly rediscover = inject(RediscoverStore);
  private readonly links = inject(LinksStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly locale = inject(LocaleService);
  private readonly dialogs = inject(DialogService);
  private readonly transloco = inject(TranslocoService);
  private readonly router = inject(Router);

  protected readonly phone = inject(ViewportService).phone;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  /** The loading page: Due (one row), Forgotten (six cards) and Recently opened (five rows). */
  protected readonly SKELETON_GROUPS: readonly {
    readonly rowList: readonly number[];
    readonly cards: number;
  }[] = [
    { rowList: [0], cards: 0 },
    { rowList: [], cards: 6 },
    { rowList: [0, 1, 2, 3, 4], cards: 0 },
  ];
  protected readonly pluralKey = pluralKey;
  protected readonly recentHref = `/${APP_PATH.Recent}`;
  protected readonly linkHost = linkHost;
  protected readonly siteLetter = siteLetter;
  protected readonly safeHref = safeHref;

  protected readonly newTab = computed(
    () => this.settings.libraryShown().openLinksIn === LINK_OPEN_TARGET.NewTab,
  );
  protected readonly snoozeOptions = computed(() => remindPresets(new Date(this.revisit.now())));

  constructor() {
    void this.revisit.load();
  }

  protected thumb(link: LinkResponse): string {
    return ownImageUrl(link.imageUrl) ?? '';
  }

  protected favicon(link: LinkResponse): string | undefined {
    return ownImageUrl(link.faviconUrl);
  }

  protected when(link: LinkResponse): string {
    this.locale.lang();
    return link.remindAt ? this.format.when(link.remindAt, this.revisit.now()) : '';
  }

  protected snoozeHint(option: RemindOption): string {
    return this.format.when(option.at.toISOString(), this.revisit.now());
  }

  protected openedWhen(link: LinkResponse): string {
    this.locale.lang();
    return link.lastOpenedAt
      ? this.locale.formatRelative(link.lastOpenedAt, this.revisit.now())
      : '';
  }

  protected savedMonth(link: LinkResponse): string {
    this.locale.lang();
    return this.locale.dateTimeFormat({ month: 'long' }).format(new Date(link.createdAt));
  }

  /** A row or card was opened: recorded like every open. */
  protected opened(link: LinkResponse): void {
    this.linkActions.open(link);
  }

  protected async done(link: LinkResponse): Promise<void> {
    await this.reminderActions.done(link);
    this.revisit.touch();
  }

  protected async snooze(link: LinkResponse, option: RemindOption): Promise<void> {
    await this.reminderActions.snooze(link, option);
    this.revisit.touch();
  }

  /** "Continue": the Link page, where Reader picks up the text. */
  protected async continueReading(link: LinkResponse): Promise<void> {
    await this.router.navigate([`/${APP_PATH.Links}`], {
      queryParams: { [PREVIEW_QUERY_PARAM]: link.id },
    });
  }

  protected async later(link: LinkResponse): Promise<void> {
    await this.reminderActions.remind([link]);
  }

  protected notInterested(link: LinkResponse): void {
    void this.rediscover.hide(link.id);
  }

  protected allHistory(): void {
    void this.router.navigateByUrl(this.recentHref);
  }

  protected async clearHistory(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: this.transloco.translate('revisit.recent.clearTitle'),
      message: this.transloco.translate('revisit.recent.clearText'),
      confirmLabel: this.transloco.translate('revisit.recent.clear'),
      cancelLabel: this.transloco.translate('links.add.actions.cancel'),
      destructive: true,
    });
    if (ok) {
      await this.links.clearHistory();
    }
  }
}
