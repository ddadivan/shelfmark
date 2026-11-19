import {
  ASK_ACTIVITY,
  ASK_DEPTH,
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  type AskEvent,
  type AskTurn,
  type LinkResponse,
} from '@shelfmark/contracts';
import { linkHost } from '../../links/utils/link-view';
import { mockAskAnswer } from './mock-ask-answer';
import { MockAskComposer } from './mock-ask-composer';
import { meaningStems } from './mock-meaning';
import { MOCK_AI_URL_MARKER } from './models/mock-ai-url-marker.const';
import { MOCK_ASK } from './models/mock-ask.const';
import type { MockAskLibrary } from './models/mock-ask-library.interface';
import type { MockAskPlan } from './models/mock-ask-plan.interface';
import { MOCK_ASK_QUESTION_WORDS } from './models/mock-ask-question-words.const';
import { MOCK_ASK_WORDS } from './models/mock-ask-words.const';

const PLANNER: ReadonlySet<string> = new Set([
  'many',
  'count',
  'number',
  'list',
  'which',
  'more',
  'else',
  'other',
  'first',
  'one',
  'explain',
  'depth',
  'think',
  'harder',
  'summar',
  'articl',
  'about',
  'what',
  'remind',
  'loop',
]);

function has(question: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) =>
    new RegExp(`(^|[^\\p{L}])${phrase}($|[^\\p{L}])`, 'u').test(question),
  );
}

/** The topic word of a question (its first stem), like the API mock's `mockTopic`. */
export function mockAskTopic(question: string): string {
  return (
    [...meaningStems(question.replace(/\bai-[a-z-]+/gu, ' '))].find(
      (stem) => !MOCK_ASK_QUESTION_WORDS.has(stem) && !PLANNER.has(stem) && !/^\d+$/u.test(stem),
    ) ?? ''
  );
}

/**
 * The mock Ask chat's answer after `meta` (ADR 0055 point 10), deterministic like the API mock: triggers,
 * counts, "the first one" and "more" from the history, finds with cards and "Show all", the deep
 * hand-over for comparisons, else a search and a content answer citing what it found.
 */
export function planMockAsk(
  question: string,
  history: readonly AskTurn[],
  library: MockAskLibrary,
): MockAskPlan {
  const q = question.toLowerCase();
  const composer = new MockAskComposer((link) => library.view(link));
  const quick = (steps: MockAskPlan['steps']): MockAskPlan => ({ steps, depth: ASK_DEPTH.Quick });
  const failure = (
    reason: typeof ASK_ERROR_REASON.Unavailable | typeof ASK_ERROR_REASON.Rejected,
  ): AskEvent => ({ type: ASK_EVENT_TYPE.Error, reason, counted: false, allowance: null });

  if (q.includes(MOCK_AI_URL_MARKER.Fail)) {
    return quick(composer.error(failure(ASK_ERROR_REASON.Unavailable), MOCK_ASK.ToolMs));
  }
  if (q.includes(MOCK_AI_URL_MARKER.Refuse)) {
    return quick(composer.error(failure(ASK_ERROR_REASON.Rejected), MOCK_ASK.ToolMs));
  }
  if (q.includes(MOCK_ASK.SlowMarker)) {
    composer.activity(ASK_ACTIVITY.Search, null, 0);
    const steps = composer.error(
      failure(ASK_ERROR_REASON.Unavailable),
      MOCK_ASK.RoundFirstOutputMs,
    );
    // Only the activity start, then the deadline: the end event would hide the pill early.
    return quick([steps[0], steps[2]].filter((step) => step !== undefined));
  }
  const topic = mockAskTopic(q);
  const last = history.at(-1);
  const lastLinks = (last?.links ?? []).flatMap((entry) => {
    const link = library.links.find((candidate) => candidate.id === entry.id);
    return link ? [link] : [];
  });
  const found = (text: string) => (q.includes(MOCK_ASK.NotFoundMarker) ? [] : library.rank(text));

  if (has(q, MOCK_ASK_WORDS.Count)) {
    const total = topic === '' ? library.links.length : found(question).length;
    composer.activity(ASK_ACTIVITY.Count, total);
    composer.text(
      `You have ${total} ${total === 1 ? 'link' : 'links'}${topic === '' ? '' : ` about ${topic}`}.`,
    );
    return quick(composer.done(question));
  }
  if (lastLinks.length > 0 && has(q, MOCK_ASK_WORDS.First)) {
    const link = lastLinks[0] as LinkResponse;
    composer.activity(ASK_ACTIVITY.Read, null);
    composer.text(`${link.title} {n:0}: ${link.summary ?? 'there is no summary yet.'}`, [link]);
    return quick(composer.done(question));
  }
  const more = last !== undefined && lastLinks.length > 0 && has(q, MOCK_ASK_WORDS.More);
  const wantsCards = has(q, MOCK_ASK_WORDS.Find) || more;
  const searchText = more ? (last?.question ?? question) : question;
  const searchTopic = more ? mockAskTopic(searchText.toLowerCase()) : topic;
  const all = found(searchText);
  const offset = more ? lastLinks.length : 0;
  const page = all.slice(offset, offset + MOCK_ASK.CardsMax * 2);
  const rounds = q.includes(MOCK_ASK.LoopMarker) ? 4 : 1;
  for (let round = 0; round < rounds; round += 1) {
    composer.activity(ASK_ACTIVITY.Search, all.length);
  }
  if (page.length === 0) {
    composer.text("I couldn't find anything about this in your links.");
    return quick(composer.done(question, { notFound: true }));
  }
  const cut = q.includes(MOCK_ASK.CutMarker);
  const limit = cut ? MOCK_ASK.CutAfterChunks : Number.POSITIVE_INFINITY;
  if (wantsCards) {
    const cards = page.slice(0, MOCK_ASK.CardsMax);
    const left = all.length - offset;
    composer.text(
      `I found ${left} ${left === 1 ? 'link' : 'links'}${searchTopic === '' ? '' : ` about ${searchTopic}`}. `,
      [],
      limit,
    );
    if (!cut) {
      composer.cards(cards, left, {
        q: searchTopic === '' ? null : searchTopic,
        folderId: null,
        tags: [],
        kind: null,
        favorite: false,
      });
    }
    return quick(composer.done(question, { truncated: cut }));
  }
  const deep = has(q, MOCK_ASK_WORDS.Deep);
  if (deep) {
    composer.activity(ASK_ACTIVITY.Deep, null);
  }
  const answer = mockAskAnswer(
    question,
    page.map((link, index) => ({
      n: index + 1,
      title: link.title,
      host: linkHost(link.url),
      tags: link.tags,
      summary: link.summary,
    })),
  ).replace(/\[(\d+)\]/gu, (_, n: string) => `{n:${Number(n) - 1}}`);
  composer.text(deep ? `Looking closer: ${answer}` : answer, page, limit);
  const depth = deep ? ASK_DEPTH.Deep : ASK_DEPTH.Quick;
  return { steps: composer.done(question, { truncated: cut, depth }), depth };
}
