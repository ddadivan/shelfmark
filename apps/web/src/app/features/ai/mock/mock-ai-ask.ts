import { HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  ASK_PERIOD,
  type AskErrorReason,
  type AskEvent,
  type AskTurn,
  type LinkResponse,
} from '@shelfmark/contracts';
import { defer, Observable, throwError } from 'rxjs';
import { mockHttpError } from '../../../core/api/mock-http-error';
import { MockLibraryData } from '../../links/mock/mock-library-data';
import { MockAiData } from './mock-ai-data';
import { normalizeMeaningQuery } from './mock-ai-meaning';
import { nextUtcDayStart } from './mock-ask-allowance';
import { planMockAsk } from './mock-ask-plan';
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
  MOCK_ASK.LoopMarker,
];

/**
 * `POST /api/ai/ask` over the mock library (mock builds only), in the API's event order (ADR 0055):
 * `off`, `busy` (one question at a time), `quota`, then `meta`, the planned activities, words,
 * cards and `done` with the turn (`planMockAsk`). The history the web sends back is read like the
 * API reads it: only links still in the mock library count. Retrieval ranks the mock library like
 * search by meaning (title, tags, summary); a question with a trigger falls back to the first links
 * when nothing matches. Failures before text are refunded; a Stop before any text too.
 */
@Service()
export class MockAiAsk {
  private readonly data = inject(MockAiData);
  private readonly library = inject(MockLibraryData);
  private inFlight = false;

  ask(question: string, history: readonly AskTurn[] = []): Observable<AskEvent> {
    return defer(() => this.start(normalizeMeaningQuery(question), history));
  }

  private start(question: string, history: readonly AskTurn[]): Observable<AskEvent> {
    if (
      question.length < ASK_LIMIT.QuestionMin ||
      question.length > ASK_LIMIT.QuestionMax ||
      hasControl(question) ||
      history.length > ASK_LIMIT.HistoryTurnsMax
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
    return this.answer(question, history);
  }

  private answer(question: string, history: readonly AskTurn[]): Observable<AskEvent> {
    this.data.countQuestion(1);
    const meta: MockAskStep = {
      afterMs: MOCK_ASK.MetaMs,
      event: { type: ASK_EVENT_TYPE.Meta, allowance: this.data.askAllowance() },
    };
    const plan = planMockAsk(question, history, {
      links: this.library.links,
      rank: (text) => this.retrieve(text),
      view: (link) => this.library.linkView(link),
    });
    return this.stream([meta, ...plan.steps], true);
  }

  /** What the mock search finds: closest by meaning, at most `MOCK_ASK.SearchMax`. */
  private retrieve(question: string): LinkResponse[] {
    const stems = new Set(
      [...meaningStems(question)].filter((stem) => !MOCK_ASK_QUESTION_WORDS.has(stem)),
    );
    const includeNotes = this.data.settings.includeNotes;
    const docs = this.library.links.map((link) =>
      meaningDoc(link, this.library.folderName(link.folderId), includeNotes),
    );
    const found = rankByMeaning(stems, docs, MOCK_ASK.SearchMax).map(({ doc }) => doc.link);
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
