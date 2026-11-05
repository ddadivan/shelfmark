import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ICON_SPRITE_URL } from './icon-sprite-url.const';
import type { IconName } from './models/icon-name.type';
import type { IconSize } from './models/icon-size.type';

/**
 * Shelfmark icon from the own sprite. Filled outlines: the colour comes from `currentColor`
 * (set `color` or `fill` on the host or a parent). Without `label` the icon is decorative.
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-icon',
    '[class.ui-icon--16]': 'size() === 16',
    '[class.ui-icon--20]': 'size() === 20',
    '[class.ui-icon--24]': 'size() === 24',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.scss',
})
export class IconComponent {
  private readonly spriteUrl = inject(ICON_SPRITE_URL);

  /** Icon name, the sprite id without the `sm-` prefix. */
  readonly name = input.required<IconName>();
  /** Size in design pixels; 16 in controls, 20 in navigation. */
  readonly size = input<IconSize>(16);
  /** Accessible name. Omit for decorative icons next to a visible label. */
  readonly label = input<string>();

  protected readonly href = computed(() => `${this.spriteUrl}#sm-${this.name()}`);
}
