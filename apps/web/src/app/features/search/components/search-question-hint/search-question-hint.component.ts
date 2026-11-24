import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ASK_LIMIT } from '@shelfmark/contracts';
import { AiLineComponent } from '@shelfmark/ui';
import { AiSettingsStore } from '../../../ai/services/ai-settings.store';
import { SearchAskService } from '../../services/search-ask.service';
import { readsLikeQuestion } from '../../utils/reads-like-question';

/**
 * "Looks like a question" over the search results (Shelf `03-search.html`): when the search text
 * reads like a question (`readsLikeQuestion`) and Ask your shelf is on, a sage band offers to ask
 * it; the button hands the text to Ask (`SearchAskService`). Nothing renders otherwise.
 */
@Component({
  selector: 'app-search-question-hint',
  imports: [TranslocoPipe, AiLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-question-hint.component.html',
  styleUrl: './search-question-hint.component.scss',
  host: { '[class.search-question-hint--shown]': 'shown()' },
})
export class SearchQuestionHintComponent {
  /** The search text of the feed. */
  readonly query = input.required<string>();

  private readonly ai = inject(AiSettingsStore);
  private readonly asker = inject(SearchAskService);

  protected readonly shown = computed(
    () =>
      this.ai.askOn() &&
      this.query().trim().length >= ASK_LIMIT.QuestionMin &&
      readsLikeQuestion(this.query()),
  );

  protected async ask(): Promise<void> {
    await this.asker.ask(this.query().trim());
  }
}
