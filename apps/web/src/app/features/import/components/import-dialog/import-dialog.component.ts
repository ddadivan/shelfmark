import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { IMPORT_LIMIT } from '@shelfmark/contracts';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  DropZoneComponent,
  NOTICE_KIND,
  NoticeComponent,
  RadioGroupComponent,
  SpinnerComponent,
  UiDialogRef,
  type RadioOption,
} from '@shelfmark/ui';
import { FileDragDirective } from '../../directives/file-drag.directive';
import { IMPORT_FOLDERS_MODE } from '../../models/import-folders-mode.const';
import { IMPORT_GROUPS_ERROR } from '../../models/import-groups-error.const';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { activeLang } from '../../../../core/i18n/active-lang';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { IMPORT_FILE_PROBLEM } from '../../models/import-file-problem.const';
import { IMPORT_RUN_PHASE } from '../../models/import-run-phase.const';
import { IMPORT_STEP } from '../../models/import-step.const';
import { ImportFlowService } from '../../services/import-flow.service';
import { ImportGroupsService } from '../../services/import-groups.service';
import { ImportRunService } from '../../services/import-run.service';
import { RecentImportsStore } from '../../services/recent-imports.store';
import { ImportGroupsComponent } from '../import-groups/import-groups.component';
import { RecentImportsComponent } from '../recent-imports/recent-imports.component';
import { ImportProgressComponent } from '../import-progress/import-progress.component';
import { ImportReviewComponent } from '../import-review/import-review.component';

const BYTES_PER_MB = 1024 * 1024;

/**
 * "Import links" (ImportExport.dc.html, section 2): choose the file (a drop anywhere in the dialog,
 * a short help, Recent imports with Undo), check before importing, AI groups (optional), then the
 * progress and the summary with "Open the folder" and "Undo import". Closing it while links are
 * being imported keeps the run going (`ImportRunService`).
 */
@Component({
  selector: 'app-import-dialog',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    DialogComponent,
    DropZoneComponent,
    FileDragDirective,
    ImportGroupsComponent,
    NoticeComponent,
    RecentImportsComponent,
    RadioGroupComponent,
    SpinnerComponent,
    ImportProgressComponent,
    ImportReviewComponent,
  ],
  providers: [ImportFlowService, ImportGroupsService],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDialogComponent implements OnDestroy {
  protected readonly flow = inject(ImportFlowService);
  protected readonly runner = inject(ImportRunService);
  private readonly recent = inject(RecentImportsStore);
  private readonly ref = inject(UiDialogRef);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  /** Full-width footer buttons in the phone sheet. */
  protected readonly phone = inject(ViewportService).phone;
  protected readonly IMPORT_STEP = IMPORT_STEP;
  protected readonly IMPORT_RUN_PHASE = IMPORT_RUN_PHASE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly IMPORT_FOLDERS_MODE = IMPORT_FOLDERS_MODE;
  protected readonly IMPORT_GROUPS_ERROR = IMPORT_GROUPS_ERROR;

  /** The short "how to export" steps are open. */
  protected readonly helpOpen = signal(false);

  protected readonly sourceOptions = computed<RadioOption[]>(() => {
    activeLang();
    return this.flow.sources.map((source) => ({
      value: source.id,
      title: this.transloco.translate(source.titleKey),
      description: this.transloco.translate(source.descriptionKey),
    }));
  });

  protected readonly title = computed(() => {
    const step = this.flow.step();
    return step === IMPORT_STEP.Review || step === IMPORT_STEP.Groups ? this.flow.fileName() : '';
  });

  protected readonly hint = computed(() => {
    activeLang();
    return this.transloco.translate('import.source.hint', {
      max: this.locale.formatNumber(IMPORT_LIMIT.FileBytesMax / BYTES_PER_MB),
      links: this.locale.formatNumber(IMPORT_LIMIT.LinksMax),
    });
  });

  protected readonly dropLabel = computed(() => {
    activeLang();
    return this.transloco.translate(
      this.flow.dragging() ? 'import.source.dropping' : 'import.source.drop',
    );
  });

  protected readonly readingText = computed(() => {
    activeLang();
    return this.transloco.translate('import.source.reading', { file: this.flow.readingName() });
  });

  /** The same drop works on the whole dialog while the file step is open and nothing is read. */
  protected readonly dropOff = computed(
    () => this.flow.step() !== IMPORT_STEP.Source || this.flow.reading(),
  );

  /** The main button of the groups step: with ticked new groups it says how many folders. */
  protected readonly groupsKey = computed(() =>
    this.flow.groups.newFolders().length > 0
      ? pluralKey('import.groups.import', this.flow.groups.newFolders().length)
      : pluralKey('import.review.import', this.flow.importCount()),
  );
  protected readonly groupsCount = computed(() =>
    this.flow.groups.newFolders().length > 0
      ? this.flow.groups.newFolders().length
      : this.flow.importCount(),
  );

  protected readonly problemText = computed(() => {
    activeLang();
    const problem = this.flow.problem();
    if (problem === null) return '';
    return this.transloco.translate(`import.source.problem.${problem}`, {
      max: String(
        problem === IMPORT_FILE_PROBLEM.TooBig
          ? IMPORT_LIMIT.FileBytesMax / BYTES_PER_MB
          : IMPORT_LIMIT.LinksMax,
      ),
    });
  });

  protected readonly importKey = computed(() =>
    pluralKey('import.review.import', this.flow.importCount()),
  );

  constructor() {
    this.runner.dialogOpened();
  }

  ngOnDestroy(): void {
    // A grouping no import took gives its allowance units back.
    this.flow.groups.release();
    this.runner.dialogClosed();
  }

  protected setDragging(over: boolean): void {
    this.flow.dragging.set(over);
  }

  protected setSource(value: string): void {
    const source = this.flow.sources.find((item) => item.id === value);
    if (source) this.flow.sourceId.set(source.id);
  }

  protected close(): void {
    this.ref.close();
  }

  /** The import's folder (or Unsorted), then the dialog closes. */
  protected openTarget(): void {
    const id = this.runner.run().targetFolderId;
    void this.router.navigate(id === null ? ['/', APP_PATH.Unsorted] : ['/', APP_PATH.Folders, id]);
    this.ref.close();
  }

  protected async undo(): Promise<void> {
    const { importId, created } = this.runner.run();
    if (importId === null) return;
    if (await this.recent.undo(importId, created)) {
      this.runner.reset();
      this.ref.close();
    }
  }

  /** After a failed grouping: import the links the way the file has them. */
  protected importPlain(): void {
    this.flow.importAsFile();
    this.flow.startImport();
  }

  /** After a failed start: back to the review with the same choices. */
  protected retry(): void {
    this.runner.reset();
    this.flow.step.set(IMPORT_STEP.Review);
  }
}
