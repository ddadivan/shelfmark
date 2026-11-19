import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector, Service, signal } from '@angular/core';
import {
  IMPORT_ERROR_MESSAGE,
  LINK_LIMIT,
  type ImportLinkItem,
  type StartImportResponse,
} from '@shelfmark/contracts';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { hasApiMessage } from '../../../core/api/api-error';
import { pluralKey } from '../../../core/i18n/plural-key';
import { TAB_SYNC_KIND } from '../../../core/sync/models/tab-sync-kind.const';
import { TabSyncService } from '../../../core/sync/tab-sync.service';
import { FoldersStore } from '../../../stores/folders.store';
import { LinksStore } from '../../../stores/links.store';
import { PinsStore } from '../../../stores/pins.store';
import { TagsStore } from '../../../stores/tags.store';
import { TrashStore } from '../../../stores/trash.store';
import { IMPORT_API } from '../models/import-api.const';
import { IMPORT_REQUEST_BYTES } from '../models/import-request-bytes.const';
import { IMPORT_RUN_IDLE } from '../models/import-run-idle.const';
import { IMPORT_RUN_PHASE } from '../models/import-run-phase.const';
import type { ImportRunRequest } from '../models/import-run-request.interface';
import type { ImportRunState } from '../models/import-run-state.interface';
import { chunkBySize } from '../utils/chunk-by-size';
import { RecentImportsStore } from './recent-imports.store';

/** Statuses after which the next batches would fail too (session, import gone or closed, cap). */
const STOP_STATUSES: readonly number[] = [
  HttpStatusCode.Unauthorized,
  HttpStatusCode.Forbidden,
  HttpStatusCode.NotFound,
  HttpStatusCode.Conflict,
];

/**
 * Runs one import (ADR 0056): starts it (folders included), sends the links in batches one after
 * another and records the counts. A failed batch is counted as failed and the next one runs;
 * a session, cap or closed import stops the run and counts the rest as failed. Root, so the run
 * goes on when the dialog is closed ("You can keep working"); the library is read again at the end.
 */
@Service()
export class ImportRunService {
  private readonly injector = inject(Injector);
  private readonly state = signal<ImportRunState>(IMPORT_RUN_IDLE);
  /** Whether the import dialog shows the run; a run that ends unseen says so in a toast. */
  private dialogShown = false;

  readonly run = this.state.asReadonly();
  readonly running = computed(() => this.state().phase === IMPORT_RUN_PHASE.Running);
  /** Share of the planned links handled, 0 to 100. */
  readonly percent = computed(() => {
    const { total, processed } = this.state();
    return total === 0 ? 100 : Math.round((processed / total) * 100);
  });

  /** Starts a run unless one is running; resolves when it ended (done or failed). */
  async start(request: ImportRunRequest): Promise<void> {
    if (this.running()) {
      return;
    }
    const { plan } = request;
    this.state.set({
      ...IMPORT_RUN_IDLE,
      phase: IMPORT_RUN_PHASE.Running,
      total: plan.links.length,
      skipped: plan.skipped,
      targetName: request.targetName,
    });
    let started: StartImportResponse;
    try {
      started = await firstValueFrom(
        this.api().start({ ...request.start, folders: [...plan.folders] }),
      );
    } catch (error) {
      this.state.update((state) => ({
        ...state,
        phase: IMPORT_RUN_PHASE.Failed,
        errorKey: hasApiMessage(error, IMPORT_ERROR_MESSAGE.FoldersLimit)
          ? 'import.progress.foldersLimit'
          : 'import.progress.startFailed',
      }));
      return;
    }
    const folderIds = new Map(started.folders.map((folder) => [folder.key, folder.id]));
    this.state.update((state) => ({
      ...state,
      importId: started.id,
      targetFolderId: started.targetFolderId,
      folders: started.folders.length + (request.start.newFolderName === undefined ? 0 : 1),
    }));
    const items: ImportLinkItem[] = plan.links.map((link) => {
      const folderId = link.folderKey === null ? undefined : folderIds.get(link.folderKey);
      return { ...link.item, ...(folderId !== undefined && { folderId }) };
    });
    await this.sendBatches(started.id, items);
    const { skipped, failed } = this.state();
    try {
      await firstValueFrom(this.api().finish(started.id, { skipped, failed }));
    } catch {
      // The counts of Recent imports stay at what the batches recorded.
    }
    this.state.update((state) => ({ ...state, phase: IMPORT_RUN_PHASE.Done }));
    this.refreshLibrary();
    if (!this.dialogShown) this.announce();
  }

  /** The dialog was closed meanwhile: the result as a toast. */
  private announce(): void {
    const transloco = this.injector.get(TranslocoService);
    const { created } = this.state();
    this.injector.get(ToastService).show({
      kind: TOAST_KIND.Success,
      title: transloco.translate(pluralKey('import.progress.doneTitle', created), {
        count: String(created),
      }),
    });
  }

  dialogOpened(): void {
    this.dialogShown = true;
    // A finished run whose summary was already seen (or never shown) starts over.
    if (!this.running()) this.state.set(IMPORT_RUN_IDLE);
  }

  dialogClosed(): void {
    this.dialogShown = false;
  }

  /** Back to idle once the summary was seen (a new import may start). */
  reset(): void {
    if (!this.running()) {
      this.state.set(IMPORT_RUN_IDLE);
    }
  }

  private async sendBatches(id: string, items: readonly ImportLinkItem[]): Promise<void> {
    const batches = chunkBySize(items, LINK_LIMIT.BatchMax, IMPORT_REQUEST_BYTES);
    for (const [index, batch] of batches.entries()) {
      try {
        const response = await firstValueFrom(
          this.api().addLinks(id, { items: batch, skipRepeats: false }),
        );
        this.state.update((state) => ({
          ...state,
          processed: state.processed + batch.length,
          created: state.created + response.created + response.replayed,
          skipped: state.skipped + response.errors.length,
        }));
      } catch (error) {
        const stop = error instanceof HttpErrorResponse && STOP_STATUSES.includes(error.status);
        const lost = stop
          ? batches.slice(index).reduce((sum, rest) => sum + rest.length, 0)
          : batch.length;
        this.state.update((state) => ({
          ...state,
          processed: state.processed + lost,
          failed: state.failed + lost,
        }));
        if (stop) return;
      }
    }
  }

  /** The new folders, tags and links show up everywhere, other tabs included. */
  private refreshLibrary(): void {
    void this.injector.get(FoldersStore).refresh();
    void this.injector.get(TagsStore).refresh();
    void this.injector.get(PinsStore).refresh();
    void this.injector.get(TrashStore).refresh();
    this.injector.get(LinksStore).refresh();
    void this.injector.get(RecentImportsStore).load();
    this.injector.get(TabSyncService).post({ kind: TAB_SYNC_KIND.LibraryChanged });
  }

  private api() {
    return this.injector.get(IMPORT_API);
  }
}
