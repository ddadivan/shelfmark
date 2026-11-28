/** State of `TidyCountStore`. */
export interface TidyCountState {
  /** Links Tidy would list (the Unsorted button); 0 until loaded and while AI is off. */
  total: number;
  /** Someone asked for the count since the session began: a finished job refreshes it. */
  wanted: boolean;
  /** The count (or 0 for AI off) is the account's answer, not the empty start: the button's room is settled. */
  known: boolean;
}
