import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { IconComponent } from '@shelfmark/ui';
import { PRIVACY_AI_FRAGMENT } from '../../../privacy/models/privacy-ai-fragment.const';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_IMAGES } from '../../models/landing-images.const';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { LANDING_AI_POINTS } from './models/landing-ai-points.const';

/**
 * "Help with sorting, when you want it" (16-landing, id `ai`): the eyebrow, three points and the
 * privacy note; beside it three drawn examples of the app's AI (suggestion chips on a new link, a
 * meaning-search result and an Ask answer with sources). The examples are pictures (`role="img"`).
 */
@Component({
  selector: 'app-landing-ai',
  imports: [IconComponent, LandingRevealDirective, NgOptimizedImage, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-ai.component.html',
  styleUrl: './landing-ai.component.scss',
})
export class LandingAiComponent {
  protected readonly POINTS = LANDING_AI_POINTS;
  protected readonly IMAGES = LANDING_IMAGES;
  protected readonly privacyHref = LANDING_LINKS.Privacy;
  protected readonly privacyFragment = PRIVACY_AI_FRAGMENT;
}
