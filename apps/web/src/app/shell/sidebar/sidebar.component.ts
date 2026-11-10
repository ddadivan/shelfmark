import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  ButtonComponent,
  ICON_SIZE,
  LogoComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  TooltipDirective,
  TreeComponent,
  UI_TREE_CONTEXT_MENU_TRIGGER,
  type UiTreeContextMenuEvent,
  type UiTreeNode,
} from '@shelfmark/ui';
import { combineLatest, filter, map } from 'rxjs';
import { ViewportService } from '../../core/layout/viewport.service';
import { FolderActionsService } from '../../features/folders/folder-actions.service';
import { SidebarTagsComponent } from '../../features/tags/sidebar-tags/sidebar-tags.component';
import { LINKS_SCOPE } from '../../features/links/models/links-scope.const';
import { APP_PATH } from '../../models/app-path.const';
import type { FolderNode } from '../../stores/models/folder-node.interface';
import { FoldersStore } from '../../stores/folders.store';
import { LinkDragService } from '../../features/links/drag/link-drag.service';
import { SIDEBAR_RECENT_ID } from './models/sidebar-recent-id.const';
import { sidebarActiveId } from './sidebar-active-id';
import { SidebarTreeFocusService } from './sidebar-tree-focus.service';

/** The fixed rows and their routes. */
const FIXED_ROUTES: Readonly<Record<string, string>> = {
  [LINKS_SCOPE.All]: APP_PATH.Links,
  [LINKS_SCOPE.Unsorted]: APP_PATH.Unsorted,
  [LINKS_SCOPE.Favorites]: APP_PATH.Favorites,
  [SIDEBAR_RECENT_ID]: APP_PATH.Recent,
};

/**
 * The library sidebar, an inset card that only navigates: the logo, "All links", "Unsorted",
 * "Favorites", "Recently opened" (a page), then the folder tree with link counts and graphite
 * folder tiles (`ui-tree`; the "Folders" heading has a "New folder" icon button) and the tags.
 * Choosing a row navigates; the active row follows the URL. A folder has a menu (right click, "..." button, Shift+F10): new subfolder, add link
 * here, rename, move, delete.
 */
@Component({
  selector: 'app-sidebar',
  imports: [
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    LogoComponent,
    RouterLink,
    SidebarTagsComponent,
    TooltipDirective,
    TranslocoPipe,
    TreeComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly folders = inject(FoldersStore);
  protected readonly drag = inject(LinkDragService);
  protected readonly ICON_SIZE = ICON_SIZE;
  /** The logo heads the card (the desktop shell); the phone drawer has its own header. */
  readonly showLogo = input(false, { transform: booleanAttribute });
  /**
   * Only the folder tree: no fixed rows and no tags. The phone Library page shows it under its
   * own tiles (and the Tags tab has the tags), with the same menus and actions.
   */
  readonly foldersOnly = input(false, { transform: booleanAttribute });

  private readonly actions = inject(FolderActionsService);
  private readonly viewport = inject(ViewportService);
  /** Text buttons reach the 44px touch target on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.phone() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Sm,
  );
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly menu = viewChild.required(MenuComponent);
  private readonly tree = viewChild.required(TreeComponent);
  private readonly treeFocus = inject(SidebarTreeFocusService);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly activeId = computed(() => sidebarActiveId(this.url()));
  protected readonly navLabelKey = computed(() =>
    this.foldersOnly() ? 'shell.sidebar.foldersNav' : 'shell.sidebar.nav',
  );

  private readonly labels = toSignal(
    combineLatest([
      this.transloco.selectTranslate('library.scope.all'),
      this.transloco.selectTranslate('library.scope.unsorted'),
      this.transloco.selectTranslate('library.scope.favorites'),
      this.transloco.selectTranslate('shell.sidebar.folderActions', { name: '{name}' }),
      this.transloco.selectTranslate('links.recent.title'),
    ]).pipe(
      map(([all, unsorted, favorites, actions, recent]) => ({
        all,
        unsorted,
        favorites,
        actions,
        recent,
      })),
    ),
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
    if (!labels || this.foldersOnly()) {
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
      { id: SIDEBAR_RECENT_ID, name: labels.recent, icon: 'clock' },
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
    effect((onCleanup) => onCleanup(this.treeFocus.register(this.tree())));
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
