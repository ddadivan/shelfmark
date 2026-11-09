import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';
import { LandingMotionService } from '../../landing-motion.service';

/**
 * The "before" board: scraps of Saved Messages, tabs, a sticky note and a bookmarks bar.
 * The scraps come in one after another, once, when the board first scrolls into view (a visible
 * tab, motion allowed), and then stay still. Nothing loops and nothing reacts to the pointer.
 * Without an observer or with reduced motion the board is simply the static frame.
 */
@Component({
  selector: 'app-landing-before-scene',
  imports: [TranslocoPipe],
  hostDirectives: [LandingLoopGateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-before-scene.component.html',
  styleUrl: './landing-before-scene.component.scss',
})
export class LandingBeforeSceneComponent {
  private readonly gate = inject(LandingLoopGateDirective).active;
  private readonly motion = inject(LandingMotionService);

  /** The scraps wait out of sight for their entrance (only when the entrance can play). */
  protected readonly armed = signal(false);
  /** The entrance has started; it never runs again. */
  protected readonly entered = signal(false);

  constructor() {
    afterNextRender(() => {
      if (!this.motion.reducedMotion() && typeof IntersectionObserver === 'function') {
        this.armed.set(true);
      }
    });
    effect(() => {
      if (this.gate() && !untracked(() => this.entered())) {
        this.entered.set(true);
      }
    });
  }
}
