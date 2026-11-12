import { Dialog } from '@angular/cdk/dialog';
import {
  CdkDrag,
  type CdkDragMove,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
} from '@angular/core';
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
import { isTypingTarget } from '../links/utils/is-typing-target';
import { isLetter } from '../links/utils/link-select-keys';
import { LINK_SELECT_SHORTCUT } from '../links/models/link-select-shortcut.const';
import { LinkActionsService } from '../links/services/link-actions.service';
import { DragSlotComponent } from '../links/components/drag-slot/drag-slot.component';
import { LinkDragService } from '../links/services/link-drag.service';
import { HowItWorksService } from '../how-it-works/services/how-it-works.service';
import { LinkCardComponent } from '../links/components/link-card/link-card.component';
import { LinkRowComponent } from '../links/components/link-row/link-row.component';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { APP_PATH } from '../../models/app-path.const';
import { LinksStore } from '../../stores/links.store';
import { PinsStore } from '../../stores/pins.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { LibraryFeedService } from './services/library-feed.service';
import { LibraryHeadService } from './services/library-head.service';
import { LibraryBulkService } from './services/library-bulk.service';
import { LibrarySelectionService } from './services/library-selection.service';
import { LibraryFilterService } from './services/library-filter.service';
import { FolderTileComponent } from './components/folder-tile/folder-tile.component';
import { scrollFeedForKey } from './utils/feed-keyboard-scroll';
import { SORT_OPTION_KEYS } from './models/sort-option-keys.const';
import { SORT_OPTIONS } from './models/sort-options.const';

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
  providers: [
    LibraryFilterService,
    LibraryFeedService,
    LibraryHeadService,
    LibrarySelectionService,
    LibraryBulkService,
  ],
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
  protected readonly selection = inject(LibrarySelectionService);
  protected readonly bulk = inject(LibraryBulkService);
  protected readonly drag = inject(LinkDragService);
  /** Touch holds 150 ms before a drag starts (DragDrop spec), so a swipe still scrolls. */
  protected readonly DRAG_START_DELAY = { touch: 150, mouse: 0 };
  private readonly exporter = inject(ExportActionsService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
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

  /** A drag began: the drag service takes the links along and a screen reader hears what moves. */
  protected onDragStarted(link: LinkResponse): void {
    this.drag.start(link, this.selection.selectedLinks());
    const count = this.bundled(link) ? this.selection.selectedCount() : 1;
    this.selection.announce(
      this.transloco.translate(pluralKey('links.drag.started', count), { count }),
    );
  }

  /** The drag ended (drop or Esc): clears the spoken text, the toast tells what moved. */
  protected onDragEnded(): void {
    this.selection.announce('');
    this.drag.drop();
  }

  /** Dragging a picked link (with others picked) carries the whole selection. */
  protected bundled(link: LinkResponse): boolean {
    return this.selection.selectedCount() > 1 && this.selection.has(link.id);
  }

  /** How many links a drag of `link` carries: the whole selection when it travels, else 1. */
  protected dragCount(link: LinkResponse): number {
    return this.bundled(link) ? this.selection.selectedCount() : 1;
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
    if (event.key === KEYBOARD_KEY.Escape && this.selection.selecting()) {
      this.selection.endSelection();
      return true;
    }
    const selectAll =
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey &&
      isLetter(event, LINK_SELECT_SHORTCUT.SelectAllKey, LINK_SELECT_SHORTCUT.SelectAllCode);
    if (selectAll && this.feed.showLinks() && !this.feed.stale() && this.feed.shownCount() > 0) {
      event.preventDefault();
      this.selection.selectAll();
      return true;
    }
    return false;
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
