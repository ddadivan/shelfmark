import type { AskEvent } from '@shelfmark/contracts';
import type { Response } from 'superagent';

/** Supertest parser for an SSE answer: collects the raw body as `{ text }`. */
export function sseParser(
  res: Response,
  callback: (error: Error | null, body: unknown) => void,
): void {
  let text = '';
  res.setEncoding('utf8');
  res.on('data', (chunk: string) => {
    text += chunk;
  });
  res.on('end', () => callback(null, { text }));
}

/** The `AskEvent`s of a collected SSE body: one JSON `data:` line per frame. */
export function sseEvents(body: unknown): AskEvent[] {
  return (body as { text: string }).text
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame) => JSON.parse(frame.slice('data: '.length)) as AskEvent);
}
