/**
 * Hover intent of `uiPopoverTrigger`: `Open`, how long the pointer (or keyboard focus) rests on
 * the trigger before the popover opens; `Close`, how long the pointer may take to travel from the
 * trigger into the popover (and back) before it closes.
 */
export const POPOVER_DELAY_MS = {
  Open: 150,
  Close: 250,
} as const;
