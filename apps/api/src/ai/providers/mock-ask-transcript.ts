import { ASK_CHAT_BLOCK } from '../models/ask-chat-block.const';
import type { AskMessage } from '../models/ask-message.type';
import type { MockAskResult } from '../models/mock-ask-result.interface';
import type { MockAskTranscript } from '../models/mock-ask-transcript.interface';

const QUESTION = new RegExp(
  `<${ASK_CHAT_BLOCK.Question}>([\\s\\S]*?)</${ASK_CHAT_BLOCK.Question}>`,
  'u',
);
const TODAY = new RegExp(
  `<${ASK_CHAT_BLOCK.Today}>(\\d{4}-\\d{2}-\\d{2})</${ASK_CHAT_BLOCK.Today}>`,
  'u',
);
const SHOWN = new RegExp(
  `<${ASK_CHAT_BLOCK.ShownLinks}>([\\s\\S]*?)</${ASK_CHAT_BLOCK.ShownLinks}>`,
  'u',
);
const GATHERED = new RegExp(
  `<${ASK_CHAT_BLOCK.Gathered}>([\\s\\S]*?)</${ASK_CHAT_BLOCK.Gathered}>`,
  'u',
);
const REF = /ref="(\d+)"/gu;

function textOf(message: AskMessage): string {
  return message.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n');
}

function unescape(text: string): string {
  return text.replaceAll('&lt;', '<');
}

function parse(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
}

/** Gathered results of the quick model: a JSON array of `{ name, isError, data }`. */
function gathered(text: string): MockAskResult[] {
  const match = GATHERED.exec(text);
  if (match === null) return [];
  const data = parse(match[1] ?? '');
  return Array.isArray(data)
    ? data.flatMap((entry: unknown) =>
        typeof entry === 'object' &&
        entry !== null &&
        'name' in entry &&
        typeof entry.name === 'string'
          ? [
              {
                name: entry.name,
                isError: 'isError' in entry && entry.isError === true,
                data: 'data' in entry ? entry.data : null,
              },
            ]
          : [],
      )
    : [];
}

/**
 * Reads an Ask round's messages the way the mock model needs them: the current question (the last
 * user message with a `<question>` block), today, the previous question, the refs of the last
 * history turn, this question's tool results (matched to their calls by id) and how many rounds ran.
 */
export function readMockAskTranscript(messages: readonly AskMessage[]): MockAskTranscript {
  let index = -1;
  messages.forEach((message, at) => {
    if (message.role === 'user' && QUESTION.test(textOf(message))) index = at;
  });
  const asked = index >= 0 ? textOf(messages[index] ?? { role: 'user', content: [] }) : '';
  const earlier = messages.slice(0, Math.max(0, index));
  const previous = [...earlier]
    .reverse()
    .find((message) => message.role === 'user' && QUESTION.test(textOf(message)));
  const shown = SHOWN.exec(asked)?.[1] ?? '';
  const names = new Map<string, string>();
  const results: MockAskResult[] = [...gathered(asked)];
  let rounds = 0;
  let wroteText = false;
  for (const message of messages.slice(index + 1)) {
    if (message.role === 'assistant') {
      rounds += 1;
      for (const block of message.content) {
        if (block.type === 'tool_call') names.set(block.id, block.name);
        if (block.type === 'text' && block.text.trim() !== '') wroteText = true;
      }
      continue;
    }
    for (const block of message.content) {
      if (block.type !== 'tool_result') continue;
      results.push({
        name: names.get(block.toolCallId) ?? '',
        isError: block.isError,
        data: block.isError ? block.content : parse(block.content),
      });
    }
  }
  return {
    question: unescape(QUESTION.exec(asked)?.[1] ?? '').toLowerCase(),
    today: TODAY.exec(asked)?.[1] ?? new Date().toISOString().slice(0, 10),
    previousQuestion:
      previous === undefined
        ? null
        : unescape(QUESTION.exec(textOf(previous))?.[1] ?? '').toLowerCase(),
    historyRefs: [...shown.matchAll(REF)].map((match) => Number(match[1])),
    results,
    rounds,
    wroteText,
  };
}
