import type { IconName } from '../../icon/models/icon-name.type';

/** One button of `ui-bulk-bar`. Labels are already translated by the feature. */
export interface BulkBarAction {
  /** Emitted by `action` when the button is pressed. */
  id: string;
  /** Visible text and accessible name, verb first ("Move", "Delete"). */
  label: string;
  icon: IconName;
  /** A destructive action: `danger` text, set apart by a divider (inline layout). */
  danger?: boolean;
  disabled?: boolean;
  /** A toggle that is on (for example Favorite when every selected item is a favorite): `aria-pressed`. */
  pressed?: boolean;
}
