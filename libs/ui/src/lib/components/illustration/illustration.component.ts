import { _IdGenerator } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { UiInViewDirective } from '../../directives/in-view/in-view.directive';
import { InViewObserver } from '../../directives/in-view/in-view-observer';
import { pageVisible } from '../../utils/page-visible/page-visible';
import { ILLUSTRATION_DEFAULT_MOTION } from './models/illustration-default-motion.const';
import type { IllustrationMotion } from './models/illustration-motion.type';
import type { IllustrationName } from './models/illustration-name.type';
import { ILLUSTRATION_MOTION } from './models/illustration-motion.const';

/**
 * Flat geometric brand scene, drawn as an inline SVG in the template (no `innerHTML`) on a
 * 120 x 120 grid with every colour bound to a token, so it follows the theme. The scene is square:
 * `--ui-illustration-size` sets its side (default 15rem, 10rem below 40em, never wider than the
 * parent) and the line widths stay the same on screen at any size. Decorative (`aria-hidden`) unless
 * a `label` is given. `motion` picks `loop` (the default of every scene: one slow movement on the
 * sage detail and the sparks' twinkle), `once` or `none`. Reduced motion shows the still drawing;
 * the loop pauses while the scene is off screen or the tab is hidden.
 */
@Component({
  selector: 'ui-illustration',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [UiInViewDirective],
  host: {
    class: 'ui-illustration',
    '[class.ui-illustration--loop]': 'motionMode() === ILLUSTRATION_MOTION.Loop',
    '[class.ui-illustration--once]': 'motionMode() === ILLUSTRATION_MOTION.Once',
    '[class.ui-illustration--none]': 'motionMode() === ILLUSTRATION_MOTION.None',
    '[class.ui-illustration--paused]': 'paused()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
  templateUrl: './illustration.component.html',
  styleUrls: [
    './illustration.component.scss',
    './illustration-once.scss',
    './illustration-loop.scss',
  ],
})
export class IllustrationComponent {
  protected readonly ILLUSTRATION_MOTION = ILLUSTRATION_MOTION;

  private readonly view = inject(UiInViewDirective);
  private readonly tabVisible = pageVisible();

  /** Scene to draw. */
  readonly name = input.required<IllustrationName>();
  /** Motion mode; omit for the default (`loop`). */
  readonly motion = input<IllustrationMotion>();
  /** Accessible name. Omit for a decorative scene next to its own text. */
  readonly label = input<string>();

  /** The mode in effect: the input, else the scene default. */
  protected readonly motionMode = computed(
    () => this.motion() ?? ILLUSTRATION_DEFAULT_MOTION[this.name()],
  );

  /** Unique per instance: the clip of a scene must not clash with another scene on the page. */
  private readonly uid = inject(_IdGenerator).getId('ui-illustration-');
  protected readonly lensId = `${this.uid}-lens`;
  protected readonly lensClip = `url(#${this.lensId})`;

  /** Off screen or in a hidden tab: the animation clock stops (a browser without an observer never pauses). */
  protected readonly paused = computed(
    () => !this.tabVisible() || (InViewObserver.supported && !this.view.inView()),
  );
}
