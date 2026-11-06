import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import type { AvatarSize } from './models/avatar-size.type';
import { initialsOf } from './initials';

/**
 * The signed-in user's picture. Shows `src` when it loads; without `src`, or when the image
 * fails (the CSP blocks external hosts in stage 1), it shows the initials of `name`, and a
 * user icon when there is no name either. The box has a fixed size, so switching between the
 * image and the fallback never shifts the layout. The image is sent with
 * `referrerpolicy="no-referrer"`.
 * Without `label` the avatar is decorative (`aria-hidden`), for use inside a labelled control;
 * with `label` it is `role="img"` with that name.
 */
@Component({
  selector: 'ui-avatar',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-avatar',
    '[class.ui-avatar--sm]': "size() === 'sm'",
    '[class.ui-avatar--md]': "size() === 'md'",
    '[class.ui-avatar--lg]': "size() === 'lg'",
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
  readonly size = input<AvatarSize>('md');
  /** Accessible name. Omit when the avatar sits inside a control that has its own name. */
  readonly label = input<string>();

  /** Set when the current `src` failed to load; resets when `src` changes. */
  protected readonly failed = linkedSignal<string | undefined, boolean>({
    source: this.src,
    computation: () => false,
  });

  protected readonly imageSrc = computed(() => (this.failed() ? null : this.src() || null));
  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly iconSize = computed(() => (this.size() === 'lg' ? 24 : 16));
}
