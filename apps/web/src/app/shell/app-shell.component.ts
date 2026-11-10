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
} from '@shelfmark/ui';
import { EXPORT_FORMAT, type ExportFormat } from '@shelfmark/contracts';
import { combineLatest, filter, map } from 'rxjs';
import { ExportActionsService } from '../features/export/export-actions.service';
import { AuthStore } from '../core/auth/auth.store';
import { LinkActionsService } from '../features/links/link-actions.service';
import { OnboardingStore } from '../features/onboarding/onboarding.store';
import { RatingStore } from '../features/rating/rating.store';
import { SearchDialogService } from '../features/search/search-dialog.service';
import { THEME_PREFERENCE } from '../core/theme/models/theme-preference.const';
import { ThemeService } from '../core/theme/theme.service';
import { isMacPlatform } from '../features/search/is-mac-platform';
import { ViewportService } from '../core/layout/viewport.service';
import { APP_PATH } from '../models/app-path.const';
import { DemoBannerComponent } from './demo-banner/demo-banner.component';
import { PHONE_TAB } from './models/phone-tab.const';
import { phoneTabForUrl } from './phone-tab-for-url';
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
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    SearchTriggerComponent,
    SidebarComponent,
    TabBarComponent,
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

  protected async exportAll(format: ExportFormat): Promise<void> {
    await this.exporter.download(format);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.toasts.handleShortcut(event)) {
      this.search.handleShortcut(event);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
