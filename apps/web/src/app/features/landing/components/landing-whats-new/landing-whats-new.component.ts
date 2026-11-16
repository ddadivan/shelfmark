import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleDatePipe } from '../../../../core/i18n/locale-date.pipe';
import { SHOWN_CHANGELOG } from '../../../changelog/models/shown-changelog.const';
import { changelogHighlights } from '../../../changelog/utils/changelog-highlights';
import { LandingRevealDirective } from '../../directives/landing-reveal.directive';
import { LANDING_LINKS } from '../../models/landing-links.const';

/** How many highlights `/about` lists before "See all changes". */
const ABOUT_HIGHLIGHTS = 4;

/**
 * "What's new" for signed-in people on `/about` (HowItWorks.dc.html, board 3): the newest
 * highlights of the changelog data (#424) and a link to `/changelog`.
 */
@Component({
  selector: 'app-landing-whats-new',
  imports: [LocaleDatePipe, LandingRevealDirective, RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-whats-new.component.html',
  styleUrl: './landing-whats-new.component.scss',
})
export class LandingWhatsNewComponent {
  protected readonly highlights = changelogHighlights(SHOWN_CHANGELOG, null, ABOUT_HIGHLIGHTS);
  protected readonly changelogHref = LANDING_LINKS.Changelog;
}
