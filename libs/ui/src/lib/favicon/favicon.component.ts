import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * The site's small icon, 16 px in a `radius-sm` square. Shows `src` when it loads; without
 * `src`, or when the image fails (the CSP blocks external hosts in stage 1), it shows `letter`
 * (the site's first letter) and, without a letter, the link icon in `text-muted`. The box has a
 * fixed size, so a failed or late image never shifts the layout. The image is bound as `src`
 * only, lazy (`loading="lazy"`, `decoding="async"`) and sent with `referrerpolicy="no-referrer"`.
 * Always decorative (`aria-hidden`): the domain next to it is the text.
 */
@Component({
  selector: 'ui-favicon',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-favicon',
    'aria-hidden': 'true',
  },
  templateUrl: './favicon.component.html',
  styleUrl: './favicon.component.scss',
})
export class FaviconComponent {
  /** Image URL of the site's icon. */
  readonly src = input<string>();
  /** Fallback letter; only the first character is shown. Without it the link icon is shown. */
  readonly letter = input<string>();

  /** Set when the current `src` failed to load; resets when `src` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.src,
    computation: () => false,
  });

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.src() || null));
  protected readonly initial = computed(() => Array.from(this.letter()?.trim() ?? '')[0] ?? '');
}
