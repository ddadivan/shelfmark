import { ASK_ESCALATION_REASON } from '../models/ask-escalation-reason.const';
import { ASK_TOOL_CHOICE } from '../models/ask-tool-choice.const';
import { ASK_TOOL_NAME } from '../models/ask-tool-name.const';
import { MOCK_ASK } from '../models/mock-ask.const';
import { MOCK_ASK_THEMES } from '../models/mock-ask-themes.const';
import { MOCK_ASK_WORDS } from '../models/mock-ask-words.const';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import type { MockAskCall } from '../models/mock-ask-call.interface';
import type { MockAskItem } from '../models/mock-ask-item.interface';
import type { MockAskResult } from '../models/mock-ask-result.interface';
import type { MockAskRound } from '../models/mock-ask-round.type';
import type { MockAskTranscript } from '../models/mock-ask-transcript.interface';
import { wordStem, wordStems } from '../search/word-stems';
import { readMockAskTranscript } from './mock-ask-transcript';

const PLANNER: ReadonlySet<string> = new Set(MOCK_ASK_WORDS.Planner);

function has(question: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) =>
    new RegExp(`(^|[^\\p{L}])${phrase}($|[^\\p{L}])`, 'u').test(question),
  );
}

/** The topic words of a question (stems), the planner's own words and month names left out. */
export function mockTopic(question: string): string {
  const months: readonly string[] = MOCK_ASK_WORDS.Months.map((month) => wordStem(month));
  return wordStems(question.replace(/\bai-[a-z-]+/gu, ' '))
    .filter((stem) => !PLANNER.has(stem) && !months.includes(stem) && !/^\d+$/u.test(stem))
    .slice(0, 2)
    .join(' ');
}

/** `savedFrom` / `savedTo` of a month named in the question: its latest occurrence up to today. */
export function mockMonthRange(question: string, today: string): Record<string, string> {
  const index = MOCK_ASK_WORDS.Months.findIndex((month) => has(question, [month]));
  if (index < 0) return {};
  const [yearText = '2026', monthText = '01'] = today.split('-');
  const year = Number(monthText) - 1 >= index ? Number(yearText) : Number(yearText) - 1;
  const last = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  const month = String(index + 1).padStart(2, '0');
  return {
    savedFrom: `${year}-${month}-01`,
    savedTo: `${year}-${month}-${String(last).padStart(2, '0')}`,
  };
}

function itemsOf(result: MockAskResult | undefined): MockAskItem[] {
  const data = result?.data;
  if (
    typeof data !== 'object' ||
    data === null ||
    !('items' in data) ||
    !Array.isArray(data.items)
  ) {
    return [];
  }
  return data.items.flatMap((entry: unknown): MockAskItem[] =>
    typeof entry === 'object' && entry !== null && 'ref' in entry && typeof entry.ref === 'number'
      ? [
          {
            ref: entry.ref,
            title: 'title' in entry && typeof entry.title === 'string' ? entry.title : '',
            site: 'site' in entry && typeof entry.site === 'string' ? entry.site : '',
            tags:
              'tags' in entry && Array.isArray(entry.tags)
                ? entry.tags.filter((tag: unknown): tag is string => typeof tag === 'string')
                : [],
            summary: 'summary' in entry && typeof entry.summary === 'string' ? entry.summary : null,
          },
        ]
      : [],
  );
}

function numberOf(data: unknown, key: string): number {
  if (typeof data !== 'object' || data === null) return 0;
  const value: unknown = Reflect.get(data, key);
  return typeof value === 'number' ? value : 0;
}

function shortTitle(item: MockAskItem): string {
  const title = Array.from(item.title.trim()).slice(0, MOCK_ASK.TitleMax).join('');
  return title === '' ? item.site : title;
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u));
}

