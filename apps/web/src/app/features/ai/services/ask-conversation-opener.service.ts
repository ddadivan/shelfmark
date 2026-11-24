import { inject, Service, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TOAST_KIND, ToastService } from '@shelfmark/ui';
import { firstValueFrom } from 'rxjs';
import { ASK_HISTORY_API } from '../models/ask-history-api.const';
import { AskStore } from './ask.store';

/**
 * Opens a stored Ask conversation into the page's `AskStore` (scoped next to it): reads it from
 * `ASK_HISTORY_API` (links re-read live by the server); a later open wins over an earlier one; a
 * failure (deleted, foreign, offline) shows a toast and calls `onFail`.
 */
@Service({ autoProvided: false })
export class AskConversationOpener {
  private readonly api = inject(ASK_HISTORY_API);
  private readonly store = inject(AskStore);
  private readonly toasts = inject(ToastService);
  private readonly transloco = inject(TranslocoService);
  private generation = 0;
  private readonly loadingState = signal<string | null>(null);
  /** The id being read, `null` when nothing is. */
  readonly loading = this.loadingState.asReadonly();

  async open(id: string, onFail: () => unknown): Promise<void> {
    const mine = ++this.generation;
    this.loadingState.set(id);
    try {
      const conversation = await firstValueFrom(this.api.get(id));
      if (mine !== this.generation) return;
      this.store.open(conversation);
    } catch {
      if (mine !== this.generation) return;
      this.toasts.show({
        title: this.transloco.translate('ai.ask.history.openFailed'),
        kind: TOAST_KIND.Danger,
      });
      onFail();
    } finally {
      if (mine === this.generation) this.loadingState.set(null);
    }
  }
}
