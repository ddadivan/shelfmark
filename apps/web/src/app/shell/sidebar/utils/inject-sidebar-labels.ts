import { inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map } from 'rxjs';
import type { SidebarLabels } from '../models/sidebar-labels.interface';
import { scopeLabelKey } from '../../../features/links/utils/scope-label-key';
import { LINKS_SCOPE } from '../../../features/links/models/links-scope.const';

/** The sidebar's translated labels, following the active language (undefined until loaded). */
export function injectSidebarLabels(): Signal<SidebarLabels | undefined> {
  const transloco = inject(TranslocoService);
  return toSignal(
    combineLatest([
      transloco.selectTranslate(scopeLabelKey(LINKS_SCOPE.All)),
      transloco.selectTranslate(scopeLabelKey(LINKS_SCOPE.Unsorted)),
      transloco.selectTranslate(scopeLabelKey(LINKS_SCOPE.Favorites)),
      transloco.selectTranslate('shell.sidebar.folderActions', { name: '{name}' }),
      transloco.selectTranslate('links.recent.title'),
      transloco.selectTranslate('today.title'),
      transloco.selectTranslate('trash.title'),
      transloco.selectTranslate('shell.sidebar.data'),
      transloco.selectTranslate('whatsNew.unseen'),
      transloco.selectTranslate('shell.sidebar.extension'),
    ]).pipe(
      map(
        ([
          all,
          unsorted,
          favorites,
          actions,
          recent,
          today,
          trash,
          data,
          whatsNewDot,
          extension,
        ]) => ({
          all,
          unsorted,
          favorites,
          actions,
          recent,
          today,
          trash,
          data,
          whatsNewDot,
          extension,
        }),
      ),
    ),
  );
}
