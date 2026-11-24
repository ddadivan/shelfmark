import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ASK_LIMIT } from '@shelfmark/contracts';
import { ButtonComponent, TextareaComponent } from '@shelfmark/ui';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AskStore } from '../../services/ask.store';
import { askAllowanceLine } from '../../utils/ask-allowance-line';

/**
 * The Ask composer (Shelf `composer`): one `surface-hover` box, radius 16, with the auto-growing
 * question field and the round 40px primary send button inside (Stop while an answer streams),
 * and the fine line under it: answers can be wrong, and the questions left. Disabled while
 * streaming; once the limit is reached only the fine line stays (the conversation shows the limit
 * row). Uses the panel's `AskStore`. A question sent from the composer while it
 * had focus puts focus back into the field once the answer ends (done, error or Stop): the field
 * is disabled while streaming, so the browser drops its focus.
 */
@Component({
  selector: 'app-ask-composer',
  imports: [TranslocoPipe, ButtonComponent, TextareaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ask-composer.component.html',
  styleUrl: './ask-composer.component.scss',
})
export class AskComposerComponent {
  /** Leaves the fine line out (the phone page: Shelf hides it below 40em). */
  readonly hideFine = input(false, { transform: booleanAttribute });

  protected readonly store = inject(AskStore);
  private readonly settings = inject(AiSettingsStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  /** The field; gone while the limit is reached (the composer steps aside). */
  private readonly field = viewChild(TextareaComponent);
  /** The composer had focus when the streaming question was sent. */
  private readonly refocus = signal(false);

  protected readonly text = signal('');
  /** No questions left in the day or month: the field is disabled. */
  protected readonly limited = computed(() => this.settings.askAllowance()?.questionsLeft === 0);
  /** "{n} questions left this month" once the allowance is known. */
  protected readonly left = computed(() => {
    const allowance = this.settings.askAllowance();
    return allowance ? askAllowanceLine(allowance) : null;
  });
  protected readonly canSend = computed(
    () =>
      !this.store.streaming() &&
      !this.limited() &&
      this.text().trim().length >= ASK_LIMIT.QuestionMin,
  );

  constructor() {
    effect(() => {
      if (this.store.streaming() || !this.refocus()) {
        return;
      }
      this.refocus.set(false);
      // After the render that enables the field again: a disabled field cannot take focus.
      // The answer may have reached the limit, which removes the field.
      // Without scrolling: the chat's own reveal of the answer must not be cut short.
      afterNextRender(() => this.field()?.focus({ preventScroll: true }), {
        injector: this.injector,
      });
    });
  }

  /** Enter asks; Shift+Enter (and Enter while an input method composes) adds a line. */
  protected onEnter(event: Event): void {
    const key = event as KeyboardEvent;
    if (!key.shiftKey && !key.isComposing) {
      this.send(event);
    }
  }

  protected send(event?: Event): void {
    event?.preventDefault();
    if (!this.canSend()) {
      return;
    }
    const hadFocus = this.host.nativeElement.contains(
      this.host.nativeElement.ownerDocument.activeElement,
    );
    if (this.store.ask(this.text())) {
      this.text.set('');
      this.refocus.set(hadFocus && this.store.streaming());
    }
  }
}
