import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ButtonComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  TreeComponent,
  UI_TREE_CONTEXT_MENU_TRIGGER,
  type UiTreeContextMenuEvent,
  type UiTreeNode,
} from '@shelfmark/ui';
import { combineLatest, filter, map } from 'rxjs';
import { FolderActionsService } from '../../features/folders/folder-actions.service';
import { SidebarTagsComponent } from '../../features/tags/sidebar-tags/sidebar-tags.component';
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
 * counts (`ui-tree`) and a "New folder" button. Choosing a row navigates; the active row follows
 * the URL. A folder has a menu (right click, "..." button, Shift+F10): new subfolder, add link
 * here, rename, move, delete.
 */
@Component({
  selector: 'app-sidebar',
  imports: [
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    SidebarTagsComponent,
    TranslocoPipe,
    TreeComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly folders = inject(FoldersStore);
  private readonly actions = inject(FolderActionsService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly menu = viewChild.required(MenuComponent);

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
      this.transloco.selectTranslate('shell.sidebar.folderActions', { name: '{name}' }),
    ]).pipe(map(([all, unsorted, favorites, actions]) => ({ all, unsorted, favorites, actions }))),
  );
  /** The "..." button name with its `{name}` placeholder; `ui-tree` fills in the folder. */
  protected readonly menuLabel = computed(() => this.labels()?.actions);

  /** `id` of the folder whose menu is open (the tree shows its button as pressed). */
  protected readonly menuNodeId = signal<string | null>(null);
  /** The folder the menu was opened for; kept while an item is chosen and the menu closes. */
  private menuFolderId: string | null = null;

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

  protected openMenu(event: UiTreeContextMenuEvent): void {
    this.menuFolderId = event.node.id;
    this.menuNodeId.set(event.node.id);
    if (event.trigger === UI_TREE_CONTEXT_MENU_TRIGGER.Pointer && event.position) {
      this.menu().openAt(event.position);
    } else {
      this.menu().openFrom(event.anchor);
    }
  }

  protected menuClosed(): void {
    this.menuNodeId.set(null);
  }

  protected createTopLevel(): void {
    void this.actions.create();
  }

  protected createSubfolder(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.create(folder);
    }
  }

  protected addLinkHere(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.addLinkHere(folder);
    }
  }

  protected rename(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.rename(folder);
    }
  }

  protected move(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.move(folder);
    }
  }

  protected remove(): void {
    const folder = this.menuFolder();
    if (folder) {
      void this.actions.delete(folder);
    }
  }

  private menuFolder() {
    return this.menuFolderId === null ? undefined : this.folders.entityMap()[this.menuFolderId];
  }
}

function count(value: number | undefined): { count: number } | Record<string, never> {
  return value === undefined ? {} : { count: value };
}
