import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CheckboxComponent,
  NOTICE_KIND,
  NoticeComponent,
  RADIO_OPTION_TONE,
  RadioGroupComponent,
  SelectComponent,
  type RadioOption,
  type SelectOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { FoldersStore } from '../../../../stores/folders.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { buildFolderOptions } from '../../../links/utils/folder-options';
import { IMPORT_FOLDERS_MODE } from '../../models/import-folders-mode.const';
import { IMPORT_NEW_FOLDER } from '../../models/import-new-folder.const';
import { ImportFlowService } from '../../services/import-flow.service';

/**
 * Step 2 of the import dialog ("Check before importing"): the numbers of the file, where the links
 * go (a new folder, one of the user's folders or Unsorted), skip duplicates and "Folders inside":
 * as in the file, AI groups by topic (only while AI is on and the allowance has room) or none.
 * Nothing is written here.
 */
@Component({
  selector: 'app-import-review',
  imports: [
    TranslocoPipe,
    CheckboxComponent,
    NoticeComponent,
    RadioGroupComponent,
    SelectComponent,
  ],
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
  protected readonly modesLabelId = 'import-review-modes';

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

  /** "Folders inside" as radio cards; the file's folders only when the file has some, AI when offered. */
  protected readonly modeOptions = computed<RadioOption[]>(() => {
    this.activeLang();
    const options: RadioOption[] = [];
    const counts = this.flow.counts();
    if (counts !== null && counts.folders > 0) {
      options.push({
        value: IMPORT_FOLDERS_MODE.File,
        title: this.transloco.translate('import.review.folders.file.title'),
        description: this.transloco.translate(
          pluralKey('import.review.folders.file.description', counts.folders),
          { count: this.locale.formatNumber(counts.folders) },
        ),
      });
    }
    const offer = this.flow.aiOffer();
    if (offer !== null) {
      options.push({
        value: IMPORT_FOLDERS_MODE.Ai,
        title: this.transloco.translate('import.review.folders.ai.title'),
        icon: 'spark',
        tone: RADIO_OPTION_TONE.Ai,
        description: this.transloco.translate('import.review.folders.ai.description', {
          count: this.locale.formatNumber(this.flow.importCount()),
          left: this.locale.formatNumber(offer.left),
        }),
      });
    }
    options.push({
      value: IMPORT_FOLDERS_MODE.None,
      title: this.transloco.translate('import.review.folders.none.title'),
      description: this.transloco.translate('import.review.folders.none.description', {
        target: this.flow.targetName(),
      }),
    });
    return options;
  });

  protected readonly roomText = computed(() => {
    this.activeLang();
    const room = this.flow.room();
    if (room <= 0) return this.transloco.translate('import.review.full');
    return this.transloco.translate(pluralKey('import.review.room', room), {
      count: this.locale.formatNumber(room),
    });
  });

  protected readonly skipKey = computed(() =>
    pluralKey('import.review.skip', this.flow.duplicates()),
  );

  constructor() {
    void this.folders.load();
  }

  protected setMode(value: string): void {
    const mode = Object.values(IMPORT_FOLDERS_MODE).find((item) => item === value);
    if (mode !== undefined) this.flow.setFoldersMode(mode);
  }

  protected setTarget(value: string | null): void {
    this.flow.target.set(value);
  }
}
