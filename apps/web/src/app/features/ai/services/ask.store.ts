import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  ASK_ERROR_REASON,
  ASK_EVENT_TYPE,
  ASK_LIMIT,
  type AskEvent,
  type AskTurn,
} from '@shelfmark/contracts';
import type { Subscription } from 'rxjs';
import { expireSession } from '../../../core/auth/expire-session';
import { AI_API } from '../models/ai-api.const';
import type { AskEntry } from '../models/ask-entry.interface';
import { ASK_ENTRY_STATE } from '../models/ask-entry-state.const';
import type { AskState } from '../models/ask-state.interface';
import {
  applyAskEvent,
  endAskEntry,
  rateLimitAskEntry,
  stopAskEntry,
} from '../utils/apply-ask-event';
import { AiSettingsStore } from './ai-settings.store';

const initialState: AskState = { entries: [] };

/** The turns the server wrote, oldest first (only finished answers have one). */
function turnsOf(entries: readonly AskEntry[]): AskTurn[] {
  return entries.flatMap((entry) => (entry.turn === null ? [] : [entry.turn]));
}

/** The question as the API normalises it: trimmed, runs of white space collapsed. */
export function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/gu, ' ');
}

/**
 * The chat of one Ask panel (AI-4, ADR 0052 and 0055), provided by the panel's container: entries
 * stay in memory until it closes (nothing in storage), one question in flight. Each finished answer
 * keeps the turn the server wrote (`done.turn`); the last `ASK_LIMIT.HistoryTurnsMax` go back with
 * the next question, so follow-ups work. Errors and a Stop without `done` add no turn. Allowances
 * from the stream go to `AiSettingsStore`, so every "questions left" line follows. An `off` error
 * reloads the AI settings (the entry points then hide). A 429 shows the rate-limit line; a 401 ends
 * the session like the error interceptor does. Destroying the store aborts the stream.
 */
export const AskStore = signalStore(
  withState(initialState),
  withComputed(({ entries }) => ({
    /** A question is being answered: the composer is disabled and Stop shows. */
    streaming: computed(() => entries().some((entry) => entry.state === ASK_ENTRY_STATE.Streaming)),
    /** What the next question sends back: the last `ASK_LIMIT.HistoryTurnsMax` turns. */
    history: computed(() => turnsOf(entries()).slice(-ASK_LIMIT.HistoryTurnsMax)),
    /** Older turns no longer go with the next question (the quiet note). */
    historyTrimmed: computed(() => turnsOf(entries()).length > ASK_LIMIT.HistoryTurnsMax),
    /** The chat has a finished answer: the composer asks for a follow-up. */
    answered: computed(() => entries().some((entry) => entry.turn !== null)),
  })),
  withMethods((store) => {
    const api = inject(AI_API);
    const settings = inject(AiSettingsStore);
    const injector = inject(Injector);
    let subscription: Subscription | null = null;
    let nextId = 1;

    const update = (id: number, change: (entry: AskEntry) => AskEntry): void => {
      patchState(store, {
        entries: store.entries().map((entry) => (entry.id === id ? change(entry) : entry)),
      });
    };

    const onEvent = (id: number, event: AskEvent): void => {
      if (event.type === ASK_EVENT_TYPE.Meta || event.type === ASK_EVENT_TYPE.Done) {
        settings.askAllowanceSeen(event.allowance);
      } else if (event.type === ASK_EVENT_TYPE.Error) {
        if (event.allowance) {
          settings.askAllowanceSeen(event.allowance);
        }
        if (event.reason === ASK_ERROR_REASON.Off) {
          void settings.refresh();
        }
      }
      update(id, (entry) => applyAskEvent(entry, event));
    };

    const start = (id: number, question: string): void => {
      subscription = api.ask(question, store.history()).subscribe({
        next: (event) => onEvent(id, event),
        error: (error: unknown) => {
          subscription = null;
          const status = error instanceof HttpErrorResponse ? error.status : null;
          if (status === HttpStatusCode.TooManyRequests) {
            update(id, rateLimitAskEntry);
            return;
          }
          update(id, endAskEntry);
          if (status === HttpStatusCode.Unauthorized) {
            // `fetch` bypasses the error interceptor: the same session-end handling.
            expireSession(injector);
          }
        },
        complete: () => {
          subscription = null;
          update(id, endAskEntry);
        },
      });
    };

    const stop = (): void => {
      subscription?.unsubscribe();
      subscription = null;
      patchState(store, { entries: store.entries().map(stopAskEntry) });
    };

    return {
      /**
       * Asks `question` (normalised; ignored when too short or long, or while another is in
       * flight). Answers whether it was sent.
       */
      ask(question: string): boolean {
        const text = normalizeQuestion(question);
        if (
          store.streaming() ||
          text.length < ASK_LIMIT.QuestionMin ||
          text.length > ASK_LIMIT.QuestionMax
        ) {
          return false;
        }
        const id = nextId++;
        const entry: AskEntry = {
          id,
          question: text,
          state: ASK_ENTRY_STATE.Streaming,
          segments: [],
          sources: [],
          sourcesKnown: false,
          notFound: false,
          truncated: false,
          reason: null,
          allowance: null,
          activity: null,
          steps: [],
          cards: [],
          turn: null,
        };
        patchState(store, { entries: [...store.entries(), entry] });
        start(id, text);
        return true;
      },

      /** Stop: the request is aborted; what arrived stays. */
      stop,

      /** "Try again" on an entry that was not counted: asked again in place. */
      retry(id: number): void {
        const entry = store.entries().find((candidate) => candidate.id === id);
        if (!entry || entry.state !== ASK_ENTRY_STATE.Error || store.streaming()) {
          return;
        }
        update(id, (current) => ({
          ...current,
          state: ASK_ENTRY_STATE.Streaming,
          segments: [],
          reason: null,
          allowance: null,
          activity: null,
          steps: [],
          cards: [],
        }));
        start(id, entry.question);
      },

      /** ✎ "New conversation": stops and forgets the chat, history included. */
      reset(): void {
        stop();
        patchState(store, { entries: [] });
      },
    };
  }),
  withHooks({
    onDestroy(store) {
      store.stop();
    },
  }),
);
