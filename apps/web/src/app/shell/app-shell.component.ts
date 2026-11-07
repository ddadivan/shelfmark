import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, LogoComponent } from '@shelfmark/ui';
import { AuthStore } from '../core/auth/auth.store';
import { AUTH_ROUTE } from '../core/auth/models/auth-routes.const';

/** Layout around the signed-in pages: header with the user and sign-out, then the page. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, TranslocoPipe, AvatarComponent, ButtonComponent, LogoComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AppShellComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    await this.router.navigateByUrl(AUTH_ROUTE.SignIn);
  }
}
