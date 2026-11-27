import { Dialog } from '@angular/cdk/dialog';
import { Directive, effect, ElementRef, inject, untracked } from '@angular/core';
import { KEYBOARD_KEY } from '@shelfmark/ui';
import { LINK_SELECT_SHORTCUT } from '../../links/models/link-select-shortcut.const';
import { parsePastedLinks } from '../../links/components/paste-many/parse-pasted-links';
import { LinkActionsService } from '../../links/services/link-actions.service';
import { isTypingTarget } from '../../../core/layout/utils/is-typing-target';
import { isLetter } from '../../links/utils/link-select-keys';
import { LibraryFeedService } from '../services/library-feed.service';
import { LibraryFilterService } from '../services/library-filter.service';
import { LibraryFolderService } from '../services/library-folder.service';
import { LibrarySelectionService } from '../services/library-selection.service';
import { scrollFeedForKey } from '../utils/feed-keyboard-scroll';
import { PREVIEW_KEY } from '../../link-preview/models/preview-key.const';
import { LinkPreviewService } from '../../link-preview/services/link-preview.service';
import { previewKey } from '../../link-preview/utils/preview-key';

/**
 * The keyboard and clipboard of the library page, on its scroll area: Esc and Cmd/Ctrl+A for the
 * selection, the paging keys that scroll the area, and a pasted link opening Add link. A new
 * view, sort or filter starts at the top of the area (the page scroll is reset by the router;
 * this area is not the page).
 */
@Directive({
  selector: '[appLibraryHotkeys]',
  host: {
    '(document:keydown)': 'onKeydown($event)',
    '(document:paste)': 'onPaste($event)',
  },
})
export class LibraryHotkeysDirective {
  private readonly area = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly cdkDialogs = inject(Dialog);
  private readonly actions = inject(LinkActionsService);
  private readonly feed = inject(LibraryFeedService);
  private readonly filters = inject(LibraryFilterService);
  private readonly selection = inject(LibrarySelectionService);
  private readonly preview = inject(LinkPreviewService);
  /** The folder page's actions (F2 renames); absent where the page does not provide them. */
  private readonly folder = inject(LibraryFolderService, { optional: true });

  constructor() {
    effect(() => {
      this.filters.filter();
      untracked(() => {
        this.area.scrollTop = 0;
      });
    });
  }

  /**
   * ⌘V / Ctrl+V in the library, outside any field and while no dialog is open: text with a link
   * opens Add link with it (one link fills the address, several turn the dialog into the list).
   * Text without a link is left alone.
   */
  onPaste(event: ClipboardEvent): void {
    if (
      event.defaultPrevented ||
      isTypingTarget(event.target) ||
      this.cdkDialogs.openDialogs.length > 0
    ) {
      return;
    }
    const text = event.clipboardData?.getData('text/plain') ?? '';
    if (parsePastedLinks(text).links.length === 0) {
      return;
    }
    event.preventDefault();
    void this.actions.addLink({ ...this.filters.addLinkData(), text });
  }

  /**
   * Page keys: F2 renames the folder of a folder page, Esc clears the selection, X starts selecting, Cmd/Ctrl+A selects every link on screen (not in a field,
   * dialog or menu); with nothing focused the paging keys scroll the feed area. While the desktop
   * link preview is open (#553), ↑ / ↓ move it, ↵ opens its link in a new tab, F turns full screen
   * on and off and Esc leaves full screen, else closes it.
   */
  onKeydown(event: KeyboardEvent): void {
    if (this.selectionKey(event) || this.previewKeyHandled(event)) {
      return;
    }
    scrollFeedForKey(this.area, event);
  }

  private selectionKey(event: KeyboardEvent): boolean {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      isTypingTarget(event.target, { overlays: true })
    ) {
      return false;
    }
    if (
      event.key === KEYBOARD_KEY.F2 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      this.folder?.folder() &&
      this.cdkDialogs.openDialogs.length === 0
    ) {
      // The folder menu's "Rename" (F2), on a folder page.
      event.preventDefault();
      this.folder.rename();
      return true;
    }
    if (event.key === KEYBOARD_KEY.Escape && this.selection.selecting()) {
      this.selection.endSelection();
      return true;
    }
    const startSelect =
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      isLetter(event, LINK_SELECT_SHORTCUT.SelectKey, LINK_SELECT_SHORTCUT.SelectCode);
    if (
      startSelect &&
      !this.selection.selecting() &&
      this.feed.showLinks() &&
      this.feed.shownCount() > 0
    ) {
      event.preventDefault();
      this.selection.startSelection();
      return true;
    }
    const selectAll =
      (event.metaKey || event.ctrlKey) &&
      !event.altKey &&
      !event.shiftKey &&
      isLetter(event, LINK_SELECT_SHORTCUT.SelectAllKey, LINK_SELECT_SHORTCUT.SelectAllCode);
    if (selectAll && this.feed.showLinks() && !this.feed.stale() && this.feed.shownCount() > 0) {
      event.preventDefault();
      this.selection.selectAll();
      return true;
    }
    return false;
  }

  private previewKeyHandled(event: KeyboardEvent): boolean {
    if (!this.preview.split()) {
      return false;
    }
    const key = previewKey(event);
    if (key === null) {
      return false;
    }
    event.preventDefault();
    if (key === PREVIEW_KEY.Close && this.preview.fullScreen()) {
      // Esc leaves full screen first; the next one closes the Link page.
      this.preview.exitFullScreen();
    } else if (key === PREVIEW_KEY.Close) {
      void this.preview.close();
    } else if (key === PREVIEW_KEY.FullScreen) {
      this.preview.toggleFullScreen();
    } else if (key === PREVIEW_KEY.OpenInNewTab) {
      this.preview.openInNewTab();
    } else {
      const onFeedLink = event.target instanceof Element && event.target.closest('[data-link-id]');
      void this.preview.go(key === PREVIEW_KEY.Previous ? -1 : 1).then(() => {
        if (onFeedLink) {
          this.focusCurrent();
        }
      });
    }
    return true;
  }

  /** After ↑ / ↓ from a feed link the focus follows to the link now previewed. */
  private focusCurrent(): void {
    const id = this.preview.currentId();
    const item = id === null ? null : this.area.querySelector(`[data-link-id="${CSS.escape(id)}"]`);
    const link = item?.querySelector<HTMLElement>('.ui-list-item__link, .ui-card__link');
    link?.focus();
    link?.scrollIntoView({ block: 'nearest' });
  }
}
