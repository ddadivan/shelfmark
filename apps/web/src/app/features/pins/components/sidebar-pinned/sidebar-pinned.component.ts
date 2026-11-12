import {
  CdkDrag,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  type CdkDragDrop,
  type CdkDragSortEvent,
} from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PIN_KIND, type FolderResponse, type LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  FaviconComponent,
  FolderIconComponent,
  holdRowsStill,
  KEYBOARD_KEY,
  reorderDropLine,
  setReorderDropLine,
  TOAST_KIND,
  ToastService,
  TREE_REORDER_TOUCH_DELAY_MS,
  TooltipDirective,
} from '@shelfmark/ui';
import { ReorderAnnouncer } from '../../../../core/a11y/reorder-announcer.service';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { PinsStore } from '../../../../stores/pins.store';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { APP_PATH } from '../../../../models/app-path.const';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { ownImageUrl, safeHref, siteLetter } from '../../../links/utils/link-view';
import type { PinRow } from '../../models/pin-row.interface';
import { PinActionsService } from '../../services/pin-actions.service';

/**
 * The "Pinned" section of the sidebar and of the phone Library page: up to seven folders and
 * links in the order the user chose, a folder with its colour, icon and count, a link with its
 * favicon letter. A folder opens its page, a link opens in a new tab. Reorder by dragging (a
 * mouse, or a finger after a short rest; the rows hold still and a line marks the place, #315) or
 * with Alt+Up / Alt+Down on the focused row (announced). Unpin is the row's only action: an icon
 * button (hover / focus, always on touch) with Undo, no "…" menu (#314). While nothing is pinned
 * the sidebar renders nothing; the phone Library page (`card`) keeps the section with one quiet
 * "Nothing pinned yet" row whose tap explains in a toast how to pin (#315), so people know where
 * pins live.
 */
@Component({
  selector: 'app-sidebar-pinned',
  imports: [
    ButtonComponent,
    CdkDrag,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    FaviconComponent,
    FolderIconComponent,
    RouterLink,
    TooltipDirective,
    TranslocoPipe,
  ],
  templateUrl: './sidebar-pinned.component.html',
  styleUrl: './sidebar-pinned.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.pinned--card]': 'card() && shown()' },
})
export class SidebarPinnedComponent {
  protected readonly PIN_KIND = PIN_KIND;
  protected readonly pins = inject(PinsStore);
  protected readonly settings = inject(UserSettingsStore);
  /** Settings › Library › Open links in. */
  protected readonly newTab = this.settings.openInNewTab;
  private readonly actions = inject(PinActionsService);
  private readonly linkActions = inject(LinkActionsService);
  private readonly transloco = inject(TranslocoService);
  private readonly announcer = inject(ReorderAnnouncer);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly toasts = inject(ToastService);
  private readonly viewport = inject(ViewportService);

  /** The id of the open page's row (a folder id), to mark the folder you are in. */
  readonly activeId = input<string | null>(null);
  /** Its own card with a page-sized heading: the phone Library page. */
  readonly card = input(false, { transform: booleanAttribute });

  /**
   * The section is drawn while something is pinned; empty, only on the phone Library page once the
   * pins have loaded (no flash of the empty row before), the desktop sidebar hides it.
   */
  protected readonly shown = computed(
    () =>
      this.pins.rows().length > 0 || (this.card() && this.viewport.compact() && this.pins.loaded()),
  );

  /**
   * Touch reorder like iOS (#315): the finger rests `TREE_REORDER_TOUCH_DELAY_MS` (the folder
   * tree's delay), then moving starts the drag; a move before that scrolls. Mouse at once.
   */
  protected readonly DRAG_START_DELAY = { touch: TREE_REORDER_TOUCH_DELAY_MS, mouse: 0 };
  /** A row is being dragged: a long press must not open the browser's link menu meanwhile. */
  private dragging = false;

  protected dragStarted(): void {
    this.dragging = true;
  }

  protected dragEnded(): void {
    this.dragging = false;
  }

  /** Android fires its own long-press `contextmenu` (the link menu) while a finger drags a row. */
  protected onContextMenu(event: Event): void {
    if (this.dragging) {
      event.preventDefault();
    }
  }

  protected folderLink(folder: FolderResponse): string[] {
    return ['/', APP_PATH.Folders, folder.id];
  }

  protected href(link: LinkResponse): string | undefined {
    return safeHref(link.url);
  }

  protected letter(link: LinkResponse): string {
    return siteLetter(link.url);
  }

  protected favicon(link: LinkResponse): string | undefined {
    return ownImageUrl(link.faviconUrl);
  }

  protected openLink(link: LinkResponse): void {
    this.linkActions.open(link);
  }

  /** The reorder line (#315) where the row would land; the rows hold still. */
  protected sorted(event: CdkDragSortEvent<unknown>): void {
    const list = event.container.element.nativeElement;
    const placeholder = event.item.getPlaceholderElement();
    const items = [...list.children].filter((child) => child instanceof HTMLElement);
    holdRowsStill(items);
    setReorderDropLine(list, reorderDropLine(list, items, placeholder, event.currentIndex));
  }

  protected dropped(event: CdkDragDrop<unknown>): void {
    setReorderDropLine(event.container.element.nativeElement, null);
    this.announcer.announce(event.previousIndex, event.currentIndex, this.pins.rows().length);
    void this.actions.move(event.previousIndex, event.currentIndex);
  }

  /**
   * Alt+Up / Alt+Down on the focused row's link: one place up or down (the keyboard route of
   * dragging), said politely; focus stays on the moved row.
   */
  protected onKeydown(event: KeyboardEvent, index: number, key: string): void {
    const up = event.key === KEYBOARD_KEY.ArrowUp;
    const target = event.target;
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (!up && event.key !== KEYBOARD_KEY.ArrowDown) ||
      !(target instanceof HTMLElement) ||
      !target.classList.contains('pinned__link')
    ) {
      return;
    }
    event.preventDefault();
    const total = this.pins.rows().length;
    const to = index + (up ? -1 : 1);
    if (to < 0 || to >= total) {
      return;
    }
    this.announcer.announce(index, to, total);
    void this.actions.move(index, to);
    // The row's element moves in the list (and loses focus): focus it again once it is drawn.
    afterNextRender(
      () =>
        this.host
          .querySelector<HTMLElement>(`[data-pin="${CSS.escape(key)}"] .pinned__link`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  /** The empty row's tap: how to pin something. */
  protected explainEmpty(): void {
    this.toasts.show({
      kind: TOAST_KIND.Info,
      title: this.transloco.translate('shell.sidebar.pinned.emptyHint'),
    });
  }

  protected unpinLabel(name: string): string {
    return this.transloco.translate('shell.sidebar.pinned.unpinButton', { name });
  }

  /** The row's "Unpin" button: unpinned at once, with an Undo toast. */
  protected unpin(row: PinRow): void {
    void this.actions.unpinRow(row);
  }
}
