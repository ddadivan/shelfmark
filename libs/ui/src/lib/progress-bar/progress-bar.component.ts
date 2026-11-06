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
import { PROGRESS_BAR_DONE_TIMEOUT_MS } from './models/progress-bar-done-timeout.const';
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

  private readonly delayed = loaderVisible(
    computed(() => this.active() && this.variant() === 'fixed'),
    { minVisible: 0 },
  );
  private readonly running = computed(() =>
    this.variant() === 'inline' ? this.active() : this.delayed(),
  );

  protected readonly phase = signal<ProgressBarPhase>('idle');

  constructor() {
    // A finished bar must never stay at 100%: if no `animationend` / `animationcancel` arrives
    // (the tab is hidden, the element is not rendered), a timer removes it.
    effect((onCleanup) => {
      if (this.phase() === 'done') {
        const timer = setTimeout(() => this.finish(), PROGRESS_BAR_DONE_TIMEOUT_MS);
        onCleanup(() => clearTimeout(timer));
      }
    });
    effect(() => {
      if (this.running()) {
        this.phase.set('running');
      } else if (untracked(this.phase) === 'running') {
        this.phase.set('done');
      }
    });
  }

  protected onAnimationCancel(event: AnimationEvent): void {
    // The enter animation is cancelled when `done` replaces it; only the fade-out counts.
    if (event.animationName === PROGRESS_BAR_DONE_ANIMATION) {
      this.finish();
    }
  }

  private finish(): void {
    if (this.phase() === 'done') {
      this.phase.set('idle');
    }
  }

  protected onAnimationEnd(event: AnimationEvent): void {
    // The enter animation also ends here; only the fade-out of a finished bar removes it.
    if (event.animationName === PROGRESS_BAR_DONE_ANIMATION) {
      this.finish();
    }
  }
}
