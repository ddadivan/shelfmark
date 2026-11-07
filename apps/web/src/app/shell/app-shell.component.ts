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
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
