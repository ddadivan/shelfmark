import { ChangeDetectionStrategy, Component, DestroyRef, inject, viewChild } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { SearchDialogService } from '../../services/search-dialog.service';
import { SearchFieldService } from '../../services/search-field.service';
import { isMacPlatform } from '../../utils/is-mac-platform';
import { SearchResultsComponent } from '../search-results/search-results.component';

/**
 * The search of the desktop header (#329). From 80em it is a real field with a results panel
 * under it (`app-search-results` in `popup` mode); from 64em to 80em a compact "Search" button
 * with the shortcut hint that opens the search dialog. The switch is structural (`@if` on
 * `ViewportService.wide`), so the unused one is not rendered. The field registers itself with
 * `SearchFieldService`, which is how Cmd or Ctrl + K focuses it.
 */
@Component({
  selector: 'app-header-search',
  imports: [TranslocoPipe, ButtonComponent, SearchResultsComponent],
  host: { '[class.header-search--field]': 'viewport.wide()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header-search.component.html',
  styleUrl: './header-search.component.scss',
})
export class HeaderSearchComponent {
  protected readonly viewport = inject(ViewportService);
  protected readonly search = inject(SearchDialogService);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  /** Shortcut caps of the button (the key is Cmd on Apple devices, else Ctrl). */
  protected readonly shortcut = isMacPlatform() ? '⌘K' : 'Ctrl K';

  private readonly field = viewChild(SearchResultsComponent);

  constructor() {
    const unregister = inject(SearchFieldService).register(() => {
      const field = this.field();
      field?.focus();
      return field !== undefined;
    });
    inject(DestroyRef).onDestroy(unregister);
  }
}
