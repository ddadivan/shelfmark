import type { PositionStrategy } from '@angular/cdk/overlay';
import type { StaticProvider } from '@angular/core';
import type { UiDialogRef } from '../dialog-ref';
import type { DialogRole } from './dialog-role.type';

/** What differs between `DialogService` and `DrawerService`; the rest is shared. */
export interface ModalOverlayOptions<R, C, D> {
  readonly role: DialogRole;
  /** `aria-labelledby` (a dialog with a visible title). */
  readonly ariaLabelledBy?: string;
  /** `aria-label` (a drawer without a heading). */
  readonly ariaLabel?: string;
  readonly ariaDescribedBy?: string | null;
  readonly data: D | undefined;
  readonly autoFocus: string | boolean;
  readonly dismissible: boolean;
  readonly scrimClose: boolean;
  readonly positionStrategy: PositionStrategy;
  /** Providers for the content component, next to `UiDialogRef`. */
  readonly providers: (ref: UiDialogRef<R, C>) => StaticProvider[];
}
