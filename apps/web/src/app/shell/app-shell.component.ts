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
  ButtonComponent,
  LogoComponent,
  MenuComponent,
  MenuItemComponent,
  MenuSeparatorComponent,
  MenuTriggerDirective,
} from '@shelfmark/ui';
import { AuthStore } from '../core/auth/auth.store';
import { LinkActionsService } from '../features/links/link-actions.service';
import { OnboardingStore } from '../features/onboarding/onboarding.store';
import { SearchDialogService } from '../features/search/search-dialog.service';
import { RecentLinksPanelComponent } from '../features/links/recent/recent-links-panel.component';
import { UiStore } from '../stores/ui.store';
import { APP_PATH } from '../models/app-path.const';
import { SidebarComponent } from './sidebar/sidebar.component';

/** Layout around the signed-in pages: header with the account menu (settings, sign out), then the page. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    TranslocoPipe,
    AvatarComponent,
    ButtonComponent,
    LogoComponent,
    MenuComponent,
    MenuItemComponent,
    MenuSeparatorComponent,
    MenuTriggerDirective,
    RecentLinksPanelComponent,
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
  protected readonly search = inject(SearchDialogService);
  private readonly transloco = inject(TranslocoService);

  private readonly recentLabels = toSignal(
    combineLatest([
      this.transloco.selectTranslate('links.recent.hide'),
      this.transloco.selectTranslate('links.recent.show'),
    ]).pipe(map(([hide, show]) => ({ hide, show }))),
  );
  /** Name of the recent-panel toggle; `null` until the translations are loaded (an icon-only button needs one). */
  protected readonly recentToggleLabel = computed(() => {
    const labels = this.recentLabels();
    return labels ? (this.ui.recentVisible() ? labels.hide : labels.show) : null;
  });
  private readonly router = inject(Router);
  private readonly onboarding = inject(OnboardingStore);

  /** The welcome dialog opens whenever it becomes due: first sign-in, or "Show welcome again". */
  private readonly welcome = effect(() => {
    if (this.onboarding.due()) {
      untracked(() => {
        this.onboarding.openIfDue();
      });
    }
  });

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.search.handleShortcut(event);
  }

  protected toggleRecent(): void {
    this.ui.setRecentVisible(!this.ui.recentVisible());
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
