import type { ExportScope } from './export-scope.interface';

/** The view the library was showing when "Export this view…" opened the dialog. */
export interface ExportViewChoice {
  /** What the view exports (folder, tags, search, kind). */
  readonly scope: ExportScope;
  /** Links in the view; `null` when the feed has more pages than it loaded. */
  readonly count: number | null;
  /** The view shows no links: the export then only explains. */
  readonly empty: boolean;
}
