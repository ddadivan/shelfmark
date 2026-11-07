import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { combineLatest, map } from 'rxjs';
import {
  ButtonComponent,
  ChipComponent,
  EmptyStateComponent,
  LoadMoreComponent,
  NoticeComponent,
  ProgressBarComponent,
  SegmentedControlComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type SegmentedOption,
} from '@shelfmark/ui';
import { Router } from '@angular/router';
import { TAG_QUERY_PARAM } from '../tags/models/tag-query-param.const';
import { parseTagFilter } from '../tags/tag-filter';
import { InViewDirective } from '../links/in-view/in-view.directive';
import { LinkActionsService } from '../links/link-actions.service';
import { LinkCardComponent } from '../links/link-card/link-card.component';
import { LinkRowComponent } from '../links/link-row/link-row.component';
import type { AddLinkData } from '../links/models/add-link-data.interface';
import type { LinksFilter } from '../links/models/links-filter.type';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { isUiView } from '../../stores/is-ui-view';
import { UiStore } from '../../stores/ui.store';
import { VIEW_OPTION_KEYS } from './models/view-option-keys.const';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 8;

/**
 * The links feed of one scope (all, unsorted, favorites; the route data sets `scope`): a toolbar
 * with the count and the cards / list switch, then the links, with a skeleton on first load,
 * a progress bar on refetch and error and empty states.
 */
@Component({
  selector: 'app-library-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    ChipComponent,
    EmptyStateComponent,
    InViewDirective,
    LinkCardComponent,
    LinkRowComponent,
    LoadMoreComponent,
    NoticeComponent,
    ProgressBarComponent,
    SegmentedControlComponent,
    SkeletonComponent,
  ],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LibraryPage {
  protected readonly store = inject(LinksStore);
  protected readonly ui = inject(UiStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  /** From the route data. */
  readonly scope = input<LinksScope>(LINKS_SCOPE.All);
  /** From the route (`folders/:folderId`). */
  readonly folderId = input<string>();
  /** From the query (`?tag=a&tag=b`): one value or a list; see `parseTagFilter`. */
  readonly tag = input<string | readonly string[]>();

  protected readonly UI_VIEW = UI_VIEW;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;

  /** The tags of the filter: normalized, deduplicated, at most `LINK_LIMIT.TagFilterMax`. */
  protected readonly tags = computed(() => parseTagFilter(this.tag()));
  protected readonly filtered = computed(() => this.tags().length > 0);

  protected readonly isFolder = computed(() => this.scope() === LINKS_SCOPE.Folder);
  /** The folder of the page, once the folder list has it. */
  protected readonly folder = computed(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? this.folders.entityMap()[id] : undefined;
  });
  /** An unknown or foreign folder id: the page shows "not found" instead of the content. */
  protected readonly folderMissing = computed(
    () =>
      this.isFolder() &&
      (this.folderId() === undefined || (this.folders.loaded() && this.folder() === undefined)),
  );
  /** Data of the add-link dialog: the folder of the page is preselected. */
  protected readonly addLinkData = computed<AddLinkData>(() => {
    const id = this.folderId();
    return this.isFolder() && id !== undefined ? { folderId: id } : {};
  });
  protected readonly titleKey = computed(() => `library.scope.${this.scope()}`);
  protected readonly emptyKey = computed(() =>
    this.isFolder() ? 'library.emptyFolder' : 'library.empty',
  );
  private readonly filter = computed<LinksFilter>(() => {
    const scope = this.scope();
    const folderId = this.folderId();
    const tags = this.tags();
    const options = tags.length > 0 ? { tags } : {};
    if (scope !== LINKS_SCOPE.Folder) {
      return { scope, ...options };
    }
    // A folder page without an id cannot happen through the router; it shows "not found".
    return folderId === undefined
      ? { scope: LINKS_SCOPE.All, ...options }
      : { scope, folderId, ...options };
  });
  protected readonly firstLoad = computed(
    () => !this.store.loaded() && !this.store.error() && this.store.count() === 0,
  );
  protected readonly failed = computed(() => this.store.error() && this.store.count() === 0);
  protected readonly empty = computed(
    () => this.store.loaded() && !this.store.loading() && this.store.count() === 0,
  );
  protected readonly refetching = computed(() => this.store.loading() && this.store.loaded());
  protected readonly showLinks = computed(() => this.store.count() > 0);

  private readonly labels = toSignal(
    combineLatest([
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.Cards]),
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.List]),
    ]).pipe(map(([cards, list]) => ({ cards, list }))),
  );
  /** Icon-only switch; `null` until the translations are loaded. */
  protected readonly viewOptions = computed<SegmentedOption[] | null>(() => {
    const labels = this.labels();
    return labels
      ? [
          { value: UI_VIEW.Cards, label: labels.cards, icon: 'cards' },
          { value: UI_VIEW.List, label: labels.list, icon: 'list' },
        ]
      : null;
  });

  constructor() {
    // The sidebar loads the folders too (the phone has none yet); the call is shared.
    void this.folders.load();
    this.store.setFilter(this.filter);
  }

  protected async showAll(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Links}`);
  }

  /** Takes one tag out of the filter. */
  protected async removeTag(name: string): Promise<void> {
    const rest = this.tags().filter((tag) => tag !== name);
    await this.setTags(rest);
  }

  protected async clearTags(): Promise<void> {
    await this.setTags([]);
  }

  private async setTags(tags: readonly string[]): Promise<void> {
    await this.router.navigate([], {
      queryParams: { [TAG_QUERY_PARAM]: tags.length > 0 ? tags : null },
      queryParamsHandling: 'merge',
    });
  }

  protected setView(view: string): void {
    if (isUiView(view)) {
      this.ui.setView(view);
    }
  }

  protected retry(): void {
    this.store.setFilter(this.filter());
  }
}
