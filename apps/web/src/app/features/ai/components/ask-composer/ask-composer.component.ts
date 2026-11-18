import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ASK_LIMIT } from '@shelfmark/contracts';
import { ButtonComponent, InputComponent } from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskStore } from '../../services/ask.store';

/**
 * The Ask composer: the question field with Ask, or Stop while an answer streams, and the footer
 * line. Disabled while streaming and once the limit is reached. Uses the panel's `AskStore`.
 */
@Component({
  selector: 'app-ask-composer',
  imports: [TranslocoPipe, ButtonComponent, InputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-composer.component.html',
  styleUrl: './ask-composer.component.scss',
})
export class AskComposerComponent {
  protected readonly store = inject(AskStore);
  private readonly settings = inject(AiSettingsStore);

  protected readonly text = signal('');
  /** No questions left in the day or month: the field is disabled. */
  protected readonly limited = computed(() => this.settings.askAllowance()?.questionsLeft === 0);
  protected readonly canSend = computed(
    () =>
      !this.store.streaming() &&
      !this.limited() &&
      this.text().trim().length >= ASK_LIMIT.QuestionMin,
  );

  protected send(event?: Event): void {
    event?.preventDefault();
    if (this.canSend() && this.store.ask(this.text())) {
      this.text.set('');
    }
  }
}
