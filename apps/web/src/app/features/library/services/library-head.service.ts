import { computed, DestroyRef, effect, inject, Service } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import type { BreadcrumbItem } from '@shelfmark/ui';
import { switchMap } from 'rxjs';
import { APP_PATH } from '../../../models/app-path.const';
import { FoldersStore } from '../../../stores/folders.store';
import { LibraryFilterService } from './library-filter.service';

/**
 * The names of the library page: the breadcrumb trail of a folder page and the tab title
 * (restored to the brand when the page goes away). Page-scoped: the page provides it.
 */
@Service({ autoProvided: false })
export class LibraryHeadService {
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);
  private readonly folders = inject(FoldersStore);
  private readonly filters = inject(LibraryFilterService);

  /** The document title the app started with (the brand), the suffix of every page title. */
  private readonly appName = this.title.getTitle();
  private readonly rootLabel = toSignal(this.transloco.selectTranslate('library.scope.all'));
  private readonly scopeLabel = toSignal(
    toObservable(this.filters.titleKey).pipe(
      switchMap((key) => this.transloco.selectTranslate(key)),
    ),
  );
  /** The heading of the page; `undefined` until translated. */
  private readonly heading = computed(() => this.filters.folder()?.name ?? this.scopeLabel());
  /** The trail of a folder page: "All links", the ancestors (links) and the folder itself. */
  readonly crumbs = computed<BreadcrumbItem[] | null>(() => {
    const id = this.filters.folderId();
    const root = this.rootLabel();
    if (
      !this.filters.isFolder() ||
      id === undefined ||
      root === undefined ||
      !this.filters.folder()
    ) {
      return null;
    }
    const path = this.folders.pathTo(id);
    return [
      { label: root, href: `/${APP_PATH.Links}` },
      ...path.map((folder, index) =>
        index === path.length - 1
          ? { label: folder.name }
          : { label: folder.name, href: `/${APP_PATH.Folders}/${folder.id}` },
      ),
    ];
  });
  /** The tab title: "<heading> · <app>", or "Search: <query> · <app>" while searching. */
  private readonly pageTitle = toSignal(
    toObservable(computed(() => ({ query: this.filters.query(), heading: this.heading() }))).pipe(
      switchMap(({ query, heading }) =>
        query === ''
          ? this.transloco.selectTranslate('library.pageTitle.page', {
              page: heading ?? '',
              app: this.appName,
            })
          : this.transloco.selectTranslate('library.pageTitle.search', {
              query,
              app: this.appName,
            }),
      ),
    ),
  );

  constructor() {
    effect(() => {
      const text = this.pageTitle();
      if (text !== undefined && this.heading() !== undefined) {
        this.title.setTitle(text);
      }
    });
    inject(DestroyRef).onDestroy(() => this.title.setTitle(this.appName));
  }
}
