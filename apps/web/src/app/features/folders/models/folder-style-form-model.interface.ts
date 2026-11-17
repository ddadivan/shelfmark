/**
 * Value of the colour and icon form: the colour (a `FOLDER_COLOUR` name or an own `#rrggbb`), the
 * icon (a `FOLDER_ICON` name or one emoji), the text of the emoji field (#335) and the
 * description and the cover link id (#418, empty for none).
 */
export interface FolderStyleFormModel {
  colour: string;
  icon: string;
  emoji: string;
  /** "Highlight with background" (#440). */
  highlighted: boolean;
  description: string;
  cover: string;
}
