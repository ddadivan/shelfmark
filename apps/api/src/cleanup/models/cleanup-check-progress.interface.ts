/** What one step of a check did: whether it finished, and its cursor and progress for the next step. */
export interface CleanupCheckProgress {
  done: boolean;
  cursor: string | null;
  checked: number;
}
