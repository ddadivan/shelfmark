import { InjectionToken } from '@angular/core';
import type { UiDialogContext } from '../../../services/dialog/models/dialog-context.interface';

export const UI_DIALOG_CONTEXT = new InjectionToken<UiDialogContext>('UI_DIALOG_CONTEXT');
