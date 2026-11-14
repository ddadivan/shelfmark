import type { IconName } from '../../icon/models/icon-name.type';
import type { BulkBarActionFolder } from './bulk-bar-action-folder.interface';
import type { BulkBarActionVariant } from './bulk-bar-action-variant.type';

/** One button of `ui-bulk-bar`. Labels are already translated by the feature. */
export interface BulkBarAction {
  /** Emitted by `action` when the button is pressed. */
  id: string;
  /** Visible text and accessible name, verb first ("Move", "Delete"). */
  label: string;
  /** Glyph before the label; not needed when `folder` draws a tile instead. */
  icon?: IconName;
  /** A small folder tile in place of `icon` ("Move to Clothes"). Decorative: the label names it. */
  folder?: BulkBarActionFolder;
  /** `default` (transparent) or `secondary` (surface button with an edge). */
  variant?: BulkBarActionVariant;
  /** A destructive action: `danger` text, set apart by a divider (inline layout). */
  danger?: boolean;
  disabled?: boolean;
  /** A toggle that is on (for example Favorite when every selected item is a favorite): `aria-pressed`. */
  pressed?: boolean;
}
