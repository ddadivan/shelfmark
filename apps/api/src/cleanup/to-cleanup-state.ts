import { CLEANUP_STATE, type CleanupState } from '@shelfmark/contracts';

const STATES: readonly string[] = Object.values(CLEANUP_STATE);

/** A stored state, narrowed (the CHECK keeps the column to these); `none` without a row. */
export function toCleanupState(value: string | undefined): CleanupState {
  return value !== undefined && STATES.includes(value)
    ? (value as CleanupState)
    : CLEANUP_STATE.None;
}
