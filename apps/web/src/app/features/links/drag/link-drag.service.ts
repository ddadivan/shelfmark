import { DOCUMENT } from '@angular/common';
import { computed, inject, Service, signal } from '@angular/core';
import type { LinkResponse } from '@shelfmark/contracts';
import { KEYBOARD_KEY } from '@shelfmark/ui';
import { FoldersStore } from '../../../stores/folders.store';
import { LINKS_SCOPE } from '../models/links-scope.const';
import { LINK_DROP_ATTRIBUTE } from '../models/link-drop-attribute.const';
import { LinkActionsService } from '../link-actions.service';

/** `data-ui-tree-id` on the rows of `ui-tree` (libs/ui). */
const TREE_ROW_SELECTOR = '[data-ui-tree-id]';

/**
 * Drag a link onto a folder (DragDrop spec). The feed reports the drag (CDK `cdkDrag` events);
 * this service hit-tests the pointer against the sidebar tree rows and the subfolder tiles, keeps
 * the current target for their highlight, and moves the link on drop through
 * `LinkActionsService.moveTo` (optimistic, `moved` toast with Undo). Esc cancels. The keyboard
 * alternative is "Move to folder…".
 */
@Service()
export class LinkDragService {
  private readonly doc = inject(DOCUMENT);
  private readonly folders = inject(FoldersStore);
  private readonly actions = inject(LinkActionsService);

  private readonly link = signal<LinkResponse | null>(null);
  /** Folder id under the pointer, `null` for Unsorted, `undefined` for no target. */
  private readonly target = signal<string | null | undefined>(undefined);

  readonly dragging = computed(() => this.link() !== null);
  /** Id of the highlighted sidebar row (`ui-tree` `dropTargetId`). */
  readonly treeTargetId = computed(() => {
    const target = this.target();
    return target === undefined ? null : (target ?? LINKS_SCOPE.Unsorted);
  });
  /** Folder id of the highlighted subfolder tile. */
  readonly folderTargetId = computed(() => this.target() ?? null);

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

  start(link: LinkResponse): void {
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
    this.target.set(target === link.folderId ? undefined : target);
  }

  /** The pointer was released: moves the link when it is over a target. */
  drop(): void {
    const link = this.link();
    const target = this.target();
    const cancelled = this.cancelled;
    this.finish();
    if (link && target !== undefined && !cancelled) {
      void this.actions.moveTo(link, target);
    }
  }

  private finish(): void {
    this.link.set(null);
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
