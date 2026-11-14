import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  numberAttribute,
} from '@angular/core';
import type { BarChartBar } from './models/bar-chart-bar.interface';

/** Width of one bar's slot in SVG units; the bar takes `BAR_WIDTH` of it. */
const SLOT = 10;
const BAR_WIDTH = 7;

function safe(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * A small column chart of counts (sign-ups per day). Inline SVG, no library: bars in `accent` on a
 * `border` baseline, stretched to the width (one slot per bar), 10rem high; the axis texts are
 * HTML under it, every `labelEvery`-th one shown. The figure is a `role="img"` named by `label`
 * (plus `summary`), and the same data is in a visually hidden table (caption `label`, columns
 * `labelHeader` and `valueHeader`), so screen readers get every value. A bar's height eases to a
 * new value (`duration-base`, `ease-in-out`); there is no entrance animation, and no movement under
 * reduced motion.
 */
@Component({
  selector: 'ui-bar-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-bar-chart' },
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
})
export class BarChartComponent {
  protected readonly SLOT = SLOT;
  protected readonly BAR_WIDTH = BAR_WIDTH;

  /** The bars, left to right. */
  readonly bars = input.required<readonly BarChartBar[]>();
  /** Accessible name and table caption, for example "Sign-ups, last 30 days". */
  readonly label = input.required<string>();
  /** Optional one-line reading for screen readers, for example "42 in all, most on 3 Nov". */
  readonly summary = input('');
  /** Header of the label column of the data table, for example "Day". */
  readonly labelHeader = input.required<string>();
  /** Header of the value column of the data table, for example "Sign-ups". */
  readonly valueHeader = input.required<string>();
  /** Shows the axis text of every n-th bar (1 = all); the last bar always shows its text. */
  readonly labelEvery = input(1, { transform: numberAttribute });

  protected readonly max = computed(() =>
    this.bars().reduce((top, bar) => Math.max(top, safe(bar.value)), 0),
  );
  protected readonly width = computed(() => Math.max(1, this.bars().length) * SLOT);
  protected readonly name = computed(() =>
    this.summary() ? `${this.label()}. ${this.summary()}` : this.label(),
  );
  protected readonly rows = computed(() => {
    const max = this.max();
    const every = Math.max(1, Math.floor(this.labelEvery()) || 1);
    const last = this.bars().length - 1;
    return this.bars().map((bar, index) => ({
      label: bar.label,
      value: safe(bar.value),
      text: bar.description ?? `${bar.label}: ${safe(bar.value)}`,
      scale: max === 0 ? 0 : safe(bar.value) / max,
      showLabel: index === last || (last - index) % every === 0,
      x: index * SLOT + (SLOT - BAR_WIDTH) / 2,
    }));
  });
}
