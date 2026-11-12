import type { FolderColour } from '../../folder-icon/models/folder-colour.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** One visible line of the picker: the option tree flattened in order, with its depth. */
export interface PickerRow {
  /** Option id, or `null` for the empty-value row. */
  readonly id: string | null;
  readonly name: string;
  /** Names from the root (`Work / Angular`); the accessible name of nested rows. */
  readonly path: string;
  /** Depth; 0 for the root and the empty-value row. */
  readonly level: number;
  readonly icon: IconName;
  readonly colour: FolderColour;
  /** The row is in `currentIds`: marked and not choosable. */
  readonly current: boolean;
}
