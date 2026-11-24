import type { AskConversationResponse } from '@shelfmark/contracts';
import type { StreamingSegment } from '@shelfmark/ui';
import type { AskEntry } from '../models/ask-entry.interface';
import { ASK_ENTRY_STATE } from '../models/ask-entry-state.const';

const MARKER = /\[(\d{1,2})\]/gu;

/**
 * A stored answer's text as streaming segments: each `[n]` marker (one or two digits, as the server
 * writes them) is a citation, everything else text.
 */
export function segmentsFromAnswer(answer: string): StreamingSegment[] {
  const segments: StreamingSegment[] = [];
  let last = 0;
  for (const match of answer.matchAll(MARKER)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: answer.slice(last, index) });
    segments.push({ cite: Number(match[1]) });
    last = index + match[0].length;
  }
  if (last < answer.length) segments.push({ text: answer.slice(last) });
  return segments;
}

/**
 * The turns of a stored conversation as finished, persisted entries (ids from `firstId` on): the
 * live sources are known, so a citation whose link is gone renders disabled.
 */
export function entriesFromConversation(
  conversation: AskConversationResponse,
  firstId: number,
): AskEntry[] {
  return conversation.turns.map((stored, index) => ({
    id: firstId + index,
    question: stored.turn.question,
    state: ASK_ENTRY_STATE.Done,
    segments: segmentsFromAnswer(stored.turn.answer),
    cards: stored.cards.map((group) => ({
      items: group.items,
      total: group.total,
      search: group.search,
    })),
    activity: null,
    steps: stored.steps.map((step) => ({ activity: step.activity, found: step.found })),
    turn: stored.turn,
    sources: stored.sources,
    sourcesKnown: true,
    notFound: stored.notFound,
    truncated: stored.truncated,
    reason: null,
    allowance: null,
    persisted: true,
  }));
}
