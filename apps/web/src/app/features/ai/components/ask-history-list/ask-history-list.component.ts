import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { AskConversationSummary } from '@shelfmark/contracts';
import {
  ButtonComponent,
  ConversationRowComponent,
  SKELETON_SHAPE,
  SkeletonComponent,
} from '@shelfmark/ui';
import { APP_PATH } from '../../../../models/app-path.const';
import { ASK_CONVERSATION_PARAM } from '../../models/ask-conversation-param.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskHistoryActions } from '../../services/ask-history-actions.service';
import { AskHistoryStore } from '../../services/ask-history.store';

/**
 * The Ask conversation list (Shelf 11-ask `.hist`): New conversation, the stored conversations
 * under Today and Earlier (each a `ui-conversation-row` linking to `/ask?c=<id>`, the open one
 * current, a Delete icon button on hover or focus), Show more, a failure line with Try again, and
 * the foot line "Kept on your account for 30 days." with Clear all. On the desktop page it is the
 * side card; on the phone it fills the Conversations sheet (`sheet`). Reads the first page when it
 * first shows.
 */
@Component({
  selector: 'app-ask-history-list',
  imports: [TranslocoPipe, ButtonComponent, ConversationRowComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.ask-history--sheet]': 'sheet()' },
  templateUrl: './ask-history-list.component.html',
  styleUrl: './ask-history-list.component.scss',
})
export class AskHistoryListComponent {
  protected readonly SKELETON_SHAPE = SKELETON_SHAPE;
  /** The rows the loading state holds room for: two day groups, as a used account has. */
  protected readonly SKELETON_GROUPS: readonly (readonly number[])[] = [
    [0, 1],
    [0, 1, 2],
  ];
  /** The conversation on screen (its row is current). */
  readonly activeId = input<string | null>(null);
  /** Inside the phone sheet: no card around it and no New conversation button. */
  readonly sheet = input(false, { transform: booleanAttribute });

  /** A row was chosen (the click's default navigation is prevented). */
  readonly opened = output<string>();
  /** New conversation. */
  readonly started = output<void>();
  /** A conversation was deleted (the page starts over when it was the open one). */
  readonly removed = output<string>();
  /** Every conversation was deleted. */
  readonly cleared = output<void>();

  protected readonly store = inject(AskHistoryStore);
  protected readonly settings = inject(AiSettingsStore);
  private readonly actions = inject(AskHistoryActions);
  private static nextId = 0;
  protected readonly idBase = `ask-history-${AskHistoryListComponent.nextId++}`;

  constructor() {
    if (!this.store.loaded() && !this.store.loading()) {
      void this.store.load();
    }
  }

  protected href(id: string): string {
    return `/${APP_PATH.Ask}?${ASK_CONVERSATION_PARAM}=${encodeURIComponent(id)}`;
  }

  protected open(event: MouseEvent, id: string): void {
    // Plain clicks route in the app; a modified click opens the link the browser's way.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
    event.preventDefault();
    this.opened.emit(id);
  }

  protected async remove(item: AskConversationSummary): Promise<void> {
    if (await this.actions.remove(item)) this.removed.emit(item.id);
  }

  protected async clear(): Promise<void> {
    if (await this.actions.clear()) this.cleared.emit();
  }
}
