import type { FolderColour } from '../../folder-icon/models/folder-colour.type';
import type { IconName } from '../../icon/models/icon-name.type';

/** One choice of `ui-choice-grid`; `label` is already translated and is the accessible name. */
export interface ChoiceOption {
  /** Value written to the model; the colour name for swatches, the icon name for icons. */
  readonly value: string;
  readonly label: string;
  /** Swatches: the colour drawn. */
  readonly colour?: FolderColour | string;
  /** Icons: the glyph drawn. */
  readonly icon?: IconName;
}
