import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import type { NumberFlowSlot } from './models/number-flow-slot.interface';

/**
 * A number whose changed digits slide 0.5em (up when it grows, down when it shrinks) and
 * cross-fade in place, while the other digits stay still (Motion, number change). Tabular figures
 * and one grid cell per character keep the width from jumping. Pass `text` when the app formats
 * the number itself (locale, grouping); it is the text that is shown and read. The full text is one
 * visually hidden string for screen readers, the animated digits are `aria-hidden`. The first
 * value is shown at once. Reduced motion: a plain cross-fade.
 */
@Component({
  selector: 'ui-number-flow',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-number-flow',
    '[style.--ui-flow-dir]': 'direction()',
  },
  templateUrl: './number-flow.component.html',
  styleUrl: './number-flow.component.scss',
})
export class NumberFlowComponent {
  /** The number; its change decides the direction of the slide. */
  readonly value = input.required<number>();
  /** The number as the app formats it (`1,204`); defaults to `String(value)`. */
  readonly text = input<string>();

  protected readonly display = computed(() => this.text() ?? String(this.value()));
  /** 1 when the number grew (digits move up), -1 when it shrank. */
  protected readonly direction = linkedSignal<number, 1 | -1>({
    source: this.value,
    computation: (value, previous) => (previous && value < previous.source ? -1 : 1),
  });
  protected readonly slots = computed<readonly NumberFlowSlot[]>(() => {
    const chars = Array.from(this.display());
    return chars.map((char, index) => ({ char, pos: chars.length - 1 - index }));
  });
  /** Empty until the first render is done, so the initial digits do not animate in. */
  protected readonly enterClass = signal('');

  constructor() {
    afterNextRender(() => this.enterClass.set('ui-number-flow__char--enter'));
  }
}
