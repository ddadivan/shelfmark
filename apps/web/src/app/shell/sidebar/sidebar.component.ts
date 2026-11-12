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
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  ButtonComponent,
  ICON_SIZE,
  loaderVisible,
  LogoComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  TooltipDirective,
  TreeComponent,
  UI_TREE_CONTEXT_MENU_TRIGGER,
  type UiTreeContextMenuEvent,
  type UiTreeNode,
} from '@shelfmark/ui';
import { filter, map } from 'rxjs';
import { ViewportService } from '../../core/layout/viewport.service';
import { SidebarPinnedComponent } from '../../features/pins/components/sidebar-pinned/sidebar-pinned.component';
import { SidebarTagsComponent } from '../../features/tags/components/sidebar-tags/sidebar-tags.component';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { PinsStore } from '../../stores/pins.store';
import { TagsStore } from '../../stores/tags.store';
import { TrashStore } from '../../stores/trash.store';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { LinkDragService } from '../../features/links/services/link-drag.service';
import { HowItWorksService } from '../../features/how-it-works/services/how-it-works.service';
import { FeedbackDialogService } from '../../features/feedback/services/feedback-dialog.service';
import { HowItWorksCardComponent } from '../../features/how-it-works/components/how-it-works-card/how-it-works-card.component';
import { SIDEBAR_FEEDBACK_ID } from './models/sidebar-feedback-id.const';
import { folderTreeNodes } from './utils/folder-tree-nodes';
import { injectSidebarLabels } from './utils/inject-sidebar-labels';
import { latched } from './utils/latched';
import { sidebarActiveId } from './utils/sidebar-active-id';
import { feedbackNodes, fixedNodes, trashNodes } from './utils/sidebar-nodes';
import { sidebarRoute } from './utils/sidebar-route';
import { SidebarFoldersService } from './services/sidebar-folders.service';
import { SidebarTreeFocusService } from './services/sidebar-tree-focus.service';

/**
 * The library sidebar, an inset card that only navigates: the logo, "All links", "Unsorted",
 * "Favorites", "Recently opened" (a page), then the folder tree with link counts and graphite
 * folder tiles (`ui-tree`; the "Folders" heading has a "New folder" icon button) and the tags.
 * Choosing a row navigates; the active row follows the URL. A folder has a menu (right click,
 * "..." button, Shift+F10): new subfolder, add link here, rename, move, share, delete. Folders
 * reorder among their siblings by dragging or Alt+Up / Alt+Down (#314). Trash is a row of its
 * own under a divider at the bottom.
 */
@Component({
  selector: 'app-sidebar',
  imports: [
    HowItWorksCardComponent,
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    LogoComponent,
    RouterLink,
    SidebarPinnedComponent,
    SidebarTagsComponent,
    SkeletonComponent,
    TooltipDirective,
    TranslocoPipe,
    TreeComponent,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  providers: [SidebarFoldersService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  protected readonly folders = inject(FoldersStore);
  private readonly trash = inject(TrashStore);
  private readonly pins = inject(PinsStore);
  protected readonly folderMenu = inject(SidebarFoldersService);
  private readonly settings = inject(UserSettingsStore);
  protected readonly drag = inject(LinkDragService);
  protected readonly howItWorks = inject(HowItWorksService);
  /** "Send feedback" in the sidebar footer opens the same dialog as the account menu (#315). */
  protected readonly feedback = inject(FeedbackDialogService);
  private readonly tagsStore = inject(TagsStore);
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  /** The folder list answered (or failed): before that the section stays out, not empty. */
  protected readonly foldersReady = latched(() => this.folders.loaded() || this.folders.error());
  protected readonly tagsReady = latched(() => this.tagsStore.loaded() || this.tagsStore.error());
  /** Rows of the first load show after 300 ms (Loading spec), never a flash for a fast answer. */
  protected readonly loaderShown = loaderVisible(computed(() => !this.foldersReady()));
  /** The logo heads the card (the desktop shell); the phone drawer has its own header. */
  readonly showLogo = input(false, { transform: booleanAttribute });
  /**
   * Only the folder tree: no fixed rows and no tags. The phone Library page shows it under its
   * own tiles (and the Tags tab has the tags), with the same menus and actions.
   */
  readonly foldersOnly = input(false, { transform: booleanAttribute });

  private readonly viewport = inject(ViewportService);
  /** Wide-screen-only blocks of the sidebar (the phone drawer and Library leave them out). */
  protected readonly phone = this.viewport.compact;
  /** Text buttons reach the 44px touch target on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Sm,
  );
  private readonly router = inject(Router);
  private readonly menu = viewChild.required(MenuComponent);
  private readonly tree = viewChild<TreeComponent>('folderTree');
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

  private readonly labels = injectSidebarLabels();
  /** The "..." button name with its `{name}` placeholder; `ui-tree` fills in the folder. */
  protected readonly menuLabel = computed(() => this.labels()?.actions);

  /** Counts show once the list has loaded; before that the rows have none. */
  protected readonly fixedNodes = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    if (!labels || this.foldersOnly()) {
      return [];
    }
    // Settings › Library › Show folder counts: off drops the link counts (Trash keeps its own).
    const counts =
      this.folders.loaded() && this.settings.countsShown() ? this.folders.counts() : null;
    return fixedNodes(labels, counts);
  });

  /** "Send feedback" above the divider (not on the phone, which has it in the You list). */
  protected readonly feedbackNodes = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return !labels || this.phone() ? [] : feedbackNodes(labels);
  });

  /** Trash under the divider; its count shows once the list has loaded and only while not empty. */
  protected readonly trashNodes = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    if (!labels) {
      return [];
    }
    const total = this.trash.total();
    return trashNodes(labels, this.trash.loaded() && total > 0 ? total : undefined);
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
    return folderTreeNodes(this.folders.tree(), {
      open,
      countsShown: this.settings.countsShown(),
      shownColour: (colour) => this.settings.shownColour(colour),
    });
  });

  constructor() {
    void this.folders.load();
    void this.trash.load();
    void this.pins.load();
    void this.tagsStore.load();
    void this.settings.load();
    effect((onCleanup) => {
      const tree = this.tree();
      if (tree) {
        onCleanup(this.treeFocus.register(tree));
      }
    });
  }

  protected retry(): void {
    void this.folders.load();
  }

  protected async select(node: UiTreeNode): Promise<void> {
    await this.router.navigate(sidebarRoute(node.id));
  }

  protected async footerSelected(node: UiTreeNode): Promise<void> {
    if (node.id === SIDEBAR_FEEDBACK_ID) {
      this.feedback.open();
      return;
    }
    await this.router.navigate([`/${APP_PATH.Trash}`]);
  }

  protected openMenu(event: UiTreeContextMenuEvent): void {
    this.folderMenu.openMenuFor(event.node.id);
    if (event.trigger === UI_TREE_CONTEXT_MENU_TRIGGER.Pointer && event.position) {
      this.menu().openAt(event.position);
    } else {
      this.menu().openFrom(event.anchor);
    }
  }

  /**
   * A folder row started to move: a long press may have opened its menu just before (press, hold,
   * then move, as on iOS), so the menu closes and the drag goes on (#315).
   */
  protected reorderStarted(): void {
    if (this.menu().isOpen()) {
      this.menu().close({ restoreFocus: false });
    }
  }
}
