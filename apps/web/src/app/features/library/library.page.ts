import { CdkDrag, CdkDragPlaceholder, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BreadcrumbsComponent,
  BULK_BAR_LAYOUT,
  BulkBarComponent,
  ButtonComponent,
  CheckboxComponent,
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
import { EXPORT_FORMAT, PIN_KIND, type ExportFormat } from '@shelfmark/contracts';
import { Router } from '@angular/router';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { ExportActionsService } from '../export/services/export-actions.service';
import { SavedViewChipsComponent } from '../views/components/saved-view-chips/saved-view-chips.component';
import { InViewDirective } from '../links/directives/in-view.directive';
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
import { LibraryHotkeysDirective } from './directives/library-hotkeys.directive';
import { LibraryDragService } from './services/library-drag.service';
import { LibraryBulkService } from './services/library-bulk.service';
import { LibrarySelectionService } from './services/library-selection.service';
import { LibraryFilterService } from './services/library-filter.service';
import { provideLibraryPage } from './services/provide-library-page';
import { FolderTileComponent } from './components/folder-tile/folder-tile.component';
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
    LibraryHotkeysDirective,
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
  styleUrls: ['./library.page.scss', './library-feed.scss', './library-selection.scss'],
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
  protected readonly selection = inject(LibrarySelectionService);
  protected readonly bulk = inject(LibraryBulkService);
  protected readonly drag = inject(LinkDragService);
  protected readonly dnd = inject(LibraryDragService);
  private readonly exporter = inject(ExportActionsService);
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
