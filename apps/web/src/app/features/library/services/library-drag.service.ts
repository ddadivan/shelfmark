import { inject, Service } from '@angular/core';
import type { CdkDragMove } from '@angular/cdk/drag-drop';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { pluralKey } from '../../../core/i18n/plural-key';
import { LinkDragService } from '../../links/services/link-drag.service';
import { LibrarySelectionService } from './library-selection.service';

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

  /** Touch holds 150 ms before a drag starts (DragDrop spec), so a swipe still scrolls. */
  readonly DRAG_START_DELAY = { touch: 150, mouse: 0 };

  /** A drag began: the drag service takes the links along and a screen reader hears what moves. */
  started(link: LinkResponse): void {
    this.links.start(link, this.selection.selectedLinks());
    const count = this.bundled(link) ? this.selection.selectedCount() : 1;
    this.selection.announce(
      this.transloco.translate(pluralKey('links.drag.started', count), { count }),
    );
  }

  /** The drag ended (drop or Esc): clears the spoken text, the toast tells what moved. */
  ended(): void {
    this.spokenReasonKey = null;
    this.selection.announce('');
    this.links.drop();
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

  /** The reason last spoken for a no-drop row, so it is announced once per row, not per move. */
  private spokenReasonKey: string | null = null;

  /**
   * Hit-tests the folders under the pointer while a link is dragged. When the pointer reaches a
   * sidebar row that cannot take links, its reason is spoken in the live region (polite).
   */
  moved(event: CdkDragMove<unknown>): void {
    this.links.move(event.pointerPosition.x, event.pointerPosition.y);
    const key = this.links.noDropReasonKey();
    if (key !== this.spokenReasonKey) {
      this.spokenReasonKey = key;
      if (key) {
        this.selection.announce(this.transloco.translate(key));
      }
    }
  }
}
