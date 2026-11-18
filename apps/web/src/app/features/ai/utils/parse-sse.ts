import type { AskEvent } from '@shelfmark/contracts';
import type { AskSseParser } from '../models/ask-sse-parser.interface';
import { toAskEvent } from './to-ask-event';

const DATA = 'data:';

function parseBlock(block: string): AskEvent | null {
  const data = block
    .split('\n')
    .filter((line) => line.startsWith(DATA))
    .map((line) => line.slice(DATA.length).replace(/^ /u, ''))
    .join('\n');
  if (data === '') {
    return null;
  }
  try {
    return toAskEvent(JSON.parse(data));
  } catch {
    return null;
  }
}

/**
 * A reader for the Ask stream (ADR 0051, plan 10.1): events are `data: <json>` lines ended by a
 * blank line. Text may arrive split anywhere, several events in one chunk or one event over many;
 * lines without `data:` (comments, other fields), broken JSON and unknown event types are skipped.
 */
export function createAskSseParser(): AskSseParser {
  let buffer = '';
  const drain = (final: boolean): AskEvent[] => {
    const blocks = buffer.split('\n\n');
    buffer = final ? '' : (blocks.pop() ?? '');
    return blocks.map(parseBlock).filter((event): event is AskEvent => event !== null);
  };
  return {
    push(chunk: string): AskEvent[] {
      buffer += chunk.replace(/\r\n?/gu, '\n');
      return drain(false);
    },
    end(): AskEvent[] {
      return drain(true);
    },
  };
}
