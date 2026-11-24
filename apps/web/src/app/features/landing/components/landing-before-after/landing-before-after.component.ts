import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '@shelfmark/ui';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_FOLDER_COLOUR } from '../../models/landing-folder-colour.const';
import { LANDING_SHELF_LINKS } from '../../models/landing-shelf-links.const';
import { LANDING_SHELF_TREE } from '../../models/landing-shelf-tree.const';

/** Where the "after" rows start sliding in, and the step between two of them (16-landing). */
const ROWS_START_MS = 300;
const ROWS_STEP_MS = 120;

/**
 * "The same links, before and after" (16-landing): a scattered collage (saved messages, a
 * bookmarks bar, forty tabs, a sticky note, a notes file) beside the same links on the Shelf
 * shelf. Both halves rise in with the scroll; the shelf rows then slide in one by one. Both
 * drawings are pictures with an accessible name.
 */
@Component({
  selector: 'app-landing-before-after',
  imports: [IconComponent, LandingRevealDirective, NgOptimizedImage, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-before-after.component.html',
  styleUrl: './landing-before-after.component.scss',
})
export class LandingBeforeAfterComponent {
  protected readonly tree = LANDING_SHELF_TREE;
  protected readonly links = LANDING_SHELF_LINKS;
  protected readonly COLOUR = LANDING_FOLDER_COLOUR;
  protected readonly ROWS_START_MS = ROWS_START_MS;
  protected readonly ROWS_STEP_MS = ROWS_STEP_MS;
}
