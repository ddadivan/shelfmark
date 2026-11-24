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
  DropZoneComponent,
  isMacPlatform,
  NOTICE_KIND,
  NoticeComponent,
  SegmentedControlComponent,
  SpinnerComponent,
  StepperComponent,
  type SegmentedOption,
} from '@shelfmark/ui';
import { activeLang } from '../../core/i18n/active-lang';
import { LocaleService } from '../../core/i18n/locale.service';
import { pluralKey } from '../../core/i18n/plural-key';
import { APP_PATH } from '../../models/app-path.const';
import { importHelpSteps } from './components/import-help/import-help-steps';
import { ImportHelpComponent } from './components/import-help/import-help.component';
import { ImportGroupsComponent } from './components/import-groups/import-groups.component';
import { ImportProgressComponent } from './components/import-progress/import-progress.component';
import { ImportReviewComponent } from './components/import-review/import-review.component';
import { RecentImportsComponent } from './components/recent-imports/recent-imports.component';
import { FileDragDirective } from './directives/file-drag.directive';
import { IMPORT_FILE_PROBLEM } from './models/import-file-problem.const';
import { IMPORT_FOLDERS_MODE } from './models/import-folders-mode.const';
import { IMPORT_RUN_PHASE } from './models/import-run-phase.const';
import { IMPORT_STEP } from './models/import-step.const';
import { ImportFlowService } from './services/import-flow.service';
import { ImportGroupsService } from './services/import-groups.service';
import { ImportRunService } from './services/import-run.service';
import { RecentImportsStore } from './services/recent-imports.store';
import { detectBrowser } from './utils/detect-browser';

const BYTES_PER_MB = 1024 * 1024;
/** The stepper's place of each step (Shelf 09-data: Choose file, Check, Folders, Import). */
const STEP_NUMBER = {
  [IMPORT_STEP.Source]: 1,
  [IMPORT_STEP.Review]: 2,
  [IMPORT_STEP.Groups]: 3,
  [IMPORT_STEP.Progress]: 4,
} as const;

/**
 * `/import` (Shelf 09-data "Import bookmarks"): a page with the numbered steps Choose file, Check,
 * Folders (the AI groups) and Import, over the flow of `ImportFlowService` (page-scoped) and the
 * run of `ImportRunService` (root: leaving the page keeps it going, a toast says when it ends).
 * Choose file has the drop zone (a drop anywhere on the page works too), how to get the file for
 * one browser at a time (the detected one first) and Recent imports with Undo; the run ends on a
 * card with Open the folder, Undo import and Import another file.
 */
@Component({
  selector: 'app-import-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    DropZoneComponent,
    FileDragDirective,
    ImportGroupsComponent,
    ImportHelpComponent,
    ImportProgressComponent,
    ImportReviewComponent,
    NoticeComponent,
    RecentImportsComponent,
    SegmentedControlComponent,
    SpinnerComponent,
    StepperComponent,
  ],
  providers: [ImportFlowService, ImportGroupsService],
  templateUrl: './import.page.html',
  styleUrl: './import.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ImportPage implements OnDestroy {
  protected readonly flow = inject(ImportFlowService);
  protected readonly runner = inject(ImportRunService);
  private readonly recent = inject(RecentImportsStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  protected readonly IMPORT_STEP = IMPORT_STEP;
  protected readonly IMPORT_RUN_PHASE = IMPORT_RUN_PHASE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  private readonly helpSteps = importHelpSteps(isMacPlatform());
  /** The browser this page runs in, when the help knows it. */
  protected readonly detected = detectBrowser(
    globalThis.navigator?.userAgent ?? '',
    this.helpSteps.map((step) => step.id),
  );
  protected readonly browser = signal(this.detected);

  protected readonly done = computed(
    () =>
      this.flow.step() === IMPORT_STEP.Progress &&
      this.runner.run().phase === IMPORT_RUN_PHASE.Done,
  );
  protected readonly stepNumber = computed(() => STEP_NUMBER[this.flow.step()]);
  protected readonly stepNames = computed(() => {
    activeLang();
    return ['source', 'check', 'folders', 'import'].map((key) =>
      this.transloco.translate(`import.page.step.${key}`),
    );
  });
  protected readonly lead = computed(() => {
    activeLang();
    switch (this.flow.step()) {
      case IMPORT_STEP.Source:
        return this.transloco.translate('import.page.lead');
      case IMPORT_STEP.Progress:
        return this.transloco.translate('import.page.background');
      default:
        return this.flow.fileName();
    }
  });
  protected readonly browserOptions = computed<SegmentedOption[]>(() =>
    this.helpSteps.map((step) => ({ value: step.id, label: this.browserName(step.id) })),
  );

  protected readonly aiMode = computed(() => this.flow.foldersMode() === IMPORT_FOLDERS_MODE.Ai);
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
  /** The page takes a drop while the file step is open and nothing is read. */
  protected readonly dropOff = computed(
    () => this.flow.step() !== IMPORT_STEP.Source || this.flow.reading(),
  );
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

  protected browserName(id: string): string {
    return this.transloco.translate(`import.page.browser.${id}`);
  }

  /** The import's folder (or Unsorted). */
  protected openTarget(): void {
    const id = this.runner.run().targetFolderId;
    void this.router.navigate(id === null ? ['/', APP_PATH.Unsorted] : ['/', APP_PATH.Folders, id]);
  }

  protected async undo(): Promise<void> {
    const { importId, created } = this.runner.run();
    if (importId === null) return;
    if (await this.recent.undo(importId, created)) {
      this.again();
    }
  }

  /** Back to Choose file for another file. */
  protected again(): void {
    this.runner.reset();
    this.flow.back();
    this.flow.step.set(IMPORT_STEP.Source);
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
