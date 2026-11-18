import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  FaviconComponent,
  FOLDER_COLOUR,
  ICON_SIZE,
  IconComponent,
  SUGGESTION_KIND,
  SuggestionComponent,
  SuggestionRowComponent,
} from '@shelfmark/ui';
import { PRIVACY_AI_FRAGMENT } from '../../../privacy/models/privacy-ai-fragment.const';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { LANDING_AI_POINTS } from './models/landing-ai-points.const';

/**
 * "Help with sorting, when you want it" (#481, LandingAi mockup): the optional AI features, off
 * until the person turns them on, with a link to the AI section of the privacy page. The visual
 * is built from the real AI components (suggestion chips, "Related by meaning", the summary line)
 * on an `ai-bg` disc; it is inert and hidden from assistive technology, the copy carries the
 * meaning. The cards rise in once when the block scrolls into view (`appLandingReveal`), the
 * final frame under reduced motion. Phones stack the copy and two cards (no search card).
 */
@Component({
  selector: 'app-landing-ai',
  imports: [
    FaviconComponent,
    IconComponent,
    LandingRevealDirective,
    RouterLink,
    SuggestionComponent,
    SuggestionRowComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-ai.component.html',
  styleUrl: './landing-ai.component.scss',
})
export class LandingAiComponent {
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly FOLDER_COLOUR = FOLDER_COLOUR;
  protected readonly SUGGESTION_KIND = SUGGESTION_KIND;
  protected readonly POINTS = LANDING_AI_POINTS;
  protected readonly privacyHref = LANDING_LINKS.Privacy;
  protected readonly privacyFragment = PRIVACY_AI_FRAGMENT;
}
