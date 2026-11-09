import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';
import { LandingMotionService } from '../../landing-motion.service';

/**
 * The "before" board: scraps of Saved Messages, tabs, a sticky note and a bookmarks bar.
 * The scraps come in one after another, once, when the board first scrolls into view (a visible
 * tab, motion allowed). After that the board loops calmly in CSS: every scrap drifts a little and
 * the "+1" bubble fades out and back in. The loop holds its frame while the board is off screen,
 * the tab is hidden or `paused` is set (pointer or focus inside the section). Nothing reacts to
 * hovering a scrap. Without an observer or with reduced motion the board is the static frame.
 * Like the shelf, the endless loop has no pause button, by the author's decision (see the shelf).
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

  /** The parent section holds the loop (pointer over it or focus inside it). */
  readonly paused = input(false);

  /** The CSS loop holds its frame: off screen, hidden tab or paused by the section. */
  protected readonly holding = computed(() => !this.gate() || this.paused());

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
