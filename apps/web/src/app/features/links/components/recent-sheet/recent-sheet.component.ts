import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  HISTORY_HEADING_LEVEL,
  SHEET_HEIGHT,
  SheetComponent,
} from '@shelfmark/ui';
import { LinksStore } from '../../../../stores/links.store';
import { ForgottenListComponent } from '../../../rediscover/components/forgotten-list/forgotten-list.component';
import { RECENT_VIEW } from '../../models/recent-view.const';
import type { RecentView } from '../../models/recent-view.type';
import { RecentHistoryComponent } from '../recent-history/recent-history.component';
import { RecentViewSwitchComponent } from '../recent-view-switch/recent-view-switch.component';

/**
 * The phone's "Recently opened": the same list as the `/recent` page in a bottom sheet, with
 * "Clear" as the header action and the "Opened · Forgotten" switch (#512; the choice lives in the
 * sheet, a dialog has no URL). Open it with `DialogService.open(RecentSheetComponent)`.
 */
@Component({
  selector: 'app-recent-sheet',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ForgottenListComponent,
    RecentHistoryComponent,
    RecentViewSwitchComponent,
    SheetComponent,
  ],
  templateUrl: './recent-sheet.component.html',
  styleUrl: './recent-sheet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentSheetComponent {
  private readonly store = inject(LinksStore);
  protected readonly history = viewChild(RecentHistoryComponent);
  protected readonly view = signal<RecentView>(RECENT_VIEW.Opened);
  protected readonly RECENT_VIEW = RECENT_VIEW;
  protected readonly hasHistory = computed(() => this.store.recent().length > 0);
  protected readonly SHEET_HEIGHT = SHEET_HEIGHT;
  protected readonly HISTORY_HEADING_LEVEL = HISTORY_HEADING_LEVEL;
}
