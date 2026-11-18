import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, UiDialogRef } from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { FoldersStore } from '../../../../stores/folders.store';
import { LinkActionsService } from '../../../links/services/link-actions.service';
import { SEARCH_QUERY_PARAM } from '../../../links/models/search-query-param.const';
import { AskInbox } from '../../services/ask-inbox.service';
import { AskStore } from '../../services/ask.store';
import { askStarters } from '../../utils/ask-starters';
import { AskEntryComponent } from '../ask-entry/ask-entry.component';

/**
 * The Ask conversation: before the first question a title, the lead and up to three starters from
 * the user's largest folders; then the questions with their answers. A question handed over
 * (`AskInbox`, from ⌘K or the phone search) is asked as soon as it shows, or dropped while another
 * question streams; the inbox is cleared when the panel closes. "Search" and "Add a link"
 * close the surrounding panel first. Uses the panel's `AskStore`.
 */
@Component({
  selector: 'app-ask-conversation',
  imports: [TranslocoPipe, ButtonComponent, AskEntryComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-conversation.component.html',
  styleUrl: './ask-conversation.component.scss',
})
export class AskConversationComponent {
  /** On the full-screen Ask page the heading follows its `h1` (an `h2`), in a panel its `h2`. */
  readonly onPage = input(false, { transform: booleanAttribute });

  protected readonly store = inject(AskStore);
  private readonly folders = inject(FoldersStore);
  private readonly inbox = inject(AskInbox);
  private readonly router = inject(Router);
  private readonly links = inject(LinkActionsService);
  private readonly ref = inject(UiDialogRef, { optional: true });

  protected readonly starters = computed(() => askStarters(this.folders.entities()));

  constructor() {
    void this.folders.load();
    effect(() => {
      if (this.inbox.pending() !== null) {
        untracked(() => {
          // Taken even while another question streams: a refused question is dropped, never asked
          // later unprompted (it would spend a question).
          const question = this.inbox.take();
          if (question !== null) {
            this.store.ask(question);
          }
        });
      }
    });
    inject(DestroyRef).onDestroy(() => this.inbox.clear());
  }

  protected async search(query: string): Promise<void> {
    this.ref?.close();
    await this.router.navigate([`/${APP_PATH.Links}`], {
      queryParams: { [SEARCH_QUERY_PARAM]: query },
    });
  }

  protected add(): void {
    this.ref?.close();
    void this.links.addLink();
  }
}
