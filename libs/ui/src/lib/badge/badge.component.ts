import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { IconName } from '../icon/models/icon-name.type';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import { BADGE_VARIANT } from './models/badge-variant.const';
import type { BadgeVariant } from './models/badge-variant.type';

/**
 * A small status label on a card or row ("Already saved", "4 days left"): a 22px pill with
 * `label`-size text and an optional 12px icon first. Words first, colour second: the text always
 * says the state, the tint only supports it. The label is projected content and is read as part of
 * its row; the badge is not interactive and has no role of its own. One badge per card or row.
 */
@Component({
  selector: 'ui-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-badge',
    '[class.ui-badge--accent]': 'variant() === BADGE_VARIANT.Accent',
    '[class.ui-badge--warn]': 'variant() === BADGE_VARIANT.Warn',
    '[class.ui-badge--danger]': 'variant() === BADGE_VARIANT.Danger',
  },
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  protected readonly BADGE_VARIANT = BADGE_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** `neutral` (default), `accent`, `warn` or `danger`. */
  readonly variant = input<BadgeVariant>(BADGE_VARIANT.Neutral);
  /** Optional decorative icon before the text. */
  readonly icon = input<IconName>();
}
