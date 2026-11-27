import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { THEME_PREFERENCE } from '@shelfmark/contracts';
import { BUTTON_SIZE, BUTTON_VARIANT, ButtonComponent, LogoComponent, THEME } from '@shelfmark/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ThemeService } from '../../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { AppLinkDirective } from '../../directives/app-link.directive';
import { LANDING_LINKS } from '../../models/landing-links.const';
import { LANDING_SCROLL_TARGET } from '../../models/landing-scroll-target.const';
import type { LandingScrollTarget } from '../../models/landing-scroll-target.type';
import { injectSignedIn } from '../../utils/inject-signed-in';
import { isPlainLeftClick } from '../../../../core/layout/utils/is-plain-left-click';

/**
 * Sticky top bar of the landing (Shelf 16-landing): logo; How it works, AI, What's new, Privacy;
 * the theme switch; Sign in and Start your shelf, or "Back to my shelf" when signed in (`/about`).
 * The page links leave below 900px, "Sign in" below 560px (it stays in the hero and the finale).
 */
@Component({
  selector: 'app-landing-header',
  imports: [AppLinkDirective, RouterLink, TranslocoPipe, LogoComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.scss',
})
export class LandingHeaderComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;
  protected readonly TARGET = LANDING_SCROLL_TARGET;
  protected readonly signedIn = injectSignedIn();

  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthStore);
  private readonly settings = inject(UserSettingsStore);

  /** The icon shows the theme the switch leads to. */
  protected readonly dark = computed(() => this.theme.resolved() === THEME.Dark);

  /** The visitor asked for a section; the page loads the deferred sections and scrolls. */
  readonly sectionRequested = output<LandingScrollTarget>();

  protected onSection(event: MouseEvent, target: LandingScrollTarget): void {
    // Open-in-new-tab gestures keep the plain link: `/#works` then loads the page with the hash.
    if (!isPlainLeftClick(event)) {
      return;
    }
    // The target may not be rendered yet (deferred); the page scrolls once it is.
    event.preventDefault();
    this.sectionRequested.emit(target);
  }

  /** Light and Dark: a guest's choice stays in this browser, a signed-in one is saved on the account. */
  protected toggleTheme(): void {
    const theme = this.dark() ? THEME_PREFERENCE.Light : THEME_PREFERENCE.Dark;
    if (this.auth.isSignedIn()) {
      void this.settings.setAppearance({ theme });
    } else {
      this.theme.setPreference(theme);
    }
  }
}
