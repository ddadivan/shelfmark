import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AvatarComponent,
  BUTTON_SIZE,
  LogoComponent,
  TabBarComponent,
  type TabBarItem,
  type TabBarSelection,
  ButtonComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
  SearchTriggerComponent,
  ToastService,
  TooltipDirective,
} from '@shelfmark/ui';
import { combineLatest, filter, map } from 'rxjs';
import { AdminStore } from '../features/admin/services/admin.store';
import { FeedbackDialogService } from '../features/feedback/services/feedback-dialog.service';
import { AuthStore } from '../core/auth/auth.store';
import { LinkActionsService } from '../features/links/services/link-actions.service';
import { OnboardingStore } from '../features/onboarding/services/onboarding.store';
import { RatingStore } from '../features/rating/services/rating.store';
import { AiAnnouncementService } from '../features/ai/services/ai-announcement.service';
import { WhatsNewStore } from '../features/changelog/services/whats-new.store';
import { HeaderSearchComponent } from '../features/search/components/header-search/header-search.component';
import { SearchDialogService } from '../features/search/services/search-dialog.service';
import { ShortcutsDialogService } from '../features/shortcuts/services/shortcuts-dialog.service';
import { ViewportService } from '../core/layout/viewport.service';
import { APP_PATH } from '../models/app-path.const';
import { PinsStore } from '../stores/pins.store';
import { UserSettingsStore } from '../stores/user-settings.store';
import { ADMIN_PATH } from '../features/admin/models/admin-path.const';
import { HowItWorksService } from '../features/how-it-works/services/how-it-works.service';
import { ReminderNoticeService } from '../features/reminders/services/reminder-notice.service';
import { AiSettingsStore } from '../features/ai/services/ai-settings.store';
import { AskHeaderButtonComponent } from '../features/ai/components/ask-header-button/ask-header-button.component';
import { AiTickService } from '../features/ai/services/ai-tick.service';
import { DemoBannerComponent } from './demo-banner/demo-banner.component';
import { OfflineBannerComponent } from './offline-banner/offline-banner.component';
import { PHONE_TAB } from './models/phone-tab.const';
import { phoneTabForUrl } from './phone-tab-for-url';
import { isPushedUrl } from './pushed-url';
import { SettingsNavComponent } from '../features/settings/components/settings-nav/settings-nav.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ToastAreaDirective } from '../core/layout/toast-area.directive';
import { ScrollRestorationDirective } from '../core/layout/scroll-restoration.directive';

/**
 * Layout around the signed-in pages (Shelf, ADR 0061). Desktop: the 240px sidebar on the left (logo,
 * account avatar, Add link, navigation, Theme and the footer rows), the header (search field, Ask at
 * the far right) and the page on the right. Mobile shell (below 64em, Shelf `01-library.html`): a
 * top bar with the search field and the avatar (settings and the account menu behind it), the page,
 * and the floating tab bar (Today, Library, Add, Search, Ask, or Tags while Ask is off).
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    NgTemplateOutlet,
    LogoComponent,
    ToastAreaDirective,
    ScrollRestorationDirective,
    TranslocoPipe,
    AvatarComponent,
    DemoBannerComponent,
    OfflineBannerComponent,
    ButtonComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    HeaderSearchComponent,
    AskHeaderButtonComponent,
    SettingsNavComponent,
    SidebarComponent,
    TabBarComponent,
    SearchTriggerComponent,
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
  protected readonly search = inject(SearchDialogService);
  protected readonly shortcuts = inject(ShortcutsDialogService);
  protected readonly viewport = inject(ViewportService);
  private readonly transloco = inject(TranslocoService);
  private readonly toasts = inject(ToastService);

  private readonly router = inject(Router);
  protected readonly howItWorks = inject(HowItWorksService);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** The tab of the current page (the tab bar marks it with `aria-current`). */
  protected readonly activeTab = computed(() => phoneTabForUrl(this.url()));
  /** A pushed page with its own bottom bar (Tidy Unsorted): the mobile shell hides the tab bar. */
  protected readonly pushed = computed(() => isPushedUrl(this.url()));
  /** On the settings pages the settings nav takes the place of the sidebar (tablet and up). */
  protected readonly inSettings = computed(() => this.activeTab() === PHONE_TAB.You);
  /**
   * The top bar of the mobile shell (search and avatar): not on a pushed page (it has its own bar)
   * nor on the settings pages (their own header leads back).
   */
  protected readonly topBar = computed(
    () => this.viewport.compact() && !this.pushed() && !this.inSettings(),
  );
  private readonly tabLabels = toSignal(
    combineLatest([
      this.transloco.selectTranslate('shell.tabs.today'),
      this.transloco.selectTranslate('shell.tabs.library'),
      this.transloco.selectTranslate('shell.tabs.search'),
      this.transloco.selectTranslate('shell.tabs.tags'),
      this.transloco.selectTranslate('shell.tabs.ask'),
    ]),
    { initialValue: ['', '', '', '', ''] },
  );
  private readonly ai = inject(AiSettingsStore);
  protected readonly tabs = computed<TabBarItem[]>(() => {
    const [today, library, search, tags, ask] = this.tabLabels();
    return [
      { id: PHONE_TAB.Today, label: today, icon: 'history', href: `/${APP_PATH.Today}` },
      { id: PHONE_TAB.Library, label: library, icon: 'bookmark', href: `/${APP_PATH.Library}` },
      { id: PHONE_TAB.Search, label: search, icon: 'search' },
      // Ask takes the last place; while it is off the place is Tags, as before (#499).
      this.ai.askOn()
        ? { id: PHONE_TAB.Ask, label: ask, icon: 'spark', href: `/${APP_PATH.Ask}` }
        : { id: PHONE_TAB.Tags, label: tags, icon: 'tag', href: `/${APP_PATH.Tags}` },
    ];
  });
  /** The account button is the 32px avatar itself (Shelf sidebar head; `--ui-button-sm-padding: 0`). */
  protected readonly accountButtonSize = BUTTON_SIZE.Sm;

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

  /** The welcome dialog opens when it becomes due: the first sign-in (it shows once). */
  private readonly welcome = effect(() => {
    if (this.onboarding.due()) {
      untracked(() => {
        this.onboarding.openIfDue();
      });
    }
  });

  private readonly rating = inject(RatingStore);
  // Pins and "Folder colours" are needed by every page that draws a folder tile or a link menu.
  private readonly pins = inject(PinsStore);
  private readonly userSettings = inject(UserSettingsStore);

  constructor() {
    void this.pins.load();
    void this.userSettings.load();
    // The due reminders badge, and the note when some became due since the last visit (#275).
    void inject(ReminderNoticeService).check();
    // AI (#389): the switches the dialogs and cards follow, and the catch-up tick while jobs wait.
    void this.ai.load();
    inject(AiTickService);
    // The one-time AI announcement (#507) plans itself once the account's AI side is loaded.
    inject(AiAnnouncementService);
  }

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

  private readonly whatsNew = inject(WhatsNewStore);
  /**
   * "What's new" (#424): once the account told its last seen release, a new account is marked up to
   * date and an existing one sees the dialog once when a newer release has highlights.
   */
  private readonly whatsNewWatch = effect(() => {
    this.auth.user();
    this.userSettings.whatsNewKnown();
    this.userSettings.whatsNewSeen();
    untracked(() => this.whatsNew.watch());
  });

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

  protected async openUsageStats(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Admin}/${ADMIN_PATH.Stats}`);
  }

  /** "About Shelfmark": the landing page, with "Back to my shelf" and "What's new" (#270). */
  protected async openAbout(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.About}`);
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
