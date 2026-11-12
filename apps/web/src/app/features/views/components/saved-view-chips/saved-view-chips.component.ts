import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LINK_KIND, SAVED_VIEW_SCOPE, type SavedViewResponse } from '@shelfmark/contracts';
import {
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  SAVED_VIEWS_LAYOUT,
  SavedViewsComponent,
  type SavedViewItem,
  type SavedViewMenuRequest,
} from '@shelfmark/ui';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { FoldersStore } from '../../../../stores/folders.store';
import { feedKeyOf, SavedViewsStore } from '../../../../stores/saved-views.store';
import type { LinksFilter } from '../../../links/models/links-filter.type';
import { ALL_VIEW_ID } from '../../models/all-view-id.const';
import { SavedViewActionsService } from '../../services/saved-view-actions.service';
import { activeViewOf, feedQueryOf, viewOnFeed } from '../../utils/feed-views';

/**
 * The saved view chips above the feed: "All" (the whole library), the user's views with their
 * counts and "+ Save this view" for the current filter. The pressed chip is the view whose query
 * is the current filter (else "All" when nothing is narrowed, else none). Each view has a menu:
 * Rename, Move left / right (the keyboard alternative to reordering) and Delete. Counts are
 * re-read whenever the library counts change. Wraps on desktop, scrolls in one row on a phone.
 */
@Component({
  selector: 'app-saved-view-chips',
  imports: [
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    SavedViewsComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved-view-chips.component.html',
  styleUrl: './saved-view-chips.component.scss',
})
export class SavedViewChipsComponent {
  /** The filter of the feed page. */
  readonly filter = input.required<LinksFilter>();

  protected readonly store = inject(SavedViewsStore);
  private readonly actions = inject(SavedViewActionsService);
  private readonly folders = inject(FoldersStore);
  private readonly transloco = inject(TranslocoService);
  private readonly phone = inject(ViewportService).phone;
  private readonly menu = viewChild.required(MenuComponent);
  /** Ticks when the active language or its translations change. */
  private readonly i18n = toSignal(this.transloco.events$, { initialValue: undefined });

  protected readonly layout = computed(() =>
    this.phone() ? SAVED_VIEWS_LAYOUT.Scroll : SAVED_VIEWS_LAYOUT.Wrap,
  );
  /** The feed the counts are taken in (none on plain All links). */
  private readonly feed = computed(() => feedQueryOf(this.filter(), this.store.items()));
  /** The views offered on this feed (a view tied to a place only on All links and on its place). */
  private readonly visible = computed(() =>
    this.store.items().filter((view) => viewOnFeed(view, this.filter())),
  );
  protected readonly items = computed<SavedViewItem[]>(() => {
    this.i18n();
    // Counts of another feed are not shown while the right ones load.
    const counted = this.store.loaded() && this.store.feedKey() === feedKeyOf(this.feed());
    return [
      {
        id: ALL_VIEW_ID,
        label: this.transloco.translate('views.all'),
        count: counted ? this.store.total() : null,
      },
      ...this.visible().map((view) => ({
        id: view.id,
        label: view.name,
        count: counted ? view.count : null,
        menuLabel: this.transloco.translate('views.menu.for', { name: view.name }),
        hint: this.hintOf(view),
      })),
    ];
  });
  protected readonly activeId = computed(() => {
    const filter = this.filter();
    const match = activeViewOf(filter, this.visible());
    return match?.id ?? (!filter.q && filter.kind === undefined ? ALL_VIEW_ID : null);
  });

  /** The view whose menu is open. */
  protected readonly menuView = signal<SavedViewResponse | null>(null);
  protected readonly menuIndex = computed(() => {
    const view = this.menuView();
    return view ? this.store.items().findIndex((item) => item.id === view.id) : -1;
  });
  protected readonly menuLabel = computed(() => {
    this.i18n();
    const view = this.menuView();
    return view ? this.transloco.translate('views.menu.for', { name: view.name }) : '';
  });

  constructor() {
    // The feed changed (or the first load): the counts are read for it.
    effect(() => {
      const feed = this.feed();
      untracked(() => void this.store.load(feed));
    });
    // The library changed (a link saved, moved, deleted, a folder trashed): counts follow.
    let first = true;
    effect(() => {
      this.folders.counts();
      this.folders.entities();
      if (first) {
        first = false;
        return;
      }
      untracked(() => void this.store.refresh());
    });
  }

  protected async select(id: string): Promise<void> {
    if (id === ALL_VIEW_ID) {
      await this.actions.applyAll(this.filter(), this.store.items());
      return;
    }
    const view = this.store.items().find((item) => item.id === id);
    if (view) {
      await this.actions.apply(view, this.filter(), this.store.items());
    }
  }

  protected async add(): Promise<void> {
    await this.actions.saveCurrent(this.filter());
  }

  /** What a plain type view filters, so nobody expects it to follow folders (#335). */
  private hintOf(view: SavedViewResponse): string | undefined {
    const query = view.query;
    const plain = query.scope === SAVED_VIEW_SCOPE.All && query.tags.length === 0 && query.q === '';
    return plain && query.kind !== null && query.kind !== LINK_KIND.Other
      ? this.transloco.translate(`views.kindHint.${query.kind}`)
      : undefined;
  }

  protected openMenu(request: SavedViewMenuRequest): void {
    const view = this.store.items().find((item) => item.id === request.id);
    if (!view) {
      return;
    }
    this.menuView.set(view);
    this.menu().openFrom(request.origin);
  }

  protected async rename(): Promise<void> {
    const view = this.menuView();
    if (view) {
      await this.actions.rename(view);
    }
  }

  protected async remove(): Promise<void> {
    const view = this.menuView();
    if (view) {
      await this.actions.delete(view);
    }
  }

  protected async move(step: -1 | 1): Promise<void> {
    const view = this.menuView();
    if (view) {
      await this.actions.move(view, step);
    }
  }
}
