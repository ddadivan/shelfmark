import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChipComponent, FaviconComponent } from '@shelfmark/ui';
import { LandingBeforeSceneComponent } from '../landing-before-scene/landing-before-scene.component';
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
 * and the pointer or focus is not inside it, it steps through `LANDING_FOLDER_CYCLE` forever,
 * one folder per `LANDING_LOOP.ShelfCycleMs / cycle length`. Otherwise it holds its frame, and
 * under reduced motion the static frame (Clothes) stays.
 */
@Component({
  selector: 'app-landing-before-after',
  imports: [
    LandingRevealDirective,
    TranslocoPipe,
    ChipComponent,
    FaviconComponent,
    LandingBeforeSceneComponent,
  ],
  hostDirectives: [LandingLoopGateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-before-after.component.html',
  styleUrls: ['./landing-before-after.component.scss', './landing-before-after-list.scss'],
})
export class LandingBeforeAfterComponent {
  protected readonly treeRows = LANDING_TREE_ROWS;
  protected readonly lists = LANDING_FOLDER_LISTS;

  /** Id of the folder whose links are listed (`LANDING_TREE_ROWS`). */
  protected readonly activeFolder = signal<LandingFolder>(LANDING_FOLDER.Clothes);

  private readonly hovered = signal(false);
  private readonly focused = signal(false);
  /** The pointer is over the section or focus is inside it: both loops hold their frame. */
  protected readonly paused = computed(() => this.hovered() || this.focused());

  constructor() {
    const gate = inject(LandingLoopGateDirective);
    const stepMs = LANDING_LOOP.ShelfCycleMs / LANDING_FOLDER_CYCLE.length;
    // DELIBERATE DECISION BY THE AUTHOR: this loop goes on forever and has no pause button
    // (WCAG 2.2.2 pause control intentionally omitted). The mitigations are: it stays static
    // under reduced motion, it runs only while on screen in a visible tab, and it pauses while
    // the pointer is over the section or focus is inside it.
    effect((onCleanup) => {
      if (!gate.active() || this.paused()) {
        return;
      }
      const timer = setInterval(() => this.activeFolder.update(nextFolder), stepMs);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected setHovered(value: boolean): void {
    this.hovered.set(value);
  }

  protected onFocusIn(): void {
    this.focused.set(true);
  }

  protected onFocusOut(event: FocusEvent, container: HTMLElement): void {
    const next = event.relatedTarget;
    this.focused.set(next instanceof Node && container.contains(next));
  }
}

function nextFolder(current: LandingFolder): LandingFolder {
  const index = LANDING_FOLDER_CYCLE.indexOf(current);
  return LANDING_FOLDER_CYCLE[(index + 1) % LANDING_FOLDER_CYCLE.length];
}
