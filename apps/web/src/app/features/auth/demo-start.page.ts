import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { LogoComponent, SpinnerComponent } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { AUTH_ROUTE } from '../../core/auth/models/auth-routes.const';
import { SIGN_IN_QUERY } from '../../core/auth/models/sign-in-query.const';
import { SIGN_IN_REASON } from '../../core/auth/models/sign-in-reason.const';
import { DEMO_ERROR_REASON } from './models/demo-error-reason.const';

/**
 * `/demo`: opens a demo sandbox and goes to the library. Signed in already: straight to the
 * library. When the demo cannot start, goes to the sign-in screen with the reason.
 */
@Component({
  selector: 'app-demo-start-page',
  imports: [TranslocoPipe, LogoComponent, SpinnerComponent],
  templateUrl: './demo-start.page.html',
  styleUrl: './demo-start.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class DemoStartPage implements OnInit {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    await this.auth.ensureLoaded();
    if (!this.auth.isSignedIn()) {
      await this.auth.signInDemo();
    }
    if (this.auth.isSignedIn()) {
      await this.router.navigateByUrl(AUTH_ROUTE.Links, { replaceUrl: true });
      return;
    }
    const error = this.auth.demoError();
    const reason = error ? DEMO_ERROR_REASON[error] : SIGN_IN_REASON.DemoFailed;
    await this.router.navigate([AUTH_ROUTE.SignIn], {
      queryParams: { [SIGN_IN_QUERY.Reason]: reason },
      replaceUrl: true,
    });
  }
}
