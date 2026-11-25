import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ICON_SPRITE_URL } from './icon-sprite-url.const';
import { ICON_NAMES_16 } from './models/icon-names-16.const';
import type { IconName } from './models/icon-name.type';
import type { IconSize } from './models/icon-size.type';

const HAS_16: ReadonlySet<string> = new Set<string>(ICON_NAMES_16);

/**
 * Shelfmark icon from the own sprite. Filled outlines: the colour comes from `currentColor`
 * (set `color` or `fill` on the host or a parent). Without `label` the icon is decorative.
 *
 * Two drawings: the 24px grid (`sm-<name>`) and, for most icons, a redraw on the 16px grid
 * (`sm-<name>-16`, strokes snapped to whole pixels). Both are in the template; a container query
 * on the host shows the 16px drawing whenever the icon is drawn at 16px or smaller, however that
 * size came about (the `size` input, `--ui-icon-size`, a dialog, text scaling), else the 24px one.
 */
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-icon',
    '[class.ui-icon--16]': 'size() === 16',
    '[class.ui-icon--20]': 'size() === 20',
    '[class.ui-icon--24]': 'size() === 24',
    '[class.ui-icon--has-16]': 'href16() !== null',
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
  /** Size in design pixels. The set is drawn on a 24px grid, so 24 is the default (crisp strokes). */
  readonly size = input<IconSize>(24);
  /** Accessible name. Omit for decorative icons next to a visible label. */
  readonly label = input<string>();

  protected readonly href = computed(() => `${this.spriteUrl}#sm-${this.name()}`);
  /** The 16px drawing of this icon, or `null` when it only has the 24px one. */
  protected readonly href16 = computed(() =>
    HAS_16.has(this.name()) ? `${this.spriteUrl}#sm-${this.name()}-16` : null,
  );
}
