import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  Service,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { LinkResponse } from '@shelfmark/contracts';
import { LinkSelectionStore } from '../../../stores/link-selection.store';
import type { LinkSelectToggle } from '../../links/models/link-select-toggle.interface';
import { FEED_ITEM_FOCUS_SELECTOR } from '../models/feed-item-focus-selector.const';
import { FEED_ITEM_SELECTOR } from '../models/feed-item-selector.const';
import { LibraryFeedService } from './library-feed.service';
import { LibraryFilterService } from './library-filter.service';

/**
 * The selection of the library page: which of the links on screen are picked (the app-wide
 * `LinkSelectionStore` holds the ids), selecting / select all / end, the polite announcement of
 * entering and leaving selection mode, and the rules that clear it (a new view, filter, sort or
 * route; links that left the view). Page-scoped: the page provides it.
 */
@Service()
export class LibrarySelectionService {
  private readonly store = inject(LinkSelectionStore);
  private readonly feed = inject(LibraryFeedService);
  private readonly filters = inject(LibraryFilterService);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Ids of the links on screen, in order: the range and "select all" of the selection. */
  readonly order = computed(() => this.feed.shownLinks().map((link) => link.id));
  /** The picked links that are on screen (a link that left the view drops out by itself). */
  readonly selectedLinks = computed(() => {
    const ids = this.store.idSet();
    return this.feed.shownLinks().filter((link) => ids.has(link.id));
  });
  readonly selectedCount = computed(() => this.selectedLinks().length);
  /** A selection is in progress: checkboxes everywhere, the header and the bulk bar show. */
  readonly selecting = computed(() => this.selectedCount() > 0);
  readonly allSelected = computed(
    () => this.selecting() && this.selectedCount() === this.feed.shownCount(),
  );
  private readonly announcement = signal('');
  /** Polite live text for entering / leaving selection mode and for a drag (empty until the first change). */
  readonly modeAnnouncement = this.announcement.asReadonly();
  private announcedSelecting = false;

  constructor() {
    // Entering and leaving selection mode is announced politely (the "N selected" header is gone
    // once the mode ends, so it cannot say so itself).
    effect(() => {
      const on = this.selecting();
      untracked(() => {
        if (on !== this.announcedSelecting) {
          this.announcedSelecting = on;
          this.announcement.set(
            this.transloco.translate(on ? 'bulk.header.modeOn' : 'bulk.header.modeOff'),
          );
        }
      });
    });
    // A new view, filter, sort or route starts without a selection; links that left the view
    // (deleted, moved out) leave the selection too.
    effect(() => {
      this.filters.filter();
      untracked(() => this.store.clear());
    });
    effect(() => {
      const order = this.order();
      untracked(() => {
        if (!this.feed.stale()) {
          this.store.keep(order);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.store.clear());
  }

  /** Sets the polite live text (a drag says what moves, and clears it when it ends). */
  announce(text: string): void {
    this.announcement.set(text);
  }

  /** Whether the link is picked. */
  has(id: string): boolean {
    return this.store.has(id);
  }

  /** The anchor of the selection: the link picked last. */
  anchor(): string | null {
    return this.store.anchor();
  }

  /** A card or row asked to toggle (checkbox, click while selecting, Space, long press). */
  toggleSelected(link: LinkResponse, toggle: LinkSelectToggle): void {
    this.store.toggle(link.id, this.order(), toggle.range);
  }

  selectAll(): void {
    this.store.selectAll(this.order());
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      this.selectAll();
    } else {
      this.endSelection();
    }
  }

  clear(): void {
    this.store.clear();
  }

  /**
   * Leaves selection mode (Esc, Done, the header box, the phone's close button). The selection bar
   * that may hold focus goes away, so focus returns to the feed: it stays on a card or row that
   * has it, else goes to the link last picked (the selection anchor), else to the first one, and
   * never falls to the toolbar above the feed.
   */
  endSelection(): void {
    const anchor = this.store.anchor();
    this.clear();
    const active = this.doc.activeElement;
    if (active instanceof HTMLElement && active.closest(FEED_ITEM_SELECTOR)) {
      return;
    }
    const items = [...this.host.querySelectorAll<HTMLElement>(FEED_ITEM_SELECTOR)];
    const item = items.find((candidate) => candidate.dataset['linkId'] === anchor) ?? items[0];
    item?.querySelector<HTMLElement>(FEED_ITEM_FOCUS_SELECTOR)?.focus();
  }
}
