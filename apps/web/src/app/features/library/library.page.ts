import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { combineLatest, map } from 'rxjs';
import {
  ButtonComponent,
  EmptyStateComponent,
  LoadMoreComponent,
  NoticeComponent,
  ProgressBarComponent,
  SegmentedControlComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type SegmentedOption,
} from '@shelfmark/ui';
import { InViewDirective } from '../links/in-view/in-view.directive';
import { LinkActionsService } from '../links/link-actions.service';
import { LinkCardComponent } from '../links/link-card/link-card.component';
import { LinkRowComponent } from '../links/link-row/link-row.component';
import { LINKS_SCOPE } from '../links/models/links-scope.const';
import type { LinksScope } from '../links/models/links-scope.type';
import { LinksStore } from '../../stores/links.store';
import { UI_VIEW } from '../../stores/models/ui-view.const';
import { isUiView } from '../../stores/is-ui-view';
import { UiStore } from '../../stores/ui.store';
import { VIEW_OPTION_KEYS } from './models/view-option-keys.const';

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
    TranslocoPipe,
    ButtonComponent,
    EmptyStateComponent,
    InViewDirective,
    LinkCardComponent,
    LinkRowComponent,
    LoadMoreComponent,
    NoticeComponent,
    ProgressBarComponent,
    SegmentedControlComponent,
    SkeletonComponent,
  ],
  templateUrl: './library.page.html',
  styleUrl: './library.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LibraryPage {
  protected readonly store = inject(LinksStore);
  protected readonly ui = inject(UiStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly transloco = inject(TranslocoService);

  /** From the route data. */
  readonly scope = input<LinksScope>(LINKS_SCOPE.All);

  protected readonly UI_VIEW = UI_VIEW;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;

  protected readonly titleKey = computed(() => `library.scope.${this.scope()}`);
  protected readonly firstLoad = computed(
    () => !this.store.loaded() && !this.store.error() && this.store.count() === 0,
  );
  protected readonly failed = computed(() => this.store.error() && this.store.count() === 0);
  protected readonly empty = computed(
    () => this.store.loaded() && !this.store.loading() && this.store.count() === 0,
  );
  protected readonly refetching = computed(() => this.store.loading() && this.store.loaded());
  protected readonly showLinks = computed(() => this.store.count() > 0);

  private readonly labels = toSignal(
    combineLatest([
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.Cards]),
      this.transloco.selectTranslate(VIEW_OPTION_KEYS[UI_VIEW.List]),
    ]).pipe(map(([cards, list]) => ({ cards, list }))),
  );
  /** Icon-only switch; `null` until the translations are loaded. */
  protected readonly viewOptions = computed<SegmentedOption[] | null>(() => {
    const labels = this.labels();
    return labels
      ? [
          { value: UI_VIEW.Cards, label: labels.cards, icon: 'cards' },
          { value: UI_VIEW.List, label: labels.list, icon: 'list' },
        ]
      : null;
  });

  constructor() {
    this.store.setFilter(computed(() => ({ scope: this.scope() })));
  }

  protected setView(view: string): void {
    if (isUiView(view)) {
      this.ui.setView(view);
    }
  }

  protected retry(): void {
    this.store.setFilter({ scope: this.scope() });
  }
}
