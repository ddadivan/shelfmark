import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AskButtonComponent,
  AvatarComponent,
  ButtonComponent,
  CARD_MEDIA,
  CardComponent,
  CHIP_VARIANT,
  ChipComponent,
  FaviconComponent,
  FolderColourDirective,
  ICON_SIZE,
  IconComponent,
  LogoComponent,
  SearchTriggerComponent,
  SegmentedControlComponent,
  TabBarComponent,
  ToastComponent,
  TreeComponent,
  ViewMenuComponent,
  type SavedViewItem,
  type SegmentedOption,
  type TabBarItem,
  type UiTreeNode,
  SavedViewsComponent,
  SAVED_VIEWS_LAYOUT,
  TOAST_KIND,
  UiResizeDirective,
} from '@shelfmark/ui';
import {
  dataNodes,
  extensionNodes,
  fixedNodes,
  trashNodes,
} from '../../../../shell/sidebar/utils/sidebar-nodes';
import { injectSidebarLabels } from '../../../../shell/sidebar/utils/inject-sidebar-labels';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';
import { LANDING_IMAGES } from '../../models/landing-images.const';
import type { LandingFolder } from '../../models/landing-folder.type';
import { LANDING_PREVIEW_CARDS } from '../../models/landing-preview-cards.const';
import { LANDING_PREVIEW_KIND } from '../../models/landing-preview-kind.const';
import { LANDING_PREVIEW_ROWS } from '../../models/landing-preview-rows.const';
import { LANDING_PREVIEW_SCOPE } from '../../models/landing-preview-scope.const';
import type { LandingPreviewTab } from '../../models/landing-preview-tab.type';
import { LANDING_FOLDER } from '../../models/landing-folder.const';
import { LandingPreviewCycleService } from '../../services/landing-preview-cycle.service';
import { previewShows } from '../../utils/landing-preview';
import { scopeLabelKey } from '../../../links/utils/scope-label-key';

/** The window the picture shows: the app at 1400px, laid out at that size and scaled down. */
const STAGE_WIDTH = 1400;
/** Below this width the picture is the phone shell at its own size (no scaling, no sidebar). */
const PHONE_BELOW = 560;
/** The width before the first measurement. */
const INITIAL_WIDTH = 720;

/**
 * The live app preview on the first screen (16-landing): a picture of the Shelf app made of the
 * real `libs/ui` components (sidebar tree, buttons, saved views, cards with their slots, toast).
 * On a wide window the app is laid out at 1400px and scaled down with a CSS transform; on a phone
 * it is the mobile shell at its own size. Decorative: `role="img"` with a name, the content is
 * `inert` and `aria-hidden`. The cycle (`LandingPreviewCycleService`) picks the frames.
 */
