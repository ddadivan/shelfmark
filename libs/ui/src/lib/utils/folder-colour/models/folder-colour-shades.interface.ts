import type { FolderColourShade } from './folder-colour-shade.interface';

/** An own folder colour drawn for both theme bases (the stylesheet picks by `data-theme`). */
export interface FolderColourShades {
  readonly light: FolderColourShade;
  readonly dark: FolderColourShade;
}
