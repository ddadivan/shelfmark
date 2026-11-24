import { inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DialogService } from '@shelfmark/ui';
import type { AskLeaveState } from '../models/ask-leave-state.interface';

/**
 * The Ask leave guard (author decision, Nov 24, 2026): before an exit would lose conversation
 * content the server has not stored (an answer still streams, a finished turn was not persisted
 * because the write failed or "Keep Ask history" is off), "Leave this conversation?" asks with the
 * reason, Stay (focused; Esc and the scrim answer Stay too) and Leave. Nothing is asked while
 * everything is stored or the chat is empty. Exits: route navigation (`askLeaveGuard`), closing
 * the drawer, New conversation, opening another conversation, Back on the phone page; tab close and
 * reload use the browser's own prompt (`listenBeforeUnload`).
 */
@Service()
export class AskLeaveGuard {
  private readonly dialogs = inject(DialogService);
  private readonly transloco = inject(TranslocoService);
  private asking: Promise<boolean> | null = null;

  /** Answers whether the exit may go on (always `true` when nothing would be lost). */
  canLeave(chat: AskLeaveState): Promise<boolean> {
    if (!chat.unsaved()) {
      return Promise.resolve(true);
    }
    // One question at a time: a second exit while it is open waits for the same answer.
    this.asking ??= this.ask(chat.streaming()).finally(() => {
      this.asking = null;
    });
    return this.asking;
  }

  private ask(streaming: boolean): Promise<boolean> {
    const t = (key: string): string => this.transloco.translate(key);
    return this.dialogs.confirm({
      title: t('ai.ask.leave.title'),
      message: t(streaming ? 'ai.ask.leave.streaming' : 'ai.ask.leave.unsaved'),
      confirmLabel: t('ai.ask.leave.leave'),
      cancelLabel: t('ai.ask.leave.stay'),
      focusCancel: true,
    });
  }
}
