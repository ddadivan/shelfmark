import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * Progress dots of the welcome dialog. `count` dots, `current` is 1-based; the current dot
 * stretches to a sage pill over `duration-base` (instant under reduced motion).
 * `label` is the translated "Step N of M" text: it is visually hidden and
 * sits in a polite live region so a change is announced. The dots are decorative.
 */
@Component({
  selector: 'ui-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-steps' },
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.scss',
})
export class StepsComponent {
  /** Number of steps. */
  readonly count = input.required({ transform: numberAttribute });
  /** Current step, starting at 1. */
  readonly current = input.required({ transform: numberAttribute });
  /** Announced text, for example "Step 2 of 3". */
  readonly label = input.required<string>();

  protected readonly dots = computed(() =>
    Array.from({ length: Math.max(0, Math.floor(this.count())) }, (_, index) => index + 1),
  );
}
