import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MCP_LIMIT, type CreateMcpTokenRequest } from '@shelfmark/contracts';
import { firstValueFrom } from 'rxjs';
import { MCP_API } from '../models/mcp-api.const';
import type { McpCreateResult } from '../models/mcp-create-result.type';
import { MCP_TOKEN_ERROR } from '../models/mcp-token-error.const';
import type { McpTokenError } from '../models/mcp-token-error.type';
import type { McpTokensState } from '../models/mcp-tokens-state.interface';

const initialState: McpTokensState = {
  available: false,
  items: [],
  loaded: false,
  loading: false,
  loadFailed: false,
  revokingId: null,
};

function errorOf(error: unknown): McpTokenError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === HttpStatusCode.Conflict) return MCP_TOKEN_ERROR.Limit;
    if (error.status === HttpStatusCode.Forbidden) return MCP_TOKEN_ERROR.NotAvailable;
  }
  return MCP_TOKEN_ERROR.Save;
}

/**
 * The personal MCP tokens of Settings › AI › Connect your assistant (#395): load, create, revoke.
 * The secret of a new token is handed to the caller (the create dialog) and never kept here.
 */
export const McpTokensStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ items }) => ({
    empty: computed(() => items().length === 0),
    limitReached: computed(() => items().length >= MCP_LIMIT.TokensPerUserMax),
  })),
  withMethods((store, api = inject(MCP_API)) => ({
    async load(): Promise<void> {
      patchState(store, { loading: true, loadFailed: false });
      try {
        const { available, items } = await firstValueFrom(api.list());
        patchState(store, { available, items, loaded: true, loading: false });
      } catch {
        patchState(store, { loading: false, loadFailed: true });
      }
    },

    async create(request: CreateMcpTokenRequest): Promise<McpCreateResult> {
      try {
        const response = await firstValueFrom(api.create(request));
        patchState(store, { items: [response.token, ...store.items()] });
        return { ok: true, response };
      } catch (error) {
        const reason = errorOf(error);
        if (reason === MCP_TOKEN_ERROR.NotAvailable) patchState(store, { available: false });
        return { ok: false, error: reason };
      }
    },

    /** Revokes a token; a 404 (already gone) also drops it from the list. */
    async revoke(id: string): Promise<boolean> {
      if (store.revokingId() !== null) return false;
      patchState(store, { revokingId: id });
      try {
        await firstValueFrom(api.revoke(id), { defaultValue: undefined });
      } catch (error) {
        const gone = error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
        if (!gone) {
          patchState(store, { revokingId: null });
          return false;
        }
      }
      patchState(store, {
        items: store.items().filter((item) => item.id !== id),
        revokingId: null,
      });
      return true;
    },
  })),
);
