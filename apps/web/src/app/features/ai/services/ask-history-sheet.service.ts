import { inject, Service } from '@angular/core';
import { DialogService } from '@shelfmark/ui';
import { AskHistorySheetComponent } from '../components/ask-history-sheet/ask-history-sheet.component';
import type { AskHistorySheetData } from '../components/ask-history-sheet/models/ask-history-sheet-data.interface';

/**
 * The phone's Conversations sheet (Shelf 11-ask, the list button of the Ask tab): the conversation
 * list in a bottom sheet. Answers the chosen conversation id, or `null` when it was closed.
 */
@Service()
export class AskHistorySheet {
  private readonly dialogs = inject(DialogService);

  async open(activeId: string | null, removed: (id?: string) => void): Promise<string | null> {
    const ref = this.dialogs.open<AskHistorySheetComponent, string, AskHistorySheetData>(
      AskHistorySheetComponent,
      { data: { activeId, removed } },
    );
    return (await ref.result) ?? null;
  }
}
