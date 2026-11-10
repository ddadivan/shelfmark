import type { Signal } from '@angular/core';
import type { DialogSize } from './dialog-size.type';
import type { DialogVariant } from './dialog-variant.type';

/** What `DialogService` tells the `ui-dialog` inside the content component. */
export interface UiDialogContext {
  readonly titleId: string;
  readonly size: DialogSize;
  readonly variant: DialogVariant;
  /** True from the moment the dialog starts to close until the overlay is removed. */
  readonly leaving: Signal<boolean>;
}
