import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Says politely where a reordered row went ("Moved up, position 2 of 5"): the sidebar's Pinned
 * section and folder tree move rows with Alt+Up / Alt+Down or a drag, and a screen reader user
 * must hear the new place.
 */
@Service()
export class ReorderAnnouncer {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly transloco = inject(TranslocoService);

  /** `from` and `to` count from 0; nothing is said when the row stays where it was. */
  announce(from: number, to: number, total: number): void {
    if (from === to) {
      return;
    }
    const key = to < from ? 'shell.sidebar.reorder.movedUp' : 'shell.sidebar.reorder.movedDown';
    void this.announcer.announce(
      this.transloco.translate(key, { position: String(to + 1), total: String(total) }),
      'polite',
    );
  }
}
