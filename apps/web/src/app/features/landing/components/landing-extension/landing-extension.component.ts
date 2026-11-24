import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent, LOGO_VARIANT, LogoComponent } from '@shelfmark/ui';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_IMAGES } from '../../models/landing-images.const';

/**
 * "Save the page you are on" (16-landing, #455): a browser frame with the extension popup saving a
 * jacket, its folder filled in by a rule, beside the eyebrow, the title and the text. No install
 * link (author: the install link is for signed-in people, in the app). A picture (`role="img"`).
 */
@Component({
  selector: 'app-landing-extension',
  imports: [IconComponent, LandingRevealDirective, LogoComponent, NgOptimizedImage, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-extension.component.html',
  styleUrl: './landing-extension.component.scss',
})
export class LandingExtensionComponent {
  protected readonly LOGO_VARIANT = LOGO_VARIANT;
  protected readonly jacket = LANDING_IMAGES.jacket;
}
