import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  ASK_PERIOD,
  type AskErrorReason,
  type AskEvent,
  type AskSource,
  type LinkResponse,
} from '@shelfmark/contracts';
import { defer, Observable, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { linkHost } from '../../links/utils/link-view';
import { MockAiData } from './mock-ai-data';
import { normalizeMeaningQuery } from './mock-ai-meaning';
import { nextUtcDayStart } from './mock-ask-allowance';
import { mockAskAnswer, mockAskCitations } from './mock-ask-answer';
import { meaningDoc, meaningStems, rankByMeaning } from './mock-meaning';
import { MOCK_AI_URL_MARKER } from './models/mock-ai-url-marker.const';
import { MOCK_ASK } from './models/mock-ask.const';
import { MOCK_ASK_QUESTION_WORDS } from './models/mock-ask-question-words.const';
import type { MockAskStep } from './models/mock-ask-step.interface';

/** A control character (C0 or DEL), which the API's DTO refuses. */
function hasControl(text: string): boolean {
  return [...text].some((char) => {
    const code = char.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}
const TRIGGERS: readonly string[] = [
  MOCK_AI_URL_MARKER.Fail,
  MOCK_AI_URL_MARKER.Refuse,
  MOCK_AI_URL_MARKER.Quota,
  MOCK_ASK.SlowMarker,
  MOCK_ASK.CutMarker,
  MOCK_ASK.NotFoundMarker,
];

/**
 * `POST /api/ai/ask` over the mock library (mock builds only), in the API's event order (plan
 * 10.1): `off`, `busy` (one question at a time), no sources → `done` `notFound` (not counted),
 * `quota`, then `meta`, the words every `MOCK_ASK.ChunkMs` and `done`. Retrieval ranks the mock
 * library like search by meaning (title, tags, summary). A question with a trigger (`ai-fail`,
 * `ai-refuse`, `ai-quota`, `ai-slow`, `ai-cut`, `sourdough`) falls back to the first links when
 * nothing matches, so the trigger always reaches the "model". Failures before text are refunded;
 * a Stop before any text too.
 */
@Service()
export class MockAiAsk {
  private readonly data = inject(MockAiData);
  private readonly library = inject(MockLibraryData);
  private inFlight = false;

  ask(question: string): Observable<AskEvent> {
    return defer(() => this.start(normalizeMeaningQuery(question)));
  }

  private start(question: string): Observable<AskEvent> {
    if (
      question.length < ASK_LIMIT.QuestionMin ||
      question.length > ASK_LIMIT.QuestionMax ||
      hasControl(question)
    ) {
      return throwError(() => mockHttpError(HttpStatusCode.BadRequest, ['question is invalid']));
    }
    const { settings } = this.data;
    if (!settings.enabled || !settings.ask) {
      return this.stream([this.error(ASK_ERROR_REASON.Off, MOCK_ASK.MetaMs, false)]);
    }
    if (this.inFlight) {
      return this.stream([this.error(ASK_ERROR_REASON.Busy, MOCK_ASK.MetaMs)]);
    }
    const sources = this.retrieve(question);
    if (sources.length === 0) {
      return this.stream([this.done([], [], false, MOCK_ASK.MetaMs)]);
    }
    const lower = question.toLowerCase();
    if (lower.includes(MOCK_AI_URL_MARKER.Quota)) {
      const allowance = {
        questionsLeft: 0,
        period: ASK_PERIOD.Day,
        resetsOn: nextUtcDayStart(Date.now()),
      };
      return this.stream([
        {
          afterMs: MOCK_ASK.MetaMs,
          event: {
            type: ASK_EVENT_TYPE.Error,
            reason: ASK_ERROR_REASON.Quota,
            counted: false,
            allowance,
          },
        },
      ]);
    }
    if (this.data.askAllowance().questionsLeft === 0) {
      return this.stream([this.error(ASK_ERROR_REASON.Quota, MOCK_ASK.MetaMs)]);
    }
    return this.answer(question, lower, sources);
  }

  private answer(question: string, lower: string, sources: LinkResponse[]): Observable<AskEvent> {
    this.data.countQuestion(1);
    const meta: MockAskStep = {
      afterMs: MOCK_ASK.MetaMs,
      event: {
        type: ASK_EVENT_TYPE.Meta,
        allowance: this.data.askAllowance(),
        retrieved: sources.length,
      },
    };
    const failure = lower.includes(MOCK_AI_URL_MARKER.Fail)
      ? { reason: ASK_ERROR_REASON.Unavailable, afterMs: MOCK_ASK.ChunkMs }
      : lower.includes(MOCK_AI_URL_MARKER.Refuse)
        ? { reason: ASK_ERROR_REASON.Rejected, afterMs: MOCK_ASK.ChunkMs }
        : lower.includes(MOCK_ASK.SlowMarker)
          ? { reason: ASK_ERROR_REASON.Unavailable, afterMs: MOCK_ASK.FirstTokenMs }
          : null;
    if (failure) {
      return this.stream([meta, this.error(failure.reason, failure.afterMs)], true);
    }
    const answer = mockAskAnswer(
      question,
      sources.map((link, index) => ({
        n: index + 1,
        title: link.title,
        host: linkHost(link.url),
        tags: link.tags,
        summary: link.summary,
      })),
    );
    const { chunks, cited } = mockAskCitations(answer, sources.length);
    const cut = lower.includes(MOCK_ASK.CutMarker);
    const sent = cut ? chunks.slice(0, MOCK_ASK.CutAfterChunks) : chunks;
    const shown = cut
      ? [...new Set(sent.flat().flatMap((e) => (e.type === ASK_EVENT_TYPE.Cite ? [e.n] : [])))]
      : cited.map((_, index) => index + 1);
    const steps: MockAskStep[] = [meta];
    for (const chunk of sent) {
      chunk.forEach((event, index) =>
        steps.push({ afterMs: index === 0 ? MOCK_ASK.ChunkMs : 0, event }),
      );
    }
    const linked = shown.flatMap((n) => {
      const link = sources[(cited[n - 1] ?? 0) - 1];
      return link ? [{ n, link: this.library.linkView(link) }] : [];
    });
    steps.push(this.done(linked, shown, cut, MOCK_ASK.ChunkMs));
    return this.stream(steps, true);
  }

  /** The links the "model" gets: closest by meaning, at most `ContextLinksMax`. */
  private retrieve(question: string): LinkResponse[] {
    const stems = new Set(
      [...meaningStems(question)].filter((stem) => !MOCK_ASK_QUESTION_WORDS.has(stem)),
    );
    const includeNotes = this.data.settings.includeNotes;
    const docs = this.library.links.map((link) =>
      meaningDoc(link, this.library.folderName(link.folderId), includeNotes),
    );
    const found = rankByMeaning(stems, docs, ASK_LIMIT.ContextLinksMax).map(({ doc }) => doc.link);
    if (found.length > 0 || !TRIGGERS.some((trigger) => question.toLowerCase().includes(trigger))) {
      return found;
    }
    return this.library.links.slice(0, MOCK_ASK.TemplateSourcesMax);
  }

  private error(reason: AskErrorReason, afterMs: number, withAllowance = true): MockAskStep {
    return {
      afterMs,
      event: {
        type: ASK_EVENT_TYPE.Error,
        reason,
        counted: false,
        allowance: withAllowance ? this.data.askAllowance() : null,
      },
    };
  }

  private done(
    sources: AskSource[],
    cites: readonly number[],
    truncated: boolean,
    afterMs: number,
  ): MockAskStep {
    return {
      afterMs,
      event: {
        type: ASK_EVENT_TYPE.Done,
        sources,
        notFound: cites.length === 0,
        truncated,
        allowance: this.data.askAllowance(),
      },
    };
  }

  /**
   * Sends `steps` on timers. With `counted` the question was counted at `meta`: an `error` refunds
   * it, and so does unsubscribing (Stop) before any text arrived. The allowance in later events is
   * read when they are sent.
   */
  private stream(steps: readonly MockAskStep[], counted = false): Observable<AskEvent> {
    return new Observable<AskEvent>((subscriber) => {
      if (counted) {
        this.inFlight = true;
      }
      let index = 0;
      let texted = false;
      let finished = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const next = (): void => {
        const step = steps[index];
        if (!step) {
          finished = true;
          this.inFlight &&= !counted;
          subscriber.complete();
          return;
        }
        timer = setTimeout(() => {
          index++;
          const event = this.fresh(step.event, counted);
          texted ||= event.type === ASK_EVENT_TYPE.Text;
          subscriber.next(event);
          next();
        }, step.afterMs);
      };
      next();
      return () => {
        clearTimeout(timer);
        if (!finished && counted) {
          this.inFlight = false;
          if (!texted) {
            this.data.countQuestion(-1);
          }
        }
      };
    });
  }

  /** An `error` after `meta` refunds the question; `done` and `error` carry the current allowance. */
  private fresh(event: AskEvent, counted: boolean): AskEvent {
    if (event.type === ASK_EVENT_TYPE.Error && counted) {
      this.data.countQuestion(-1);
      return { ...event, allowance: this.data.askAllowance() };
    }
    if (event.type === ASK_EVENT_TYPE.Done) {
      return { ...event, allowance: this.data.askAllowance() };
    }
    return event;
  }
}
