import type { Signal } from '@angular/core';

/** What the Ask leave guard reads of a chat (`AskStore`). */
export interface AskLeaveState {
  /** Leaving would lose something (a stream, or an answer the server did not store). */
  readonly unsaved: Signal<boolean>;
  /** An answer is being written (the reason line says so). */
  readonly streaming: Signal<boolean>;
}
