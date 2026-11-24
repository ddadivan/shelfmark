import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HighlightComponent, IconComponent } from '@shelfmark/ui';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_BENTO_TREE } from '../../models/landing-bento-tree.const';
import { LANDING_FOLDER_COLOUR } from '../../models/landing-folder-colour.const';
import { LANDING_IMAGES } from '../../models/landing-images.const';

/** The export formats on the "Your links stay yours" tile (file formats, not translated). */
const FORMATS = ['JSON', 'Bookmarks HTML', 'CSV'] as const;

/**
 * "Save once, find in seconds" (16-landing, id `works`): five tiles, the preview that fills in by
 * itself, folders inside folders, search by any word, saving from the phone and the export. The
 * small drawings are decorative (`aria-hidden`); the tile text says what they show. Tiles lift on
 * hover.
 */
@Component({
  selector: 'app-landing-bento',
  imports: [
    HighlightComponent,
    IconComponent,
    LandingRevealDirective,
    NgOptimizedImage,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-bento.component.html',
  styleUrl: './landing-bento.component.scss',
})
export class LandingBentoComponent {
  protected readonly tree = LANDING_BENTO_TREE;
  protected readonly COLOUR = LANDING_FOLDER_COLOUR;
  protected readonly IMAGES = LANDING_IMAGES;
  protected readonly FORMATS = FORMATS;
}
