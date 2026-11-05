import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { LogoTone } from './models/logo-tone.type';
import type { LogoVariant } from './models/logo-variant.type';

/**
 * Shelfmark logo: the card-with-bookmark mark, optionally followed by the wordmark (Onest 600).
 * Colours come from tokens, so one component serves both themes. A lockup is read through its
 * visible wordmark; a bare mark is decorative (`aria-hidden`). `label` turns either into a
 * named image. The wordmark text is the brand name, passed in `wordmark` (default "Shelfmark").
 * Size: `--ui-logo-size` is the mark's height (default 2rem); the wordmark scales with it.
 */
@Component({
  selector: 'ui-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-logo',
    '[class.ui-logo--lockup]': "variant() === 'lockup'",
    '[class.ui-logo--mark]': "variant() === 'mark'",
    '[class.ui-logo--mono]': "tone() === 'mono'",
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() || variant() === 'lockup' ? null : 'true'",
  },
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
})
export class LogoComponent {
  readonly variant = input<LogoVariant>('lockup');
  readonly tone = input<LogoTone>('color');
  /** Accessible name. Omit when the logo is decorative. */
  readonly label = input<string>();
  /** Wordmark text of the lockup. */
  readonly wordmark = input('Shelfmark');
}
