import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Numbered steps of a flow (Shelf 09-data import: "1 Choose file — 2 Check — 3 Folders — 4
 * Import"). `steps` are the translated names, `current` is 1-based; earlier steps show a check,
 * the current one a filled number and `aria-current="step"`, later ones an outlined number. A
 * list named by `label`; it shows where the flow is and is not a navigation.
 */
@Component({
  selector: 'ui-stepper',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-stepper' },
  templateUrl: './stepper.component.html',
  styleUrl: './stepper.component.scss',
})
export class StepperComponent {
  /** The step names, already translated. */
  readonly steps = input.required<readonly string[]>();
  /** The current step, starting at 1. */
  readonly current = input.required({ transform: numberAttribute });
  /** Accessible name of the list ("Import steps"). */
  readonly label = input.required<string>();

  protected readonly items = computed(() =>
    this.steps().map((name, index) => {
      const number = index + 1;
      return {
        name,
        number,
        done: number < this.current(),
        current: number === this.current(),
      };
    }),
  );
}
