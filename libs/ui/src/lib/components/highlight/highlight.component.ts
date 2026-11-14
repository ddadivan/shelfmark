import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { highlightParts } from './highlight-parts';

/**
 * Shows `text` with the parts that match `query` wrapped in `<mark>`. `query` is a string (split
 * on whitespace into terms) or a list of terms. Matching is case-insensitive and literal; the
 * runs are rendered as text nodes through `@for`, never as HTML.
 *
 * `<ui-highlight [text]="link.title" [query]="query()" />`
 */
@Component({
  selector: 'ui-highlight',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-highlight' },
  templateUrl: './highlight.component.html',
  styleUrl: './highlight.component.scss',
})
export class HighlightComponent {
  /** The full text to show. */
  readonly text = input('');
  /** What to mark: one string (whitespace separates terms) or a list of terms. */
  readonly query = input<string | readonly string[]>('');

  protected readonly parts = computed(() => highlightParts(this.text(), this.query()));
}