@Component({
  selector: 'app-landing-hero-preview',
  imports: [
    AskButtonComponent,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    ChipComponent,
    UiResizeDirective,
    FolderColourDirective,
    FaviconComponent,
    IconComponent,
    LogoComponent,
    SavedViewsComponent,
    SearchTriggerComponent,
    SegmentedControlComponent,
    TabBarComponent,
    ToastComponent,
    TranslocoPipe,
    TreeComponent,
    ViewMenuComponent,
  ],
  hostDirectives: [LandingLoopGateDirective],
  providers: [LandingPreviewCycleService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-hero-preview.component.html',
  styleUrl: './landing-hero-preview.component.scss',
})
export class LandingHeroPreviewComponent {
  protected readonly cycle = inject(LandingPreviewCycleService);
  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$);
  private readonly labels = injectSidebarLabels();

  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly CARD_MEDIA = CARD_MEDIA;
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly TOAST_KIND = TOAST_KIND;
  protected readonly SAVED_VIEWS_LAYOUT = SAVED_VIEWS_LAYOUT;
  protected readonly IMAGES = LANDING_IMAGES;
  protected readonly user = 'Sam Lee';
  protected readonly shortcut = 'Ctrl K';

  private readonly width = signal(INITIAL_WIDTH);
  protected readonly phone = computed(() => this.width() < PHONE_BELOW);
  /** Wide: the stage's scale; phone: 1. */
  protected readonly scale = computed(() => (this.phone() ? 1 : this.width() / STAGE_WIDTH));

  protected measured(width: number): void {
    if (width > 0) {
      this.width.set(width);
    }
  }

  private t(key: string, params?: Record<string, string>): string {
    this.lang();
    return this.transloco.translate(key, params);
  }

  protected readonly library = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return labels ? fixedNodes(labels, { all: 17, unsorted: 3, favorites: 3 }, 3) : [];
  });

  protected readonly folders = computed<UiTreeNode[]>(() => {
    this.lang();
    const node = (scope: LandingFolder, count: number, colour: string): UiTreeNode => ({
      id: scope,
      name: this.t(`landing.folders.${scope}`),
      count,
      icon: 'folder',
      colour,
    });
    return LANDING_PREVIEW_ROWS.map((row) => ({
      ...node(row.scope, row.count, row.colour),
      ...(row.children && {
        children: row.children.map((child) => node(child.scope, child.count, row.colour)),
      }),
    }));
  });

  protected readonly footerRows = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return labels ? [...extensionNodes(labels, true), ...dataNodes(labels)] : [];
  });

  protected readonly trash = computed<UiTreeNode[]>(() => {
    const labels = this.labels();
    return labels ? trashNodes(labels, undefined) : [];
  });

  protected readonly viewOptions = computed<SegmentedOption[]>(() => {
    this.lang();
    return [
      { value: 'masonry', label: this.t('library.view.masonry'), icon: 'masonry' },
      { value: 'cards', label: this.t('library.view.cards'), icon: 'cards' },
      { value: 'list', label: this.t('library.view.list'), icon: 'list' },
      { value: 'headlines', label: this.t('library.view.headlines'), icon: 'lines' },
    ];
  });

  protected readonly tabs = computed<TabBarItem[]>(() => {
    this.lang();
    return [
      { id: 'today', label: this.t('shell.tabs.today'), icon: 'history' },
      { id: 'library', label: this.t('shell.tabs.library'), icon: 'bookmark' },
      { id: 'search', label: this.t('shell.tabs.search'), icon: 'search' },
      { id: 'tags', label: this.t('shell.tabs.tags'), icon: 'tag' },
    ];
  });

  /** The saved-view tabs: shown on All links only. */
  protected readonly views = computed<SavedViewItem[]>(() => {
    this.lang();
    return [
      { id: 'all', label: this.t('views.all'), count: 17 },
      { id: LANDING_PREVIEW_KIND.Video, label: this.t('links.kind.video'), count: 6 },
      { id: LANDING_PREVIEW_KIND.Shop, label: this.t('links.kind.shopping'), count: 4 },
    ];
  });

  protected readonly viewActive = computed<LandingPreviewTab>(() => this.cycle.state().tab);
  /** The phone row's views picker shows the open view's name, as in the app. */
  protected readonly viewActiveLabel = computed(
    () => this.views().find((view) => view.id === this.viewActive())?.label ?? '',
  );
  protected readonly onAll = computed(() => this.cycle.state().scope === LANDING_PREVIEW_SCOPE.All);

  /** Every card with whether the current frame shows it (hidden ones stay in the DOM). */
  protected readonly cards = computed(() =>
    LANDING_PREVIEW_CARDS.map((card, index) => ({
      card,
      index,
      shown: previewShows(card, this.cycle.state()),
      ratio: card.image.width / card.image.height,
    })),
  );

  protected readonly titleKey = computed(() => {
    const scope = this.cycle.state().scope;
    const folder = (Object.values(LANDING_FOLDER) as string[]).includes(scope);
    return folder ? `landing.folders.${scope}` : scopeLabelKey(scope);
  });

  protected folderKey(folder: LandingFolder): string {
    return `landing.folders.${folder}`;
  }

  protected folderColour(folder: LandingFolder): string {
    const row = LANDING_PREVIEW_ROWS.find((item) => item.scope === folder);
    return `var(--folder-${row?.colour ?? 'sage'})`;
  }
}
