import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LogoComponent } from '@shelfmark/ui';
import { LocaleDatePipe } from '../../core/i18n/locale-date.pipe';
import { APP_VERSION } from '../../models/app-version.const';
import { CHANGELOG } from './models/changelog.const';
import { isFeature, releasedChangelog } from './utils/changelog-highlights';
import type { ChangelogFix } from './models/changelog-fix.interface';

/**
 * The public changelog (`/changelog`, #424): every shipped release, newest first, with its date and
 * its changes in plain language, from the typed changelog data. No data, no guard, like `/privacy`.
 */
@Component({
  selector: 'app-changelog-page',
  imports: [LocaleDatePipe, LogoComponent, RouterLink, TranslocoPipe],
  templateUrl: './changelog.page.html',
  styleUrl: './changelog.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ChangelogPage {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly appName = this.title.getTitle();

  /** Each shipped release with its features (title and text) first, then its one-line fixes. */
  protected readonly releases = releasedChangelog(CHANGELOG).map((release) => ({
    version: release.version,
    date: release.date,
    features: release.items.filter(isFeature),
    fixes: release.items.filter((item): item is ChangelogFix => !isFeature(item)),
  }));
  protected readonly version = APP_VERSION;

  /** "What's new · Shelfmark", in the active language. */
  private readonly pageTitle = toSignal(this.transloco.selectTranslate('changelog.title'));

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
