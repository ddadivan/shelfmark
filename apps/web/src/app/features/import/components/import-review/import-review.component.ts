import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CheckboxComponent,
  NOTICE_KIND,
  NoticeComponent,
  SelectComponent,
  type SelectOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { buildFolderOptions } from '../../../links/utils/folder-options';
import { IMPORT_NEW_FOLDER } from '../../models/import-new-folder.const';
import { ImportFlowService } from '../../services/import-flow.service';

/**
 * Step 2 of the import dialog ("Check before importing"): the numbers of the file, where the links
 * go (a new folder, one of the user's folders or Unsorted), skip duplicates and keep the folder
 * structure. Nothing is written here.
 */
@Component({
  selector: 'app-import-review',
  imports: [TranslocoPipe, CheckboxComponent, NoticeComponent, SelectComponent],
  templateUrl: './import-review.component.html',
  styleUrl: './import-review.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportReviewComponent {
  protected readonly flow = inject(ImportFlowService);
  private readonly folders = inject(FoldersStore);
  private readonly settings = inject(UserSettingsStore);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);
  private readonly activeLang = activeLang;

  protected readonly NOTICE_KIND = NOTICE_KIND;

  /** The three numbers with their plural labels. */
  protected readonly stats = computed(() => {
    const counts = this.flow.counts();
    if (counts === null) return [];
    return [
      { value: counts.links, labelKey: pluralKey('import.review.stats.links', counts.links) },
      { value: counts.folders, labelKey: pluralKey('import.review.stats.folders', counts.folders) },
      { value: counts.saved, labelKey: 'import.review.stats.saved' },
    ].map((stat) => ({ ...stat, text: this.locale.formatNumber(stat.value) }));
  });

  protected readonly targetOptions = computed<SelectOption[]>(() => {
    this.activeLang();
    const name = this.transloco.translate('import.review.newFolderName');
    return [
      {
        id: IMPORT_NEW_FOLDER,
        name: this.transloco.translate('import.review.newFolder', { name }),
      },
      ...buildFolderOptions(this.folders.entities(), this.settings.shownColour),
    ];
  });

  protected readonly skipKey = computed(() =>
    pluralKey('import.review.skip', this.flow.duplicates()),
  );

  constructor() {
    void this.folders.load();
  }

  protected setTarget(value: string | null): void {
    this.flow.target.set(value);
  }
}
