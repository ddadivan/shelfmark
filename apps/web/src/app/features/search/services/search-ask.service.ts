import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { ViewportService } from '../../../core/layout/viewport.service';
import { urlPath } from '../../../core/routing/url-path';
import { APP_PATH } from '../../../models/app-path.const';
import { AskInbox } from '../../ai/services/ask-inbox.service';
import { AskPanelService } from '../../ai/services/ask-panel.service';

/**
 * Hands a search text to Ask your shelf (the Ask row of the search dialog, the question hint and
 * the nothing-found state of the feed): the Ask page through `AskInbox` in the mobile shell (below
 * 64em) and while the Ask page is open (it asks in the open conversation), the Ask panel otherwise. Nothing happens while Ask is off (the panel
 * opens nothing; callers show the action only while it is on).
 */
@Service()
export class SearchAskService {
  private readonly viewport = inject(ViewportService);
  private readonly inbox = inject(AskInbox);
  private readonly panel = inject(AskPanelService);
  private readonly router = inject(Router);

  async ask(question: string): Promise<void> {
    const onAskPage = urlPath(this.router.url) === `/${APP_PATH.Ask}`;
    if (this.viewport.compact() || onAskPage) {
      this.inbox.put(question);
      if (!onAskPage) await this.router.navigateByUrl(`/${APP_PATH.Ask}`);
      return;
    }
    this.panel.open(question);
  }
}
