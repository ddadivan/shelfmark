import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogCancelDirective,
  DialogComponent,
  injectDialogData,
  RadioGroupComponent,
  SegmentedControlComponent,
  SpinnerComponent,
  TOAST_KIND,
  ToastService,
  UiDialogRef,
  type RadioOption,
  type SegmentedOption,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { relativeTime } from '../../../../core/i18n/relative-time';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { EXPORT_FORMAT_OPTIONS } from '../../models/export-format-options.const';
import { EXPORT_RESULT } from '../../models/export-result.const';
import type { LastExport } from '../../models/last-export.interface';
import { FoldersStore } from '../../../../stores/folders.store';
import type { ExportFolderChoice } from '../../models/export-folder-choice.interface';
import { ExportActionsService } from '../../services/export-actions.service';
import { readLastExport, writeLastExport } from '../../utils/last-export';

/** The segmented value of "Whole library". */
const ALL_LINKS = 'all';

function isFormat(value: string): value is ExportFormat {
  return (Object.values(EXPORT_FORMAT) as string[]).includes(value);
}

/**
 * "Export" (ImportExport.dc.html, section 3): the whole library as JSON, Bookmarks HTML or CSV,
 * with the last export of this browser under the cards. While the file is prepared the cards and
 * Download are off and Cancel aborts the request; when it is saved the dialog closes with a toast.
 * A failure keeps the dialog open (the error toast has the retry).
 */
@Component({
  selector: 'app-export-dialog',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    DialogCancelDirective,
    DialogComponent,
    RadioGroupComponent,
    SegmentedControlComponent,
    SpinnerComponent,
  ],
  templateUrl: './export-dialog.component.html',
  styleUrl: './export-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportDialogComponent {
  private readonly exporter = inject(ExportActionsService);
  private readonly ref = inject(UiDialogRef);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  /** Full-width footer buttons in the phone sheet. */
  protected readonly phone = inject(ViewportService).phone;

  /** The cards the contract has a format for. */
  private readonly formats = EXPORT_FORMAT_OPTIONS.filter((option) => isFormat(option.value));
  protected readonly format = signal<ExportFormat>(EXPORT_FORMAT.Json);
  protected readonly preparing = signal(false);
  private readonly last = signal<LastExport | null>(readLastExport());
  private readonly abort = new AbortController();
  private readonly folders = inject(FoldersStore);

  /** The folder page the dialog was opened on, offered next to the whole library. */
  protected readonly folder = injectDialogData<ExportFolderChoice | null>() ?? null;
  /** `ALL_LINKS` or the folder's id. */
  protected readonly scope = signal<string>(ALL_LINKS);
  protected readonly scopeOptions = computed<SegmentedOption[]>(() => {
    activeLang();
    const folder = this.folder;
    if (folder === null) return [];
    return [
      {
        value: ALL_LINKS,
        label: this.transloco.translate('export.dialog.whole', {
          count: this.locale.formatNumber(this.folders.counts().all),
        }),
      },
      {
        value: folder.id,
        label: this.transloco.translate('export.dialog.folder', {
          name: folder.name,
          count: this.locale.formatNumber(folder.count),
        }),
      },
    ];
  });

  protected readonly options = computed<RadioOption[]>(() => {
    activeLang();
    return this.formats.map((option) => ({
      value: option.value,
      title: this.transloco.translate(option.titleKey),
      description: this.transloco.translate(option.descriptionKey),
    }));
  });

  /** The file type in capitals ("JSON", "HTML", "CSV"), the same in every language. */
  protected readonly formatName = computed(() => this.format().toUpperCase());

  protected readonly lastLine = computed(() => {
    const last = this.last();
    if (!last) {
      return null;
    }
    activeLang();
    return this.transloco.translate('export.dialog.last', {
      when: relativeTime(last.at, Date.now(), this.locale.locale()),
      format: last.format.toUpperCase(),
    });
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.abort.abort();
    });
  }

  protected choose(value: string): void {
    if (isFormat(value)) {
      this.format.set(value);
    }
  }

  protected async download(): Promise<void> {
    if (this.preparing()) {
      return;
    }
    const format = this.format();
    this.preparing.set(true);
    const scope = this.scope() === ALL_LINKS ? {} : { folderId: this.scope() };
    const result = await this.exporter.download(format, scope, { signal: this.abort.signal });
    if (this.abort.signal.aborted) {
      return;
    }
    this.preparing.set(false);
    if (result === EXPORT_RESULT.Saved) {
      this.last.set(writeLastExport(format));
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.transloco.translate('export.dialog.saved'),
      });
    }
    if (result === EXPORT_RESULT.Saved || result === EXPORT_RESULT.Empty) {
      this.ref.close();
    }
  }

  protected cancel(): void {
    this.abort.abort();
    this.ref.close();
  }
}
