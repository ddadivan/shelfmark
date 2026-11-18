import type { AskEvent } from '@shelfmark/contracts';

/** Where the Ask service writes its events (the SSE response; a fake in unit specs). */
export interface AskSink {
  /** `true` once the client went away or the stream ended; later sends are ignored. */
  readonly closed: boolean;
  send(event: AskEvent): void;
  /** Called once when the client goes away before the stream ended. */
  onAbort(listener: () => void): void;
}
