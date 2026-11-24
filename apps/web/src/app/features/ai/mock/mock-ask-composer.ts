import {
  ASK_ACTIVITY_PHASE,
  ASK_DEPTH,
  ASK_EVENT_TYPE,
  ASK_PERIOD,
  type AskActivity,
  type AskDepth,
  type AskEvent,
  type AskSearchFilter,
  type AskSource,
  type LinkResponse,
} from '@shelfmark/contracts';
import { MOCK_ASK } from './models/mock-ask.const';
import type { MockAskStep } from './models/mock-ask-step.interface';

/**
 * Builds a mock Ask stream like the API's loop and citation stream: activity steps, word chunks
 * with citations, cards sharing the citation numbering, and the closing `done` with the live
 * sources and the turn the web sends back. `[link:<id>]` in a text marks a citation.
 */
export class MockAskComposer {
  private readonly steps: MockAskStep[] = [];
  private readonly numbers = new Map<string, number>();
  private readonly links = new Map<string, LinkResponse>();
  private answer = '';
  private words = 0;

  constructor(private readonly view: (link: LinkResponse) => LinkResponse) {}

  get wordCount(): number {
    return this.words;
  }

  activity(activity: AskActivity, found: number | null, ms: number = MOCK_ASK.ToolMs): this {
    this.steps.push({
      afterMs: 0,
      event: {
        type: ASK_EVENT_TYPE.Activity,
        activity,
        phase: ASK_ACTIVITY_PHASE.Start,
        found: null,
      },
    });
    this.steps.push({
      afterMs: ms,
      event: { type: ASK_EVENT_TYPE.Activity, activity, phase: ASK_ACTIVITY_PHASE.End, found },
    });
    return this;
  }

  private number(link: LinkResponse): number {
    const known = this.numbers.get(link.id);
    if (known !== undefined) {
      return known;
    }
    const next = this.numbers.size + 1;
    this.numbers.set(link.id, next);
    this.links.set(link.id, link);
    return next;
  }

  /** Words one by one; `{n:<index>}` cites `cited[index]`. */
  text(text: string, cited: readonly LinkResponse[] = [], limit = Number.POSITIVE_INFINITY): this {
    for (const word of text.match(/\S+\s*/gu) ?? []) {
      if (this.words >= limit) {
        return this;
      }
      const events: AskEvent[] = [];
      let last = 0;
      for (const match of word.matchAll(/\{n:(\d+)\}/gu)) {
        const link = cited[Number(match[1])];
        if (match.index > last) {
          const piece = word.slice(last, match.index);
          events.push({ type: ASK_EVENT_TYPE.Text, text: piece });
          this.answer += piece;
        }
        if (link) {
          const n = this.number(link);
          events.push({ type: ASK_EVENT_TYPE.Cite, n });
          this.answer += `[${n}]`;
        }
        last = match.index + match[0].length;
      }
      if (last < word.length) {
        const piece = word.slice(last);
        events.push({ type: ASK_EVENT_TYPE.Text, text: piece });
        this.answer += piece;
      }
      events.forEach((event, index) =>
        this.steps.push({ afterMs: index === 0 ? MOCK_ASK.ChunkMs : 0, event }),
      );
      this.words += 1;
    }
    return this;
  }

  cards(links: readonly LinkResponse[], total: number, search: AskSearchFilter | null): this {
    const items: AskSource[] = links.map((link) => ({
      n: this.number(link),
      link: this.view(link),
    }));
    if (items.length > 0) {
      this.steps.push({
        afterMs: MOCK_ASK.ChunkMs,
        event: {
          type: ASK_EVENT_TYPE.Links,
          items,
          total: total > items.length ? total : null,
          search: total > items.length ? search : null,
        },
      });
    }
    return this;
  }

  error(event: AskEvent, afterMs: number): MockAskStep[] {
    return [...this.steps, { afterMs, event }];
  }

  /** The steps and the closing `done` (the allowance is filled in when it is sent). */
  done(
    question: string,
    options: { notFound?: boolean; truncated?: boolean; depth?: AskDepth } = {},
  ): MockAskStep[] {
    const sources: AskSource[] = [...this.numbers.entries()].flatMap(([id, n]) => {
      const link = this.links.get(id);
      return link ? [{ n, link: this.view(link) }] : [];
    });
    return [
      ...this.steps,
      {
        afterMs: MOCK_ASK.ChunkMs,
        event: {
          type: ASK_EVENT_TYPE.Done,
          sources,
          notFound: options.notFound ?? false,
          truncated: options.truncated ?? false,
          allowance: { questionsLeft: 0, period: ASK_PERIOD.Month, resetsOn: '' },
          turn: {
            question,
            answer: this.answer,
            links: sources.map((s) => ({ n: s.n, id: s.link.id })),
          },
          depth: options.depth ?? ASK_DEPTH.Quick,
          conversationId: null,
        },
      },
    ];
  }
}
