import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { AskConversationSummary } from '@shelfmark/contracts';
import { DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { AskHistoryStore } from './ask-history.store';

/**
 * Delete conversation and Clear all of the Ask history (a destructive confirmation each, a short
 * toast after it worked; a failure keeps the list and the default error toast says why).
 */
@Service()
export class AskHistoryActions {
  private readonly store = inject(AskHistoryStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);

  /** Asks, then deletes one conversation; answers whether it was deleted. */
  async remove(item: AskConversationSummary): Promise<boolean> {
    const t = (key: string, params?: Record<string, string>): string =>
      this.transloco.translate(key, params);
    const sure = await this.dialogs.confirm({
      title: t('ai.ask.history.deleteTitle'),
      message: t('ai.ask.history.deleteMessage', { title: item.title }),
      confirmLabel: t('ai.ask.history.deleteConfirm'),
      cancelLabel: t('ai.ask.history.cancel'),
      destructive: true,
    });
    if (!sure || !(await this.store.remove(item.id))) return false;
    this.toasts.show({ title: t('ai.ask.history.deleted'), kind: TOAST_KIND.Success });
    return true;
  }

  /** Asks, then deletes every conversation; answers whether they were deleted. */
  async clear(
    titleKey = 'ai.ask.history.clearTitle',
    messageKey = 'ai.ask.history.clearMessage',
  ): Promise<boolean> {
    const t = (key: string): string => this.transloco.translate(key);
    const sure = await this.dialogs.confirm({
      title: t(titleKey),
      message: t(messageKey),
      confirmLabel: t('ai.ask.history.clearConfirm'),
      cancelLabel: t('ai.ask.history.cancel'),
      destructive: true,
    });
    if (!sure || !(await this.store.clear())) return false;
    this.toasts.show({ title: t('ai.ask.history.cleared'), kind: TOAST_KIND.Success });
    return true;
  }
}
