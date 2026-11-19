import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy } from '@angular/core';
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
import { activeLang } from '../../../../core/i18n/active-lang';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { APP_PATH } from '../../../../models/app-path.const';
import { IMPORT_FILE_PROBLEM } from '../../models/import-file-problem.const';
import { IMPORT_RUN_PHASE } from '../../models/import-run-phase.const';
import { IMPORT_STEP } from '../../models/import-step.const';
import { ImportFlowService } from '../../services/import-flow.service';
import { ImportRunService } from '../../services/import-run.service';
import { RecentImportsStore } from '../../services/recent-imports.store';
import { ImportProgressComponent } from '../import-progress/import-progress.component';
import { ImportReviewComponent } from '../import-review/import-review.component';

const BYTES_PER_MB = 1024 * 1024;

/**
 * "Import links" (Import.dc.html): choose the source and the file, check before importing, then the
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
    NoticeComponent,
    RadioGroupComponent,
    SpinnerComponent,
    ImportProgressComponent,
    ImportReviewComponent,
  ],
  providers: [ImportFlowService],
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

  protected readonly IMPORT_STEP = IMPORT_STEP;
  protected readonly IMPORT_RUN_PHASE = IMPORT_RUN_PHASE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  protected readonly sourceOptions = computed<RadioOption[]>(() => {
    activeLang();
    return this.flow.sources.map((source) => ({
      value: source.id,
      title: this.transloco.translate(source.titleKey),
      description: this.transloco.translate(source.descriptionKey),
    }));
  });

  protected readonly title = computed(() =>
    this.flow.step() === IMPORT_STEP.Review ? this.flow.fileName() : '',
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
    this.runner.dialogClosed();
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

  /** After a failed start: back to the review with the same choices. */
  protected retry(): void {
    this.runner.reset();
    this.flow.step.set(IMPORT_STEP.Review);
  }
}
