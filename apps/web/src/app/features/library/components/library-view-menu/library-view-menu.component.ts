import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CARD_PREVIEW } from '@shelfmark/contracts';
import {
  type SegmentedOption,
  type ViewMenuChoice,
  type ViewMenuField,
  type ViewMenuFieldChange,
  ViewMenuComponent,
} from '@shelfmark/ui';
import { ThemeService } from '../../../../core/theme/theme.service';
import { AppearanceSettingsService } from '../../../settings/services/appearance-settings.service';
import { isRowsView } from '../../utils/is-rows-view';
import { CARD_FIELD } from '../../models/card-field.const';
import { CARD_FIELD_KEYS } from '../../models/card-field-keys.const';
import type { CardField } from '../../models/card-field.type';
import { GRID_COLUMNS } from '../../models/grid-columns.const';
import { LibraryFilterService } from '../../services/library-filter.service';

const FIELDS: readonly CardField[] = Object.values(CARD_FIELD);

/** The account-wide "Show site" switch (the card's `data-card-site` layout attribute), not a per-feed field. */
const SITE_FIELD = 'site';

function isCardField(id: string): id is CardField {
  return (FIELDS as readonly string[]).includes(id);
}

/**
 * The library's View button (Shelf ViewMenu): Grid size in six steps and the Note, Hashtags,
 * Folder and Date switches, remembered per feed (`LibraryFilterService`, `FeedMemoryService`).
 * The grid size is off in the List and Headlines views. Two settings are the account's, not the
 * feed's, and are saved like the old Settings › Cards rows (`ThemeService` layout, saved through
 * `AppearanceSettingsService` / `UserSettingsStore`): the preview image size (Large, Small, Off)
 * and "Show site".
 */
@Component({
  selector: 'app-library-view-menu',
  imports: [TranslocoPipe, ViewMenuComponent],
  providers: [AppearanceSettingsService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './library-view-menu.component.html',
})
export class LibraryViewMenuComponent {
  protected readonly filters = inject(LibraryFilterService);
  private readonly theme = inject(ThemeService);
  private readonly appearance = inject(AppearanceSettingsService);
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  protected readonly steps = GRID_COLUMNS.length;
  protected readonly listView = computed(() => isRowsView(this.filters.view()));

  /** The four switches with their translated names and this feed's state. */
  protected readonly fields = computed<ViewMenuField[]>(() => {
    this.lang();
    const site: ViewMenuField = {
      id: SITE_FIELD,
      label: this.transloco.translate('library.viewMenu.fields.site'),
      checked: this.theme.layout().cardSite,
    };
    return [
      site,
      ...FIELDS.map((id) => ({
        id,
        label: this.transloco.translate(CARD_FIELD_KEYS[id]),
        checked: this.filters.fieldShown(id),
      })),
    ];
  });

  /** Preview image size: Large, Small or Off (the account's `cardPreview`). */
  protected readonly previewChoice = computed<ViewMenuChoice>(() => {
    this.lang();
    const options: SegmentedOption[] = Object.values(CARD_PREVIEW).map((value) => ({
      value,
      label: this.transloco.translate(`library.viewMenu.preview.${value}`),
    }));
    return {
      label: this.transloco.translate('library.viewMenu.preview.label'),
      options,
      value: this.theme.layout().cardPreview,
    };
  });

  /** "4 / 6" next to the Grid size heading. */
  protected readonly stepText = (step: number, steps: number): string => {
    this.lang();
    return this.transloco.translate('library.viewMenu.gridStep', { step, steps });
  };

  protected setStep(step: number): void {
    this.filters.setGridStep(step);
  }

  protected setPreview(value: string): void {
    this.appearance.setPreviewImage(value);
  }

  protected setField({ id, checked }: ViewMenuFieldChange): void {
    if (id === SITE_FIELD) {
      this.appearance.setCardPart({ cardSite: checked });
    } else if (isCardField(id)) {
      this.filters.setCardField(id, checked);
    }
  }
}
