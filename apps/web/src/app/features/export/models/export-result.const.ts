/** How `ExportActionsService.download` ended. */
export const EXPORT_RESULT = {
  /** The file was handed to the browser. */
  Saved: 'saved',
  /** There was nothing to export; an info toast explained it. */
  Empty: 'empty',
  /** The export failed; an error toast with a retry was shown. */
  Failed: 'failed',
  /** The caller aborted it, or another export was already running. */
  Skipped: 'skipped',
} as const;
