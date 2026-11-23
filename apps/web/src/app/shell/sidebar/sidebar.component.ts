import { DOCUMENT } from '@angular/common';
import { ExtensionBannerService } from '../../core/browser-extension/extension-banner.service';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BADGE_TONE,
  BadgeComponent,
  BUTTON_SIZE,
  ButtonComponent,
  ICON_SIZE,
  KEYBOARD_KEY,
  loaderVisible,
  LogoComponent,
  MENU_FOCUS_EDGE,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  THEME,
  TooltipDirective,
  TreeComponent,
  UI_TREE_CONTEXT_MENU_TRIGGER,
  type UiTreeContextMenuEvent,
  type UiTreeNode,
} from '@shelfmark/ui';
import { filter, map } from 'rxjs';
import { ViewportService } from '../../core/layout/viewport.service';
import { pluralKey } from '../../core/i18n/plural-key';
import { RediscoverStore } from '../../features/rediscover/services/rediscover.store';
import { SidebarPinnedComponent } from '../../features/pins/components/sidebar-pinned/sidebar-pinned.component';
import { SidebarTagsComponent } from '../../features/tags/components/sidebar-tags/sidebar-tags.component';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { PinsStore } from '../../stores/pins.store';
import { RemindersStore } from '../../stores/reminders.store';
import { TagsStore } from '../../stores/tags.store';
import { TrashStore } from '../../stores/trash.store';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { LinkDragService } from '../../features/links/services/link-drag.service';
import { HowItWorksService } from '../../features/how-it-works/services/how-it-works.service';
import { FeedbackDialogService } from '../../features/feedback/services/feedback-dialog.service';
import { HowItWorksCardComponent } from '../../features/how-it-works/components/how-it-works-card/how-it-works-card.component';
import { SIDEBAR_DATA_ID } from './models/sidebar-data-id.const';
import { SIDEBAR_EXTENSION_ID } from './models/sidebar-extension-id.const';
import { SIDEBAR_THEME_ID } from './models/sidebar-theme-id.const';
import { THEME_PREFERENCE } from '@shelfmark/contracts';
import { ThemeService } from '../../core/theme/theme.service';
import { WhatsNewStore } from '../../features/changelog/services/whats-new.store';
import { folderTreeNodes } from './utils/folder-tree-nodes';
import { injectSidebarLabels } from './utils/inject-sidebar-labels';
import { latched } from './utils/latched';
import { sidebarActiveId } from './utils/sidebar-active-id';
import {
  dataNodes,
  extensionNodes,
  fixedNodes,
  themeNodes,
  trashNodes,
} from './utils/sidebar-nodes';
import { sidebarRoute } from './utils/sidebar-route';
import { SidebarFoldersService } from './services/sidebar-folders.service';
import { SidebarTreeFocusService } from './services/sidebar-tree-focus.service';
import { SidebarSections } from './services/sidebar-sections.service';
import { SIDEBAR_SECTION } from './models/sidebar-section.const';

/**
 * The library sidebar, an inset card that only navigates: the logo, "All links", "Unsorted",
 * "Favorites", "Recently opened" (a page), then the folder tree with link counts and graphite
 * folder tiles (`ui-tree`; the "Folders" heading has a "New folder" icon button) and the tags.
 * Choosing a row navigates; the active row follows the URL. A folder has a menu (right click,
 * "..." button, Shift+F10): new subfolder, add link here, rename, move, share, delete. Folders
 * reorder among their siblings by dragging or Alt+Up / Alt+Down (#314). The footer has one "Data &
 * help" row that opens a menu upwards (Import links, Export, What's new, Send feedback, #387) and
 * Trash as a row of its own under a divider.
 */
