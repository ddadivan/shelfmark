import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  CARD_MEDIA,
  IconComponent,
  ICON_SIZE,
  NoticeComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { LocaleService } from '../../core/i18n/locale.service';
import { APP_PATH } from '../../models/app-path.const';
import { LinkCardComponent } from '../links/components/link-card/link-card.component';
import { FolderChipsService } from '../links/services/folder-chips.service';
import { LinkActionsService } from '../links/services/link-actions.service';
import { TodayBackComponent } from './components/today-back/today-back.component';
import { TodayShelfComponent } from './components/today-shelf/today-shelf.component';
import { TodayWeekComponent } from './components/today-week/today-week.component';
import { TodayStore } from './services/today.store';

/** Placeholder cards of "All links": the page loads up to eight (`TODAY_LIMIT.Latest`). */
const SKELETON_COUNT = 8;

/**
 * Today (Shelf `01-library.html`, route `APP_PATH.Today`): the day's date, then "Back to these"
 * (due reminders), "Saved this week" beside "From your shelf" (one column below 64em), and the
 * newest links as a masonry preview with "Open library". The sidebar row and the first tab of the
 * mobile shell lead here.
 */
@Component({
  selector: 'app-today-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonComponent,
    IconComponent,
    NoticeComponent,
    SkeletonComponent,
    LinkCardComponent,
    TodayBackComponent,
    TodayShelfComponent,
    TodayWeekComponent,
  ],
  providers: [TodayStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today.page.html',
  styleUrl: './today.page.scss',
})
export default class TodayPage {
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly store = inject(TodayStore);
  protected readonly chips = inject(FolderChipsService);
  protected readonly actions = inject(LinkActionsService);
  private readonly locale = inject(LocaleService);
  protected readonly CARD_MEDIA = CARD_MEDIA;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly libraryHref = `/${APP_PATH.Links}`;

  /** "Monday 23 November", in the active language. */
  protected readonly date = computed(() =>
    this.locale
      .dateTimeFormat({ weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date()),
  );

  constructor() {
    void this.store.load();
  }
}
