import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ICON_SIZE,
  IconComponent,
  MeterComponent,
  NOTICE_KIND,
  NoticeComponent,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { IMPORT_RUN_PHASE } from '../../models/import-run-phase.const';
import { ImportRunService } from '../../services/import-run.service';

/**
 * Step 3 of the import dialog: the progress of the run ("212 of 375"), then the summary (imported,
 * where, folders, skipped, failed), or why it could not start. The actions sit in the dialog footer.
 */
@Component({
  selector: 'app-import-progress',
  imports: [TranslocoPipe, IconComponent, MeterComponent, NoticeComponent],
  templateUrl: './import-progress.component.html',
  styleUrl: './import-progress.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportProgressComponent {
  protected readonly runner = inject(ImportRunService);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(LocaleService);

  protected readonly IMPORT_RUN_PHASE = IMPORT_RUN_PHASE;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  protected readonly countText = computed(() => {
    const { processed, total } = this.runner.run();
    return this.transloco.translate('import.progress.count', {
      done: this.locale.formatNumber(processed),
      total: this.locale.formatNumber(total),
    });
  });

  protected readonly doneTitle = computed(() =>
    this.plural('import.progress.doneTitle', this.runner.run().created),
  );

  /** "In “Imported bookmarks”. 18 folders. 37 skipped: …. 4 could not be saved." */
  protected readonly doneText = computed(() => {
    const run = this.runner.run();
    const parts = [
      run.targetName !== null
        ? this.transloco.translate('import.progress.inFolder', { name: run.targetName })
        : this.transloco.translate(
            run.targetFolderId === null ? 'import.progress.inUnsorted' : 'import.progress.inTarget',
          ),
    ];
    if (run.folders > 0) parts.push(this.plural('import.progress.folders', run.folders));
    if (run.skipped > 0) parts.push(this.plural('import.progress.skipped', run.skipped));
    if (run.failed > 0) parts.push(this.plural('import.progress.failed', run.failed));
    return parts.join(' ');
  });

  private plural(base: string, count: number): string {
    return this.transloco.translate(pluralKey(base, count), {
      count: this.locale.formatNumber(count),
    });
  }
}
