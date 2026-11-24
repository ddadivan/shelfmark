import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SavedViewResponse } from '@shelfmark/contracts';
import { ChipComponent } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { FoldersStore } from '../../../../stores/folders.store';
import { SavedViewsStore } from '../../../../stores/saved-views.store';
import { TagsStore } from '../../../../stores/tags.store';
import type { LinksFilter } from '../../../links/models/links-filter.type';
import { TagActionsService } from '../../../tags/services/tag-actions.service';
import { SavedViewActionsService } from '../../../views/services/saved-view-actions.service';
import { SEARCH_LOCAL_LIMIT } from '../../models/search-local-limit.const';
import { includesAllWords, matchFolders, matchTags } from '../../utils/search-match';

/**
 * "Go to" under the search title (Shelf `03-search.html`): the folders, tags and saved views whose
 * name has every word of the search, as small chips with their counts. A folder opens its page, a
 * tag All links filtered by it, a view applies it; each leaves the search. Nothing renders when
 * nothing matches. Folders and tags come from the lists the app already holds.
 */
@Component({
  selector: 'app-search-go-to',
  imports: [TranslocoPipe, ChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.search-go-to--shown]': 'any()' },
  templateUrl: './search-go-to.component.html',
  styleUrl: './search-go-to.component.scss',
})
export class SearchGoToComponent {
  /** The search text of the feed (normalised `?q=`). */
  readonly query = input.required<string>();
  /** The filter of the feed (a view applies inside it). */
  readonly filter = input.required<LinksFilter>();

  private readonly folders = inject(FoldersStore);
  private readonly tags = inject(TagsStore);
  private readonly views = inject(SavedViewsStore);
  private readonly tagActions = inject(TagActionsService);
  private readonly viewActions = inject(SavedViewActionsService);
  private readonly router = inject(Router);

  protected readonly folderMatches = computed(() =>
    matchFolders(this.folders.entities(), (id) => this.folders.pathTo(id), this.query()),
  );
  protected readonly tagMatches = computed(() => matchTags(this.tags.entities(), this.query()));
  protected readonly viewMatches = computed(() =>
    this.views
      .items()
      .filter((view) => includesAllWords(view.name, this.query()))
      .slice(0, SEARCH_LOCAL_LIMIT),
  );
  protected readonly any = computed(
    () => this.folderMatches().length + this.tagMatches().length + this.viewMatches().length > 0,
  );

  constructor() {
    // Shared with the sidebar; the calls are no-ops once loaded.
    void this.folders.load();
    void this.tags.load();
  }

  protected async openFolder(id: string): Promise<void> {
    await this.router.navigate(['/', APP_PATH.Folders, id]);
  }

  protected async openTag(name: string): Promise<void> {
    await this.tagActions.showLinks(name);
  }

  protected async openView(view: SavedViewResponse): Promise<void> {
    // The view applies inside the feed without the search (it leaves the search, like the others).
    await this.viewActions.apply(view, { ...this.filter(), q: undefined });
  }
}
