import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

/**
 * A slider for one number in whole steps (the grid size of the View menu): a native
 * `<input type="range">`, so the arrow keys move one `step`, Home / End jump to the ends and a
 * screen reader announces it as a slider. Shelf look: a 4 px `toggle-off` track, the part up to
 * the thumb in `accent`, a 16 px `accent` thumb with a `surface` ring. `label` is the accessible
 * name (the visible text belongs to the caller), `valueText` the spoken value ("4 of 6").
 * Implements `FormValueControl<number>`: `<ui-range label="Grid size" [formField]="form.size" />`
 * or `[(value)]` without a form.
 */
@Component({
  selector: 'ui-range',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-range',
    '[class.ui-range--disabled]': 'disabled()',
  },
  templateUrl: './range.component.html',
  styleUrl: './range.component.scss',
})
export class RangeComponent implements FormValueControl<number> {
  readonly value = model(0);
  /** Lowest value (0 by default); a form schema may set it (`FormValueControl.min`). */
  readonly min = input<number | undefined>(undefined);
  /** Highest value (100 by default); a form schema may set it (`FormValueControl.max`). */
  readonly max = input<number | undefined>(undefined);
  readonly step = input(1, { transform: numberAttribute });
  /** Accessible name of the slider. */
  readonly label = input.required<string>();
  /** Spoken value (`aria-valuetext`): a string, or a function of the value ("4 of 6"). */
  readonly valueText = input<string | ((value: number) => string)>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Emits on blur; `[formField]` marks the field touched. */
  readonly touch = output<void>();

  private readonly host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly lowest = computed(() => this.min() ?? 0);
  protected readonly highest = computed(() => this.max() ?? 100);

  /** Position of the value between `min` and `max`, 0 to 1 (the filled part of the track). */
  protected readonly ratio = computed(() => {
    const span = this.highest() - this.lowest();
    if (span <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, (this.value() - this.lowest()) / span));
  });

  protected readonly spoken = computed(() => {
    const text = this.valueText();
    return typeof text === 'function' ? text(this.value()) : (text ?? null);
  });

  /** Focuses the native slider. */
  focus(options?: FocusOptions): void {
    this.host.querySelector('input')?.focus(options);
  }

  protected onInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.value.set(target.valueAsNumber);
    }
  }
}
