import { afterRenderEffect, Directive, ElementRef, inject } from '@angular/core';
import { LinkPreviewService } from '../../link-preview/services/link-preview.service';
import { LibraryFeedService } from '../services/library-feed.service';

/** Room kept above a row the list scrolls to, in px (clear of the area's top scroll fade). */
const REVEAL_GAP_PX = 8;
/** Frames an opened preview's row is kept at the top while the feed settles (~0.5 s). */
const SETTLE_FRAMES = 30;
/** The desktop sidebar, whose folder tree owns ↑ / ↓. */
const SIDEBAR = 'app-sidebar';
/** The one focusable link of a feed card or row. */
const ROW_LINK = '.ui-list-item__link, .ui-card__link';

/**
 * Keeps the link open in the side-by-side preview on screen in the library's scroll area (author,
 * Nov 27): when the preview opens (a click, a reload with `?preview=`) its row scrolls to the top
 * of the list; when it moves to another link (↑ / ↓, the toolbar's previous and next) the list
 * scrolls only as far as needed to show the new row. Nothing scrolls while the row is not rendered
 * yet; it runs again once the feed shows it. Only this area scrolls, never the page.
 */
@Directive({ selector: '[appRevealPreviewed]' })
export class RevealPreviewedDirective {
  private readonly area = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly preview = inject(LinkPreviewService);
  private readonly feed = inject(LibraryFeedService);
  /** The link this area last scrolled to; `null` while no preview is open. */
  private revealed: string | null = null;
  /** Bumped on every reveal, so a settle loop of an earlier row stops. */
  private settleRun = 0;

  constructor() {
    afterRenderEffect(() => {
      const id = this.preview.split() ? this.preview.currentId() : null;
      // Read so a row that renders later (a reload, a later page) is still revealed.
      this.feed.shownLinks();
      if (id === null) {
        this.revealed = null;
        return;
      }
      if (id === this.revealed) {
        return;
      }
      const row = this.row(id);
      if (row === null) {
        return;
      }
      this.reveal(id, row, this.revealed === null);
      this.revealed = id;
    });
  }

  private row(id: string): HTMLElement | null {
    return this.area.querySelector<HTMLElement>(`[data-link-id="${CSS.escape(id)}"]`);
  }

  private reveal(id: string, row: HTMLElement, toTop: boolean): void {
    this.align(row, toTop);
    this.settleRun += 1;
    if (toTop) {
      this.adoptFocus(row);
      this.settle(id, SETTLE_FRAMES, this.settleRun);
    }
  }

  /**
   * Opening a preview reshapes the feed (cards turn into List rows) and a fresh page resets the
   * area's scroll once the filter loads, both after the first alignment: keep the row at the top
   * for a few frames, until it stays put.
   */
  private settle(id: string, frames: number, run: number): void {
    const view = this.area.ownerDocument.defaultView;
    if (view === null || frames === 0) {
      return;
    }
    view.requestAnimationFrame(() => {
      if (run !== this.settleRun) {
        return;
      }
      // Looked up again each frame: the feed may have drawn the row anew (cards to List rows).
      const row = this.row(id);
      if (row !== null) {
        this.align(row, true);
        this.adoptFocus(row);
      }
      this.settle(id, frames - 1, run);
    });
  }

  /**
   * ↑ / ↓ follow the list only while the focus is not in a widget with its own arrows (author,
   * Nov 27: after a click on a sidebar folder the tree kept the focus and took the arrows). When the
   * preview opens with the focus left on the page body or in the sidebar, it moves to the open row's
   * link (no scroll; a pointer-opened preview shows no ring). A field, the preview panel or the
   * feed itself keeps its focus.
   */
  private adoptFocus(row: HTMLElement): void {
    const doc = this.area.ownerDocument;
    const active = doc.activeElement;
    const stray = active === null || active === doc.body || active.closest(SIDEBAR) !== null;
    if (!stray) {
      return;
    }
    row.querySelector<HTMLElement>(ROW_LINK)?.focus({ preventScroll: true });
  }

  private align(row: HTMLElement, toTop: boolean): void {
    const area = this.area.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    const above = box.top - area.top - REVEAL_GAP_PX;
    const below = box.bottom - area.bottom + REVEAL_GAP_PX;
    if (toTop || above < 0) {
      this.area.scrollTop += above;
    } else if (below > 0) {
      this.area.scrollTop += below;
    }
  }
}
