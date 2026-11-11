import { CdkDrag, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PIN_KIND, type FolderResponse, type LinkResponse } from '@shelfmark/contracts';
import {
  ButtonComponent,
  FaviconComponent,
  FolderIconComponent,
  MenuComponent,
  MenuItemComponent,
  MenuTriggerDirective,
  TooltipDirective,
} from '@shelfmark/ui';
import { ViewportService } from '../../../core/layout/viewport.service';
import { PinsStore } from '../../../stores/pins.store';
import { UserSettingsStore } from '../../../stores/user-settings.store';
import { APP_PATH } from '../../../models/app-path.const';
import { LinkActionsService } from '../../links/link-actions.service';
import { ownImageUrl, safeHref, siteLetter } from '../../links/link-view';
import { PinActionsService } from '../pin-actions.service';

/**
 * The "Pinned" section of the sidebar and of the phone Library page: up to seven folders and
 * links in the order the user chose, a folder with its colour, icon and count, a link with its
 * favicon letter. A folder opens its page, a link opens in a new tab. Reorder by dragging (desktop)
 * or with "Move up" / "Move down" in the item menu (also on a phone); "Unpin from sidebar" is in the
 * menu too. Nothing is rendered while nothing is pinned.
 */
@Component({
  selector: 'app-sidebar-pinned',
  imports: [
    ButtonComponent,
    CdkDrag,
    CdkDropList,
    FaviconComponent,
    FolderIconComponent,
    MenuComponent,
    MenuItemComponent,
    MenuTriggerDirective,
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
  private readonly actions = inject(PinActionsService);
  private readonly linkActions = inject(LinkActionsService);
  private readonly transloco = inject(TranslocoService);
  private readonly viewport = inject(ViewportService);

  /** The id of the open page's row (a folder id), to mark the folder you are in. */
  readonly activeId = input<string | null>(null);
  /** Its own card with a page-sized heading: the phone Library page. */
  readonly card = input(false, { transform: booleanAttribute });

  /** Dragging is for a mouse; a phone reorders with the item menu (a drag would fight scrolling). */
  protected readonly dragDisabled = computed(() => this.viewport.phone());

  protected folderLink(folder: FolderResponse): string[] {
    return ['/', APP_PATH.Folders, folder.id];
  }

  protected menuLabel(name: string): string {
    return this.transloco.translate('shell.sidebar.pinned.actions', { name });
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
    void this.actions.move(event.previousIndex, event.currentIndex);
  }

  protected move(index: number, delta: number): void {
    void this.actions.move(index, index + delta);
  }

  protected unpinFolder(folder: FolderResponse): void {
    void this.actions.unpinFolder(folder);
  }

  protected unpinLink(link: LinkResponse): void {
    void this.actions.unpinLink(link);
  }

  protected openContext(event: MouseEvent, menu: MenuComponent): void {
    event.preventDefault();
    menu.openAt({ x: event.clientX, y: event.clientY });
  }
}
