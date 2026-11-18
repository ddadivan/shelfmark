import type { AskEvent } from '@shelfmark/contracts';

/** Incremental reader of the `POST /api/ai/ask` body (`utils/parse-sse.ts`). */
export interface AskSseParser {
  /** Adds decoded text; answers the events completed by it, in order. */
  push(chunk: string): AskEvent[];
  /** The body ended: answers an event left without its blank line, if any. */
  end(): AskEvent[];
}
