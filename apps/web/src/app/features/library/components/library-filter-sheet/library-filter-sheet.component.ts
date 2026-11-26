import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { injectDialogData, SheetComponent } from '@shelfmark/ui';
import type { LibraryFilterService } from '../../services/library-filter.service';
import { LibraryFilterFormComponent } from '../library-filter-form/library-filter-form.component';

/**
 * The library's Filter below 64em (mobile shell): a bottom sheet titled "Filter" with the same
 * groups as the desktop popover, the Saved control at full width so no label is cut. Opened by
 * `LibraryFilterPanelComponent` through `DialogService.open`, which passes the page's
 * `LibraryFilterService` as `data`. Closed by dragging down, Esc, the scrim or the close button;
 * every choice already applied.
 */
@Component({
  selector: 'app-library-filter-sheet',
  imports: [TranslocoPipe, SheetComponent, LibraryFilterFormComponent],
  templateUrl: './library-filter-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryFilterSheetComponent {
  protected readonly filters = injectDialogData<LibraryFilterService>();
}
