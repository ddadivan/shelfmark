import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { LinkResponse } from '@shelfmark/contracts';
import { KEYBOARD_KEY } from '@shelfmark/ui';
import { FoldersStore } from '../../../stores/folders.store';
import { LINKS_SCOPE } from '../models/links-scope.const';
import { LINK_DROP_ATTRIBUTE } from '../models/link-drop-attribute.const';
import { LinkSelectionStore } from '../../../stores/link-selection.store';
import { SIDEBAR_RECENT_ID } from '../../../shell/sidebar/models/sidebar-recent-id.const';
import { SIDEBAR_TRASH_ID } from '../../../shell/sidebar/models/sidebar-trash-id.const';
import { BulkLinkActionsService } from './bulk-link-actions.service';
import { LinkActionsService } from './link-actions.service';

/** `data-ui-tree-id` on the rows of `ui-tree` (libs/ui). */
const TREE_ROW_SELECTOR = '[data-ui-tree-id]';

/** Fixed sidebar rows that are no drop target: All links, Favorites, Recently opened, Trash. */
const NO_DROP_TREE_IDS: readonly string[] = [
  LINKS_SCOPE.All,
  LINKS_SCOPE.Favorites,
  SIDEBAR_RECENT_ID,
  SIDEBAR_TRASH_ID,
];
const EMPTY_IDS: readonly string[] = [];

/**
 * Drag a link onto a folder (DragDrop spec). The feed reports the drag (CDK `cdkDrag` events);
 * this service hit-tests the pointer against the sidebar tree rows, the pinned folders and the subfolder tiles, keeps
 * the current target for their highlight, and moves the link on drop through
 * `LinkActionsService.moveTo` (optimistic, `moved` toast with Undo). Dragging a selected link
 * carries the whole selection (one batch move through `BulkLinkActionsService.moveTo`, one toast,
 * then the selection clears); an unselected link moves alone. Esc cancels. The keyboard
 * alternative is "Move to folder…".
 */
@Service()
export class LinkDragService {
  private readonly doc = inject(DOCUMENT);
  private readonly folders = inject(FoldersStore);
  private readonly actions = inject(LinkActionsService);
  private readonly bulk = inject(BulkLinkActionsService);
  private readonly selection = inject(LinkSelectionStore);

  /** The links being dragged: the selection when the grabbed link is part of it, else just it. */
  private readonly links = signal<readonly LinkResponse[]>([]);
  private readonly link = signal<LinkResponse | null>(null);
  /** Folder id under the pointer, `null` for Unsorted, `undefined` for no target. */
  private readonly target = signal<string | null | undefined>(undefined);

  readonly dragging = computed(() => this.link() !== null);
  /** Ids of the links that travel with the pointer (the feed dims the other ones). */
  readonly carriedIds = computed(() => new Set(this.links().map((item) => item.id)));
  /** Id of the highlighted sidebar row (`ui-tree` `dropTargetId`). */
  readonly treeTargetId = computed(() => {
    const target = this.target();
    return target === undefined ? null : (target ?? LINKS_SCOPE.Unsorted);
  });
  /**
   * Sidebar rows that cannot take links while one is dragged (`ui-tree` `noDropIds`): they show a
   * no-drop cursor and a muted state. Unsorted can (the drop removes the folder).
   */
  readonly treeNoDropIds = computed<readonly string[]>(() =>
    this.dragging() ? NO_DROP_TREE_IDS : EMPTY_IDS,
  );
  /** Folder id of the highlighted subfolder tile and pinned folder row. */
  readonly folderTargetId = computed(() => this.target() ?? null);

  constructor() {
    // A drag cut short by the injector going away (sign-out, a destroyed test bed) must not leave
    // the capture listener behind: it would swallow every later Esc on the page.
    inject(DestroyRef).onDestroy(() => this.finish());
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === KEYBOARD_KEY.Escape) {
      event.preventDefault();
      event.stopPropagation();
      this.finish();
      // The CDK keeps following the pointer until it is released; nothing happens on release.
      this.cancelled = true;
    }
  };
  private cancelled = false;

  /**
   * The pointer went down on a draggable item: remembers where in the item it grabbed (CSS
   * variables on the root, read by the drag preview), so the shrunk preview can sit down-right of
   * the pointer instead of around it, and the item's height, so the slot it leaves behind (the
   * CDK placeholder) keeps its exact size. Cleared when the drag ends.
   */
  grab(event: PointerEvent): void {
    const item = event.currentTarget;
    if (!(item instanceof HTMLElement)) {
      return;
    }
    const box = item.getBoundingClientRect();
    const root = this.doc.documentElement.style;
    root.setProperty('--drag-grab-x', `${event.clientX - box.left}px`);
    root.setProperty('--drag-grab-y', `${event.clientY - box.top}px`);
    root.setProperty('--drag-slot-height', `${box.height}px`);
  }

  /**
   * A drag began on `link`. `selected` are the picked links on screen: when `link` is one of
   * them (and there are several) all of them travel together.
   */
  start(link: LinkResponse, selected: readonly LinkResponse[] = []): void {
    const together = selected.length > 1 && selected.some((item) => item.id === link.id);
    this.links.set(together ? selected : [link]);
    this.link.set(link);
    this.target.set(undefined);
    this.cancelled = false;
    this.doc.addEventListener('keydown', this.onKeydown, true);
  }

  /** The pointer moved to `x`, `y` (viewport coordinates) while dragging. */
  move(x: number, y: number): void {
    const link = this.link();
    if (!link || this.cancelled) {
      return;
    }
    const target = this.targetAt(x, y);
    const already = this.links().every((item) => item.folderId === target);
    this.target.set(already ? undefined : target);
  }

  /** The pointer was released: moves the link when it is over a target. */
  drop(): void {
    const link = this.link();
    const links = this.links();
    const target = this.target();
    const cancelled = this.cancelled;
    this.finish();
    if (!link || target === undefined || cancelled) {
      return;
    }
    if (links.length > 1) {
      void this.bulk.moveTo(links, target).then((moved) => {
        if (moved) {
          this.selection.clear();
        }
      });
    } else {
      void this.actions.moveTo(link, target);
    }
  }

  private finish(): void {
    this.link.set(null);
    this.links.set([]);
    this.doc.documentElement.style.removeProperty('--drag-grab-x');
    this.doc.documentElement.style.removeProperty('--drag-grab-y');
    this.doc.documentElement.style.removeProperty('--drag-slot-height');
    this.target.set(undefined);
    this.doc.removeEventListener('keydown', this.onKeydown, true);
  }

  private targetAt(x: number, y: number): string | null | undefined {
    const element = this.doc.elementFromPoint(x, y);
    const tile = element?.closest(`[${LINK_DROP_ATTRIBUTE}]`);
    if (tile) {
      return this.folderOrNothing(tile.getAttribute(LINK_DROP_ATTRIBUTE));
    }
    const id = element?.closest(TREE_ROW_SELECTOR)?.getAttribute('data-ui-tree-id');
    return id === LINKS_SCOPE.Unsorted ? null : this.folderOrNothing(id);
  }

  private folderOrNothing(id: string | null | undefined): string | undefined {
    return id && this.folders.entityMap()[id] ? id : undefined;
  }
}
