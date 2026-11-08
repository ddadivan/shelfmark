import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonComponent, BUTTON_SIZE, BUTTON_VARIANT } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { SIGN_IN_REASON } from '../../core/auth/models/sign-in-reason.const';
import { pluralKey } from '../../core/i18n/plural-key';
import { DEMO_BANNER_TICK_MS } from './models/demo-banner-tick.const';
import { MS_PER_HOUR } from './models/ms-per-hour.const';

/**
 * Strip above the app header while the user is in a demo (PROJECT.md 5.4): how long the sandbox
 * has left and a way out to a real account. When the time is up it signs out and shows the
 * sign-in screen with the "demo ended" notice.
 */
@Component({
  selector: 'app-demo-banner',
  imports: [TranslocoPipe, ButtonComponent],
  templateUrl: './demo-banner.component.html',
  styleUrl: './demo-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoBannerComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly auth = inject(AuthStore);
  private readonly now = signal(Date.now());
  private expiryHandled = false;

  protected readonly demoUser = computed(() => {
    const user = this.auth.user();
    return user?.isDemo ? user : null;
  });

  /** Whole hours left, rounded up, never below 1 while the demo runs; `null` when unknown. */
  protected readonly hoursLeft = computed<number | null>(() => {
    const expiresAt = this.demoUser()?.demoExpiresAt;
    if (!expiresAt) {
      return null;
    }
    const left = Date.parse(expiresAt) - this.now();
    return Math.max(1, Math.ceil(left / MS_PER_HOUR));
  });

  protected readonly remainingKey = computed(() => {
    const hours = this.hoursLeft();
    return hours === null ? null : pluralKey('shell.demoBanner.remaining', hours);
  });

  private readonly expired = computed(() => {
    const expiresAt = this.demoUser()?.demoExpiresAt;
    return !!expiresAt && Date.parse(expiresAt) <= this.now();
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), DEMO_BANNER_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect(() => {
      if (this.expired() && !this.expiryHandled) {
        this.expiryHandled = true;
        void this.auth.signOutAndLeave(SIGN_IN_REASON.DemoExpired);
      }
    });
  }

  protected async signInOwn(): Promise<void> {
    await this.auth.signOutAndLeave();
  }
}
