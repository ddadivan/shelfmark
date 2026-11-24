import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  IllustrationComponent,
  LogoComponent,
  type IllustrationName,
} from '@shelfmark/ui';
import { POPUP_ERROR } from '../../models/popup-error.const';
import { POPUP_STEP } from '../../models/popup-step.const';
import { POPUP_VIEW } from '../../models/popup-view.const';
import { PopupStore } from '../../popup.store';

/** States 7 and 8: a page that cannot be saved, or a failed load or save, with an illustration. */
@Component({
  selector: 'ext-popup-message',
  templateUrl: './popup-message.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ext-screen ext-screen--flow' },
  imports: [ButtonComponent, IllustrationComponent, LogoComponent, TranslocoPipe],
})
export class PopupMessageComponent {
  protected readonly store = inject(PopupStore);
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  /** Captured once: only the first screen after opening opens its second button up. */
  protected readonly animateSlot = this.store.animateFoot();

  constructor() {
    afterNextRender(() => this.store.animateFoot.set(false));
  }

  protected readonly unsupported = computed(() => this.store.view() === POPUP_VIEW.Unsupported);
  protected readonly illustration = computed<IllustrationName>(() => {
    const failure = this.store.failure();
    if (this.unsupported() || failure === null) return 'page-not-found';
    return failure.error === POPUP_ERROR.Offline ? 'offline' : 'not-found';
  });
  protected readonly titleKey = computed(() => {
    if (this.unsupported()) return 'popup.unsupported.title';
    return this.store.failure()?.step === POPUP_STEP.Load
      ? 'popup.error.loadTitle'
      : 'popup.error.title';
  });
  protected readonly textKey = computed(() => {
    const failure = this.store.failure();
    return this.unsupported() || failure === null
      ? 'popup.unsupported.text'
      : `popup.error.${failure.error}`;
  });
  /** Try again only when it can help; otherwise the way out is the app. */
  protected readonly canRetry = computed(
    () => !this.unsupported() && this.store.failure()?.retryable === true,
  );
}
