import { BULK_ACTION } from '../links/models/bulk-action.const';
import { LINK_SELECT_SHORTCUT } from '../links/models/link-select-shortcut.const';
import { LibraryFilterPanelComponent } from './components/library-filter-panel/library-filter-panel.component';
import { CdkDrag, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SavedViewActionsService } from '../views/services/saved-view-actions.service';
import {
  BadgeComponent,
  BreadcrumbsComponent,
  BULK_BAR_LAYOUT,
  CARD_MEDIA,
  BulkBarComponent,
  ButtonComponent,
  ChipComponent,
  EmptyStateComponent,
  FolderIconComponent,
  FOLDER_ICON_SIZE,
  LoadMoreComponent,
  MenuComponent,
  MenuItemComponent,
  MenuLabelComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  NoticeComponent,
  PickerMenuComponent,
  ProgressBarComponent,
  ResizeHandleComponent,
  SegmentedControlComponent,
  TooltipDirective,
  TooltipGroupDirective,
  SKELETON_SHAPE,
  SkeletonComponent,
  type BreadcrumbClick,
  DragWobbleDirective,
  ScrollFadeDirective,
  mediaMatch,
} from '@shelfmark/ui';
import { PIN_KIND } from '@shelfmark/contracts';
import { Router } from '@angular/router';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { ExportDialogService } from '../export/services/export-dialog.service';
import { SavedViewChipsComponent } from '../views/components/saved-view-chips/saved-view-chips.component';
import { InViewDirective } from '../links/directives/in-view.directive';
import { LinkActionsService } from '../links/services/link-actions.service';
import { DragSlotComponent } from '../links/components/drag-slot/drag-slot.component';
import { LinkDragService } from '../links/services/link-drag.service';
import { HowItWorksService } from '../how-it-works/services/how-it-works.service';
import { LinkCardComponent } from '../links/components/link-card/link-card.component';
import { LinkRowComponent } from '../links/components/link-row/link-row.component';
import { FolderChipsService } from '../links/services/folder-chips.service';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import { FirstRunComponent } from '../onboarding/components/first-run/first-run.component';
import { FoldersStore } from '../../stores/folders.store';
import type { LinksScope } from '../links/models/links-scope.type';
import { APP_PATH } from '../../models/app-path.const';
import { LinksStore } from '../../stores/links.store';
import { PinsStore } from '../../stores/pins.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { isRowsView } from './utils/is-rows-view';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { LibraryFeedService } from './services/library-feed.service';
import { LibraryHeadService } from './services/library-head.service';
import { LibraryFolderService } from './services/library-folder.service';
import { BulkBarFitDirective } from './directives/bulk-bar-fit.directive';
import { LibraryHotkeysDirective } from './directives/library-hotkeys.directive';
import { ToastAboveDirective } from '../../core/layout/toast-above.directive';
import { ToastAreaDirective } from '../../core/layout/toast-area.directive';
import { LibraryDragService } from './services/library-drag.service';
import { LibraryBulkService } from './services/library-bulk.service';
import { LibrarySelectionService } from './services/library-selection.service';
import { LibraryFilterService } from './services/library-filter.service';
import { provideLibraryPage } from './services/provide-library-page';
import { FolderCoverComponent } from './components/folder-cover/folder-cover.component';
import { FolderTileComponent } from './components/folder-tile/folder-tile.component';
import { ExtensionBannerComponent } from './components/extension-banner/extension-banner.component';
import { SplitRightHalfComponent } from './components/split-right-half/split-right-half.component';
import { SplitViewService } from './services/split-view.service';
import { ElementWidthDirective } from './directives/element-width.directive';
import { TidyEntryComponent } from '../ai/components/tidy-entry/tidy-entry.component';
import { SORT_OPTION_KEYS } from './models/sort-option-keys.const';
import { SORT_GROUPS } from './models/sort-groups.const';
import { LinkPreviewService } from '../link-preview/services/link-preview.service';
import { PreviewPanelComponent } from '../link-preview/components/preview-panel/preview-panel.component';
import { PreviewPageComponent } from '../link-preview/components/preview-page/preview-page.component';
import { LibraryViewMenuComponent } from './components/library-view-menu/library-view-menu.component';
import { HelpTextComponent } from '../help/components/help-text/help-text.component';
import { CARD_FIELD } from './models/card-field.const';
import { SearchGoToComponent } from '../search/components/search-go-to/search-go-to.component';
import { SearchMeaningComponent } from '../search/components/search-meaning/search-meaning.component';
import { SearchQuestionHintComponent } from '../search/components/search-question-hint/search-question-hint.component';

/** Number of placeholders shown while the first page loads. */
const SKELETON_COUNT = 8;

