import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ILLUSTRATION_DEFAULT_MOTION } from './models/illustration-default-motion.const';
import type { IllustrationMotion } from './models/illustration-motion.type';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_MOTION } from './models/illustration-motion.const';

/**
 * Flat geometric brand scene, drawn as an inline SVG in the template (no `innerHTML`) with
 * fills bound to colour tokens, so it follows the theme. Decorative (`aria-hidden`) unless a
 * `label` is given. `motion` picks `loop`, `once` or `none`; without it the scene uses its
 * default (welcome scenes loop, the others play once). Reduced motion shows the final frame.
 * Width comes from `--ui-illustration-width` (default 15rem, never wider than the parent).
 */
@Component({
  selector: 'ui-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-illustration',
    '[class.ui-illustration--loop]': 'motionMode() === ILLUSTRATION_MOTION.Loop',
    '[class.ui-illustration--once]': 'motionMode() === ILLUSTRATION_MOTION.Once',
    '[class.ui-illustration--none]': 'motionMode() === ILLUSTRATION_MOTION.None',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './illustration.component.html',
  styleUrl: './illustration.component.scss',
})
export class IllustrationComponent {
  protected readonly ILLUSTRATION_MOTION = ILLUSTRATION_MOTION;

  /** Scene to draw. */
  readonly name = input.required<IllustrationName>();
  /** Motion mode; omit for the scene's default. */
  readonly motion = input<IllustrationMotion>();
  /** Accessible name. Omit for a decorative scene next to its own text. */
  readonly label = input<string>();

  /** The mode in effect: the input, else the scene default. */
  protected readonly motionMode = computed(
    () => this.motion() ?? ILLUSTRATION_DEFAULT_MOTION[this.name()],
  );
}
