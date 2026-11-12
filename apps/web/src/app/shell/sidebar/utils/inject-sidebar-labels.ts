import { inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map } from 'rxjs';
import type { SidebarLabels } from '../models/sidebar-labels.interface';

/** The sidebar's translated labels, following the active language (undefined until loaded). */
export function injectSidebarLabels(): Signal<SidebarLabels | undefined> {
  const transloco = inject(TranslocoService);
  return toSignal(
    combineLatest([
      transloco.selectTranslate('library.scope.all'),
      transloco.selectTranslate('library.scope.unsorted'),
      transloco.selectTranslate('library.scope.favorites'),
      transloco.selectTranslate('shell.sidebar.folderActions', { name: '{name}' }),
      transloco.selectTranslate('links.recent.title'),
      transloco.selectTranslate('trash.title'),
      transloco.selectTranslate('shell.sendFeedback'),
    ]).pipe(
      map(([all, unsorted, favorites, actions, recent, trash, feedback]) => ({
        all,
        unsorted,
        favorites,
        actions,
        recent,
        trash,
        feedback,
      })),
    ),
  );
}
