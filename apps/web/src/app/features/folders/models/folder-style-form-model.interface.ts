/**
 * Value of the colour and icon form: the colour (a `FOLDER_COLOUR` name or an own `#rrggbb`), the
 * icon (a `FOLDER_ICON` name or one emoji) and the text of the emoji field (#335).
 */
export interface FolderStyleFormModel {
  colour: string;
  icon: string;
  emoji: string;
}
