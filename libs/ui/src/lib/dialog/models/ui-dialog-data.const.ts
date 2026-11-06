import { InjectionToken } from '@angular/core';

/** The `data` of `DialogService.open()`; read it with `injectDialogData<T>()`. */
export const UI_DIALOG_DATA = new InjectionToken<unknown>('UI_DIALOG_DATA');
