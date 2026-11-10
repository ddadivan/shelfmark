import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { combineLatest, map } from 'rxjs';
import {
  AvatarComponent,
  BUTTON_SIZE,
  type IconName,
  SearchTriggerComponent,
  THEME,
  ButtonComponent,
  ICON_SIZE,
  LogoComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  ToastService,
} from '@shelfmark/ui';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { ExportActionsService } from '../features/export/export-actions.service';
import { AuthStore } from '../core/auth/auth.store';
import { LinkActionsService } from '../features/links/link-actions.service';
import { OnboardingStore } from '../features/onboarding/onboarding.store';
import { RatingStore } from '../features/rating/rating.store';
import { SearchDialogService } from '../features/search/search-dialog.service';
import { RecentLinksDrawerService } from '../features/links/recent/recent-links-drawer.service';
import { RecentLinksPanelComponent } from '../features/links/recent/recent-links-panel.component';
import { THEME_PREFERENCE } from '../core/theme/models/theme-preference.const';
import { ThemeService } from '../core/theme/theme.service';
import { isMacPlatform } from '../features/search/is-mac-platform';
import { ViewportService } from '../core/layout/viewport.service';
import { UiStore } from '../stores/ui.store';
import { APP_PATH } from '../models/app-path.const';
import { DemoBannerComponent } from './demo-banner/demo-banner.component';
import { MobileNavService } from './mobile-nav/mobile-nav.service';
import { SidebarComponent } from './sidebar/sidebar.component';

/**
 * Layout around the signed-in pages. Desktop and tablet: the sidebar card on the left, the top bar
 * (search pill, theme, "Add link", account menu) and the page on the right. Phone: the header
 * with the menu button and the drawer.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    TranslocoPipe,
    AvatarComponent,
    DemoBannerComponent,
    ButtonComponent,
    LogoComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    RecentLinksPanelComponent,
    SearchTriggerComponent,
    SidebarComponent,
  ],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly ui = inject(UiStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly exporter = inject(ExportActionsService);
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly search = inject(SearchDialogService);
  protected readonly viewport = inject(ViewportService);
  protected readonly nav = inject(MobileNavService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);
  private readonly recentDrawer = inject(RecentLinksDrawerService);

  private readonly recentLabels = toSignal(
    combineLatest([
      this.transloco.selectTranslate('links.recent.hide'),
      this.transloco.selectTranslate('links.recent.show'),
    ]).pipe(map(([hide, show]) => ({ hide, show }))),
  );
  /** Name of the recent-panel toggle; `null` until the translations are loaded (an icon-only button needs one). */
  protected readonly recentToggleLabel = computed(() => {
    const labels = this.recentLabels();
    return labels ? (this.recentOpen() ? labels.hide : labels.show) : null;
  });
  /** The recent links are on screen: the inline column (desktop) or the side panel (tablet). */
  protected readonly recentOpen = computed(() =>
    this.viewport.desktop() ? this.ui.recentVisible() : this.recentDrawer.isOpen(),
  );
  private readonly router = inject(Router);
  /** The avatar button is 44px: the 32px avatar is never clipped and it is a touch target. */
  protected readonly accountButtonSize = BUTTON_SIZE.Lg;
  protected readonly THEME = THEME;
  protected readonly theme = inject(ThemeService);
  /** The icon shows what a press switches to. */
  protected readonly themeIcon = computed<IconName>(() =>
    this.theme.resolved() === THEME.Dark ? 'sun' : 'moon',
  );
  /** Shortcut caps of the search pill (the key is Cmd on Apple devices, else Ctrl). */
  protected readonly searchShortcut = isMacPlatform() ? '⌘K' : 'Ctrl K';

  constructor() {
    // Growing past the phone breakpoint shows the sidebar inline: the drawer has to go.
    effect(() => {
      if (!this.viewport.phone()) {
        void this.nav.close();
      }
    });
    // Growing to the desktop shows the inline column, and the phone has its own sheet: the
    // tablet side panel has to go.
    effect(() => {
      if (this.viewport.desktop() || this.viewport.phone()) {
        void this.recentDrawer.close();
      }
    });
  }

  private readonly onboarding = inject(OnboardingStore);

  /** The welcome dialog opens whenever it becomes due: first sign-in, or "Show welcome again". */
  private readonly welcome = effect(() => {
    if (this.onboarding.due()) {
      untracked(() => {
        this.onboarding.openIfDue();
      });
    }
  });

  private readonly rating = inject(RatingStore);

  /** The rating look starts for an eligible user (not demo, onboarding done) and stops otherwise. */
  private readonly ratingWatch = effect(() => {
    const eligible = this.rating.eligible();
    // Read so that a switch to another user (eligible stays true) runs the effect again.
    const userId = this.auth.user()?.id;
    untracked(() => {
      if (eligible && userId !== undefined) {
        this.rating.watch();
      } else {
        this.rating.stop();
      }
    });
  });

  protected toggleTheme(): void {
    this.theme.setPreference(
      this.theme.resolved() === THEME.Dark ? THEME_PREFERENCE.Light : THEME_PREFERENCE.Dark,
    );
  }

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.toasts.handleShortcut(event)) {
      this.search.handleShortcut(event);
    }
  }

  protected toggleRecent(): void {
    if (this.viewport.desktop()) {
      this.ui.setRecentVisible(!this.ui.recentVisible());
    } else if (this.recentDrawer.isOpen()) {
      void this.recentDrawer.close();
    } else {
      this.recentDrawer.open();
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
