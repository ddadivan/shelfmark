import {
  CdkDrag,
  CdkDragPlaceholder,
  CdkDragPreview,
  CdkDropList,
  type CdkDragDrop,
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
  KEYBOARD_KEY,
  TooltipDirective,
} from '@shelfmark/ui';
import { ReorderAnnouncer } from '../../../core/a11y/reorder-announcer.service';
import { ViewportService } from '../../../core/layout/viewport.service';
import { PinsStore } from '../../../stores/pins.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { APP_PATH } from '../../../models/app-path.const';
import { LinkActionsService } from '../../links/link-actions.service';
import { ownImageUrl, safeHref, siteLetter } from '../../links/link-view';
import type { PinRow } from '../models/pin-row.interface';
import { PinActionsService } from '../pin-actions.service';

/**
 * The "Pinned" section of the sidebar and of the phone Library page: up to seven folders and
 * links in the order the user chose, a folder with its colour, icon and count, a link with its
 * favicon letter. A folder opens its page, a link opens in a new tab. Reorder by dragging (desktop,
 * a drop line marks the place) or with Alt+Up / Alt+Down on the focused row (announced). Unpin is
 * the row's only action: an icon button (hover / focus, always on touch) with Undo, no "…" menu
 * (#314). Settings ›
 * Library › Edit pinned keeps its buttons. Nothing is rendered while nothing is pinned.
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
  host: { '[class.pinned--card]': 'card()' },
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
  private readonly viewport = inject(ViewportService);
  private readonly announcer = inject(ReorderAnnouncer);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The id of the open page's row (a folder id), to mark the folder you are in. */
  readonly activeId = input<string | null>(null);
  /** Its own card with a page-sized heading: the phone Library page. */
  readonly card = input(false, { transform: booleanAttribute });

  /** Dragging is for a mouse; on a phone a drag would fight scrolling (Alt+arrows still work). */
  protected readonly dragDisabled = computed(() => this.viewport.phone());

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

  protected dropped(event: CdkDragDrop<unknown>): void {
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

  protected unpinLabel(name: string): string {
    return this.transloco.translate('shell.sidebar.pinned.unpinButton', { name });
  }

  /** The row's "Unpin" button: unpinned at once, with an Undo toast. */
  protected unpin(row: PinRow): void {
    void this.actions.unpinRow(row);
  }
}
