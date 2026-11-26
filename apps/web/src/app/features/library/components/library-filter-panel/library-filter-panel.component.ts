import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogService, PopoverComponent } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { TagsStore } from '../../../../stores/tags.store';
import { LibraryFilterService } from '../../services/library-filter.service';
import { LibraryFilterFormComponent } from '../library-filter-form/library-filter-form.component';
import { LibraryFilterSheetComponent } from '../library-filter-sheet/library-filter-sheet.component';

/**
 * The library's Filter (Shelf `designs/01-library.html`, "Filter" in the toolbar): from 64em a
 * popover under the button, below it (the mobile shell) a bottom sheet like the Sort and "..."
 * menus (`app-library-filter-sheet`). Both show `app-library-filter-form`; the page's
 * `LibraryFilterService` owns the state.
 */
@Component({
  selector: 'app-library-filter-panel',
  imports: [TranslocoPipe, PopoverComponent, LibraryFilterFormComponent],
  templateUrl: './library-filter-panel.component.html',
  styleUrl: './library-filter-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryFilterPanelComponent {
  protected readonly filters = inject(LibraryFilterService);
  private readonly tags = inject(TagsStore);
  private readonly viewport = inject(ViewportService);
  private readonly dialogs = inject(DialogService);
  private readonly popover = viewChild.required(PopoverComponent);

  /** Opens the popover under `anchor` (from 64em) or the bottom sheet (below) with focus inside. */
  open(anchor: HTMLElement): void {
    void this.tags.load();
    if (this.viewport.compact()) {
      this.dialogs.open(LibraryFilterSheetComponent, {
        data: this.filters,
        restoreFocus: () => anchor,
      });
      return;
    }
    this.popover().openFrom(anchor, { focus: true });
  }
}
