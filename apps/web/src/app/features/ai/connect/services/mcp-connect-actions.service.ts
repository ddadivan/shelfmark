import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import type { McpTokenSummary } from '@shelfmark/contracts';
import { DIALOG_SIZE, DialogService, TOAST_KIND, ToastService } from '@shelfmark/ui';
import { CreateTokenDialogComponent } from '../components/create-token-dialog/create-token-dialog.component';
import { copyText } from '../../../../core/browser/copy-text';
import { McpTokensStore } from './mcp-tokens.store';

/**
 * The flows of Connect your assistant: open the create dialog, revoke a token after a confirmation
 * that names it, copy the server address. Results are told with a toast.
 */
@Service()
export class McpConnectActions {
  private readonly store = inject(McpTokensStore);
  private readonly dialogs = inject(DialogService);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private readonly doc = inject(DOCUMENT);

  async create(): Promise<void> {
    await this.dialogs.open(CreateTokenDialogComponent, { size: DIALOG_SIZE.Md }).result;
  }

  async revoke(token: McpTokenSummary): Promise<void> {
    const confirmed = await this.dialogs.confirm({
      title: this.t('ai.connect.revoke.title', { name: token.name }),
      message: this.t('ai.connect.revoke.message'),
      confirmLabel: this.t('ai.connect.revoke.confirm'),
      cancelLabel: this.t('ai.connect.revoke.cancel'),
      destructive: true,
    });
    if (!confirmed) return;
    if (await this.store.revoke(token.id)) {
      this.toasts.show({
        kind: TOAST_KIND.Success,
        title: this.t('ai.connect.revoke.done'),
        detail: token.name,
      });
    } else {
      this.toasts.show({ kind: TOAST_KIND.Danger, title: this.t('ai.connect.revoke.failed') });
    }
  }

  /** Copies the server address; `false` when the clipboard refused (the address stays selectable). */
  async copyAddress(url: string): Promise<boolean> {
    const copied = await copyText(this.doc, url);
    this.toasts.show(
      copied
        ? { kind: TOAST_KIND.Success, title: this.t('ai.connect.address.copied') }
        : { kind: TOAST_KIND.Danger, title: this.t('ai.connect.copyFailed') },
    );
    return copied;
  }

  private t(key: string, params?: Record<string, string>): string {
    return this.transloco.translate(key, params);
  }
}
