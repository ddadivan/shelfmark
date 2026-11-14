import { inject, Service } from '@angular/core';
import type { CdkDragMove } from '@angular/cdk/drag-drop';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { TOAST_KIND, ToastService, type ToastRef } from '@shelfmark/ui';
import { pluralKey } from '../../../core/i18n/plural-key';
import { LinkDragService } from '../../links/services/link-drag.service';
import { isDropTarget } from '../utils/split-param';
import { LibrarySelectionService } from './library-selection.service';

/** How long the "can't drop here" toast stays (ms). */
const REASON_TOAST_MS = 2500;

/** The preview plus this many silhouettes behind it: a deck of three cards. */
const MAX_DECK_DEPTH = 2;

/**
 * Dragging links of the library page onto folders: what a drag carries (the whole selection when
 * a picked link is dragged), the spoken text and the badge of the preview. The drop targets and
 * the hit test live in the app-wide `LinkDragService`. Page-scoped: the page provides it.
 */
@Service({ autoProvided: false })
export class LibraryDragService {
  private readonly links = inject(LinkDragService);
  private readonly selection = inject(LibrarySelectionService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

  /** Touch holds 150 ms before a drag starts (DragDrop spec), so a swipe still scrolls. */
  readonly DRAG_START_DELAY = { touch: 150, mouse: 0 };

  /** A drag began: the drag service takes the links along and a screen reader hears what moves. */
  started(link: LinkResponse): void {
    this.clearReason();
    this.links.start(link, this.selection.selectedLinks());
    const count = this.bundled(link) ? this.selection.selectedCount() : 1;
    this.selection.announce(
      this.transloco.translate(pluralKey('links.drag.started', count), { count }),
    );
  }

  /** The drag ended (drop or Esc): clears the spoken text, the toast tells what moved. */
  ended(): void {
    this.clearReason();
    this.selection.announce('');
    this.links.drop();
  }

  /**
   * A half of the side-by-side view (its `data-link-drop-folder` value, `unsorted` for Unsorted)
   * is the drop target under the pointer: it shows the ring and "Move here".
   */
  dropsOn(value: string | null): boolean {
    return isDropTarget(value, this.links.treeTargetId());
  }

  /** Dragging a picked link (with others picked) carries the whole selection. */
  bundled(link: LinkResponse): boolean {
    return this.selection.selectedCount() > 1 && this.selection.has(link.id);
  }

  /** How many links a drag of `link` carries: the whole selection when it travels, else 1. */
  dragCount(link: LinkResponse): number {
    return this.bundled(link) ? this.selection.selectedCount() : 1;
  }

  /**
   * How many card silhouettes the deck shows behind the preview: none for one link, one for two,
   * two (a deck of three cards) for three or more.
   */
  deckDepth(link: LinkResponse): number {
    return Math.min(MAX_DECK_DEPTH, this.dragCount(link) - 1);
  }

  /** Label key of the drag preview badge: "Move 1 link" / "Move 3 links" (plural per language). */
  dragLabelKey(link: LinkResponse): string {
    return pluralKey('links.drag.move', this.dragCount(link));
  }

  /** The no-drop rows already explained during this drag, and the toast that is up. */
  private readonly explained = new Set<string>();
  private reasonToast: ToastRef | null = null;

  /**
   * Hit-tests the folders under the pointer while a link is dragged. When the pointer first
   * reaches a sidebar row that cannot take links, an info toast says why (once per row and drag;
   * a new row replaces the previous toast). The toast region announces it, so nothing is spoken
   * a second time.
   */
  moved(event: CdkDragMove<unknown>): void {
    this.links.move(event.pointerPosition.x, event.pointerPosition.y);
    const id = this.links.noDropHoverId();
    const key = this.links.noDropReasonKey();
    if (id === null || key === null || this.explained.has(id)) {
      return;
    }
    this.explained.add(id);
    this.reasonToast?.dismiss();
    this.reasonToast = this.toasts.show({
      kind: TOAST_KIND.Info,
      title: this.transloco.translate(key),
      duration: REASON_TOAST_MS,
    });
  }

  private clearReason(): void {
    this.explained.clear();
    this.reasonToast?.dismiss();
    this.reasonToast = null;
  }
}
