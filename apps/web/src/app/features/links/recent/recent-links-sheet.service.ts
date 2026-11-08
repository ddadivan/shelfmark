import { Service, inject } from '@angular/core';
import { DialogService } from '@shelfmark/ui';
import { RecentLinksSheetComponent } from './recent-links-sheet.component';

/** Opens the recent links as a sheet (the phone has no side panel). */
@Service()
export class RecentLinksSheetService {
  private readonly dialogs = inject(DialogService);

  open(): void {
    this.dialogs.open(RecentLinksSheetComponent);
  }
}
