import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { AvatarSize } from './models/avatar-size.type';
import { initialsOf } from './initials';
import { AVATAR_SIZE } from './models/avatar-size.const';

/**
 * The signed-in user's picture. Shows `src` when it loads; without `src`, or when the image
 * fails (the CSP blocks external hosts in stage 1), it shows the initials of `name`, and a
 * user icon when there is no name either. The box has a fixed size, so switching between the
 * image and the fallback never shifts the layout. The image is sent with
 * `referrerpolicy="no-referrer"`.
 *
 * The initials are drawn by CSS from `data-initials` (no text node), so a labelled control
 * that contains the avatar passes WCAG 2.5.3. Without `label` the avatar is decorative
 * (`aria-hidden`), for use inside a labelled control; with `label` it is `role="img"` with
 * that name.
 */
@Component({
  selector: 'ui-avatar',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-avatar',
    '[class.ui-avatar--sm]': 'size() === AVATAR_SIZE.Sm',
    '[class.ui-avatar--md]': 'size() === AVATAR_SIZE.Md',
    '[class.ui-avatar--lg]': 'size() === AVATAR_SIZE.Lg',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  /** Image URL (Google / GitHub profile picture). */
  readonly src = input<string>();
  /** Display name; its initials are the fallback. */
  readonly name = input<string>();
  /** `sm` 24, `md` 32, `lg` 48 design pixels. */
  readonly size = input<AvatarSize>(AVATAR_SIZE.Md);
  /** Accessible name. Omit when the avatar sits inside a control that has its own name. */
  readonly label = input<string>();

  /** Set when the current `src` failed to load; resets when `src` changes. */
  protected readonly AVATAR_SIZE = AVATAR_SIZE;
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.src,
    computation: () => false,
  });

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.src() || null));
  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly iconSize = computed(() => (this.size() === AVATAR_SIZE.Lg ? 24 : 16));
}
