import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { FeedbackScore } from '@shelfmark/contracts';
import { BUTTON_SIZE, ButtonComponent, KEYBOARD_KEY } from '@shelfmark/ui';
import { ViewportService } from '../../../core/layout/viewport.service';
import { RATING_SCORES } from '../models/rating-scores.const';

/**
 * Ten score buttons, 1 to 10, with the edge labels under them. One tab stop (roving tabindex):
 * the arrow keys, Home and End move focus, Enter and Space pick the focused score. Picking is
 * always deliberate; the dialog opens by itself, so a stray key must never score.
 * `focusScore()` is for the digit shortcuts of the dialog. Two rows of five on a phone.
 */
@Component({
  selector: 'app-score-scale',
  imports: [TranslocoPipe, ButtonComponent],
  host: { role: 'group', '(keydown)': 'onKeydown($event)' },
  templateUrl: './score-scale.component.html',
  styleUrl: './score-scale.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreScaleComponent {
  protected readonly scores = RATING_SCORES;
  protected readonly phone = inject(ViewportService).phone;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;

  /** A score was picked with a click, a tap, Enter or Space. */
  readonly picked = output<FeedbackScore>();

  private readonly buttons = viewChildren(ButtonComponent);
  /** The score that holds the tab stop. */
  protected readonly tabStop = signal<FeedbackScore>(1);

  /** Moves focus to the button of `score`. */
  focusScore(score: FeedbackScore): void {
    this.tabStop.set(score);
    this.buttons()[score - 1]?.element()?.focus();
  }

  /** The score whose button has focus, or `null`. */
  focusedScore(): FeedbackScore | null {
    const index = this.buttons().findIndex((button) => {
      const element = button.element();
      return element !== undefined && element === element.ownerDocument.activeElement;
    });
    return RATING_SCORES[index] ?? null;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const current = this.focusedScore();
    if (current === null || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const last = RATING_SCORES.length;
    let target: number | null = null;
    switch (event.key) {
      case KEYBOARD_KEY.ArrowRight:
      case KEYBOARD_KEY.ArrowDown:
        target = current === last ? 1 : current + 1;
        break;
      case KEYBOARD_KEY.ArrowLeft:
      case KEYBOARD_KEY.ArrowUp:
        target = current === 1 ? last : current - 1;
        break;
      case KEYBOARD_KEY.Home:
        target = 1;
        break;
      case KEYBOARD_KEY.End:
        target = last;
        break;
    }
    const score = RATING_SCORES.find((candidate) => candidate === target);
    if (score !== undefined) {
      event.preventDefault();
      this.focusScore(score);
    }
  }
}
