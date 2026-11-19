import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  ICON_SIZE,
  IconComponent,
  NOTICE_KIND,
  NoticeComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { pluralKey } from '../../../../core/i18n/plural-key';
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { PRIVACY_AI_FRAGMENT } from '../../../privacy/models/privacy-ai-fragment.const';
import { AI_BACKFILL_FRAGMENT } from '../../../settings/models/ai-backfill-fragment.const';
import { SETTINGS_PATH } from '../../../settings/models/settings-path.const';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AI_BACKFILL_OFFER_POINTS } from './models/ai-backfill-offer-points.const';
import { AI_INTRO_POINTS } from './models/ai-intro-points.const';

/**
 * The first-run AI intro (AiIntro mockup): opens the first time the main switch of Settings › AI is
 * turned on. What AI does, what is sent, that nothing is used for training; "Turn on AI" is the
 * `PATCH enabled: true` (every feature on Suggest; the API marks the intro seen) and closes with
 * `true` once saved; "Not now", Esc and the scrim close with `false` and leave AI off. A failed save
 * keeps the dialog open with a notice. `ui-dialog` draws it as a bottom sheet on a phone.
 *
 * When the account has links saved before AI was on (`backfillOffer`: eligible, within the
 * allowance, no run going or done), turning on does not close yet: the same dialog shows the next
 * step, "Process your N saved links?" (AiIntro state 3). "Process N links" starts the backfill (the
 * call of Settings › AI) and closes; "Later", ×, Esc and the scrim close; the note links to the
 * backfill row of Settings › AI. Every close of this step resolves `true` (AI is on).
 */
@Component({
  selector: 'app-ai-intro-dialog',
  imports: [
    TranslocoPipe,
    RouterLink,
    ButtonComponent,
    DialogComponent,
    IconComponent,
    NoticeComponent,
  ],
  templateUrl: './ai-intro-dialog.component.html',
  styleUrl: './ai-intro-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiIntroDialogComponent {
  protected readonly BUTTON_SIZE = BUTTON_SIZE;
  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;
  protected readonly ICON_SIZE = ICON_SIZE;
  protected readonly NOTICE_KIND = NOTICE_KIND;
  protected readonly POINTS = AI_INTRO_POINTS;
  protected readonly OFFER_POINTS = AI_BACKFILL_OFFER_POINTS;
  protected readonly pluralKey = pluralKey;
  protected readonly settingsHref = `/${APP_PATH.Settings}/${SETTINGS_PATH.Ai}`;
  protected readonly AI_BACKFILL_FRAGMENT = AI_BACKFILL_FRAGMENT;
  protected readonly privacyHref = `/${APP_PATH.Privacy}#${PRIVACY_AI_FRAGMENT}`;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly locale = inject(LocaleService);
  private readonly injector = inject(Injector);
  private readonly offerHeading = viewChild<ElementRef<HTMLElement>>('offerHeading');
  /** Phone: the shorter title and full-width stacked buttons. */
  protected readonly phone = inject(ViewportService).phone;

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  /** The next step's link count, taken when AI was turned on; 0 while on the first step. */
  protected readonly offer = signal(0);
  protected readonly starting = signal(false);
  /** The separate one-time allowance ("5,000 links"), from the account's usage. */
  protected readonly allowance = computed(() =>
    this.locale.formatNumber(this.store.usage()?.backfillLimit ?? 0),
  );

  /** "Not now" and × on the first step (AI stays off); "Later", × and the note's link on the next. */
  protected notNow(): void {
    this.ref.close(this.offer() > 0);
  }

  /** "Process N links": the backfill of Settings › AI; a refusal keeps the step open (with a toast). */
  protected async process(): Promise<void> {
    if (this.starting()) {
      return;
    }
    this.starting.set(true);
    const started = await this.actions.startBackfill();
    this.starting.set(false);
    if (started) {
      this.ref.close(true);
    }
  }

  protected async turnOn(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const saved = await this.store.update({ enabled: true });
    this.saving.set(false);
    const offer = saved ? this.store.backfillOffer() : 0;
    if (offer > 0) {
      this.offer.set(offer);
      // The pressed button is gone: focus the new step's heading, so it is read out.
      afterNextRender(() => this.offerHeading()?.nativeElement.focus(), {
        injector: this.injector,
      });
    } else if (saved) {
      this.ref.close(true);
    } else {
      this.failed.set(true);
    }
  }
}
