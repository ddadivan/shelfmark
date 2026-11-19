import { ASK_CHAT_BLOCK } from '../models/ask-chat-block.const';
import type { AskBuiltMessages } from '../models/ask-built-messages.interface';
import type { AskGatheredResult } from '../models/ask-gathered-result.interface';
import type { AskHistoryTurn } from '../models/ask-history-turn.interface';
import type { AskMessage } from '../models/ask-message.type';
import { serializeToolData } from '../ask/serialize-tool-data';

/** What an empty past answer (cards only) reads as, so no message is empty. */
export const ASK_CARDS_ONLY_ANSWER = '(Showed the links below as cards.)';

/** Untrusted text inside a block: control characters as spaces (newlines kept), `<` escaped. */
function clean(text: string): string {
  return text
    .replace(/\p{Cc}/gu, (char) => (char === '\n' ? char : ' '))
    .replaceAll('<', '&lt;')
    .trim();
}

function block(tag: string, body: string): string {
  return `<${tag}>${body}</${tag}>`;
}

/** A turn's links as one fenced data block (JSON per link, `<` escaped), or nothing. */
function shownLinks(turn: AskHistoryTurn | undefined): string | null {
  if (turn === undefined || turn.links.length === 0) return null;
  const lines = turn.links.map(
    (link) =>
      `<${ASK_CHAT_BLOCK.Link} ref="${link.ref}">${serializeToolData(link, false)}</${ASK_CHAT_BLOCK.Link}>`,
  );
  return `<${ASK_CHAT_BLOCK.ShownLinks}>\n${lines.join('\n')}\n</${ASK_CHAT_BLOCK.ShownLinks}>`;
}

function user(...parts: (string | null)[]): AskMessage {
  return {
    role: 'user',
    content: [{ type: 'text', text: parts.filter((part) => part !== null).join('\n\n') }],
  };
}

/**
 * The messages of an Ask loop (ADR 0055 points 6 and 9): each earlier question as a user message (the
 * previous turn's links first, as a `<shown_links>` data block) followed by its answer as an
 * assistant message; then today's UTC day, the quick model's results for the deep loop (one
 * `<gathered>` block) and the question. Deterministic for the same input, so the history prefix is
 * cacheable; `historyEnd` is the last history message. Past tool results are not replayed.
 */
export function buildAskMessages(input: {
  history: readonly AskHistoryTurn[];
  question: string;
  today: string;
  gathered?: readonly AskGatheredResult[];
}): AskBuiltMessages {
  const messages: AskMessage[] = [];
  input.history.forEach((turn, index) => {
    messages.push(
      user(
        shownLinks(input.history[index - 1]),
        block(ASK_CHAT_BLOCK.Question, clean(turn.question)),
      ),
    );
    const answer = clean(turn.answer);
    messages.push({
      role: 'assistant',
      content: [{ type: 'text', text: answer === '' ? ASK_CARDS_ONLY_ANSWER : answer }],
    });
  });
  const historyEnd = messages.length === 0 ? null : messages.length - 1;
  const gathered =
    input.gathered === undefined || input.gathered.length === 0
      ? null
      : block(ASK_CHAT_BLOCK.Gathered, serializeToolData(input.gathered, false));
  messages.push(
    user(
      shownLinks(input.history.at(-1)),
      block(ASK_CHAT_BLOCK.Today, input.today),
      gathered,
      block(ASK_CHAT_BLOCK.Question, clean(input.question)),
    ),
  );
  return { messages, historyEnd };
}
