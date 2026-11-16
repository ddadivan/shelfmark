import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BADGE_TONE, BadgeComponent, LogoComponent } from '@shelfmark/ui';
import { LocaleDatePipe } from '../../core/i18n/locale-date.pipe';
import { ThemeService } from '../../core/theme/theme.service';
import { APP_VERSION } from '../../models/app-version.const';
import { SHOWN_CHANGELOG } from './models/shown-changelog.const';
import { changelogSections, releasedChangelog } from './utils/changelog-highlights';
import { changelogImageSrc } from './utils/changelog-image-src';
import type { ChangelogImage } from './models/changelog-image.interface';

/**
 * The public changelog (`/changelog`, #424): every shipped release, newest first, with its date and
 * its changes in plain language, from the typed changelog data, in the sections New (features with a
 * screenshot), Improved and Fixed; an empty section is left out. No data, no guard, like `/privacy`.
 */
@Component({
  selector: 'app-changelog-page',
  imports: [
    BadgeComponent,
    LocaleDatePipe,
    LogoComponent,
    NgOptimizedImage,
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './changelog.page.html',
  styleUrl: './changelog.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChangelogPage {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly appName = this.title.getTitle();

  private readonly theme = inject(ThemeService);
  protected readonly BADGE_TONE = BADGE_TONE;

  /** Each shipped release, newest first, with its items grouped into sections. */
  protected readonly releases = releasedChangelog(SHOWN_CHANGELOG).map((release) => ({
    version: release.version,
    date: release.date,
    ...changelogSections(release),
  }));
  protected readonly version = APP_VERSION;

  /** "What's new · Shelfmark", in the active language. */
  private readonly pageTitle = toSignal(this.transloco.selectTranslate('changelog.title'));

  /** The screenshot file for the current theme. */
  protected imageSrc(image: ChangelogImage): string {
    return changelogImageSrc(image, this.theme.resolved());
  }

  constructor() {
    effect(() => {
      const page = this.pageTitle();
      if (page !== undefined) {
        this.title.setTitle(
          this.transloco.translate('library.pageTitle.page', { page, app: this.appName }),
        );
      }
    });
    inject(DestroyRef).onDestroy(() => this.title.setTitle(this.appName));
  }
}
