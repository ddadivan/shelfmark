/**
 * How the user last interacted, written to `data-ui-input` on `<html>` by `trackInputModality`.
 * The global styles hide the focus ring while it is `Pointer` (a click or tap), so focus moved by
 * code (a dialog's first control, a returned trigger) shows no ring until a key is pressed.
 */
export const INPUT_MODALITY = {
  Pointer: 'pointer',
  Keyboard: 'keyboard',
} as const;
