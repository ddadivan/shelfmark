import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BUTTON_VARIANT, ButtonComponent, EmptyStateComponent } from '@shelfmark/ui';
import { AuthStore } from '../../core/auth/auth.store';
import { APP_PATH } from '../../models/app-path.const';

/**
 * Any address the app does not know (Shelf 06-public "Not found"): the page-not-found scene, one
 * line on what happened and the way back, to the links when signed in, else to the landing.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [ButtonComponent, EmptyStateComponent, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
})
export default class NotFoundPage {
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly signedIn = inject(AuthStore).isSignedIn;
  protected readonly home = computed(() => (this.signedIn() ? `/${APP_PATH.Links}` : '/'));
}
