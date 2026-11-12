import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ICON_SIZE } from '../icon/models/icon-size.const';
import type { IconName } from '../icon/models/icon-name.type';
import { BADGE_TONE } from './models/badge-tone.const';
import type { BadgeTone } from './models/badge-tone.type';

/**
 * Small status pill on a card or row ("30 days left", "Pinned", "Link broken"). The label is
 * projected text and always carries the meaning (words first, colour second); the optional
 * leading icon is decorative. The badge is plain inline text with no role, so a screen reader
 * reads it in context. One badge per card: more than one belongs in the meta line.
 */
@Component({
  selector: 'ui-badge',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-badge',
    '[class.ui-badge--neutral]': 'tone() === BADGE_TONE.Neutral',
    '[class.ui-badge--accent]': 'tone() === BADGE_TONE.Accent',
    '[class.ui-badge--warning]': 'tone() === BADGE_TONE.Warning',
    '[class.ui-badge--danger]': 'tone() === BADGE_TONE.Danger',
  },
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  protected readonly BADGE_TONE = BADGE_TONE;
  protected readonly ICON_SIZE = ICON_SIZE;

  /** `neutral`, `accent` (sage), `warning` or `danger`. */
  readonly tone = input<BadgeTone>(BADGE_TONE.Neutral);
  /** Optional decorative leading icon. */
  readonly icon = input<IconName>();
}
