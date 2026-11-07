import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, LogoComponent, NoticeComponent, NOTICE_KIND } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { AUTH_DEMO } from '../../core/auth/models/auth-pending.const';
import { AuthPending } from '../../core/auth/models/auth-pending.type';
import { AUTH_PROVIDER } from '../../core/auth/models/auth-provider.const';
import { AuthProvider } from '../../core/auth/models/auth-provider.type';
import { AUTH_ROUTE } from '../../core/auth/models/auth-routes.const';
import { safeReturnUrl } from '../../core/auth/safe-return-url';
import { SIGN_IN_REASON_KEY } from './models/sign-in-reason-key.const';

/** Sign in with Google or GitHub, or open the demo. Guest-only (`guestOnly` on the route). */
@Component({
  selector: 'app-sign-in-page',
  imports: [TranslocoPipe, ButtonComponent, LogoComponent, NoticeComponent],
  templateUrl: './sign-in.page.html',
  styleUrl: './sign-in.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class SignInPage {
  protected readonly AUTH_PROVIDER = AUTH_PROVIDER;
  protected readonly AUTH_DEMO = AUTH_DEMO;
  protected readonly NOTICE_KIND = NOTICE_KIND;

  protected readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  /** `?returnUrl=`, bound from the route; only used after `safeReturnUrl`. */
  readonly returnUrl = input<string>();
  /** `?reason=`, bound from the route; unknown values show nothing. */
  readonly reason = input<string>();

  protected readonly reasonKey = computed<string | null>(() => {
    const reason = this.reason();
    return reason !== undefined && Object.hasOwn(SIGN_IN_REASON_KEY, reason)
      ? SIGN_IN_REASON_KEY[reason as keyof typeof SIGN_IN_REASON_KEY]
      : null;
  });

  protected isLoading(action: AuthPending): boolean {
    return this.auth.pending() === action;
  }

  /** Another action is running, so this button waits. */
  protected isLocked(action: AuthPending): boolean {
    const pending = this.auth.pending();
    return pending !== null && pending !== action;
  }

  protected async signIn(provider: AuthProvider): Promise<void> {
    await this.auth.signIn(provider);
    await this.leave();
  }

  protected async signInDemo(): Promise<void> {
    await this.auth.signInDemo();
    await this.leave();
  }

  private async leave(): Promise<void> {
    if (this.auth.isSignedIn()) {
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()) ?? AUTH_ROUTE.Home);
    }
  }
}
