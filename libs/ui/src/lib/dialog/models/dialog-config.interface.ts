import type { DialogRole } from './dialog-role.type';
import type { DialogSize } from './dialog-size.type';

/** Options of `DialogService.open()`. */
export interface UiDialogConfig<D = undefined> {
  /** Panel width; `ui-dialog` uses it unless its own `size` input is set. Default `sm`. */
  readonly size?: DialogSize;
  /** Read in the dialog component with `injectDialogData<D>()`. */
  readonly data?: D;
  /** Esc and a scrim click close the dialog. `false` makes it blocking. Default `true`. */
  readonly dismissible?: boolean;
  /** A scrim click closes (needs `dismissible`). Destructive confirmations set `false`. Default `true`. */
  readonly scrimClose?: boolean;
  /** Default `dialog`. */
  readonly role?: DialogRole;
  /** Id of an element inside the content that describes the dialog (`aria-describedby`). */
  readonly describedBy?: string;
  /** What gets focus on open: `first-tabbable` (default), `first-heading`, `dialog`, a CSS selector or `false`. */
  readonly autoFocus?: string | boolean;
}
