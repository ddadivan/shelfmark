import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, ChipComponent, FaviconComponent } from '@shelfmark/ui';
import { LandingBeforeSceneComponent } from '../landing-before-scene/landing-before-scene.component';
import { LandingMotionService } from '../../landing-motion.service';
import { LandingLoopGateDirective } from '../../directives/landing-loop-gate.directive';
import { LANDING_FOLDER } from '../../models/landing-folder.const';
import type { LandingFolder } from '../../models/landing-folder.type';
import { LANDING_FOLDER_CYCLE } from '../../models/landing-folder-cycle.const';
import { LANDING_FOLDER_LISTS } from '../../models/landing-folder-lists.const';
import { LANDING_LOOP } from '../../models/landing-loop.const';
import { LANDING_TREE_ROWS } from '../../models/landing-tree-rows.const';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';

/**
 * "The same links, before and after": the scattered mess next to the shelf. `activeFolder` is the
 * folder the shelf shows; while the block is on screen in a visible tab (and motion is allowed)
 * it steps through `LANDING_FOLDER_CYCLE` over `LANDING_LOOP.ShelfCycleMs`. Otherwise the
 * static frame (Clothes) stays.
 */
@Component({
  selector: 'app-landing-before-after',
  imports: [
    LandingRevealDirective,
    TranslocoPipe,
    ButtonComponent,
    ChipComponent,
    FaviconComponent,
    LandingBeforeSceneComponent,
  ],
  hostDirectives: [LandingLoopGateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-before-after.component.html',
  styleUrl: './landing-before-after.component.scss',
})
export class LandingBeforeAfterComponent {
  protected readonly treeRows = LANDING_TREE_ROWS;
  protected readonly lists = LANDING_FOLDER_LISTS;

  /** Id of the folder whose links are listed (`LANDING_TREE_ROWS`). */
  protected readonly activeFolder = signal<LandingFolder>(LANDING_FOLDER.Clothes);

  protected readonly motion = inject(LandingMotionService);

  /** WCAG 2.2.2: the user can pause the loops; hover and focus inside the scenes pause them too. */
  protected readonly paused = signal(false);
  private readonly engaged = signal(false);
  protected readonly stopped = computed(() => this.paused() || this.engaged());

  protected togglePaused(): void {
    this.paused.update((value) => !value);
  }

  protected engage(engaged: boolean): void {
    this.engaged.set(engaged);
  }

  protected leaveFocus(event: FocusEvent): void {
    const area = event.currentTarget as Node;
    if (!(event.relatedTarget instanceof Node) || !area.contains(event.relatedTarget)) {
      this.engaged.set(false);
    }
  }

  constructor() {
    const gate = inject(LandingLoopGateDirective);
    const stepMs = LANDING_LOOP.ShelfCycleMs / LANDING_FOLDER_CYCLE.length;
    effect((onCleanup) => {
      if (!gate.active() || this.stopped()) {
        return;
      }
      const timer = setInterval(() => this.activeFolder.update(nextFolder), stepMs);
      onCleanup(() => clearInterval(timer));
    });
  }
}

function nextFolder(current: LandingFolder): LandingFolder {
  const index = LANDING_FOLDER_CYCLE.indexOf(current);
  return LANDING_FOLDER_CYCLE[(index + 1) % LANDING_FOLDER_CYCLE.length];
}
