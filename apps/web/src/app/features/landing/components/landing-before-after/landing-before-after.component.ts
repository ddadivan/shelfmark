import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ChipComponent, FaviconComponent } from '@shelfmark/ui';
import { LandingBeforeSceneComponent } from '../landing-before-scene/landing-before-scene.component';
import { LANDING_FOLDER_LISTS } from '../../models/landing-folder-lists.const';
import { LANDING_TREE_ROWS } from '../../models/landing-tree-rows.const';

/**
 * "The same links, before and after": the scattered mess next to the shelf. Both scenes are
 * static final frames; `activeFolder` is the folder the shelf shows (animated later, #105).
 */
@Component({
  selector: 'app-landing-before-after',
  imports: [TranslocoPipe, ChipComponent, FaviconComponent, LandingBeforeSceneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-before-after.component.html',
  styleUrl: './landing-before-after.component.scss',
})
export class LandingBeforeAfterComponent {
  protected readonly treeRows = LANDING_TREE_ROWS;
  protected readonly lists = LANDING_FOLDER_LISTS;

  /** Id of the folder whose links are listed (`LANDING_TREE_ROWS`). */
  protected readonly activeFolder = signal('clothes');
}
