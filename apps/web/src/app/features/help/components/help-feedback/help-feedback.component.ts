import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent } from '@shelfmark/ui';
import type { HelpVote } from '../../models/help-vote.type';
import { HELP_VOTE } from '../../models/help-vote.const';

/**
 * "Was this helpful?" at the end of an article (Shelf 17-help `.fb`). The answer is kept only on
 * the page (a polite thank-you replaces the question); "No" also offers to send feedback.
 */
@Component({
  selector: 'app-help-feedback',
  imports: [ButtonComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-feedback.component.html',
  styleUrl: './help-feedback.component.scss',
})
export class HelpFeedbackComponent {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly HELP_VOTE = HELP_VOTE;

  /** The open article; a new one asks again. */
  readonly articleId = input.required<string>();
  /** "Send feedback" after a "No". */
  readonly feedbackRequested = output<void>();

  protected readonly vote = linkedSignal<string, HelpVote | null>({
    source: this.articleId,
    computation: () => null,
  });
}
