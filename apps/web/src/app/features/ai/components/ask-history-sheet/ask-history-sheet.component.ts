import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DialogComponent, injectDialogData, UiDialogRef } from '@shelfmark/ui';
import { AskHistoryListComponent } from '../ask-history-list/ask-history-list.component';
import type { AskHistorySheetData } from './models/ask-history-sheet-data.interface';

/** Content of the phone's Conversations sheet: the list; a row closes it with its id. */
@Component({
  selector: 'app-ask-history-sheet',
  imports: [TranslocoPipe, DialogComponent, AskHistoryListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-dialog
      [title]="'ai.ask.history.title' | transloco"
      [closeLabel]="'ai.ask.history.close' | transloco"
    >
      <app-ask-history-list
        sheet
        [activeId]="data.activeId"
        (opened)="ref.close($event)"
        (removed)="data.removed($event)"
        (cleared)="data.removed()"
      />
    </ui-dialog>
  `,
})
export class AskHistorySheetComponent {
  protected readonly data = injectDialogData<AskHistorySheetData>();
  protected readonly ref = inject<UiDialogRef<string>>(UiDialogRef);
}