/** A content answer citing the found links: a canned demo theme, else a template. */
function contentAnswer(question: string, items: readonly MockAskItem[], deep: boolean): string {
  const asked = words(question);
  for (const theme of MOCK_ASK_THEMES) {
    if (!theme.triggers.some((trigger) => asked.has(trigger))) continue;
    const matching = items.filter((item) => {
      const own = words(`${item.title} ${item.tags.join(' ')} ${item.summary ?? ''}`);
      return theme.sourceWords.some((word) => own.has(word));
    });
    if (matching.length === 0) break;
    const lines = matching
      .slice(0, theme.lines.length)
      .map(
        (item, index) =>
          `${(theme.lines[index] ?? '').replace('{title}', shortTitle(item))} [${item.ref}]`,
      );
    return [deep ? `Looking closer: ${theme.intro}` : theme.intro, ...lines].join(' ');
  }
  const picked = items.slice(0, MOCK_ASK.TemplateSourcesMax);
  const lines = picked.map((item, index) =>
    index === 0
      ? `${shortTitle(item)} looks closest [${item.ref}].`
      : `${shortTitle(item)} is related [${item.ref}].`,
  );
  const lead = deep
    ? `Comparing what you saved, ${picked.length} ${picked.length === 1 ? 'link stands' : 'links stand'} out.`
    : `You saved ${items.length} ${items.length === 1 ? 'link' : 'links'} about this.`;
  return [lead, ...lines].join(' ');
}

const NOT_FOUND = "I couldn't find anything about this in your links.";

function reply(text: string, calls: MockAskCall[] = []): MockAskRound {
  return { kind: 'reply', text, calls, slow: false, cut: false };
}

function lastOf(t: MockAskTranscript, name: string): MockAskResult | undefined {
  return [...t.results].reverse().find((result) => result.name === name);
}

/** The answer from what the tools returned (also the forced answer). */
function finalText(t: MockAskTranscript, deep: boolean): string {
  const q = t.question;
  const count = lastOf(t, ASK_TOOL_NAME.CountLinks);
  if (count !== undefined && !count.isError) {
    const total = numberOf(count.data, 'total');
    const topic = mockTopic(q);
    const groups =
      typeof count.data === 'object' &&
      count.data !== null &&
      'groups' in count.data &&
      Array.isArray(count.data.groups)
        ? count.data.groups
            .slice(0, 3)
            .flatMap((group: unknown) =>
              typeof group === 'object' && group !== null && 'label' in group && 'count' in group
                ? [`${String(group.label)} (${String(group.count)})`]
                : [],
            )
        : [];
    const lead = `You have ${total} ${total === 1 ? 'link' : 'links'}${topic === '' ? '' : ` about ${topic}`}.`;
    return groups.length > 0 ? `${lead} Most are in ${groups.join(', ')}.` : lead;
  }
  const read = lastOf(t, ASK_TOOL_NAME.GetLink);
  if (read !== undefined && !read.isError && typeof read.data === 'object' && read.data !== null) {
    const item = itemsOf({ ...read, data: { items: [read.data] } })[0];
    if (item !== undefined) {
      return `${shortTitle(item)} [${item.ref}]: ${item.summary ?? 'there is no summary yet.'}`;
    }
  }
  const items = t.results
    .filter((result) => result.name === ASK_TOOL_NAME.SearchLinks && !result.isError)
    .flatMap((result) => itemsOf(result));
  if (items.length === 0) return NOT_FOUND;
  const inject = q.includes(MOCK_ASK.InjectMarker);
  const answer = contentAnswer(q, items, deep);
  return inject ? `${answer} [999]` : answer;
}

/**
 * The mock model's next round (ADR 0055 point 10), deterministic from the messages: triggers first,
 * then the deep hand-over, counts, "the first one", "more", finds with cards, else a search and a
 * content answer citing refs. With `tool_choice: none` it always answers from what it has.
 */
export function planMockAskRound(input: AskRoundInput): MockAskRound {
  const t = readMockAskTranscript(input.messages);
  const q = t.question;
  if (q.includes(MOCK_ASK.FailMarker)) return { kind: 'fail' };
  if (q.includes(MOCK_ASK.RefuseMarker)) return { kind: 'refuse' };
  const round = nextRound(input, t);
  if (round.kind !== 'reply') return round;
  return {
    ...round,
    slow: q.includes(MOCK_ASK.SlowMarker) && t.rounds === 0,
    cut: q.includes(MOCK_ASK.CutMarker) && round.text !== '',
  };
}

