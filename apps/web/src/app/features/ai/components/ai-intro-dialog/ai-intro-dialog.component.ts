import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
import { ViewportService } from '../../../../core/layout/viewport.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { PRIVACY_AI_FRAGMENT } from '../../../privacy/models/privacy-ai-fragment.const';
import { AiSettingsStore } from '../../services/ai-settings.store';
import { AI_INTRO_POINTS } from './models/ai-intro-points.const';

/**
 * The first-run AI intro (AiIntro mockup): opens the first time the main switch of Settings › AI is
 * turned on. What AI does, what is sent, that nothing is used for training; "Turn on AI" is the
 * `PATCH enabled: true` (every feature on Suggest; the API marks the intro seen) and closes with
 * `true` once saved; "Not now", Esc and the scrim close with `false` and leave AI off. A failed save
 * keeps the dialog open with a notice. `ui-dialog` draws it as a bottom sheet on a phone.
 */
@Component({
  selector: 'app-ai-intro-dialog',
  imports: [TranslocoPipe, ButtonComponent, DialogComponent, IconComponent, NoticeComponent],
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
  protected readonly privacyHref = `/${APP_PATH.Privacy}#${PRIVACY_AI_FRAGMENT}`;

  private readonly ref = inject<UiDialogRef<boolean>>(UiDialogRef);
  private readonly store = inject(AiSettingsStore);
  /** Phone: the shorter title and full-width stacked buttons. */
  protected readonly phone = inject(ViewportService).phone;

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected notNow(): void {
    this.ref.close(false);
  }

  protected async turnOn(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const saved = await this.store.update({ enabled: true });
    this.saving.set(false);
    if (saved) {
      this.ref.close(true);
    } else {
      this.failed.set(true);
    }
  }
}
