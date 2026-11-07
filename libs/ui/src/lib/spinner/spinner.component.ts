import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import type { SpinnerSize } from './models/spinner-size.type';
import { SPINNER_SIZE } from './models/spinner-size.const';

/**
 * Indeterminate spinner: a ring drawn in `currentColor` that fades in and scales up from 40%
 * when it is created (200 ms) and turns at a constant speed (slower under reduced motion).
 * Without `label` it is decorative (`aria-hidden`; the visible text next to it is the status);
 * with `label` it is a `role="status"` region holding the label as visually hidden text. The
 * text is filled after the first render, so the region exists empty first and the screen reader
 * announces the insertion. (`ui-progress-bar` and `ui-meter` stay `progressbar`.)
 *
 * It leaves with the `leave(spinner)` preset: the owner removes it with `@if` and binds
 * `animate.leave` to a class that includes `@include leave(spinner)` (inside a button
 * `spinner-shrink`). The rotation is on the inner ring, so the host's animations can finish.
 */
@Component({
  selector: 'ui-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-spinner',
    '[class.ui-spinner--sm]': 'size() === SPINNER_SIZE.Sm',
    '[class.ui-spinner--lg]': 'size() === SPINNER_SIZE.Lg',
    '[attr.role]': "label() ? 'status' : null",
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  protected readonly SPINNER_SIZE = SPINNER_SIZE;

  readonly size = input<SpinnerSize>(SPINNER_SIZE.Md);
  /** Accessible name. Omit when the spinner sits next to the text that says what is loading. */
  readonly label = input<string>();

  private readonly ready = signal(false);
  /** The hidden text: empty until the first render is done, then the label. */
  protected readonly text = computed(() => (this.ready() ? (this.label() ?? '') : ''));

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }
}
