import { inject, Injector, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { UpdateAiSettingsRequest } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { LinksStore } from '../../../stores/links.store';
import { AiIntroDialogComponent } from '../components/ai-intro-dialog/ai-intro-dialog.component';
import { AiSettingsStore } from './ai-settings.store';

/**
 * The flows of Settings › AI: the main switch (the first time through the intro), saving a choice
 * with a toast when it fails, "Process existing links" and "Delete AI data" (confirm first; the
 * feed reloads so removed summaries disappear). The page only binds and calls.
 */
@Service()
export class AiSettingsActions {
  private readonly store = inject(AiSettingsStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly injector = inject(Injector);

  /**
   * Turns AI on or off. On while the intro was never seen opens the intro, whose "Turn on AI" saves;
   * resolves whether AI is on afterwards (the switch follows it).
   */
  async setEnabled(on: boolean): Promise<boolean> {
    if (on === this.store.isOn()) {
      return on;
    }
    if (on && !this.store.introSeen()) {
      await this.dialogs.open<AiIntroDialogComponent, boolean>(AiIntroDialogComponent, {
        size: DIALOG_SIZE.Md,
      }).result;
      return this.store.isOn();
    }
    await this.save({ enabled: on });
    return this.store.isOn();
  }

  /** Saves a choice at once; a failed request puts it back, says so and resolves false. */
  async save(change: UpdateAiSettingsRequest): Promise<boolean> {
    if (await this.store.update(change)) {
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.transloco.translate('ai.settings.failed'),
      detail: this.transloco.translate('ai.settings.failedDetail'),
    });
    return false;
  }

  /**
   * "Process existing links" (Settings › AI, the intro's next step, the search reminder); a refusal
   * says so and re-reads the settings. Resolves whether it started.
   */
  async startBackfill(): Promise<boolean> {
    if (await this.store.startBackfill()) {
      return true;
    }
    this.toasts.show({
      kind: TOAST_KIND.Danger,
      title: this.transloco.translate('ai.backfill.startFailed'),
    });
    void this.store.refresh();
    return false;
  }

  async stopBackfill(): Promise<void> {
    if (!(await this.store.stopBackfill())) {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('ai.backfill.stopFailed'),
      });
    }
  }

  /** Asks, then deletes every AI summary and suggestion; the user's edits stay. */
  async deleteData(): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.transloco.translate('ai.deleteData.confirm.title'),
      message: this.transloco.translate('ai.deleteData.confirm.message'),
      confirmLabel: this.transloco.translate('ai.deleteData.confirm.confirm'),
      cancelLabel: this.transloco.translate('ai.deleteData.confirm.cancel'),
      closeLabel: this.transloco.translate('ai.deleteData.confirm.close'),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    if (await this.store.deleteData()) {
      // Cached cards still carry the AI summaries: read the feed again.
      this.injector.get(LinksStore).refresh();
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.transloco.translate('ai.deleteData.done'),
      });
    } else {
      this.toasts.show({
        kind: TOAST_KIND.Danger,
        title: this.transloco.translate('ai.deleteData.failed'),
        detail: this.transloco.translate('ai.deleteData.failedDetail'),
      });
    }
  }
}
