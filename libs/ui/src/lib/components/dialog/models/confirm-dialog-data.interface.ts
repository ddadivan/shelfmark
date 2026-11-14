import type { ConfirmDialogConfig } from './confirm-config.interface';

/** What `ConfirmDialogComponent` receives: the config plus the id of its message element. */
export interface ConfirmDialogData extends ConfirmDialogConfig {
  readonly textId: string;
}