function nextRound(input: AskRoundInput, t: MockAskTranscript): MockAskRound {
  const q = t.question;
  const deep = !input.profile.escalation;
  if (input.toolChoice === ASK_TOOL_CHOICE.None) return reply(finalText(t, deep));

  const topic = mockTopic(q);
  const search = (extra: Record<string, unknown> = {}): MockAskCall => ({
    name: ASK_TOOL_NAME.SearchLinks,
    input: {
      ...(topic === '' ? {} : { query: q.includes(MOCK_ASK.NotFoundMarker) ? 'sourdough' : topic }),
      ...mockMonthRange(q, t.today),
      ...extra,
    },
  });
  const last = t.results.at(-1);

  if (q.includes(MOCK_ASK.LoopMarker)) {
    return reply('', [
      {
        name: ASK_TOOL_NAME.SearchLinks,
        input: { query: 'loop', offset: Math.min(t.rounds, 100) },
      },
    ]);
  }
  if (q.includes(MOCK_ASK.BadArgsMarker) && t.rounds === 0) {
    return reply('', [
      { name: ASK_TOOL_NAME.SearchLinks, input: { query: 'x', userId: 'everyone' } },
    ]);
  }
  if (q.includes(MOCK_ASK.DeepLateMarker) && input.profile.escalation && t.rounds === 0) {
    return reply('Let me look. ', [
      { name: ASK_TOOL_NAME.RequestDeeperAnswer, input: { reason: ASK_ESCALATION_REASON.Unsure } },
    ]);
  }
  const wantsDeep = has(q, MOCK_ASK_WORDS.Deep);
  if (wantsDeep && input.profile.escalation && t.rounds === 0) {
    return reply('', [
      {
        name: ASK_TOOL_NAME.RequestDeeperAnswer,
        input: { reason: ASK_ESCALATION_REASON.Synthesis },
      },
    ]);
  }
  if (
    t.results.length === 0 ||
    last?.name === ASK_TOOL_NAME.RequestDeeperAnswer ||
    (q.includes(MOCK_ASK.BadArgsMarker) && t.rounds === 1)
  ) {
    if (has(q, MOCK_ASK_WORDS.Count)) {
      const groupBy = MOCK_ASK_WORDS.GroupBy.find((group) =>
        has(q, [`by ${group}`, `per ${group}`, `each ${group}`]),
      );
      return reply('', [
        {
          name: ASK_TOOL_NAME.CountLinks,
          input: {
            ...(topic === '' ? {} : { query: topic }),
            ...mockMonthRange(q, t.today),
            ...(groupBy === undefined ? {} : { groupBy }),
          },
        },
      ]);
    }
    if (t.historyRefs.length > 0 && has(q, MOCK_ASK_WORDS.First)) {
      return reply('', [{ name: ASK_TOOL_NAME.GetLink, input: { ref: t.historyRefs[0] } }]);
    }
    if (t.historyRefs.length > 0 && t.previousQuestion !== null && has(q, MOCK_ASK_WORDS.More)) {
      const previous = mockTopic(t.previousQuestion);
      return reply('', [
        {
          name: ASK_TOOL_NAME.SearchLinks,
          input: {
            ...(previous === '' ? { savedTo: t.today } : { query: previous }),
            ...mockMonthRange(t.previousQuestion, t.today),
            offset: t.historyRefs.length,
          },
        },
      ]);
    }
    if (topic === '' && Object.keys(mockMonthRange(q, t.today)).length === 0) {
      return reply('', [{ name: ASK_TOOL_NAME.CountLinks, input: {} }]);
    }
    return reply('', [search()]);
  }
  // After a search: cards for "find / list / more" questions, then a short closing round.
  const searchResult = lastOf(t, ASK_TOOL_NAME.SearchLinks);
  const shown = t.results.some(
    (result) => result.name === ASK_TOOL_NAME.ShowLinks && !result.isError,
  );
  const wantsCards =
    has(q, MOCK_ASK_WORDS.Find) || (t.historyRefs.length > 0 && has(q, MOCK_ASK_WORDS.More));
  if (last?.name === ASK_TOOL_NAME.SearchLinks && wantsCards && !shown) {
    const items = itemsOf(searchResult);
    if (items.length === 0) return reply(NOT_FOUND);
    const total = numberOf(searchResult?.data, 'total');
    const cards = items.slice(0, MOCK_ASK.CardsMax);
    const lead = `I found ${total} ${total === 1 ? 'link' : 'links'}${topic === '' ? '' : ` about ${topic}`}.`;
    return reply(`${lead} `, [
      { name: ASK_TOOL_NAME.ShowLinks, input: { refs: cards.map((item) => item.ref) } },
    ]);
  }
  if (shown) return reply('');
  return reply(finalText(t, deep));
}
