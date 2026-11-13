import { Dialog } from '@angular/cdk/dialog';
import { Directive, effect, ElementRef, inject, untracked } from '@angular/core';
import { KEYBOARD_KEY } from '@shelfmark/ui';
import { LINK_SELECT_SHORTCUT } from '../../links/models/link-select-shortcut.const';
import { parsePastedLinks } from '../../links/components/paste-many/parse-pasted-links';
import { LinkActionsService } from '../../links/services/link-actions.service';
import { isTypingTarget } from '../../links/utils/is-typing-target';
import { isLetter } from '../../links/utils/link-select-keys';
import { isEditableTarget } from '../../shortcuts/utils/is-editable-target';
import { LibraryFeedService } from '../services/library-feed.service';
import { LibraryFilterService } from '../services/library-filter.service';
import { LibrarySelectionService } from '../services/library-selection.service';
import { scrollFeedForKey } from '../utils/feed-keyboard-scroll';

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
      isEditableTarget(event.target) ||
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
   * Page keys: Esc clears the selection, Cmd/Ctrl+A selects every link on screen (not in a field,
   * dialog or menu); with nothing focused the paging keys scroll the feed area.
   */
  onKeydown(event: KeyboardEvent): void {
    if (this.selectionKey(event)) {
      return;
    }
    scrollFeedForKey(this.area, event);
  }

  private selectionKey(event: KeyboardEvent): boolean {
    if (event.defaultPrevented || event.isComposing || isTypingTarget(event.target)) {
      return false;
    }
    if (event.key === KEYBOARD_KEY.Escape && this.selection.selecting()) {
      this.selection.endSelection();
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
}
