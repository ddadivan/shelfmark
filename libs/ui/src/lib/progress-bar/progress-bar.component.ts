import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';
import { loaderVisible } from '../loader-timing/loader-visible';
import { PROGRESS_BAR_DONE_ANIMATION } from './models/progress-bar-done-animation.const';
import type { ProgressBarPhase } from './models/progress-bar-phase.type';
import type { ProgressBarVariant } from './models/progress-bar-variant.type';

/**
 * The sage progress bar for navigation and background requests; old content stays visible.
 * Presentational: the app binds `active` (for example to "requests pending > 0"); this library
 * has no store.
 *
 * `fixed` is the 2px bar at the top of the viewport. It appears only after 300 ms of `active`
 * (a fast response never shows it); when `active` ends it fills to 100% and fades. `inline`
 * is a 3px track inside a box (the boot screen later); it shows at once, and the caller
 * decides when to bind `active`. Without `label` the bar is `aria-hidden` (the page announces
 * the loading itself); with `label` it is an indeterminate `progressbar` with that name.
 * Under `prefers-reduced-motion` the bar keeps moving, slower.
 */
@Component({
  selector: 'ui-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  /** True while something is loading. */
  readonly active = input(false, { transform: booleanAttribute });
  readonly variant = input<ProgressBarVariant>('fixed');
  /** Accessible name for the `progressbar`; unset keeps the bar `aria-hidden`. */
  readonly label = input<string>();

  private readonly delayed = loaderVisible(this.active, { minVisible: 0 });
  private readonly running = computed(() =>
    this.variant() === 'inline' ? this.active() : this.delayed(),
  );

  protected readonly phase = signal<ProgressBarPhase>('idle');

  constructor() {
    effect(() => {
      if (this.running()) {
        this.phase.set('running');
      } else if (untracked(this.phase) === 'running') {
        this.phase.set('done');
      }
    });
  }

  protected onAnimationEnd(event: AnimationEvent): void {
    // The enter animation also ends here; only the fade-out of a finished bar removes it.
    if (this.phase() === 'done' && event.animationName === PROGRESS_BAR_DONE_ANIMATION) {
      this.phase.set('idle');
    }
  }
}
