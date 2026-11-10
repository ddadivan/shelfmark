import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AvatarComponent,
  BUTTON_SIZE,
  type IconName,
  SearchTriggerComponent,
  TabBarComponent,
  type TabBarItem,
  type TabBarSelection,
  THEME,
  ButtonComponent,
  ICON_SIZE,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  ToastService,
  TooltipDirective,
} from '@shelfmark/ui';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { combineLatest, filter, map } from 'rxjs';
import { AdminStore } from '../features/admin/admin.store';
import { FeedbackDialogService } from '../features/feedback/feedback-dialog.service';
import { ExportActionsService } from '../features/export/export-actions.service';
import { AuthStore } from '../core/auth/auth.store';
import { LinkActionsService } from '../features/links/link-actions.service';
import { OnboardingStore } from '../features/onboarding/onboarding.store';
import { RatingStore } from '../features/rating/rating.store';
import { SearchDialogService } from '../features/search/search-dialog.service';
import { ShortcutsDialogService } from '../features/shortcuts/shortcuts-dialog.service';
import { THEME_PREFERENCE } from '../core/theme/models/theme-preference.const';
import { ThemeService } from '../core/theme/theme.service';
import { isMacPlatform } from '../features/search/is-mac-platform';
import { ViewportService } from '../core/layout/viewport.service';
import { APP_PATH } from '../models/app-path.const';
import { ADMIN_PATH } from '../features/admin/models/admin-path.const';
import { DemoBannerComponent } from './demo-banner/demo-banner.component';
import { OfflineBannerComponent } from './offline-banner/offline-banner.component';
import { PHONE_TAB } from './models/phone-tab.const';
import { phoneTabForUrl } from './phone-tab-for-url';
import { SettingsNavComponent } from '../features/settings/settings-nav/settings-nav.component';
import { SidebarComponent } from './sidebar/sidebar.component';

/**
 * Layout around the signed-in pages. Desktop and tablet: the sidebar card on the left, the top bar
 * (search pill, theme, "Add link", account menu) and the page on the right. Phone: the page alone
 * under the floating tab bar (Library, Search, Add, Tags, You); each page carries its own title.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    TranslocoPipe,
    AvatarComponent,
    DemoBannerComponent,
    OfflineBannerComponent,
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    SearchTriggerComponent,
    SettingsNavComponent,
    SidebarComponent,
    TabBarComponent,
    TooltipDirective,
  ],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly exporter = inject(ExportActionsService);
  protected readonly EXPORT_FORMAT = EXPORT_FORMAT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly search = inject(SearchDialogService);
  protected readonly shortcuts = inject(ShortcutsDialogService);
  protected readonly viewport = inject(ViewportService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** The tab of the current page (the tab bar marks it with `aria-current`). */
  protected readonly activeTab = computed(() => phoneTabForUrl(this.url()));
  /** On the settings pages the settings nav takes the place of the sidebar (tablet and up). */
  protected readonly inSettings = computed(() => this.activeTab() === PHONE_TAB.You);
  private readonly tabLabels = toSignal(
    combineLatest([
      this.transloco.selectTranslate('shell.tabs.library'),
      this.transloco.selectTranslate('shell.tabs.search'),
      this.transloco.selectTranslate('shell.tabs.tags'),
      this.transloco.selectTranslate('shell.tabs.you'),
    ]),
    { initialValue: ['', '', '', ''] },
  );
  protected readonly tabs = computed<TabBarItem[]>(() => {
    const [library, search, tags, you] = this.tabLabels();
    return [
      { id: PHONE_TAB.Library, label: library, icon: 'bookmark', href: `/${APP_PATH.Library}` },
      { id: PHONE_TAB.Search, label: search, icon: 'search' },
      { id: PHONE_TAB.Tags, label: tags, icon: 'tag', href: `/${APP_PATH.Tags}` },
      { id: PHONE_TAB.You, label: you, icon: 'user', href: `/${APP_PATH.Settings}` },
    ];
  });
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

  protected readonly onboarding = inject(OnboardingStore);
  protected readonly feedback = inject(FeedbackDialogService);
  protected readonly admin = inject(AdminStore);

  /** Asks once per session whether this is the author (the "Feedback inbox" entry); never for a demo user. */
  private readonly adminCheck = effect(() => {
    const user = this.auth.user();
    untracked(() => {
      if (user !== null && !user.isDemo) {
        void this.admin.check();
      }
    });
  });

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

  /** A tab was chosen: the pages route (the links are real `href`s), Search opens over the page. */
  protected async selectTab({ id, event }: TabBarSelection): Promise<void> {
    if (id === PHONE_TAB.Search) {
      this.search.open();
      return;
    }
    event.preventDefault();
    const href = this.tabs().find((tab) => tab.id === id)?.href;
    if (href) {
      await this.router.navigateByUrl(href);
    }
  }

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }

  protected async openFeedbackInbox(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Admin}/${ADMIN_PATH.Feedback}`);
  }

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.toasts.handleShortcut(event) && !this.search.handleShortcut(event)) {
      this.shortcuts.handleShortcut(event);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
