/**
 * A folder colour as CSS values for a stylesheet (#418): `ink` is the glyph colour (4.5:1 on
 * `tint` and on the page), `tint` the tile colour; both follow the theme by themselves.
 */
export interface FolderColourTokens {
  readonly ink: string;
  readonly tint: string;
}
