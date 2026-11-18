import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DRAWER_SIDE, DrawerService, type UiDialogRef } from '@shelfmark/ui';
import { AskDrawerComponent } from '../components/ask-drawer/ask-drawer.component';
import { AiSettingsStore } from './ai-settings.store';
import { AskInbox } from './ask-inbox.service';

/**
 * Opens Ask your shelf on desktop and tablet widths with a header (the spark button, the ⌘K row):
 * a 440px drawer from the inline-end edge over the feed. A question passed along is asked once the
 * panel shows; while it is open a new question goes to the same panel. Nothing opens while Ask is
 * off.
 */
@Service()
export class AskPanelService {
  private readonly drawers = inject(DrawerService);
  private readonly inbox = inject(AskInbox);
  private readonly settings = inject(AiSettingsStore);
  private readonly transloco = inject(TranslocoService);
  private ref: UiDialogRef<undefined, AskDrawerComponent> | null = null;

  open(question?: string): void {
    if (!this.settings.askOn()) {
      return;
    }
    if (question !== undefined) {
      this.inbox.put(question);
    }
    if (this.ref) {
      return;
    }
    const ref = this.drawers.open<AskDrawerComponent>(AskDrawerComponent, {
      side: DRAWER_SIDE.End,
      ariaLabel: this.transloco.translate('ai.ask.title'),
    });
    this.ref = ref;
    ref.afterClosed().subscribe(() => {
      if (this.ref === ref) {
        this.ref = null;
      }
    });
  }

  close(): void {
    this.ref?.close();
  }
}
