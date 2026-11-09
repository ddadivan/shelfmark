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
 * it steps through `LANDING_FOLDER_CYCLE` once over `LANDING_LOOP.ShelfCycleMs`, ends back on the
 * first folder (Clothes) and stays there. It is finite, so it needs no pause control (WCAG 2.2.2
 * only asks for one for moving content that goes on for more than five seconds without end).
 * Otherwise the static frame (Clothes) stays.
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
  styleUrl: './landing-before-after.component.scss',
})
export class LandingBeforeAfterComponent {
  protected readonly treeRows = LANDING_TREE_ROWS;
  protected readonly lists = LANDING_FOLDER_LISTS;

  /** Id of the folder whose links are listed (`LANDING_TREE_ROWS`). */
  protected readonly activeFolder = signal<LandingFolder>(LANDING_FOLDER.Clothes);

  /** Folder changes played so far; the cycle runs once and stops after `LANDING_FOLDER_CYCLE.length`. */
  private readonly played = signal(0);
  /** A computed boolean: the effect below reruns only when the cycle ends, not on every step. */
  private readonly finished = computed(() => this.played() >= LANDING_FOLDER_CYCLE.length);

  constructor() {
    const gate = inject(LandingLoopGateDirective);
    const stepMs = LANDING_LOOP.ShelfCycleMs / LANDING_FOLDER_CYCLE.length;
    effect((onCleanup) => {
      if (!gate.active() || this.finished()) {
        return;
      }
      const timer = setInterval(() => {
        this.activeFolder.update(nextFolder);
        this.played.update((value) => value + 1);
      }, stepMs);
      onCleanup(() => clearInterval(timer));
    });
  }
}

function nextFolder(current: LandingFolder): LandingFolder {
  const index = LANDING_FOLDER_CYCLE.indexOf(current);
  return LANDING_FOLDER_CYCLE[(index + 1) % LANDING_FOLDER_CYCLE.length];
}
