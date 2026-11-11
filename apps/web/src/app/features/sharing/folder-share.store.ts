import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { FolderShareResponse } from '@shelfmark/contracts';
import { firstValueFrom, type Observable } from 'rxjs';
import type { FolderShareState } from './models/folder-share-state.interface';
import { SHARE_ERROR } from './models/share-error.const';
import type { ShareError } from './models/share-error.type';
import { SHARES_API } from './models/shares-api.const';

const initialState: FolderShareState = {
  folderId: null,
  share: null,
  loading: false,
  busy: false,
  error: null,
};

function errorOf(error: unknown): ShareError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === HttpStatusCode.Conflict) return SHARE_ERROR.Limit;
    if (error.status === HttpStatusCode.Forbidden) return SHARE_ERROR.Demo;
  }
  return SHARE_ERROR.Save;
}

/**
 * The public link of one folder for the share dialog (#276). Provided by the dialog, so it lives
 * as long as the dialog. Changes wait for the server (no optimistic switch: a guest must never
 * see a page the owner believes is off); a failure keeps the last known state and sets `error`.
 */
export const FolderShareStore = signalStore(
  withState(initialState),
  withComputed(({ share }) => ({
    enabled: computed(() => share()?.enabled ?? false),
    token: computed(() => share()?.token ?? null),
    showNotes: computed(() => share()?.showNotes ?? false),
  })),
  withMethods((store, api = inject(SHARES_API)) => {
    async function change(
      request: (folderId: string) => Observable<FolderShareResponse | void>,
      next: (result: FolderShareResponse | void) => FolderShareResponse | null,
    ): Promise<boolean> {
      const folderId = store.folderId();
      if (folderId === null || store.busy()) return false;
      patchState(store, { busy: true, error: null });
      try {
        const result = await firstValueFrom(request(folderId), { defaultValue: undefined });
        patchState(store, { share: next(result), busy: false });
        return true;
      } catch (error) {
        patchState(store, { busy: false, error: errorOf(error) });
        return false;
      }
    }

    const disabled = (folderId: string): FolderShareResponse => ({
      folderId,
      enabled: false,
      token: null,
      showNotes: false,
      createdAt: null,
    });

    return {
      async load(folderId: string): Promise<void> {
        patchState(store, { ...initialState, folderId, loading: true });
        try {
          const share = await firstValueFrom(api.get(folderId));
          patchState(store, { share, loading: false });
        } catch {
          patchState(store, { loading: false, error: SHARE_ERROR.Load });
        }
      },

      setEnabled(on: boolean): Promise<boolean> {
        return on
          ? change(
              (id) => api.enable(id),
              (result) => result ?? null,
            )
          : change(
              (id) => api.disable(id),
              () => disabled(store.folderId() ?? ''),
            );
      },

      setShowNotes(showNotes: boolean): Promise<boolean> {
        return change(
          (id) => api.setShowNotes(id, showNotes),
          (result) => result ?? null,
        );
      },

      reset(): Promise<boolean> {
        return change(
          (id) => api.reset(id),
          (result) => result ?? null,
        );
      },

      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),
);
