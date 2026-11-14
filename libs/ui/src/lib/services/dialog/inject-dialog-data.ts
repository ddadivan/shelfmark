import { inject } from '@angular/core';
import { UI_DIALOG_DATA } from './models/ui-dialog-data.const';

/** The `data` passed to `DialogService.open()`. The caller states the type it passed. */
export function injectDialogData<T>(): T {
  return inject(UI_DIALOG_DATA) as T;
}
