import { computed, inject, Injector, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { IMPORT_LIMIT, type ImportSource } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { IMPORT_API } from '../models/import-api.const';
import { IMPORT_FILE_PROBLEM } from '../models/import-file-problem.const';
import type { ImportFileProblem } from '../models/import-file-problem.type';
import { IMPORT_NEW_FOLDER } from '../models/import-new-folder.const';
import { IMPORT_REQUEST_BYTES } from '../models/import-request-bytes.const';
import { IMPORT_SOURCES } from '../models/import-sources.const';
import type { ImportSourceOption } from '../models/import-source-option.interface';
import { IMPORT_STEP } from '../models/import-step.const';
import type { ImportStep } from '../models/import-step.type';
import type { ParsedImport } from '../models/parsed-import.interface';
import { chunkBySize } from '../utils/chunk-by-size';
import { ImportParseError } from '../utils/import-parse-error';
import { importUrl, planImport, reviewCounts } from '../utils/plan-import';
import { ImportRunService } from './import-run.service';

/**
 * State of one import dialog (scoped to it): the source and file, the review choices and the hand
 * over to `ImportRunService`. Nothing is written before "Import N links": the file is read and
 * parsed in the browser and only the duplicate check asks the API (read-only).
 */
@Service()
export class ImportFlowService {
  private readonly injector = inject(Injector);
  private readonly transloco = inject(TranslocoService);
  private readonly runner = inject(ImportRunService);

  readonly sources = IMPORT_SOURCES;
  readonly step = signal<ImportStep>(
    this.runner.running() ? IMPORT_STEP.Progress : IMPORT_STEP.Source,
  );
  readonly sourceId = signal<ImportSource>(IMPORT_SOURCES[0].id);
  readonly source = computed<ImportSourceOption>(
    () => this.sources.find((source) => source.id === this.sourceId()) ?? this.sources[0],
  );
  readonly reading = signal(false);
  readonly problem = signal<ImportFileProblem | null>(null);
  readonly fileName = signal('');
  readonly parsed = signal<ParsedImport | null>(null);
  readonly saved = signal<ReadonlySet<number>>(new Set());

  /** "Put them into": `IMPORT_NEW_FOLDER`, a folder id, or `null` for Unsorted. */
  readonly target = signal<string | null>(IMPORT_NEW_FOLDER);
  readonly skipDuplicates = signal(true);
  readonly keepStructure = signal(true);

  readonly counts = computed(() => {
    const parsed = this.parsed();
    return parsed === null ? null : reviewCounts(parsed, this.saved());
  });
  readonly duplicates = computed(() => {
    const counts = this.counts();
    return counts === null ? 0 : counts.saved + counts.repeats;
  });
  /** Links "Import N links" will send. */
  readonly importCount = computed(() => {
    const counts = this.counts();
    if (counts === null) return 0;
    return counts.links - (this.skipDuplicates() ? this.duplicates() : 0);
  });

  /** Reads, parses and checks the file; moves to the review step when it can be imported. */
  async chooseFile(file: File): Promise<void> {
    if (this.reading()) return;
    this.problem.set(null);
    if (file.size > IMPORT_LIMIT.FileBytesMax) {
      this.problem.set(IMPORT_FILE_PROBLEM.TooBig);
      return;
    }
    this.reading.set(true);
    try {
      const parsed = await this.parse(file);
      if (parsed === null) return;
      const saved = await this.check(parsed);
      if (saved === null) return;
      this.fileName.set(file.name.slice(0, IMPORT_LIMIT.FileNameMax));
      this.parsed.set(parsed);
      this.saved.set(saved);
      this.keepStructure.set(true);
      this.skipDuplicates.set(true);
      this.step.set(IMPORT_STEP.Review);
    } finally {
      this.reading.set(false);
    }
  }

  back(): void {
    this.parsed.set(null);
    this.saved.set(new Set());
    this.step.set(IMPORT_STEP.Source);
  }

  /** Starts the run with the review choices and shows its progress. */
  startImport(): void {
    const parsed = this.parsed();
    if (parsed === null || this.importCount() === 0 || this.runner.running()) return;
    const plan = planImport(parsed, this.saved(), {
      skipDuplicates: this.skipDuplicates(),
      keepStructure: this.keepStructure(),
      newKey: () => globalThis.crypto.randomUUID(),
    });
    const target = this.target();
    const newFolderName = this.t('import.review.newFolderName');
    this.step.set(IMPORT_STEP.Progress);
    void this.runner.start({
      start: {
        source: this.sourceId(),
        fileName: this.fileName() || this.t('import.review.untitledFile'),
        ...(target === IMPORT_NEW_FOLDER && { newFolderName }),
        ...(target !== IMPORT_NEW_FOLDER && target !== null && { targetFolderId: target }),
      },
      plan,
      targetName: target === IMPORT_NEW_FOLDER ? newFolderName : null,
    });
  }

  private async parse(file: File): Promise<ParsedImport | null> {
    let parsed: ParsedImport;
    try {
      parsed = this.source().parse(await file.text(), this.t('import.review.untitledFolder'));
    } catch (error) {
      this.problem.set(
        error instanceof ImportParseError
          ? IMPORT_FILE_PROBLEM.NotBookmarks
          : IMPORT_FILE_PROBLEM.Unreadable,
      );
      return null;
    }
    if (parsed.links.length === 0) {
      this.problem.set(IMPORT_FILE_PROBLEM.Empty);
      return null;
    }
    if (parsed.links.length > IMPORT_LIMIT.LinksMax) {
      this.problem.set(IMPORT_FILE_PROBLEM.TooManyLinks);
      return null;
    }
    return parsed;
  }

  /** Indexes of links already saved, asked in chunks; `null` (with a problem) when it failed. */
  private async check(parsed: ParsedImport): Promise<ReadonlySet<number> | null> {
    const urls = parsed.links.map((link) => importUrl(link));
    const chunks = chunkBySize(urls, IMPORT_LIMIT.CheckBatchMax, IMPORT_REQUEST_BYTES);
    const saved = new Set<number>();
    let offset = 0;
    try {
      for (const chunk of chunks) {
        const response = await firstValueFrom(this.injector.get(IMPORT_API).check(chunk));
        for (const index of response.saved) saved.add(offset + index);
        offset += chunk.length;
      }
    } catch {
      this.problem.set(IMPORT_FILE_PROBLEM.CheckFailed);
      return null;
    }
    return saved;
  }

  private t(key: string): string {
    return this.transloco.translate(key);
  }
}
