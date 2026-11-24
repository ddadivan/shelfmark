import type { ReaderTheme } from '../../models/reader-theme.type';

/** One tile of `ui-reader-theme-picker`: a Reader theme and its translated name ("Sepia"). */
export interface ReaderThemeOption {
  readonly value: ReaderTheme;
  readonly label: string;
}
