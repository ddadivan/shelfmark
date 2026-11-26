import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { THEME_PREFERENCE } from '@shelfmark/contracts';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  SearchTriggerComponent,
  THEME,
} from '@shelfmark/ui';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ThemeService } from '../../../../core/theme/theme.service';
import { UserSettingsStore } from '../../../../stores/user-settings.store';
import { AppLinkDirective } from '../../../landing/directives/app-link.directive';
import { LANDING_LINKS } from '../../../landing/models/landing-links.const';
import { matchesSearchShortcut } from '../../../search/utils/matches-search-shortcut';

/**
 * The top bar of the Help main area (like the app's header, Shelf 17-help): the menu button below
 * 64em, the search pill (Ctrl / Cmd K), the theme switch and the way back, "Back to my shelf" when signed in
 * and "Sign in" for a guest. The search pill and the shortcut only ask the page to open search.
 */
@Component({
  selector: 'app-help-header',
  imports: [AppLinkDirective, ButtonComponent, SearchTriggerComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './help-header.component.html',
  styleUrl: './help-header.component.scss',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class HelpHeaderComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly LANDING_LINKS = LANDING_LINKS;

  private readonly auth = inject(AuthStore);
  private readonly theme = inject(ThemeService);
  private readonly settings = inject(UserSettingsStore);

  protected readonly signedIn = computed(() => this.auth.user() !== null);
  /** The icon shows the theme the switch leads to. */
  protected readonly dark = computed(() => this.theme.resolved() === THEME.Dark);

  /** Below 64em the sidebar is a drawer: the bar starts with its menu button. */
  readonly compact = input(false);
  /** The menu button below 64em. */
  readonly menuRequested = output<void>();
  /** The visitor asked to search: the search pill, or Ctrl / Cmd K. */
  readonly searchRequested = output<void>();

  protected onKeydown(event: KeyboardEvent): void {
    if (matchesSearchShortcut(event)) {
      event.preventDefault();
      this.searchRequested.emit();
    }
  }

  /** A guest's choice stays in this browser, a signed-in one is saved on the account. */
  protected toggleTheme(): void {
    const theme = this.dark() ? THEME_PREFERENCE.Light : THEME_PREFERENCE.Dark;
    if (this.auth.isSignedIn()) {
      void this.settings.setAppearance({ theme });
    } else {
      this.theme.setPreference(theme);
    }
  }
}
