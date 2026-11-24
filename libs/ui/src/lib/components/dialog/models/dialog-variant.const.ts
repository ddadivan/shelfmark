/**
 * Look of a dialog: the plain panel, the top-placed command dialog (search), or `panel`: a 480px
 * panel under the top end corner with no dimmed page (Shelf Add link), a bottom sheet on a phone.
 */
export const DIALOG_VARIANT = {
  Default: 'default',
  Command: 'command',
  Panel: 'panel',
} as const;
