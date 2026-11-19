import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounce, map, of, switchMap, tap, timer } from 'rxjs';
import { pluralKey } from '../../../core/i18n/plural-key';
import { FoldersStore } from '../../../stores/folders.store';
import { LINKS_API } from '../../links/models/links-api.const';
import { NEW_VIEW_PREVIEW } from '../models/new-view-preview.const';
import type { ViewPreview } from '../models/view-preview.interface';
import { previewOf, previewQueryOf } from '../utils/view-preview';
import { NewViewFormService } from './new-view-form.service';

/**
 * The live count of the new view dialog (provided by the dialog): what the rows would list, asked
 * from the links list a moment after the last change. A newer change drops the older answer
 * (`switchMap`), the previous answer stays on screen meanwhile, and a failure shows no count (never
 * an error toast: the count is a convenience, saving does not depend on it).
 */
@Service({ autoProvided: false })
export class NewViewPreviewService {
  private readonly api = inject(LINKS_API);
  private readonly folders = inject(FoldersStore);
  private readonly formState = inject(NewViewFormService);

  /** The last answer; `null` before the first and after a failure. */
  readonly preview = signal<ViewPreview | null>(null);
  /** A change is waiting for its answer. */
  readonly busy = signal(true);

  /** "Found N links", or "N+" when more follow the page that was read; `null` without an answer. */
  readonly countKey = computed(() => {
    const found = this.preview();
    if (found === null) {
      return null;
    }
    return found.more ? 'views.new.foundMore' : pluralKey('views.new.found', found.count);
  });

  constructor() {
    let first = true;
    toObservable(this.formState.query)
      .pipe(
        tap(() => this.busy.set(true)),
        debounce(() => {
          const wait = first ? 0 : NEW_VIEW_PREVIEW.DebounceMs;
          first = false;
          return timer(wait);
        }),
        switchMap((query) =>
          this.api.list(previewQueryOf(query)).pipe(
            map((response) => previewOf(response, (id) => this.folderName(id))),
            catchError(() => of(null)),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((preview) => {
        this.preview.set(preview);
        this.busy.set(false);
      });
  }

  private folderName(id: string): string | null {
    return this.folders.entities().find((folder) => folder.id === id)?.name ?? null;
  }
}
