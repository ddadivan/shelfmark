import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { SAVED_VIEW_LIMIT, type SavedViewResponse } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { APP_PATH } from '../../models/app-path.const';
import { DIALOG_FIRST_FIELD } from '../../models/dialog-first-field.const';
import { VIEW_OUTCOME } from '../../stores/models/view-outcome.const';
import { SavedViewsStore } from '../../stores/saved-views.store';
import type { LinksFilter } from '../links/models/links-filter.type';
import type { ViewNameDialogData } from './models/view-name-dialog-data.interface';
import { VIEW_NAME_MODE } from './models/view-name-mode.const';
import { viewNavigation, viewQueryOf } from './saved-view-query';
import { ViewNameDialogComponent } from './view-name-dialog/view-name-dialog.component';

/**
 * What a user can do with saved views: apply one (or "All"), save the current filter as a view,
 * rename, delete (after a confirmation) and move one left or right. Dialogs, texts and toasts live
 * here, so components only call. Save waits for the server inside its dialog; rename, delete and
 * move change the chips at once and roll back with a toast when the request fails.
 */
@Service()
export class SavedViewActionsService {
  private readonly store = inject(SavedViewsStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  /** "All": every link, newest first. */
  async applyAll(): Promise<void> {
    await this.router.navigate(['/', APP_PATH.Links]);
  }

  /** Applies the view's filter through the router (scope route plus query parameters). */
  async apply(view: SavedViewResponse): Promise<void> {
    if (!view.available) {
      this.toasts.show({
        kind: TOAST_KIND.Info,
        title: this.t('views.unavailable.title'),
        detail: this.t('views.unavailable.detail', { name: view.name }),
      });
      return;
    }
    const { commands, queryParams } = viewNavigation(view.query);
    await this.router.navigate(commands, { queryParams });
  }

  /** Opens the name dialog and saves the filter as a new view at the end. */
  async saveCurrent(filter: LinksFilter): Promise<void> {
    if (this.store.atLimit()) {
      this.limitToast();
      return;
    }
    const query = viewQueryOf(filter);
    let saved = '';
    const ref = this.dialogs.open<ViewNameDialogComponent, boolean, ViewNameDialogData>(
      ViewNameDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        autoFocus: DIALOG_FIRST_FIELD,
        data: {
          mode: VIEW_NAME_MODE.Create,
          name: '',
          submit: async (name) => {
            const outcome = await this.store.create(name, query);
            saved = name;
            if (outcome === VIEW_OUTCOME.Done) {
              return null;
            }
            if (outcome === VIEW_OUTCOME.Limit) {
              return 'views.create.limit';
            }
            return outcome === VIEW_OUTCOME.Missing
              ? 'views.create.missing'
              : 'views.create.failed';
          },
        },
      },
    );
    if (await ref.result) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('views.created.title'),
        detail: saved,
      });
    }
  }

  async rename(view: SavedViewResponse): Promise<void> {
    await this.dialogs.open<ViewNameDialogComponent, boolean, ViewNameDialogData>(
      ViewNameDialogComponent,
      {
        size: DIALOG_SIZE.Sm,
        autoFocus: DIALOG_FIRST_FIELD,
        data: {
          mode: VIEW_NAME_MODE.Rename,
          name: view.name,
          submit: (name) => {
            void this.store.rename(view.id, name).then((done) => {
              if (!done) {
                this.failToast('views.renameFailed.title', view.name);
              }
            });
            return Promise.resolve(null);
          },
        },
      },
    ).result;
  }

  async delete(view: SavedViewResponse): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t('views.deleteConfirm.title', { name: view.name }),
      message: this.t('views.deleteConfirm.message'),
      confirmLabel: this.t('views.deleteConfirm.confirm'),
      cancelLabel: this.t('views.deleteConfirm.cancel'),
      closeLabel: this.t('views.deleteConfirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    if (await this.store.remove(view.id)) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('views.deleted.title'),
        detail: view.name,
      });
    } else {
      this.failToast('views.deleteFailed.title', view.name);
    }
  }

  /** Moves the view one place left (`-1`) or right (`1`). */
  async move(view: SavedViewResponse, step: -1 | 1): Promise<void> {
    const from = this.store.items().findIndex((item) => item.id === view.id);
    if (from < 0) {
      return;
    }
    if (!(await this.store.move(view.id, from + step))) {
      this.failToast('views.moveFailed.title', view.name);
    }
  }

  private limitToast(): void {
    this.toasts.show({
      kind: TOAST_KIND.Warn,
      title: this.t('views.limit.title'),
      detail: this.t('views.limit.detail', { max: String(SAVED_VIEW_LIMIT.PerUserMax) }),
      duration: LIMIT_TOAST_MS,
    });
  }

  private failToast(key: string, name: string): void {
    this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t(key), detail: name });
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}

/** The limit toast stays long enough to read (a warning would stay until closed). */
const LIMIT_TOAST_MS = 6000;
