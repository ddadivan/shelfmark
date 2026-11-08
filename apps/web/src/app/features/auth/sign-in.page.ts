import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AUTH_PROVIDER, type AuthProvider } from '@shelfmark/contracts';
import { ButtonComponent, LogoComponent, NoticeComponent, NOTICE_KIND } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { AUTH_DEMO } from '../../core/auth/models/auth-pending.const';
import { AuthPending } from '../../core/auth/models/auth-pending.type';
import { AUTH_ROUTE } from '../../core/auth/models/auth-routes.const';
import { isSignInError } from '../../core/auth/is-sign-in-error';
import { isSignInReason } from '../../core/auth/is-sign-in-reason';
import { safeReturnUrl } from '../../core/auth/safe-return-url';
import { SIGN_IN_ERROR_GENERIC_KEY } from './models/sign-in-error-generic-key.const';
import { SIGN_IN_ERROR_KEY } from './models/sign-in-error-key.const';
import { DEMO_ERROR_REASON } from './models/demo-error-reason.const';
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
  private readonly destroyRef = inject(DestroyRef);
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => (this.destroyed = true));
  }

  /** `?returnUrl=`, bound from the route; only used after `safeReturnUrl`. */
  readonly returnUrl = input<string>();
  /** `?reason=`, bound from the route; unknown values show nothing. */
  readonly reason = input<string>();

  /** `?error=`, appended by Better Auth when the OAuth flow fails; unknown codes get a generic text. */
  readonly error = input<string>();

  protected readonly errorKey = computed<string | null>(() => {
    const error = this.error();
    if (!error) {
      return null;
    }
    return isSignInError(error) ? SIGN_IN_ERROR_KEY[error] : SIGN_IN_ERROR_GENERIC_KEY;
  });

  protected readonly reasonKey = computed<string | null>(() => {
    const reason = this.reason();
    return isSignInReason(reason) ? SIGN_IN_REASON_KEY[reason] : null;
  });

  /** Why the demo button failed, when the API said so (too many demos, sandbox full). */
  protected readonly demoErrorKey = computed<string | null>(() => {
    const error = this.auth.demoError();
    // After `/demo` failed the reason is in the URL already; one notice is enough.
    return error && this.reasonKey() === null ? SIGN_IN_REASON_KEY[DEMO_ERROR_REASON[error]] : null;
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
    await this.auth.signIn(provider, safeReturnUrl(this.returnUrl()));
    await this.leave();
  }

  protected async signInDemo(): Promise<void> {
    await this.auth.signInDemo();
    await this.leave();
  }

  private async leave(): Promise<void> {
    if (!this.destroyed && this.auth.isSignedIn()) {
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()) ?? AUTH_ROUTE.Home);
    }
  }
}
