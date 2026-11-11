import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  CheckboxComponent,
  EmptyStateComponent,
  HistoryGroupComponent,
  SegmentedControlComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
  type SegmentedOption,
} from '@shelfmark/ui';
import { pluralKey } from '../../core/i18n/plural-key';
import { ViewportService } from '../../core/layout/viewport.service';
import { APP_PATH } from '../../models/app-path.const';
import { TrashStore } from '../../stores/trash.store';
import { UserSettingsStore } from '../../stores/user-settings.store';
import { TRASH_FILTER } from './models/trash-filter.const';
import type { TrashFilter } from './models/trash-filter.type';
import { TrashActionsService } from './trash-actions.service';
import { trashKey } from './trash-key';
import { TrashRowComponent } from './trash-row/trash-row.component';

/** Placeholders shown while Trash loads. */
const SKELETON_COUNT = 5;

/**
 * `/trash` (TrashView, MobileTrash): what was deleted and waits for its retention to pass. The
 * title with the count and "Empty trash"; All / Links / Folders chips; the entries as history
 * rows ("Recently deleted") with Restore and Delete forever, one at a time or selected (a
 * checkbox on desktop, a long press on the phone) with a selection bar; the explanation footer
 * and the empty state. The store and `TrashActionsService` do the work.
 */
@Component({
  selector: 'app-trash-page',
  imports: [
    TranslocoPipe,
    ButtonComponent,
    CheckboxComponent,
    EmptyStateComponent,
    HistoryGroupComponent,
    SegmentedControlComponent,
    SkeletonComponent,
    TrashRowComponent,
  ],
  templateUrl: './trash.page.html',
  styleUrl: './trash.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class TrashPage {
  protected readonly store = inject(TrashStore);
  protected readonly actions = inject(TrashActionsService);
  protected readonly viewport = inject(ViewportService);
  protected readonly settings = inject(UserSettingsStore);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  protected readonly SKELETON_COUNT = SKELETON_COUNT;
  protected readonly TRASH_FILTER = TRASH_FILTER;
  protected readonly pluralKey = pluralKey;
  protected readonly trashKey = trashKey;
  protected readonly libraryHref = `/${APP_PATH.Library}`;

  /** One "now" for the page: the days left and the "deleted ... ago" texts agree. */
  protected readonly now = signal(Date.now());
  protected readonly filter = signal<TrashFilter>(TRASH_FILTER.All);
  private readonly selection = signal<ReadonlySet<string>>(new Set());

  protected readonly linkCount = computed(() => this.store.linkItems().length);
  protected readonly folderCount = computed(() => this.store.folderItems().length);

  protected readonly visible = computed(() => {
    switch (this.filter()) {
      case TRASH_FILTER.Links:
        return this.store.linkItems();
      case TRASH_FILTER.Folders:
        return this.store.folderItems();
      default:
        return this.store.items();
    }
  });

  /** The selected entries that are still in Trash (an entry that left it drops out by itself). */
  protected readonly selected = computed(() => {
    const keys = this.selection();
    return this.store.items().filter((item) => keys.has(trashKey(item)));
  });
  protected readonly selectedCount = computed(() => this.selected().length);
  /** Phone: checkboxes only show while something is selected. */
  protected readonly selecting = computed(() => !this.viewport.phone() || this.selectedCount() > 0);
  protected readonly allVisibleSelected = computed(() => {
    const visible = this.visible();
    const keys = this.selection();
    return visible.length > 0 && visible.every((item) => keys.has(trashKey(item)));
  });
  protected readonly someSelected = computed(
    () => this.selectedCount() > 0 && !this.allVisibleSelected(),
  );

  protected readonly filterOptions = computed<SegmentedOption[]>(() => [
    {
      value: TRASH_FILTER.All,
      label: this.transloco.translate('trash.filter.all', { count: this.store.items().length }),
    },
    {
      value: TRASH_FILTER.Links,
      label: this.transloco.translate('trash.filter.links', { count: this.linkCount() }),
    },
    {
      value: TRASH_FILTER.Folders,
      label: this.transloco.translate('trash.filter.folders', { count: this.folderCount() }),
    },
  ]);

  constructor() {
    void this.store.open();
    void this.settings.load();
  }

  protected setFilter(value: string): void {
    this.filter.set(
      Object.values(TRASH_FILTER).find((filter) => filter === value) ?? TRASH_FILTER.All,
    );
  }

  protected isSelected(key: string): boolean {
    return this.selection().has(key);
  }

  protected setSelected(key: string, selected: boolean): void {
    this.selection.update((current) => {
      const next = new Set(current);
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  protected toggleAll(checked: boolean): void {
    this.selection.set(
      checked ? new Set(this.visible().map((item) => trashKey(item))) : new Set<string>(),
    );
  }

  protected clearSelection(): void {
    this.selection.set(new Set());
  }

  protected async restoreSelected(): Promise<void> {
    await this.actions.restore(this.selected());
    this.clearSelection();
  }

  protected async deleteSelected(): Promise<void> {
    if (await this.actions.deleteForever(this.selected())) {
      this.clearSelection();
    }
  }

  protected async goToLibrary(event: MouseEvent): Promise<void> {
    event.preventDefault();
    await this.router.navigateByUrl(this.libraryHref);
  }

  protected retry(): void {
    void this.store.load();
  }
}
