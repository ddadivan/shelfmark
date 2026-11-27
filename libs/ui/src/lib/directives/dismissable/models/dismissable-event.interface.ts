import type { DismissReason } from './dismiss-reason.type';

export interface DismissableEvent {
  readonly reason: DismissReason;
  /** The press or key event that asked to close. */
  readonly event: Event;
  /** Focus sat inside the layer or its anchor when Esc was pressed (give it back then); false for a press. */
  readonly focusInside: boolean;
}
