import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent } from '@shelfmark/ui';
import { FragmentTargetDirective } from '../../core/layout/fragment-target.directive';
import { PRIVACY_AI_FRAGMENT } from './models/privacy-ai-fragment.const';
import { PRIVACY_AI_POINTS } from './models/privacy-ai-points.const';
import { PRIVACY_LINKS } from './models/privacy-links.const';

/**
 * Public privacy policy (`/privacy`): static text from translation keys, no data, no guard. The
 * "AI features (optional)" section is `#ai` (Settings › AI and the AI intro link there); its
 * bracketed provider and retention placeholders are filled in by the author once chosen.
 */
@Component({
  selector: 'app-privacy-page',
  imports: [FragmentTargetDirective, RouterLink, TranslocoPipe, LogoComponent],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PrivacyPage {
  protected readonly links = PRIVACY_LINKS;
  protected readonly AI_FRAGMENT = PRIVACY_AI_FRAGMENT;
  protected readonly aiPoints = PRIVACY_AI_POINTS;
}
