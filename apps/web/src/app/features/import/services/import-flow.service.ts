import { computed, inject, Injector, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { IMPORT_LIMIT, type ImportSource } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { FoldersStore } from '../../../stores/folders.store';
import { AiSettingsStore } from '../../ai/services/ai-settings.store';
import { IMPORT_API } from '../models/import-api.const';
import { IMPORT_FILE_PROBLEM } from '../models/import-file-problem.const';
import type { ImportFileProblem } from '../models/import-file-problem.type';
import { IMPORT_FOLDERS_MODE } from '../models/import-folders-mode.const';
import type { ImportFoldersMode } from '../models/import-folders-mode.type';
import { IMPORT_NEW_FOLDER } from '../models/import-new-folder.const';
import { IMPORT_REQUEST_BYTES } from '../models/import-request-bytes.const';
import { IMPORT_SOURCES } from '../models/import-sources.const';
import type { ImportSourceOption } from '../models/import-source-option.interface';
import { IMPORT_STEP } from '../models/import-step.const';
import type { ImportStep } from '../models/import-step.type';
import type { ImportGroupedFolders } from '../models/import-grouped-folders.interface';
import type { ImportPlan } from '../models/import-plan.interface';
import type { ParsedImport } from '../models/parsed-import.interface';
import { chunkBySize } from '../utils/chunk-by-size';
import { ImportParseError } from '../utils/import-parse-error';
import { importUrl, planImport, reviewCounts } from '../utils/plan-import';
import { applyGroups } from '../utils/apply-groups';
import { groupsRequest } from '../utils/groups-request';
import { ImportGroupsService } from './import-groups.service';
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
  private readonly settings = inject(AiSettingsStore);
  private readonly folders = inject(FoldersStore);
  readonly groups = inject(ImportGroupsService);

  readonly sources = IMPORT_SOURCES;
  readonly step = signal<ImportStep>(
    this.runner.running() ? IMPORT_STEP.Progress : IMPORT_STEP.Source,
  );
  readonly sourceId = signal<ImportSource>(IMPORT_SOURCES[0].id);
  readonly source = computed<ImportSourceOption>(
    () => this.sources.find((source) => source.id === this.sourceId()) ?? this.sources[0],
  );
  readonly reading = signal(false);
  /** Name of the file being read (step 1b). */
  readonly readingName = signal('');
  readonly problem = signal<ImportFileProblem | null>(null);
  readonly fileName = signal('');
  readonly parsed = signal<ParsedImport | null>(null);
  readonly saved = signal<ReadonlySet<number>>(new Set());

  /** "Put them into": `IMPORT_NEW_FOLDER`, a folder id, or `null` for Unsorted. */
  readonly target = signal<string | null>(IMPORT_NEW_FOLDER);
  readonly skipDuplicates = signal(true);
  /** The user's choice of "Folders inside"; `foldersMode` is what applies. */
  private readonly chosenMode = signal<ImportFoldersMode>(IMPORT_FOLDERS_MODE.File);
  /** How many more links fit the link limit (from the duplicate check). */
  readonly room = signal(Number.POSITIVE_INFINITY);
  /** A file is being dragged over the dialog (step 1a). */
  readonly dragging = signal(false);

  readonly counts = computed(() => {
    const parsed = this.parsed();
    return parsed === null ? null : reviewCounts(parsed, this.saved());
  });
  readonly duplicates = computed(() => {
    const counts = this.counts();
    return counts === null ? 0 : counts.saved + counts.repeats;
  });
  /** Links of the file that are not left out as duplicates. */
  private readonly wanted = computed(() => {
    const counts = this.counts();
    if (counts === null) return 0;
    return counts.links - (this.skipDuplicates() ? this.duplicates() : 0);
  });
  /** Links "Import N links" will send: at most what the link limit still has room for. */
  readonly importCount = computed(() => Math.min(this.wanted(), this.room()));
  /** Links that do not fit the limit and are left out (the first ones are imported). */
  readonly overRoom = computed(() => Math.max(0, this.wanted() - this.room()));

  readonly hasFolders = computed(() => (this.counts()?.folders ?? 0) > 0);
  /**
   * What the "AI groups by topic" choice needs: AI on, a backfill allowance that has room for every
   * link to import, and no more links than one grouping takes (ADR 0056 decision 10). `left` is the
   * allowance left, for "Takes N of M"; `null` hides the choice.
   */
  readonly aiOffer = computed<{ left: number } | null>(() => {
    const usage = this.settings.usage();
    const count = this.importCount();
    if (!this.settings.isOn() || this.settings.providerUnavailable() || usage === null) return null;
    const left = usage.backfillLimit - usage.backfillUsed;
    const fits = usage.backfillLimit > 0 && count > 0 && count <= IMPORT_LIMIT.GroupLinksMax;
    return fits && left >= count ? { left } : null;
  });
  /** The choice in effect: a choice that is no longer possible falls back. */
  readonly foldersMode = computed<ImportFoldersMode>(() => {
    const mode = this.chosenMode();
    if (mode === IMPORT_FOLDERS_MODE.Ai && this.aiOffer() === null) return this.fallbackMode();
    if (mode === IMPORT_FOLDERS_MODE.File && !this.hasFolders()) return this.fallbackMode();
    return mode;
  });
  /** Name of where the links go, for "Everything in one list in “…”". */
  readonly targetName = computed(() => {
    const target = this.target();
    if (target === IMPORT_NEW_FOLDER) return this.t('import.review.newFolderName');
    if (target === null) return this.t('import.review.unsorted');
    return this.folders.entityMap()[target]?.name ?? this.t('import.review.unsorted');
  });

  constructor() {
    void this.settings.load();
    void this.folders.load();
  }

  setFoldersMode(mode: ImportFoldersMode): void {
    this.chosenMode.set(mode);
  }

  /** Reads, parses and checks the file; moves to the review step when it can be imported. */
  async chooseFile(file: File): Promise<void> {
    if (this.reading()) return;
    this.problem.set(null);
    if (file.size > IMPORT_LIMIT.FileBytesMax) {
      this.problem.set(IMPORT_FILE_PROBLEM.TooBig);
      return;
    }
    this.reading.set(true);
    this.readingName.set(file.name);
    try {
      const parsed = await this.parse(file);
      if (parsed === null) return;
      const checked = await this.check(parsed);
      if (checked === null) return;
      const { saved, room } = checked;
      this.fileName.set(file.name.slice(0, IMPORT_LIMIT.FileNameMax));
      this.parsed.set(parsed);
      this.saved.set(saved);
      this.room.set(room);
      this.skipDuplicates.set(true);
      this.chosenMode.set(
        parsed.folders.length > 0
          ? IMPORT_FOLDERS_MODE.File
          : this.aiOffer() !== null
            ? IMPORT_FOLDERS_MODE.Ai
            : IMPORT_FOLDERS_MODE.None,
      );
      this.step.set(IMPORT_STEP.Review);
    } finally {
      this.reading.set(false);
    }
  }

  /** Back one step: from the groups to the check, from the check to the file. */
  back(): void {
    if (this.step() === IMPORT_STEP.Groups) {
      this.groups.reset();
      this.step.set(IMPORT_STEP.Review);
      return;
    }
    this.parsed.set(null);
    this.saved.set(new Set());
    this.step.set(IMPORT_STEP.Source);
  }

  /** The main button of the check: the groups (AI chosen) or the import itself. */
  next(): void {
    if (this.foldersMode() === IMPORT_FOLDERS_MODE.Ai) void this.requestGroups();
    else this.startImport();
  }

  /** Step 2a: asks the API for groups for the links the import would send. */
  async requestGroups(): Promise<void> {
    const parsed = this.parsed();
    if (parsed === null || this.aiOffer() === null) return;
    this.step.set(IMPORT_STEP.Groups);
    await this.groups.load(groupsRequest(this.plan(parsed, false), parsed));
  }

  /**
   * Starts the run with the check's choices and shows its progress. From step 2a (groups made, no
   * error) the ticked groups become folders and the import asks for the AI pass; a failed grouping
   * imports as the file has it.
   */
  startImport(): void {
    const parsed = this.parsed();
    if (parsed === null || this.importCount() === 0 || this.runner.running()) return;
    const ai = this.step() === IMPORT_STEP.Groups && this.groups.error() === null;
    const plan = ai
      ? applyGroups(this.plan(parsed, false), this.groups.assignment())
      : this.plan(parsed, this.foldersMode() === IMPORT_FOLDERS_MODE.File);
    const target = this.target();
    const newFolderName = this.t('import.review.newFolderName');
    this.step.set(IMPORT_STEP.Progress);
    void this.runner.start({
      start: {
        source: this.sourceId(),
        fileName: this.fileName() || this.t('import.review.untitledFile'),
        ...(target === IMPORT_NEW_FOLDER && { newFolderName }),
        ...(target !== IMPORT_NEW_FOLDER && target !== null && { targetFolderId: target }),
        ...(ai && { aiPass: true }),
      },
      plan,
      targetName: target === IMPORT_NEW_FOLDER ? newFolderName : null,
      ...(ai && { grouped: this.groupedFolders(plan) }),
    });
  }

  /** After a failed grouping: the file's folders (or none) instead, back on the check. */
  importAsFile(): void {
    this.groups.reset();
    this.chosenMode.set(this.fallbackMode());
    this.step.set(IMPORT_STEP.Review);
  }

  /** The plan of the check's choices: with the file's folders or flat, within the room left. */
  private plan(parsed: ParsedImport, keepStructure: boolean): ImportPlan {
    return planImport(parsed, this.saved(), {
      skipDuplicates: this.skipDuplicates(),
      keepStructure,
      limit: this.room(),
      newKey: () => globalThis.crypto.randomUUID(),
    });
  }

  private groupedFolders(plan: ImportPlan): ImportGroupedFolders {
    const used = new Set(
      plan.links.flatMap((link) => {
        const key = link.folderId ?? link.folderKey;
        return key === null ? [] : [key];
      }),
    );
    return { folders: used.size, created: plan.folders.length };
  }

  private fallbackMode(): ImportFoldersMode {
    return this.hasFolders() ? IMPORT_FOLDERS_MODE.File : IMPORT_FOLDERS_MODE.None;
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

  /** Indexes of links already saved and the room left, asked in chunks; `null` (with a problem) when it failed. */
  private async check(
    parsed: ParsedImport,
  ): Promise<{ saved: ReadonlySet<number>; room: number } | null> {
    const urls = parsed.links.map((link) => importUrl(link));
    const chunks = chunkBySize(urls, IMPORT_LIMIT.CheckBatchMax, IMPORT_REQUEST_BYTES);
    const saved = new Set<number>();
    let room = Number.POSITIVE_INFINITY;
    let offset = 0;
    try {
      for (const chunk of chunks) {
        const response = await firstValueFrom(this.injector.get(IMPORT_API).check(chunk));
        for (const index of response.saved) saved.add(offset + index);
        room = Math.min(room, response.room);
        offset += chunk.length;
      }
    } catch {
      this.problem.set(IMPORT_FILE_PROBLEM.CheckFailed);
      return null;
    }
    return { saved, room };
  }

  private t(key: string): string {
    return this.transloco.translate(key);
  }
}
