/**
 * Timing of the clear dissolve (#564, Motion «Clear dissolve»): each word dissolves over `WordMs`,
 * `StepMs` after the one before; with many words the step shrinks so the last word still ends
 * within `TotalMs` (the Motion limit).
 */
export const DISSOLVE_TIMING = {
  WordMs: 200,
  StepMs: 60,
  TotalMs: 320,
} as const;
