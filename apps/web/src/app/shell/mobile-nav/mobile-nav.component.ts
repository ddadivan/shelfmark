import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  THEME,
  AvatarComponent,
  ButtonComponent,
  DrawerComponent,
  LogoComponent,
} from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { THEME_PREFERENCE } from '../../core/theme/models/theme-preference.const';
import { ThemeService } from '../../core/theme/theme.service';
import { RecentLinksSheetService } from '../../features/links/recent/recent-links-sheet.service';
import { APP_PATH } from '../../models/app-path.const';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MobileNavService } from './mobile-nav.service';

/**
 * Content of the phone drawer (docs/design/screens/MobileMenu): logo and close button, the
 * library sidebar with a "Recently opened" row, and a footer with the signed-in user, the theme
 * toggle and settings. `MobileNavService` opens it.
 */
@Component({
  selector: 'app-mobile-nav',
  imports: [
    AvatarComponent,
    ButtonComponent,
    DrawerComponent,
    LogoComponent,
    SidebarComponent,
    TranslocoPipe,
  ],
  templateUrl: './mobile-nav.component.html',
  styleUrl: './mobile-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileNavComponent {
  protected readonly auth = inject(AuthStore);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly nav = inject(MobileNavService);
  private readonly recent = inject(RecentLinksSheetService);

  /** The icon shows the theme the button switches to. */
  protected readonly themeIcon = computed(() =>
    this.theme.resolved() === THEME.Dark ? 'sun' : 'moon',
  );

  protected toggleTheme(): void {
    this.theme.setPreference(
      this.theme.resolved() === THEME.Dark ? THEME_PREFERENCE.Light : THEME_PREFERENCE.Dark,
    );
  }

  /** Slides the drawer out, then opens the recent links as a sheet (focus ends on the menu button). */
  protected async openRecent(): Promise<void> {
    await this.nav.close();
    this.recent.open();
  }

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }
}
