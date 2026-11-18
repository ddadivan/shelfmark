import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { ASK_ERROR_REASON, ASK_EVENT_TYPE, ASK_LIMIT, type AskEvent } from '@shelfmark/contracts';
import type { Subscription } from 'rxjs';
import { AI_API } from '../models/ai-api.const';
import type { AskEntry } from '../models/ask-entry.interface';
import { ASK_ENTRY_STATE } from '../models/ask-entry-state.const';
import type { AskState } from '../models/ask-state.interface';
import { applyAskEvent, endAskEntry, stopAskEntry } from '../utils/apply-ask-event';
import { AiSettingsStore } from './ai-settings.store';

const initialState: AskState = { entries: [] };

/** The question as the API normalises it: trimmed, runs of white space collapsed. */
export function normalizeQuestion(question: string): string {
  return question.trim().replace(/\s+/gu, ' ');
}

/**
 * The conversation of one Ask panel (AI-4, ADR 0051), provided by the panel's container: entries
 * stay in memory until it closes, each question is single-turn, one question in flight. Allowances
 * from the stream go to `AiSettingsStore`, so every "questions left" line follows. An `off` error
 * reloads the AI settings (the entry points then hide). Destroying the store aborts the stream.
 */
export const AskStore = signalStore(
  withState(initialState),
  withComputed(({ entries }) => ({
    /** A question is being answered: the composer is disabled and Stop shows. */
    streaming: computed(() => entries().some((entry) => entry.state === ASK_ENTRY_STATE.Streaming)),
  })),
  withMethods((store) => {
    const api = inject(AI_API);
    const settings = inject(AiSettingsStore);
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
      subscription = api.ask(question).subscribe({
        next: (event) => onEvent(id, event),
        error: () => {
          subscription = null;
          update(id, endAskEntry);
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
          notFound: false,
          truncated: false,
          reason: null,
          allowance: null,
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
        }));
        start(id, entry.question);
      },

      /** "New question": stops and forgets the conversation. */
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
