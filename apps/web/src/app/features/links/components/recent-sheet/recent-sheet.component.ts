import { ChangeDetectionStrategy, Component, computed, inject, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ButtonComponent,
  HISTORY_HEADING_LEVEL,
  SHEET_HEIGHT,
  SheetComponent,
} from '@shelfmark/ui';
import { LinksStore } from '../../../../stores/links.store';
import { RecentHistoryComponent } from '../recent-history/recent-history.component';

/**
 * The phone's "Recently opened": the same list as the `/recent` page in a bottom sheet, with
 * "Clear" as the header action. Open it with `DialogService.open(RecentSheetComponent)`.
 */
@Component({
  selector: 'app-recent-sheet',
  imports: [TranslocoPipe, ButtonComponent, RecentHistoryComponent, SheetComponent],
  templateUrl: './recent-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentSheetComponent {
  private readonly store = inject(LinksStore);
  protected readonly history = viewChild.required(RecentHistoryComponent);
  protected readonly hasHistory = computed(() => this.store.recent().length > 0);
  protected readonly SHEET_HEIGHT = SHEET_HEIGHT;
  protected readonly HISTORY_HEADING_LEVEL = HISTORY_HEADING_LEVEL;
}
