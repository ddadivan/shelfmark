import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';

/**
 * The "before" board: scraps of Saved Messages, tabs, a sticky note and a bookmarks bar.
 * The static frame is the default; while the board is on screen in a visible tab (and motion is
 * allowed) the scraps drift slowly and the "+1 in Saved Messages" ping pops up periodically.
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
  /** The user (or a hover / focus on the block) paused the loops. */
  readonly paused = input(false);

  private readonly gate = inject(LandingLoopGateDirective).active;
  protected readonly live = computed(() => this.gate() && !this.paused());
}
