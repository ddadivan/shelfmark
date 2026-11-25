import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { type ViewMenuField, type ViewMenuFieldChange, ViewMenuComponent } from '@shelfmark/ui';
import { isRowsView } from '../../utils/is-rows-view';
import { CARD_FIELD } from '../../models/card-field.const';
import { CARD_FIELD_KEYS } from '../../models/card-field-keys.const';
import type { CardField } from '../../models/card-field.type';
import { GRID_COLUMNS } from '../../models/grid-columns.const';
import { LibraryFilterService } from '../../services/library-filter.service';

const FIELDS: readonly CardField[] = Object.values(CARD_FIELD);

function isCardField(id: string): id is CardField {
  return (FIELDS as readonly string[]).includes(id);
}

/**
 * The library's View button (Shelf ViewMenu): Grid size in six steps and the Note, Hashtags,
 * Folder and Date switches, remembered per feed (`LibraryFilterService`, `FeedMemoryService`).
 * The grid size is off in the List and Headlines views.
 */
@Component({
  selector: 'app-library-view-menu',
  imports: [TranslocoPipe, ViewMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-view-menu.component.html',
})
export class LibraryViewMenuComponent {
  protected readonly filters = inject(LibraryFilterService);
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  protected readonly steps = GRID_COLUMNS.length;
  protected readonly listView = computed(() => isRowsView(this.filters.view()));

  /** The four switches with their translated names and this feed's state. */
  protected readonly fields = computed<ViewMenuField[]>(() => {
    this.lang();
    return FIELDS.map((id) => ({
      id,
      label: this.transloco.translate(CARD_FIELD_KEYS[id]),
      checked: this.filters.fieldShown(id),
    }));
  });

  /** "4 / 6" next to the Grid size heading. */
  protected readonly stepText = (step: number, steps: number): string => {
    this.lang();
    return this.transloco.translate('library.viewMenu.gridStep', { step, steps });
  };

  protected setStep(step: number): void {
    this.filters.setGridStep(step);
  }

  protected setField({ id, checked }: ViewMenuFieldChange): void {
    if (isCardField(id)) {
      this.filters.setCardField(id, checked);
    }
  }
}
