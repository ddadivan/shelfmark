/** How the caller knows what it exports (`ExportActionsService.download`). */
export interface ExportOptions {
  /** The shown view has no links (the library feed knows it); a view export then only explains. */
  viewEmpty?: boolean;
  /** Aborts the request (the export dialog's Cancel); the result is then `skipped`, with no toast. */
  signal?: AbortSignal;
}
