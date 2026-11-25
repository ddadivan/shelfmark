import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import type { ReaderViewSpan } from '../models/reader-view-span.interface';

/**
 * The inline text of one `ui-reader` block: each span is plain text by interpolation, in a
 * `<code>`, `<em>` or `<strong>` when it carries that style, and in an `<a>` when it has an
 * absolute http(s) `href`. Links open in a new tab (`target="_blank"`, `rel="noopener noreferrer"`);
 * `newTabLabel` (translated, optional) is added as visually hidden text so a screen reader says so.
 * Never `innerHTML`.
 */
@Component({
  selector: 'ui-reader-spans',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-reader-spans' },
  templateUrl: './reader-spans.component.html',
  styleUrl: './reader-spans.component.scss',
})
export class ReaderSpansComponent {
  readonly spans = input.required<readonly ReaderViewSpan[]>();
  /** Visually hidden hint after each link ("(opens in a new tab)"). */
  readonly newTabLabel = input('');

  /** Only an absolute http(s) address is linked, whatever the caller passes. */
  protected link(span: ReaderViewSpan): string | null {
    return span.href !== null && /^https?:\/\//i.test(span.href) ? span.href : null;
  }
}
