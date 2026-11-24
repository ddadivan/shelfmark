import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AI_BACKFILL_STATE } from '@shelfmark/contracts';
import {
  BUTTON_VARIANT,
  ButtonComponent,
  DialogComponent,
  IllustrationComponent,
  MeterComponent,
  UiDialogRef,
} from '@shelfmark/ui';
import { activeLang } from '../../../../core/i18n/active-lang';
import { LocaleService } from '../../../../core/i18n/locale.service';
import { APP_PATH } from '../../../../models/app-path.const';
import { AiSettingsActions } from '../../services/ai-settings-actions.service';
import { AiSettingsStore } from '../../services/ai-settings.store';

/**
 * "Sorting older links" (Shelf 15-tools): the AI pass over links saved before AI was on, as a
 * dialog. While it runs: how many of the run are done, a meter, the allowance it takes and Pause
 * (stops the run) or Close (it keeps going; `AiTickService` drives it). Once the run ended with
 * links done: "Older links are sorted" with Open Tidy up. The design's "filed into folders" and
 * "tags suggested" counts are not shown: the backfill status has only done and total.
 */
@Component({
  selector: 'app-backfill-dialog',
  imports: [TranslocoPipe, ButtonComponent, DialogComponent, IllustrationComponent, MeterComponent],
  templateUrl: './backfill-dialog.component.html',
  styleUrl: './backfill-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackfillDialogComponent {
  private readonly store = inject(AiSettingsStore);
  private readonly actions = inject(AiSettingsActions);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);
  private readonly ref = inject(UiDialogRef);

  protected readonly BUTTON_VARIANT = BUTTON_VARIANT;

  protected readonly running = computed(
    () => this.store.backfill()?.state === AI_BACKFILL_STATE.Running,
  );
  protected readonly view = computed(() => {
    activeLang();
    const status = this.store.backfill();
    const usage = this.store.usage();
    const done = status?.done ?? 0;
    const total = status?.total ?? 0;
    return {
      done: this.locale.formatNumber(done),
      total: this.locale.formatNumber(total),
      percent: total > 0 ? (done / total) * 100 : 0,
      used: this.locale.formatNumber(usage?.backfillUsed ?? 0),
      limit: this.locale.formatNumber(usage?.backfillLimit ?? 0),
    };
  });

  /** Stops the run; the progress row of Settings › AI offers to start it again. */
  protected pause(): void {
    void this.actions.stopBackfill();
    this.ref.close();
  }

  protected close(): void {
    this.ref.close();
  }

  protected openTidy(): void {
    this.ref.close();
    void this.router.navigateByUrl(`/${APP_PATH.Tidy}`);
  }
}
