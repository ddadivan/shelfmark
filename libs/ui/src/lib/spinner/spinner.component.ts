import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { SpinnerSize } from './models/spinner-size.type';

/**
 * Indeterminate spinner: a ring drawn in `currentColor` that fades in and scales up from 40%
 * when it is created (200 ms) and turns at a constant speed (slower under reduced motion).
 * Without `label` it is decorative (`aria-hidden`; the visible text next to it is the status);
 * with `label` it is a `progressbar` with that accessible name.
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
    '[class.ui-spinner--sm]': "size() === 'sm'",
    '[class.ui-spinner--lg]': "size() === 'lg'",
    '[attr.role]': "label() ? 'progressbar' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  readonly size = input<SpinnerSize>('md');
  /** Accessible name. Omit when the spinner sits next to the text that says what is loading. */
  readonly label = input<string>();
}
