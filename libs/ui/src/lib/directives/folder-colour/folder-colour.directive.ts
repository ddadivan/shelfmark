import { computed, Directive, input } from '@angular/core';
import { FOLDER_COLOUR } from '../../components/folder-icon/models/folder-colour.const';
import type { FolderColour } from '../../components/folder-icon/models/folder-colour.type';
import { folderColourTokens } from '../../utils/folder-colour/folder-colour-tokens';

/**
 * Puts a folder colour on its host as custom properties (#418): `--ui-folder-ink` (glyph colour,
 * 4.5:1 on the tint and the page) and `--ui-folder-tint` (tile colour), plus the attribute
 * `data-ui-folder-colour` while a colour is chosen (not graphite), so a stylesheet can tint the
 * row, band or chip only then. Built-in names use the tokens, an own `#rrggbb` its readable
 * shades for both bases (CSSOM, CSP-safe). Also a host directive (`ui-folder-banner`, `ui-folder-chip`).
 */
@Directive({
  selector: '[uiFolderColour]',
  host: {
    '[style.--ui-folder-ink]': 'tokens()?.ink ?? null',
    '[style.--ui-folder-tint]': 'tokens()?.tint ?? null',
    '[attr.data-ui-folder-colour]': "tokens() ? '' : null",
  },
})
export class FolderColourDirective {
  /** A `FolderColour` name or an own `#rrggbb`; graphite (the default) tints nothing. */
  readonly colour = input<FolderColour | string>(FOLDER_COLOUR.Graphite, {
    alias: 'uiFolderColour',
  });

  protected readonly tokens = computed(() => folderColourTokens(this.colour()));
}
