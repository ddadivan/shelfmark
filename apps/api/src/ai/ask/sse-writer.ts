import type { AskEvent } from '@shelfmark/contracts';
import type { Response } from 'express';
import type { AskSink } from '../models/ask-sink.interface';

/**
 * The Ask stream over SSE framing (ADR 0052 point 1): `text/event-stream`, never cached or
 * transformed, not buffered by proxies, headers flushed at once. Each event is one `data:` line of
 * `JSON.stringify` (a newline inside text is escaped, so it cannot break the framing). Writes after
 * the client went away or after `end()` are ignored.
 */
export class SseWriter implements AskSink {
  private ended = false;
  private aborted = false;
  private readonly listeners: (() => void)[] = [];

  constructor(private readonly res: Response) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.on('close', () => {
      if (this.ended || res.writableFinished) return;
      this.aborted = true;
      for (const listener of this.listeners.splice(0)) listener();
    });
  }

  get closed(): boolean {
    return this.ended || this.aborted || this.res.destroyed;
  }

  send(event: AskEvent): void {
    if (this.closed) return;
    this.res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  onAbort(listener: () => void): void {
    if (this.aborted) {
      listener();
      return;
    }
    this.listeners.push(listener);
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    if (!this.res.destroyed) this.res.end();
  }
}
