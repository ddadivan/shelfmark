import { Dialog } from '@angular/cdk/dialog';
import {
  CdkDrag,
  type CdkDragMove,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BreadcrumbsComponent,
  BULK_BAR_LAYOUT,
  BulkBarComponent,
  ButtonComponent,
  CheckboxComponent,
  KEYBOARD_KEY,
  ChipComponent,
  EmptyStateComponent,
  ICON_SIZE,
  LoadMoreComponent,
  MenuComponent,
  MenuItemComponent,
  MenuLabelComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  NoticeComponent,
  ProgressBarComponent,
  SegmentedControlComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type BreadcrumbClick,
  type BulkBarAction,
} from '@shelfmark/ui';
import {
  EXPORT_FORMAT,
  PIN_KIND,
  type ExportFormat,
  type LinkResponse,
} from '@shelfmark/contracts';
import { Router } from '@angular/router';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { ExportActionsService } from '../export/services/export-actions.service';
import { SavedViewChipsComponent } from '../views/components/saved-view-chips/saved-view-chips.component';
import { InViewDirective } from '../links/directives/in-view.directive';
import { parsePastedLinks } from '../links/components/paste-many/parse-pasted-links';
import { isEditableTarget } from '../shortcuts/utils/is-editable-target';
import { BulkLinkActionsService } from '../links/services/bulk-link-actions.service';
import { BULK_ACTION } from '../links/models/bulk-action.const';
import { isTypingTarget } from '../links/utils/is-typing-target';
import { isLetter } from '../links/utils/link-select-keys';
import { LINK_SELECT_SHORTCUT } from '../links/models/link-select-shortcut.const';
import type { LinkSelectToggle } from '../links/models/link-select-toggle.interface';
import { LinkSelectionStore } from '../../stores/link-selection.store';
import { LinkActionsService } from '../links/services/link-actions.service';
import { DragSlotComponent } from '../links/components/drag-slot/drag-slot.component';
import { LinkDragService } from '../links/services/link-drag.service';
import { HowItWorksService } from '../how-it-works/services/how-it-works.service';
import { LinkCardComponent } from '../links/components/link-card/link-card.component';
import { LinkRowComponent } from '../links/components/link-row/link-row.component';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { APP_PATH } from '../../models/app-path.const';
import { FoldersStore } from '../../stores/folders.store';
import { LinksStore } from '../../stores/links.store';
import { PinsStore } from '../../stores/pins.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { LibraryFeedService } from './services/library-feed.service';
import { LibraryHeadService } from './services/library-head.service';
import { LibraryFilterService } from './services/library-filter.service';
import { SavedViewsStore } from '../../stores/saved-views.store';
import { FolderTileComponent } from './components/folder-tile/folder-tile.component';
import { scrollFeedForKey } from './utils/feed-keyboard-scroll';
import { SORT_OPTION_KEYS } from './models/sort-option-keys.const';
import { SORT_OPTIONS } from './models/sort-options.const';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 8;
/** A link of the feed (card or row) and the control that takes focus in it (its stretched link). */
const FEED_ITEM_SELECTOR = 'li.library__item[data-link-id]';
const FEED_ITEM_FOCUS_SELECTOR = '.ui-card__link, .ui-list-item__link';

/**
 * The links feed of one scope (all, unsorted, favorites; the route data sets `scope`): a toolbar
 * with the count and the cards / list switch, then the links, with a skeleton on first load,
 * a progress bar on refetch and error and empty states.
 */