/**
 * The links feed of one scope (all, unsorted, favorites; the route data sets `scope`): a toolbar
 * with the count and the cards / list switch, then the links, with a skeleton on first load,
 * a progress bar on refetch and error and empty states.
 */
/** The Sass `wide` mixin is 80em; the toolbar's words need more room (feed column, UK / DE). */
const LABELLED_TOOLS_BELOW_QUERY = '(width < 100em)';

@Component({
  selector: 'app-library-page',
  imports: [
    ScrollFadeDirective,
    LibraryViewMenuComponent,
    HelpTextComponent,
    LibraryFilterPanelComponent,
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
    DragWobbleDirective,
    CdkDropList,
    NgTemplateOutlet,
    TranslocoPipe,
    BadgeComponent,
    BreadcrumbsComponent,
    BulkBarComponent,
    ButtonComponent,
    ChipComponent,
    EmptyStateComponent,
    FolderCoverComponent,
    FolderIconComponent,
    FolderTileComponent,
    ExtensionBannerComponent,
    InViewDirective,
    LibraryHotkeysDirective,
    BulkBarFitDirective,
    ToastAboveDirective,
    ToastAreaDirective,
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
    PickerMenuComponent,
    ProgressBarComponent,
    ElementWidthDirective,
    PreviewPageComponent,
    PreviewPanelComponent,
    ResizeHandleComponent,
    SavedViewChipsComponent,
    SegmentedControlComponent,
    TooltipDirective,
    TooltipGroupDirective,
    SkeletonComponent,
    SplitRightHalfComponent,
    TidyEntryComponent,
    SearchGoToComponent,
    SearchMeaningComponent,
    SearchQuestionHintComponent,
    FirstRunComponent,
  ],
  templateUrl: './library.page.html',
  styleUrls: [
    './library.page.scss',
    './library-head.scss',
    './library-feed.scss',
    './library-selection.scss',
    './library-preview.scss',
    './library-split.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: provideLibraryPage(),
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
  /** From 80em: the "Side by side" button and the right half (#386). */
  protected readonly wide = inject(ViewportService).wide;
  private readonly belowLabelled = mediaMatch(LABELLED_TOOLS_BELOW_QUERY);
  /**
   * The toolbar buttons (Filter, Select, Save view, Sort, Export) carry their words from 100em, when
   * the feed column (window minus the sidebar) holds them in one line in every language; below
   * that they are icons with a tooltip, so the toolbar never breaks into lines with a tool alone.
   */
  protected readonly labelled = computed(() => !this.belowLabelled() && !this.narrow());
  protected readonly splitView = inject(SplitViewService);
  /** The link preview (#553): the desktop split from 80em, the pushed page below. */
  protected readonly preview = inject(LinkPreviewService);
  /** The left feed shares the width with a right half or the preview: the compact toolbar. */
  protected readonly narrow = computed(() => this.splitView.open() || this.preview.split());
  protected readonly FOLDER_ICON_SIZE = FOLDER_ICON_SIZE;
  protected readonly folderChips = inject(FolderChipsService);
  /** Cards and rows name their folder in mixed feeds, not in a folder's own feed or Unsorted (#418). */
  protected readonly showFolderChips = computed(
    () =>
      this.filters.scope() !== LINKS_SCOPE.Folder && this.filters.scope() !== LINKS_SCOPE.Unsorted,
  );
  /**
   * The Shelf folder header (04-organise): tile or cover, title, counts, description, "Add link
   * here" and the folder menu; never in the split view. The highlight colours the sidebar row only.
   */
  protected readonly folderHead = computed(() => (this.narrow() ? null : this.head.banner()));
  protected readonly folderMenu = inject(LibraryFolderService);
  /** "Tidy with suggestions" (AI-2): only in Unsorted, not in the split view; it hides itself while AI is off. */
  protected readonly tidyEntry = computed(
    () => this.filters.scope() === LINKS_SCOPE.Unsorted && !this.narrow(),
  );
  protected readonly selection = inject(LibrarySelectionService);
  protected readonly bulk = inject(LibraryBulkService);
  protected readonly drag = inject(LinkDragService);
  protected readonly dnd = inject(LibraryDragService);
  private readonly exportDialog = inject(ExportDialogService);
  private readonly savedViews = inject(SavedViewActionsService);
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });
  private readonly router = inject(Router);

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
  /** From the query (`?saved=week`): see `parseSavedWithin`. */
  readonly saved = input<unknown>();
  /** From the query (`?fav=1`): see `parseFavoriteParam`. */
  readonly fav = input<unknown>();
  /** From the query (`?split=<folder id>`): the right half of the side-by-side view. */
  readonly split = input<unknown>();
  /** From the query (`?related=<link id>`): "Show related" fills the split picker (AI-3). */
  readonly related = input<unknown>();

  protected readonly emptyIllustration = this.filters.emptyIllustration;
  private readonly libraryFolders = inject(FoldersStore);
  /**
   * The whole library is empty on All links (no filter): the first run (Shelf 10-first-run) takes
   * the place of the empty state.
   */
  protected readonly firstRun = computed(
    () =>
      this.filters.scope() === LINKS_SCOPE.All &&
      !this.filters.filtered() &&
      this.libraryFolders.loaded() &&
      this.libraryFolders.counts().all === 0,
  );
  protected readonly UI_VIEW = UI_VIEW;
  /**
   * The view the feed draws: the saved preference, except beside the link preview, where the narrow
   * feed is List, rows with the 72 x 48 picture (author, round 11; Headlines before). The preference
   * itself is untouched, so the user's view is back when the preview closes.
   */
  protected readonly view = computed(() =>
    this.preview.split() ? UI_VIEW.List : this.filters.view(),
  );
  /** The List or Headlines view: rows in a column instead of cards. */
  protected readonly rowsView = computed(() => isRowsView(this.view()));
  protected readonly LINKS_SCOPE = LINKS_SCOPE;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly pluralKey = pluralKey;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly SORT_GROUPS = SORT_GROUPS;
  protected readonly SORT_OPTION_KEYS = SORT_OPTION_KEYS;

  protected readonly BULK_BAR_LAYOUT = BULK_BAR_LAYOUT;
  protected readonly CARD_MEDIA = CARD_MEDIA;
  protected readonly CARD_FIELD = CARD_FIELD;

  /** Sort button: "Sort: Newest first" (the visible word "Sort" is the start of it). */
  protected readonly sortLabel = computed(() => {
    this.lang();
    return this.transloco.translate('library.sort.label', {
      sort: this.transloco.translate(SORT_OPTION_KEYS[this.filters.feedSort()]),
    });
  });

  /** The "Side by side" toggle: after the split closes it takes the focus the close control had. */
  private readonly splitOpener = viewChild<ButtonComponent>('splitOpener');
  private readonly bulkMore = viewChild.required<MenuComponent>('bulkMore');
  private readonly bulkBarEl = viewChild('bulkBarEl', { read: ElementRef<HTMLElement> });

  /** A bulk bar button: "More" opens its sheet, every other one runs. */
  protected bulkAction(id: string): void {
    const bar = this.bulkBarEl()?.nativeElement;
    if (id === BULK_ACTION.More && bar) {
      this.bulkMore().openFrom(bar);
      return;
    }
    void this.bulk.run(id);
  }

  constructor() {
    this.filters.connect({
      scope: this.scope,
      folderId: this.folderId,
      tag: this.tag,
      q: this.q,
      sort: this.sort,
      kind: this.kind,
      saved: this.saved,
      fav: this.fav,
      split: this.split,
      related: this.related,
    });
    effect(() => {
      const opener = this.splitOpener();
      // After the split closes the button, which stays, takes the focus the close control had.
      if (!this.splitView.open() && opener && this.splitView.takeOpenerFocus()) {
        opener.focus();
      }
    });
    void this.settings.load();
  }

  protected async openUnsorted(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Unsorted}`);
  }

  /**
   * "Export this view…" in the toolbar's ⋯: the Export dialog with the format choice and, when the
   * view has an export equivalent (a folder, tags, a search or a type), "This view" next to the
   * whole library.
   */
  protected exportThisView(): void {
    const scope = this.filters.viewScope();
    this.exportDialog.open(
      scope === undefined
        ? undefined
        : {
            scope,
            count: this.feed.shownHasMore() ? null : this.feed.shownCount(),
            empty: this.feed.empty(),
          },
    );
  }

  /** The key cap next to "Select links" (X). */
  protected readonly SELECT_SHORTCUT_CAP = LINK_SELECT_SHORTCUT.SelectKey.toUpperCase();

  /** Opens the Filter popover under the menu's button (the menu has closed and handed focus back). */
  /** Filter button text: "Filter", with the number of active filters. */
  protected readonly filterLabel = computed(() => {
    this.lang();
    const count = this.filters.filterCount();
    return count === 0
      ? this.transloco.translate('library.toolbar.filter')
      : this.transloco.translate('library.toolbar.filterCount', { count });
  });
  /**
   * "Save view" of the toolbar (the only way to start a view on wider screens since the dashed chip
   * is phone only, author): shown whenever the library has links; the dialog starts from the filter.
   */
  protected readonly saveViewShown = computed(() => !this.feed.emptyLibrary());

  /** "Save view" of the toolbar: the New view dialog, filled with the current filter. */
  protected async saveView(): Promise<void> {
    await this.savedViews.saveCurrent(this.filters.filter());
  }

  protected openFilter(panel: LibraryFilterPanelComponent, button: ButtonComponent): void {
    const anchor = button.element();
    if (anchor) {
      panel.open(anchor);
    }
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
