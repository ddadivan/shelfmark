import {
  booleanAttribute,
  ChangeDetectionStrategy,
  computed,
  Component,
  input,
  output,
  signal,
  viewChildren,
  type ElementRef,
} from '@angular/core';
import { KEYBOARD_KEY } from '../../models/keyboard';

const DEFAULT_MAX = 10;

/**
 * A 1 to `max` score as square buttons that are easy to hit (RatingScale spec): ten columns,
 * five under 32.5em, 48px at least. One tab stop (roving tabindex): the arrow keys, Home and End
 * move focus, Enter and Space pick the focused score. Picking is always deliberate, so a stray
 * key never scores; `focusScore()` lets the host move focus for digit shortcuts. `labels` names
 * each button for assistive technology ("7 out of 10"); the visible text is the number.
 * `readonly` shows the chosen `score` as a quiet copy (`role="img"` named by `readonlyLabel`).
 */
@Component({
  selector: 'ui-rating-scale',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-rating-scale',
    '[attr.role]': "readonly() ? null : 'group'",
    '(keydown)': 'onKeydown($event)',
  },
  templateUrl: './rating-scale.component.html',
  styleUrl: './rating-scale.component.scss',
})
export class RatingScaleComponent {
  /** The highest score; the scale starts at 1. */
  readonly max = input(DEFAULT_MAX);
  /** The chosen score; marks that button. */
  readonly score = input<number | null>(null);
  /** Names under the two ends of the row ("Not really", "Love it"). */
  readonly lowLabel = input('');
  readonly highLabel = input('');
  /** Accessible name of each button, by score order; the number is used where one is missing. */
  readonly labels = input<readonly string[]>([]);
  /** A quiet, non-interactive copy of the chosen score. */
  readonly readonly = input(false, { transform: booleanAttribute });
  /** Accessible name of the read-only copy ("Your score: 6"). */
  readonly readonlyLabel = input('');

  /** A score was picked with a click, a tap, Enter or Space. */
  readonly picked = output<number>();

  protected readonly scores = computed(() =>
    Array.from({ length: Math.max(0, this.max()) }, (_, index) => index + 1),
  );

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('item');
  /** The score that holds the tab stop. */
  protected readonly tabStop = signal(1);

  /** Moves focus to the button of `score`. */
  focusScore(score: number): void {
    if (score < 1 || score > this.max()) {
      return;
    }
    this.tabStop.set(score);
    this.buttons()[score - 1]?.nativeElement.focus();
  }

  /** The score whose button has focus, or `null`. */
  focusedScore(): number | null {
    const index = this.buttons().findIndex(
      (button) => button.nativeElement === button.nativeElement.ownerDocument.activeElement,
    );
    return index === -1 ? null : index + 1;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const current = this.focusedScore();
    if (current === null || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const last = this.max();
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
    if (target !== null) {
      event.preventDefault();
      this.focusScore(target);
    }
  }
}