@Component({
  selector: 'app-library-page',
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    TranslocoPipe,
    BreadcrumbsComponent,
    BulkBarComponent,
    ButtonComponent,
    CheckboxComponent,
    ChipComponent,
    EmptyStateComponent,
    FolderTileComponent,
    InViewDirective,
    LinkCardComponent,
    LinkRowComponent,
    DragSlotComponent,
    LoadMoreComponent,
    MenuComponent,
    MenuItemComponent,
    MenuLabelComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    NoticeComponent,
    ProgressBarComponent,
    SavedViewChipsComponent,
    SegmentedControlComponent,
    SkeletonComponent,
  ],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [LibraryFilterService, LibraryFeedService, LibraryHeadService],
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
  },
})
export default class LibraryPage {
  protected readonly store = inject(LinksStore);
  private readonly settings = inject(UserSettingsStore);
  protected readonly filters = inject(LibraryFilterService);
  protected readonly feed = inject(LibraryFeedService);
  protected readonly head = inject(LibraryHeadService);
  protected readonly actions = inject(LinkActionsService);
  protected readonly pins = inject(PinsStore);
  protected readonly PIN_KIND = PIN_KIND;
  protected readonly howItWorks = inject(HowItWorksService);
  /** Below 40em: the toolbar folds into one View menu and the short labels. */
  protected readonly phone = inject(ViewportService).phone;
  /**
   * The mobile shell (below 64em, #316): no sidebar to drop on, the touch selection header and
   * the stacked bulk bar over the tab bar, the share action.
   */
  protected readonly compact = inject(ViewportService).compact;
  protected readonly selection = inject(LinkSelectionStore);
  private readonly bulk = inject(BulkLinkActionsService);
  protected readonly drag = inject(LinkDragService);
  /** Touch holds 150 ms before a drag starts (DragDrop spec), so a swipe still scrolls. */
  protected readonly DRAG_START_DELAY = { touch: 150, mouse: 0 };
  private readonly exporter = inject(ExportActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly views = inject(SavedViewsStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly title = inject(Title);
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly cdkDialogs = inject(Dialog);

  /** From the route data. */
  readonly scope = input<LinksScope>(LINKS_SCOPE.All);
  /** From the route (`folders/:folderId`). */
  readonly folderId = input<string>();
  /** From the query (`?tag=a&tag=b`): one value or a list; see `parseTagFilter`. */
  readonly tag = input<string | readonly string[]>();
  /** From the query (`?q=signal store`): the search text; see `parseSearchQuery`. */
  readonly q = input<unknown>();
  /** From the query (`?sort=oldest`): see `parseFeedSort`. */
  readonly sort = input<unknown>();
  /** From the query (`?kind=video`): see `parseLinkKind`. */
  readonly kind = input<unknown>();

  protected readonly emptyIllustration = this.filters.emptyIllustration;
  protected readonly UI_VIEW = UI_VIEW;
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;
  protected readonly LINKS_SCOPE = LINKS_SCOPE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly pluralKey = pluralKey;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly SORT_OPTIONS = SORT_OPTIONS;
  protected readonly SORT_OPTION_KEYS = SORT_OPTION_KEYS;

  /** Ids of the links on screen, in order: the range and "select all" of the selection. */
  protected readonly order = computed(() => this.feed.shownLinks().map((link) => link.id));
  /** The picked links that are on screen (a link that left the view drops out by itself). */
  protected readonly selectedLinks = computed(() => {
    const ids = this.selection.idSet();
    return this.feed.shownLinks().filter((link) => ids.has(link.id));
  });
  protected readonly selectedCount = computed(() => this.selectedLinks().length);
  /** A selection is in progress: checkboxes everywhere, the header and the bulk bar show. */
  protected readonly selecting = computed(() => this.selectedCount() > 0);
  protected readonly allSelected = computed(
    () => this.selecting() && this.selectedCount() === this.feed.shownCount(),
  );
  private readonly i18n = toSignal(this.transloco.selectTranslation());
  /** The bulk bar: desktop Move, Tags, Favorite, Open all, Copy links, Delete; the phone shares instead of opening. */
  protected readonly barActions = computed<BulkBarAction[]>(() => {
    this.i18n();
    const t = (key: string): string => this.transloco.translate(key);
    const favorite = this.selecting() && this.selectedLinks().every((link) => link.isFavorite);
    const actions: BulkBarAction[] = [
      { id: BULK_ACTION.Move, label: t('bulk.bar.move'), icon: 'folder-move' },
      { id: BULK_ACTION.Tags, label: t('bulk.bar.tags'), icon: 'tag' },
      {
        id: BULK_ACTION.Favorite,
        label: t('bulk.bar.favorite'),
        icon: favorite ? 'star-filled' : 'star',
        pressed: favorite,
      },
    ];
    if (this.compact()) {
      actions.push(
        this.bulk.canShare()
          ? { id: BULK_ACTION.Share, label: t('bulk.bar.share'), icon: 'share' }
          : { id: BULK_ACTION.Copy, label: t('bulk.bar.copy'), icon: 'copy' },
      );
    } else {
      actions.push(
        { id: BULK_ACTION.OpenAll, label: t('bulk.bar.openAll'), icon: 'external' },
        { id: BULK_ACTION.Copy, label: t('bulk.bar.copy'), icon: 'copy' },
      );
    }
    actions.push({
      id: BULK_ACTION.Delete,
      label: t('bulk.bar.delete'),
      icon: 'trash',
      danger: true,
    });
    return actions;
  });
  protected readonly BULK_BAR_LAYOUT = BULK_BAR_LAYOUT;

  /** The scroll area of the feed (the page itself scrolls on a phone). */
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    this.filters.connect({
      scope: this.scope,
      folderId: this.folderId,
      tag: this.tag,
      q: this.q,
      sort: this.sort,
      kind: this.kind,
    });
    void this.settings.load();
    // A new view, sort or filter starts at the top of its list (the page scroll is reset by the
    // router; this area is not the page).
    effect(() => {
      this.filters.filter();
      untracked(() => {
        const area = this.scroller()?.nativeElement;
        if (area) {
          area.scrollTop = 0;
        }
      });
    });
    // Entering and leaving selection mode is announced politely (the "N selected" header is gone
    // once the mode ends, so it cannot say so itself).
    effect(() => {
      const on = this.selecting();
      untracked(() => {
        if (on !== this.announcedSelecting) {
          this.announcedSelecting = on;
          this.modeAnnouncement.set(
            this.transloco.translate(on ? 'bulk.header.modeOn' : 'bulk.header.modeOff'),
          );
        }
      });
    });
    // A new view, filter, sort or route starts without a selection; links that left the view
    // (deleted, moved out) leave the selection too.
    effect(() => {
      this.filters.filter();
      untracked(() => this.selection.clear());
    });
    effect(() => {
      const order = this.order();
      untracked(() => {
        if (!this.feed.stale()) {
          this.selection.keep(order);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.selection.clear();
    });
  }

  /**
   * ⌘V / Ctrl+V in the library, outside any field and while no dialog is open: text with a link
   * opens Add link with it (one link fills the address, several turn the dialog into the list).
   * Text without a link is left alone.
   */
  protected onPaste(event: ClipboardEvent): void {
    if (
      event.defaultPrevented ||
      isEditableTarget(event.target) ||
      this.cdkDialogs.openDialogs.length > 0
    ) {
      return;
    }
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (parsePastedLinks(text).links.length === 0) {
      return;
    }
    event.preventDefault();
    void this.actions.addLink({ ...this.filters.addLinkData(), text });
  }

  /** Polite live text for entering / leaving selection mode (empty until the first change). */
  protected readonly modeAnnouncement = signal('');
  private announcedSelecting = false;

  /** A drag began: the drag service takes the links along and a screen reader hears what moves. */
  protected onDragStarted(link: LinkResponse): void {
    this.drag.start(link, this.selectedLinks());
    const count = this.bundled(link) ? this.selectedCount() : 1;
    this.modeAnnouncement.set(
      this.transloco.translate(pluralKey('links.drag.started', count), { count }),
    );
  }

  /** The drag ended (drop or Esc): clears the spoken text, the toast tells what moved. */
  protected onDragEnded(): void {
    this.modeAnnouncement.set('');
    this.drag.drop();
  }

  /** Dragging a picked link (with others picked) carries the whole selection. */
  protected bundled(link: LinkResponse): boolean {
    return this.selectedCount() > 1 && this.selection.has(link.id);
  }

  /** How many links a drag of `link` carries: the whole selection when it travels, else 1. */
  protected dragCount(link: LinkResponse): number {
    return this.bundled(link) ? this.selectedCount() : 1;
  }

  /** Label key of the drag preview badge: "Move 1 link" / "Move 3 links" (plural per language). */
  protected dragLabelKey(link: LinkResponse): string {
    return pluralKey('links.drag.move', this.dragCount(link));
  }

  /** Hit-tests the folders under the pointer while a link is dragged. */
  protected onDragMoved(event: CdkDragMove<unknown>): void {
    this.drag.move(event.pointerPosition.x, event.pointerPosition.y);
  }

  /**
   * Page keys: Esc clears the selection, Cmd/Ctrl+A selects every link on screen (not in a field,
   * dialog or menu); with nothing focused the paging keys scroll the feed area.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.selectionKey(event)) {
      return;
    }
    const area = this.scroller()?.nativeElement;
    if (area) {
      scrollFeedForKey(area, event);
    }
  }

  private selectionKey(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing || isTypingTarget(event.target)) {
      return false;
    }
    if (event.key === KEYBOARD_KEY.Escape && this.selecting()) {
      this.endSelection();
      return true;
    }
    const selectAll =
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey &&
      isLetter(event, LINK_SELECT_SHORTCUT.SelectAllKey, LINK_SELECT_SHORTCUT.SelectAllCode);
    if (selectAll && this.feed.showLinks() && !this.feed.stale() && this.feed.shownCount() > 0) {
      event.preventDefault();
      this.selectAll();
      return true;
    }
    return false;
  }

  /** A card or row asked to toggle (checkbox, click while selecting, Space, long press). */
  protected toggleSelected(link: LinkResponse, toggle: LinkSelectToggle): void {
    this.selection.toggle(link.id, this.order(), toggle.range);
  }

  protected selectAll(): void {
    this.selection.selectAll(this.order());
  }

  protected toggleAll(checked: boolean): void {
    if (checked) {
      this.selectAll();
    } else {
      this.endSelection();
    }
  }

  protected clearSelection(): void {
    this.selection.clear();
  }

  /**
   * Leaves selection mode (Esc, Done, the header box, the phone's close button). The selection bar
   * that may hold focus goes away, so focus returns to the feed: it stays on a card or row that
   * has it, else goes to the link last picked (the selection anchor), else to the first one, and
   * never falls to the toolbar above the feed.
   */
  protected endSelection(): void {
    const anchor = this.selection.anchor();
    this.clearSelection();
    const active = this.doc.activeElement;
    if (active instanceof HTMLElement && active.closest(FEED_ITEM_SELECTOR)) {
      return;
    }
    const items = [...this.host.querySelectorAll<HTMLElement>(FEED_ITEM_SELECTOR)];
    const item = items.find((candidate) => candidate.dataset['linkId'] === anchor) ?? items[0];
    item?.querySelector<HTMLElement>(FEED_ITEM_FOCUS_SELECTOR)?.focus();
  }

  /** A bulk bar button: runs the action on the picked links; some clear the selection afterwards. */
  protected async runBulk(id: string): Promise<void> {
    const links = this.selectedLinks();
    let clear = false;
    switch (id) {
      case BULK_ACTION.Move:
        clear = await this.bulk.move(links);
        break;
      case BULK_ACTION.Tags:
        clear = await this.bulk.editTags(links);
        break;
      case BULK_ACTION.Favorite:
        clear = await this.bulk.toggleFavorite(links);
        break;
      case BULK_ACTION.OpenAll:
        clear = await this.bulk.openAll(links);
        break;
      case BULK_ACTION.Copy:
        clear = await this.bulk.copy(links);
        break;
      case BULK_ACTION.Share:
        clear = await this.bulk.share(links);
        break;
      case BULK_ACTION.Delete:
        clear = await this.bulk.delete(links);
        break;
    }
    if (clear) {
      this.clearSelection();
    }
  }

  protected async openUnsorted(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Unsorted}`);
  }

  protected async exportView(format: ExportFormat): Promise<void> {
    await this.exporter.download(format, this.filters.viewScope());
  }

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected async showAll(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Links}`);
  }

  protected async openCrumb(click: BreadcrumbClick): Promise<void> {
    click.event?.preventDefault();
    if (click.item.href) {
      await this.router.navigateByUrl(click.item.href);
    }
  }

  protected retry(): void {
    this.feed.retry();
  }
}
