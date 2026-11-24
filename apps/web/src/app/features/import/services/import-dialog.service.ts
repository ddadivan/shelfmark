import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { APP_PATH } from '../../../models/app-path.const';

/**
 * Opens "Import bookmarks" from the data menu and Settings › Your data: since Shelf (09-data) the
 * import is the `/import` page with its numbered steps, not a dialog.
 */
@Service()
export class ImportDialogService {
  private readonly router = inject(Router);

  open(): void {
    void this.router.navigate(['/', APP_PATH.Import]);
  }
}
