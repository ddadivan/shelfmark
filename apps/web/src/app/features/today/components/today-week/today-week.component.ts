import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SAVED_WITHIN, type LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  FolderIconComponent,
  IconComponent,
  ICON_SIZE,
  NoticeComponent,
} from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { SAVED_QUERY_PARAM } from '../../../links/models/saved-query-param.const';
import { FolderChipsService } from '../../../links/services/folder-chips.service';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { safeHref } from '../../../links/utils/link-view';
import { TodayThumbComponent } from '../today-thumb/today-thumb.component';
import { LINKS_SCOPE_LABEL_KEY } from '../../../links/models/links-scope-label-key.const';

/**
 * "Saved this week" of Today (Shelf): how many links came in over the last 7 days and how many
 * already sit in a folder, then the newest few as rows (preview, title, the folder it went to).
 * "Show all" opens the library with the Saved › This week filter.
 */
@Component({
  selector: 'app-today-week',
  imports: [
    RouterLink,
    TranslocoPipe,
    ButtonComponent,
    FolderIconComponent,
    IconComponent,
    NoticeComponent,
    TodayThumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './today-week.component.html',
  styleUrl: './today-week.component.scss',
})
export class TodayWeekComponent {
  readonly rows = input.required<readonly LinkResponse[]>();
  /** "12" or "100+". */
  readonly count = input.required<string>();
  readonly filed = input.required<number>();
  readonly loaded = input.required<boolean>();
  readonly failed = input(false);
  readonly retry = output<void>();

  protected readonly chips = inject(FolderChipsService);
  protected readonly LINKS_SCOPE_LABEL_KEY = LINKS_SCOPE_LABEL_KEY;
  private readonly actions = inject(LinkActionsService);
  protected readonly newTab = inject(UserSettingsStore).openInNewTab;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly safeHref = safeHref;
  protected readonly allHref = `/${APP_PATH.Links}`;
  protected readonly allQuery = { [SAVED_QUERY_PARAM]: SAVED_WITHIN.Week };

  protected opened(link: LinkResponse): void {
    this.actions.open(link);
  }
}
