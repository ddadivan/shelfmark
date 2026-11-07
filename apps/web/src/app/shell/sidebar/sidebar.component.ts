import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TreeComponent, type UiTreeNode } from '@shelfmark/ui';
import { combineLatest, filter, map } from 'rxjs';
import { LINKS_SCOPE } from '../../features/links/models/links-scope.const';
import { APP_PATH } from '../../models/app-path.const';
import type { FolderNode } from '../../stores/models/folder-node.interface';
import { FoldersStore } from '../../stores/folders.store';
import { sidebarActiveId } from './sidebar-active-id';

/** The fixed rows and their routes. */
const FIXED_ROUTES: Readonly<Record<string, string>> = {
  [LINKS_SCOPE.All]: APP_PATH.Links,
  [LINKS_SCOPE.Unsorted]: APP_PATH.Unsorted,
  [LINKS_SCOPE.Favorites]: APP_PATH.Favorites,
};

/**
 * The library sidebar: "All links", "Unsorted", "Favorites", then the folder tree with link
 * counts (`ui-tree`). Choosing a row navigates; the active row follows the URL.
 */
@Component({
  selector: 'app-sidebar',
  imports: [TranslocoPipe, TreeComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly folders = inject(FoldersStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly activeId = computed(() => sidebarActiveId(this.url()));

  private readonly labels = toSignal(
    combineLatest([
      this.transloco.selectTranslate('library.scope.all'),
      this.transloco.selectTranslate('library.scope.unsorted'),
      this.transloco.selectTranslate('library.scope.favorites'),
    ]).pipe(map(([all, unsorted, favorites]) => ({ all, unsorted, favorites }))),
  );

  /** Counts show once the list has loaded; before that the rows have none. */
  protected readonly fixedNodes = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    if (!labels) {
      return [];
    }
    const counts = this.folders.loaded() ? this.folders.counts() : null;
    return [
      { id: LINKS_SCOPE.All, name: labels.all, icon: 'bookmark', ...count(counts?.all) },
      {
        id: LINKS_SCOPE.Unsorted,
        name: labels.unsorted,
        icon: 'inbox',
        ...count(counts?.unsorted),
      },
      {
        id: LINKS_SCOPE.Favorites,
        name: labels.favorites,
        icon: 'star',
        ...count(counts?.favorites),
      },
    ];
  });

  /** The folder tree; the folders above the active one start open. */
  protected readonly nodes = computed<UiTreeNode[]>(() => {
    const active = this.activeId();
    const open = new Set(
      active === null
        ? []
        : this.folders
            .pathTo(active)
            .slice(0, -1)
            .map((folder) => folder.id),
    );
    const toNode = ({ folder, children }: FolderNode): UiTreeNode => ({
      id: folder.id,
      name: folder.name,
      count: folder.linkCount,
      ...(open.has(folder.id) && { expanded: true }),
      ...(children.length > 0 && { children: children.map(toNode) }),
    });
    return this.folders.tree().map(toNode);
  });

  constructor() {
    void this.folders.load();
  }

  protected retry(): void {
    void this.folders.load();
  }

  protected async select(node: UiTreeNode): Promise<void> {
    const fixed = FIXED_ROUTES[node.id];
    await this.router.navigate(fixed ? [`/${fixed}`] : [`/${APP_PATH.Folders}`, node.id]);
  }
}

function count(value: number | undefined): { count: number } | Record<string, never> {
  return value === undefined ? {} : { count: value };
}