@Component({
  selector: 'app-sidebar',
  imports: [
    BadgeComponent,
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
  private readonly reminders = inject(RemindersStore);
  private readonly rediscover = inject(RediscoverStore);
  private readonly transloco = inject(TranslocoService);
  protected readonly folderMenu = inject(SidebarFoldersService);
  private readonly settings = inject(UserSettingsStore);
  protected readonly drag = inject(LinkDragService);
  protected readonly howItWorks = inject(HowItWorksService);
  /** "Send feedback" in the data menu opens the same dialog as the account menu (#315). */
  protected readonly feedback = inject(FeedbackDialogService);
  private readonly whatsNew = inject(WhatsNewStore);
  private readonly tagsStore = inject(TagsStore);
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly BADGE_TONE = BADGE_TONE;
  /** Shown as the badge of "What's new" in the data menu while a release is unseen. */
  protected readonly whatsNewPending = this.whatsNew.pending;
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
  /** Pinned, Folders and Tags fold under their heading in the desktop sidebar (#556). */
  protected readonly sections = inject(SidebarSections);
  protected readonly SIDEBAR_SECTION = SIDEBAR_SECTION;
  protected readonly collapsible = computed(() => !this.foldersOnly() && !this.phone());
  protected readonly foldersCollapsed = computed(
    () => this.collapsible() && this.sections.collapsed(SIDEBAR_SECTION.Folders),
  );
  /** Text buttons reach the 44px touch target on a phone. */
  protected readonly buttonSize = computed(() =>
    this.viewport.compact() ? BUTTON_SIZE.Lg : BUTTON_SIZE.Sm,
  );
  private readonly router = inject(Router);
  private readonly menu = viewChild.required<MenuComponent>('folderMenuRef');
  private readonly dataMenu = viewChild.required<MenuComponent>('dataMenuRef');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
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
  /** "Get the extension" in the footer once the library banner was closed (#455). */
  private readonly extension = inject(ExtensionBannerService);
  private readonly document = inject(DOCUMENT);
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
    // The due reminders count shows whatever "Show folder counts" says: it asks for attention.
    const due = this.reminders.dueCount();
    // "N forgotten" on Recently opened likewise (#512); the language is read through `pluralKey`.
    const forgotten = this.rediscover.count();
    const note =
      forgotten > 0
        ? this.transloco.translate(pluralKey('rediscover.note', forgotten), { count: forgotten })
        : undefined;
    return fixedNodes(labels, counts, due > 0 ? due : undefined, note);
  });

  private readonly theme = inject(ThemeService);
  /** The "Theme" row at the top of the footer (Shelf; not on the phone: the You page has Appearance). */
  protected readonly themeRows = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return !labels || this.phone() ? [] : themeNodes(labels, this.theme.resolved() === THEME.Dark);
  });

  /** "Get the extension" above the data row (not on the phone). */
  protected readonly extensionRows = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return !labels || this.phone() ? [] : extensionNodes(labels, this.extension.entryShown());
  });

  /** The "Data & help" row (not on the phone: the You list has the same entries), with the What's new dot. */
  protected readonly dataRows = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return !labels || this.phone() ? [] : dataNodes(labels, this.whatsNew.pending());
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
    // In the capture phase: the tree stops the keys of its rows from bubbling.
    this.host.addEventListener('keydown', this.dataKeydown, true);
    inject(DestroyRef).onDestroy(() => {
      this.host.removeEventListener('keydown', this.dataKeydown, true);
    });
    void this.folders.load();
    void this.trash.load();
    void this.pins.load();
    // The once-per-session load of Rediscover: the Recently opened row shows how many wait.
    void this.rediscover.load();
    void this.tagsStore.load();
    void this.settings.load();
    effect((onCleanup) => {
      const tree = this.tree();
      if (tree) {
        onCleanup(this.treeFocus.register(tree));
      }
    });
  }

  /** "New folder" opens a folded Folders section first, so the new row shows. */
  protected createFolder(): void {
    this.sections.setCollapsed(SIDEBAR_SECTION.Folders, false);
    this.folderMenu.createTopLevel();
  }

  protected retry(): void {
    void this.folders.load();
  }

  protected async select(node: UiTreeNode): Promise<void> {
    await this.router.navigate(sidebarRoute(node.id));
  }

  protected async footerSelected(node: UiTreeNode): Promise<void> {
    if (node.id === SIDEBAR_DATA_ID) {
      this.toggleDataMenu(MENU_FOCUS_EDGE.First);
      return;
    }
    if (node.id === SIDEBAR_THEME_ID) {
      // Switches between the fixed Light and Dark themes and saves the choice on the account.
      void this.settings.setAppearance({
        theme:
          this.theme.resolved() === THEME.Dark ? THEME_PREFERENCE.Light : THEME_PREFERENCE.Dark,
      });
      return;
    }
    if (node.id === SIDEBAR_EXTENSION_ID) {
      this.document.defaultView?.open(this.extension.storeUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    await this.router.navigate([`/${APP_PATH.Trash}`]);
  }

  /** ArrowUp on the data row opens its menu on the last item (the menu grows upwards). */
  private readonly dataKeydown = (event: KeyboardEvent): void => {
    if (event.key === KEYBOARD_KEY.ArrowUp && event.target === this.dataRow()) {
      event.preventDefault();
      this.toggleDataMenu(MENU_FOCUS_EDGE.Last, true);
    }
  };

  protected async openImport(): Promise<void> {
    const { ImportDialogService } =
      await import('../../features/import/services/import-dialog.service');
    this.injector.get(ImportDialogService).open();
  }

  protected async openExport(): Promise<void> {
    const { ExportDialogService } =
      await import('../../features/export/services/export-dialog.service');
    this.injector.get(ExportDialogService).open();
  }

  protected openWhatsNew(): void {
    void this.whatsNew.open();
  }

  private dataRow(): HTMLElement | null {
    return this.host.querySelector<HTMLElement>(`[data-ui-tree-id="${SIDEBAR_DATA_ID}"]`);
  }

  private toggleDataMenu(
    focus: typeof MENU_FOCUS_EDGE.First | typeof MENU_FOCUS_EDGE.Last,
    openOnly = false,
  ): void {
    const row = this.dataRow();
    if (!row) {
      return;
    }
    const menu = this.dataMenu();
    if (menu.anchor() === row && !openOnly) {
      menu.close();
    } else {
      menu.openFrom(row, { focus });
    }
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
