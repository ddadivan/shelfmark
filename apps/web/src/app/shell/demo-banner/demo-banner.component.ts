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
import {
  ButtonComponent,
  BUTTON_SIZE,
  BUTTON_VARIANT,
  NoticeComponent,
  NOTICE_KIND,
} from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { MS_PER_HOUR } from '../../core/models/ms-per-hour.const';
import { pluralKey } from '../../core/i18n/plural-key';
import { DEMO_BANNER_TICK_MS } from './models/demo-banner-tick.const';

/**
 * Strip above the app header while the user is in a demo (PROJECT.md 5.4): how long the sandbox
 * has left and a way out to a real account. When the time is up it signs out and shows the
 * sign-in screen with the "demo ended" notice.
 */
@Component({
  selector: 'app-demo-banner',
  imports: [TranslocoPipe, ButtonComponent, NoticeComponent],
  templateUrl: './demo-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoBannerComponent {
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  private readonly auth = inject(AuthStore);
  private readonly now = signal(Date.now());
  private expiryHandled = false;

  protected readonly demoUser = computed(() => {
    const user = this.auth.user();
    return user?.isDemo ? user : null;
  });

  /** Milliseconds until the sandbox ends; `null` when there is no expiry to show. */
  private readonly msLeft = computed<number | null>(() => {
    const expiresAt = this.demoUser()?.demoExpiresAt;
    return expiresAt ? Date.parse(expiresAt) - this.now() : null;
  });

  /** Whole hours left, rounded up, never below 1 while the demo runs; `null` when unknown. */
  protected readonly hoursLeft = computed<number | null>(() => {
    const left = this.msLeft();
    return left === null ? null : Math.max(1, Math.ceil(left / MS_PER_HOUR));
  });

  protected readonly remainingKey = computed(() => {
    const hours = this.hoursLeft();
    return hours === null ? null : pluralKey('shell.demoBanner.remaining', hours);
  });

  /** The sign-out from the button is running; the button waits. */
  protected readonly leaving = signal(false);

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), DEMO_BANNER_TICK_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    effect(() => {
      const left = this.msLeft();
      if (left !== null && left <= 0 && !this.expiryHandled) {
        this.expiryHandled = true;
        void this.auth.expireDemo();
      }
    });
  }

  protected async signInOwn(): Promise<void> {
    if (this.leaving()) {
      return;
    }
    this.leaving.set(true);
    try {
      await this.auth.signOutAndLeave();
    } finally {
      this.leaving.set(false);
    }
  }
}
