import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CHIP_VARIANT, ChipComponent, FaviconComponent, IconComponent } from '@shelfmark/ui';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_BENTO_FOLDERS } from '../../models/landing-bento-folders.const';

/**
 * "Save once, find in seconds": the bento of what the app does (docs/design/screens/Landing.dc.html).
 * Static tiles that fade in once when scrolled to; the small pictures in them are decorative.
 */
@Component({
  selector: 'app-landing-bento',
  imports: [LandingRevealDirective, TranslocoPipe, ChipComponent, FaviconComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-bento.component.html',
  styleUrls: ['./landing-bento.component.scss', './landing-bento-demo.scss'],
})
export class LandingBentoComponent {
  protected readonly CHIP_VARIANT = CHIP_VARIANT;
  protected readonly folders = LANDING_BENTO_FOLDERS;
}
