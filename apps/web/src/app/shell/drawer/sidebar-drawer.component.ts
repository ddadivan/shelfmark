import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AvatarComponent, ButtonComponent, LogoComponent } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { APP_PATH } from '../../models/app-path.const';
import { SidebarComponent } from '../sidebar/sidebar.component';

/**
 * Content of the phone drawer: logo and close button, the library sidebar, and the signed-in
 * user with a link to settings. `SidebarDrawerService` opens it and animates it out.
 */
@Component({
  selector: 'app-sidebar-drawer',
  imports: [AvatarComponent, ButtonComponent, LogoComponent, SidebarComponent, TranslocoPipe],
  host: {
    '[class.drawer--leaving]': 'leaving()',
    '(animationend)': 'onAnimationEnd($event)',
  },
  templateUrl: './sidebar-drawer.component.html',
  styleUrl: './sidebar-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarDrawerComponent {
  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** The close button was used. */
  readonly closeRequested = output<void>();
  /** The service sets it when the drawer starts to leave. */
  readonly leaving = signal(false);
  /** The leave animation of the panel ended. */
  readonly left = output<void>();

  protected async openSettings(): Promise<void> {
    await this.router.navigateByUrl(`/${APP_PATH.Settings}`);
  }

  protected onAnimationEnd(event: AnimationEvent): void {
    if (this.leaving() && event.target === event.currentTarget) {
      this.left.emit();
    }
  }
}
