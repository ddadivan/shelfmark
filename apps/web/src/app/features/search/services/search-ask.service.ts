import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportService } from '../../../core/layout/viewport.service';
import { APP_PATH } from '../../../models/app-path.const';
import { AskInbox } from '../../ai/services/ask-inbox.service';
import { AskPanelService } from '../../ai/services/ask-panel.service';

/**
 * Hands a search text to Ask your shelf (the Ask row of the search dialog, the question hint and
 * the nothing-found state of the feed): the full-screen Ask page in the mobile shell (below 64em,
 * through `AskInbox`), the Ask panel with a header. Nothing happens while Ask is off (the panel
 * opens nothing; callers show the action only while it is on).
 */
@Service()
export class SearchAskService {
  private readonly viewport = inject(ViewportService);
  private readonly inbox = inject(AskInbox);
  private readonly panel = inject(AskPanelService);
  private readonly router = inject(Router);

  async ask(question: string): Promise<void> {
    if (this.viewport.compact()) {
      this.inbox.put(question);
      await this.router.navigateByUrl(`/${APP_PATH.Ask}`);
      return;
    }
    this.panel.open(question);
  }
}
