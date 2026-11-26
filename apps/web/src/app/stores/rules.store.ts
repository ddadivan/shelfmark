import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject, Injector } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  findMatchingRule,
  RULE_ERROR_MESSAGE,
  RULE_LIMIT,
  type CreateRuleRequest,
  type RuleMatchesResponse,
  type RuleResponse,
  type UpdateRuleRequest,
} from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { hasApiMessage } from '../core/api/api-error';
import { withSessionLoad } from './features/with-session-load';
import { RULES_API } from '../features/rules/models/rules-api.const';
import { RULE_OUTCOME } from './models/rule-outcome.const';
import type { RuleOutcome } from './models/rule-outcome.type';
import type { RuleSaveResult } from './models/rule-save-result.interface';
import type { RulesState } from './models/rules-state.interface';

const initialState: RulesState = { items: [], loaded: false, loading: false, error: false };

function byDomain(items: readonly RuleResponse[]): RuleResponse[] {
  return [...items].sort((a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));
}

function outcomeOf(error: unknown): RuleOutcome {
  if (hasApiMessage(error, RULE_ERROR_MESSAGE.DomainTaken)) {
    return RULE_OUTCOME.Taken;
  }
  if (hasApiMessage(error, RULE_ERROR_MESSAGE.LimitReached)) {
    return RULE_OUTCOME.Limit;
  }
  if (hasApiMessage(error, RULE_ERROR_MESSAGE.FolderNotFound)) {
    return RULE_OUTCOME.MissingFolder;
  }
  return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound
    ? RULE_OUTCOME.Missing
    : RULE_OUTCOME.Failed;
}

/**
 * The domain rules (`/api/rules`, #398), cached for the whole app: Settings › Library lists them,
 * the add-link form and the share page match a URL against them before saving (`matchFor`).
 * Create and edit wait for the server (the dialog shows the outcome); a delete hides the rule at
 * once and is sent when its Undo window ends. The session end forgets everything.
 */
export const RulesStore = signalStore(
  { providedIn: 'root' },
  withState<RulesState>(initialState),
  withSessionLoad<RulesState>(initialState),
  withComputed(({ items }) => ({
    atLimit: computed(() => items().length >= RULE_LIMIT.PerUserMax),
  })),
  withMethods((store) => {
    const injector = inject(Injector);
    const api = () => injector.get(RULES_API);

    async function fetchList(): Promise<void> {
      const started = store._epoch();
      patchState(store, { loading: true, error: false });
      try {
        const response = await firstValueFrom(api().list());
        if (started === store._epoch()) {
          patchState(store, { items: response.items, loaded: true, loading: false });
        }
      } catch {
        if (started === store._epoch()) {
          patchState(store, { loading: false, error: !store.loaded() });
        }
      }
    }

    function put(rule: RuleResponse): void {
      patchState(store, {
        items: byDomain([...store.items().filter((item) => item.id !== rule.id), rule]),
      });
    }

    return {
      /** Loads the rules once; a failure can be retried by calling again. */
      load(): Promise<void> {
        if (store.loaded()) {
          return Promise.resolve();
        }
        return store._dedupe(() => fetchList());
      },

      /** Re-reads the rules (a folder was deleted or restored). Only once loaded. */
      refresh(): Promise<void> {
        return store.loaded() ? fetchList() : Promise.resolve();
      },

      /** The rule a link with this URL would get on save, or `null` (also while not loaded). */
      matchFor(url: string): RuleResponse | null {
        return findMatchingRule(store.items(), url);
      },

      /** Adds a rule; waits for the server. */
      async create(request: CreateRuleRequest): Promise<RuleSaveResult> {
        if (store.atLimit()) {
          return { outcome: RULE_OUTCOME.Limit };
        }
        const started = store._epoch();
        try {
          const rule = await firstValueFrom(api().create(request));
          if (started === store._epoch()) {
            put(rule);
          }
          return { outcome: RULE_OUTCOME.Done, rule };
        } catch (error) {
          return { outcome: outcomeOf(error) };
        }
      },

      /** Changes a rule; waits for the server. */
      async update(id: string, request: UpdateRuleRequest): Promise<RuleSaveResult> {
        const started = store._epoch();
        try {
          const rule = await firstValueFrom(api().update(id, request));
          if (started === store._epoch()) {
            put(rule);
          }
          return { outcome: RULE_OUTCOME.Done, rule };
        } catch (error) {
          const outcome = outcomeOf(error);
          if (outcome === RULE_OUTCOME.Missing && started === store._epoch()) {
            patchState(store, { items: store.items().filter((item) => item.id !== id) });
          }
          return { outcome };
        }
      },

      /** Takes a rule out of the list at once (the delete waits for its Undo window). */
      hide(id: string): RuleResponse | null {
        const rule = store.items().find((item) => item.id === id) ?? null;
        if (rule) {
          patchState(store, { items: store.items().filter((item) => item.id !== id) });
        }
        return rule;
      },

      /** Puts a hidden rule back (Undo, or its delete failed). */
      putBack(rule: RuleResponse): void {
        put(rule);
      },

      /** Matches of "Apply to existing links"; `null` when the request fails. */
      async matches(id: string): Promise<RuleMatchesResponse | null> {
        try {
          return await firstValueFrom(api().matches(id));
        } catch {
          return null;
        }
      },

      /** Deletes a rule on the server; resolves false when that fails (a rule already gone is done). */
      async remove(id: string): Promise<boolean> {
        try {
          await firstValueFrom(api().remove(id));
          return true;
        } catch (error) {
          return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
        }
      },
    };
  }),
);
