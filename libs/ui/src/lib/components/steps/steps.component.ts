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
 * The host is `role="img"` named by `label` (the translated "Step N of M"); the dots are
 * decorative. There is no live region: a step change is not announced by this component, so
 * the consumer moves focus to the new step's heading, which announces the change.
 */
@Component({
  selector: 'ui-steps',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-steps', role: 'img', '[attr.aria-label]': 'label()' },
  templateUrl: './steps.component.html',
  styleUrl: './steps.component.scss',
})
export class StepsComponent {
  /** Number of steps. */
  readonly count = input.required({ transform: numberAttribute });
  /** Current step, starting at 1. */
  readonly current = input.required({ transform: numberAttribute });
  /** Accessible name of the indicator, for example "Step 2 of 3". */
  readonly label = input.required<string>();

  protected readonly dots = computed(() =>
    Array.from({ length: Math.max(0, Math.floor(this.count())) }, (_, index) => index + 1),
  );
}
