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
  /**
   * An own option that can be deleted (an own colour): the translated action name ("Remove colour
   * #a33a5b"). Shows a small "×" on hover and focus (always on touch); Delete or Backspace on the
   * focused option removes it too. The grid only emits `removed`; the feature deletes it.
   */
  readonly removeLabel?: string;
}
