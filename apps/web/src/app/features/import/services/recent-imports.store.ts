import { inject, Injector, Service, signal } from '@angular/core';
import type { ImportSummary, UndoImportResponse } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { SessionScope } from '../../../core/auth/session-scope.service';
import { pluralKey } from '../../../core/i18n/plural-key';
import { LibraryRefreshService } from '../../../stores/library-refresh.service';
import { IMPORT_API } from '../models/import-api.const';
import { ImportAiFollowService } from './import-ai-follow.service';
import { Translate } from '../../../core/i18n/translate.service';

/**
 * "Recent imports" of Account › Your data (SetImport.dc.html): the imports of the last 7 days
 * that are not undone, and their Undo (confirmed, through Trash, ADR 0056). Root, so the import
 * dialog's own Undo uses the same path.
 */
@Service()
export class RecentImportsStore {
  private readonly injector = inject(Injector);
  private readonly translate = inject(Translate);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(DialogService);

  private readonly itemsState = signal<readonly ImportSummary[]>([]);
  private readonly loadedState = signal(false);
  private readonly undoingState = signal<string | null>(null);

  readonly items = this.itemsState.asReadonly();
  readonly loaded = this.loadedState.asReadonly();
  /** Id of the import being undone. */
  readonly undoing = this.undoingState.asReadonly();

  constructor() {
    // Another account must not see this one's imports.
    inject(SessionScope).onEnd(() => {
      this.itemsState.set([]);
      this.loadedState.set(false);
    });
  }

  async load(): Promise<void> {
    try {
      const response = await firstValueFrom(this.injector.get(IMPORT_API).list());
      this.itemsState.set(response.items);
    } catch {
      // Recent imports are optional: the list stays as it was.
    }
    this.loadedState.set(true);
  }

  /**
   * Asks first (the links, folders and new tags of this import go; the user's later additions
   * stay), then undoes. Resolves true when it was undone.
   */
  async undo(id: string, linkCount: number): Promise<boolean> {
    if (this.undoingState() !== null) {
      return false;
    }
    const confirmed = await this.dialogs.confirm({
      title: this.translate.t('import.undo.title'),
      message: this.translate.t(pluralKey('import.undo.message', linkCount), {
        count: String(linkCount),
      }),
      confirmLabel: this.translate.t('import.undo.confirm'),
      cancelLabel: this.translate.t('import.undo.cancel'),
    });
    if (!confirmed) {
      return false;
    }
    this.undoingState.set(id);
    let response: UndoImportResponse;
    try {
      response = await firstValueFrom(this.injector.get(IMPORT_API).undo(id));
    } catch {
      this.undoingState.set(null);
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.translate.t('import.undo.failed') });
      void this.load();
      return false;
    }
    this.undoingState.set(null);
    this.itemsState.update((items) => items.filter((item) => item.id !== id));
    this.injector.get(ImportAiFollowService).unwatch(id);
    this.injector.get(LibraryRefreshService).afterLibraryRewrite();
    this.toasts.show({
      kind: TOAST_KIND.Success,
      title: this.translate.t('import.undo.done'),
      detail: this.translate.t(pluralKey('import.undo.doneDetail', response.links), {
        count: String(response.links),
      }),
    });
    return true;
  }
}
