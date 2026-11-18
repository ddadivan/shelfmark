import type { AskEntry } from './ask-entry.interface';

/** `AskStore`: the questions of this panel, oldest first. */
export interface AskState {
  readonly entries: readonly AskEntry[];
}
