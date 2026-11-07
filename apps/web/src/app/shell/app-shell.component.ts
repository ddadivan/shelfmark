import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
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
import { RecentLinksPanelComponent } from '../features/links/recent/recent-links-panel.component';
import { UiStore } from '../stores/ui.store';
import { APP_PATH } from '../models/app-path.const';

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
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly ui = inject(UiStore);
  protected readonly actions = inject(LinkActionsService);
  private readonly router = inject(Router);

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }

  protected toggleRecent(): void {
    this.ui.setRecentVisible(!this.ui.recentVisible());
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
