import { computed, effect, inject, Service, signal, untracked } from '@angular/core';
import { LinkPreviewRoute } from './link-preview-route.service';

/**
 * Full screen of the Link page (Shelf ReaderView, author-approved Reader package): an in-app
 * layout mode, not the browser Fullscreen API. Only the split view has it (from 80em; below that
 * the Link page is a page over the whole window already). While `active`, the shell hides the
 * sidebar and header and the library page hides its list, so the Link page covers the window. It
 * lasts while stepping through links and ends when the Link page closes. Root, so the shell reads
 * the same state as the page.
 */
@Service()
export class PreviewFullScreen {
  private readonly route = inject(LinkPreviewRoute);
  private readonly wanted = signal(false);

  /** Full screen is on and the split view shows (a window narrowed below 80em pauses it). */
  readonly active = computed(() => this.wanted() && this.route.split());
  /** Whether the window can show it (the button and the F key are there). */
  readonly available = this.route.split;

  constructor() {
    effect(() => {
      if (!this.route.isOpen()) {
        untracked(() => this.wanted.set(false));
      }
    });
  }

  toggle(): void {
    if (this.available()) {
      this.wanted.update((on) => !on);
    }
  }

  exit(): void {
    this.wanted.set(false);
  }
}
