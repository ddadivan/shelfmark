import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FLAG_BASE_URL } from './flag-base-url.const';
import type { FlagCode } from './models/flag-code.type';

/**
 * A small country flag (#315: the language list of Settings › Language), 1.25 x 0.875rem with
 * soft corners and a hairline edge so white stripes keep their shape on white. Always decorative
 * (`aria-hidden`, empty `alt`): the language name next to it carries the meaning. The flag is an
 * SVG file in the national colours, the one place with fixed colours besides the brand marks.
 */
@Component({
  selector: 'ui-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-flag', 'aria-hidden': 'true' },
  templateUrl: './flag.component.html',
  styleUrl: './flag.component.scss',
})
export class FlagComponent {
  private readonly base = inject(FLAG_BASE_URL);
  readonly code = input.required<FlagCode>();
  protected readonly src = computed(() => `${this.base}${this.code()}.svg`);
}
