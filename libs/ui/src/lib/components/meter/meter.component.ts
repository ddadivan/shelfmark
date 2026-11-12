import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * Determinate progress for work of known size (an export): a 6px track with a sage fill.
 * `value` is 0 to 100 (clamped; anything that is not a number counts as 0). It is a
 * `progressbar` with `aria-valuenow`; `label` is its accessible name. Show the percentage next
 * to it as text (or projected by the feature); this component draws only the bar.
 */
@Component({
  selector: 'ui-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meter.component.html',
  styleUrl: './meter.component.scss',
})
export class MeterComponent {
  /** Progress from 0 to 100. */
  readonly value = input(0, { transform: numberAttribute });
  /** Accessible name, for example "Export progress". */
  readonly label = input.required<string>();

  protected readonly percent = computed(() => {
    const value = this.value();
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  });
}
