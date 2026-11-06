import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpinnerComponent } from '../spinner/spinner.component';

/**
 * The row under the last item of a list while the next page loads: a small spinner (it fades
 * and scales in place) and the text. Render it with `@if` only while loading; the row is a
 * polite live region, so assistive technology announces the text. `text` comes from the feature
 * (for example "Loading more links").
 */
@Component({
  selector: 'ui-load-more',
  imports: [SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  templateUrl: './load-more.component.html',
  styleUrl: './load-more.component.scss',
})
export class LoadMoreComponent {
  readonly text = input.required<string>();
  /** Shows the row. The host stays in the DOM, so its live region announces the change. */
  readonly loading = input(true, { transform: booleanAttribute });
}
