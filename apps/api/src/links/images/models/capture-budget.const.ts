/** Time a capture may take once the save is otherwise done (ADR 0027), in total. */
export const CAPTURE_BUDGET_MS = 5_000;

/** Below this much time left in the request the capture is skipped: it could not finish. */
export const CAPTURE_MIN_BUDGET_MS = 2_000;

/** Part of the budget kept for decoding, re-encoding and writing; the fetches get the rest. */
export const CAPTURE_PROCESSING_RESERVE_MS = 1_000;
