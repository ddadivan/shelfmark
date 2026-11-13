import { inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, map } from 'rxjs';
import { NO_DROP_REASON_KEYS } from '../../../features/links/models/no-drop-reason-keys.const';

/**
 * The short reasons the sidebar rows that cannot take links show while a link is dragged over
 * them (#350), by row id, following the active language.
 */
export function injectNoDropLabels(): Signal<Readonly<Record<string, string>>> {
  const transloco = inject(TranslocoService);
  const ids = Object.keys(NO_DROP_REASON_KEYS);
  return toSignal(
    combineLatest(ids.map((id) => transloco.selectTranslate(NO_DROP_REASON_KEYS[id]))).pipe(
      map((texts) => Object.fromEntries(ids.map((id, i) => [id, texts[i]]))),
    ),
    { initialValue: {} },
  );
}
