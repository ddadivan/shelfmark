import { ASK_EVENT_TYPE, type AskEvent } from '@shelfmark/contracts';
import { createAskSseParser } from './parse-sse';

const ALLOWANCE = { questionsLeft: 3, period: 'day', resetsOn: '2026-11-19' } as const;
const LINK = { id: 'l1', url: 'https://a.example/', title: 'A', tags: [] };

function frame(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

describe('createAskSseParser', () => {
  it('reads several events in one chunk, in order', () => {
    const parser = createAskSseParser();
    const events = parser.push(
      frame({ type: 'meta', allowance: ALLOWANCE, retrieved: 2 }) +
        frame({ type: 'text', text: 'Hi\nthere ' }) +
        frame({ type: 'cite', n: 1 }),
    );
    expect(events).toEqual<AskEvent[]>([
      { type: ASK_EVENT_TYPE.Meta, allowance: ALLOWANCE, retrieved: 2 },
      { type: ASK_EVENT_TYPE.Text, text: 'Hi\nthere ' },
      { type: ASK_EVENT_TYPE.Cite, n: 1 },
    ]);
  });

  it('joins an event split over chunks, anywhere, also CRLF', () => {
    const parser = createAskSseParser();
    const whole = frame({ type: 'text', text: 'split' }).replace('\n\n', '\r\n\r\n');
    const pieces = [whole.slice(0, 3), whole.slice(3, 15), whole.slice(15, -1), whole.slice(-1)];
    const events = pieces.flatMap((piece) => parser.push(piece));
    expect(events).toEqual([{ type: 'text', text: 'split' }]);
  });

  it('skips broken JSON, unknown types, missing fields and lines without data', () => {
    const parser = createAskSseParser();
    const events = parser.push(
      'data: {broken\n\n' +
        ': comment\n\n' +
        'event: ping\n\n' +
        frame({ type: 'ping' }) +
        frame({ type: 'text' }) +
        frame({ type: 'cite', n: 0 }) +
        frame({ type: 'cite', n: 1.5 }) +
        frame(['text']) +
        frame({ type: 'meta', allowance: { questionsLeft: -1 }, retrieved: 1 }) +
        frame({ type: 'error', reason: 'nope', counted: false, allowance: null }) +
        frame({
          type: 'done',
          sources: [{ n: 1, link: { id: 1 } }],
          notFound: false,
          truncated: false,
          allowance: ALLOWANCE,
        }) +
        frame({
          type: 'done',
          sources: [{ n: 1 }],
          notFound: false,
          truncated: false,
          allowance: ALLOWANCE,
        }) +
        frame({
          type: 'done',
          sources: 'x',
          notFound: false,
          truncated: false,
          allowance: ALLOWANCE,
        }) +
        frame({ type: 'text', text: 'kept' }),
    );
    expect(events).toEqual([{ type: 'text', text: 'kept' }]);
  });

  it('reads done and error events with their fields', () => {
    const parser = createAskSseParser();
    const events = parser.push(
      frame({
        type: 'done',
        sources: [{ n: 1, link: LINK }],
        notFound: false,
        truncated: true,
        allowance: ALLOWANCE,
        extra: 1,
      }) +
        frame({ type: 'error', reason: 'quota', counted: false, allowance: ALLOWANCE }) +
        frame({ type: 'error', reason: 'off', counted: false, allowance: null }),
    );
    expect(events).toEqual([
      {
        type: 'done',
        sources: [{ n: 1, link: LINK }],
        notFound: false,
        truncated: true,
        allowance: ALLOWANCE,
      },
      { type: 'error', reason: 'quota', counted: false, allowance: ALLOWANCE },
      { type: 'error', reason: 'off', counted: false, allowance: null },
    ]);
  });

  it('keeps a partial event until the end, then reads it', () => {
    const parser = createAskSseParser();
    expect(parser.push('data: {"type":"text","text":"tail"}')).toEqual([]);
    expect(parser.end()).toEqual([{ type: 'text', text: 'tail' }]);
    expect(parser.end()).toEqual([]);
  });
});
