import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  AI_TIER,
  MCP_ERROR_MESSAGE,
  MCP_LIMIT,
  MCP_TOKEN_PREFIX,
  type CreateMcpTokenRequest,
  type CreateMcpTokenResponse,
  type McpTokenSummary,
  type McpTokensResponse,
} from '@shelfmark/contracts';
import { defer, delay, type Observable, of, throwError } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { MOCK_LATENCY_MS } from '../../../links/models/mock-latency.const';
import { readMockAiAccount } from '../../mock/mock-ai-account';
import { MOCK_MCP_SECRET_MARKER } from './models/mock-mcp-secret-marker.const';
import { MOCK_MCP_STORAGE_KEY } from './models/mock-mcp-storage-key.const';
import type { McpApi } from '../models/mcp-api.interface';

/** Characters of the random part of a real token (32 bytes, base64url). */
const SECRET_LENGTH = 43;

function isSummary(value: unknown): value is McpTokenSummary {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Record<keyof McpTokenSummary, unknown>>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.last4 === 'string' &&
    typeof candidate.includeNotes === 'boolean' &&
    typeof candidate.createdAt === 'string' &&
    (candidate.lastUsedAt === null || typeof candidate.lastUsedAt === 'string') &&
    typeof candidate.callsThisWeek === 'number'
  );
}

/** A fake secret shaped like a real one: the prefix, then `mock` and base64url characters. */
function newSecret(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(SECRET_LENGTH));
  const random = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${MCP_TOKEN_PREFIX}${MOCK_MCP_SECRET_MARKER}${random}`.slice(
    0,
    MCP_TOKEN_PREFIX.length + SECRET_LENGTH,
  );
}

function httpError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { statusCode: status, message } });
}

/**
 * `McpApi` like the real API: available for a signed-in account that is not the demo and whose
 * mock AI tier is not Free (`sm-mock-ai`), at most `MCP_LIMIT.TokensPerUserMax` tokens (409), names
 * trimmed to 1–`NameMax` characters (400), unknown ids 404. The summaries live in `localStorage`
 * (`MOCK_MCP_STORAGE_KEY`) so a reload keeps them; the secret is only in the create answer.
 */
@Service()
export class MockMcpApi implements McpApi {
  private readonly auth = inject(AuthStore);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage;

  list(): Observable<McpTokensResponse> {
    return this.answer(() => ({ available: this.available(), items: this.records() }));
  }

  create(request: CreateMcpTokenRequest): Observable<CreateMcpTokenResponse> {
    return this.answer(() => {
      if (this.auth.user()?.isDemo) {
        throw httpError(HttpStatusCode.Forbidden, MCP_ERROR_MESSAGE.DemoUser);
      }
      if (!this.available()) {
        throw httpError(HttpStatusCode.Forbidden, MCP_ERROR_MESSAGE.NotAvailable);
      }
      const name = request.name.trim();
      if (name === '' || name.length > MCP_LIMIT.NameMax) {
        throw httpError(HttpStatusCode.BadRequest, 'Invalid name');
      }
      const records = this.records();
      if (records.length >= MCP_LIMIT.TokensPerUserMax) {
        throw httpError(HttpStatusCode.Conflict, MCP_ERROR_MESSAGE.LimitReached);
      }
      const secret = newSecret();
      const token: McpTokenSummary = {
        id: globalThis.crypto.randomUUID(),
        name,
        last4: secret.slice(-4),
        includeNotes: request.includeNotes,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        callsThisWeek: 0,
      };
      this.save([token, ...records]);
      return { token, secret };
    });
  }

  revoke(id: string): Observable<void> {
    return this.answer(() => {
      const records = this.records();
      if (!records.some((record) => record.id === id)) {
        throw httpError(HttpStatusCode.NotFound, MCP_ERROR_MESSAGE.NotFound);
      }
      this.save(records.filter((record) => record.id !== id));
    });
  }

  private available(): boolean {
    const demo = this.auth.user()?.isDemo ?? false;
    return !demo && readMockAiAccount(this.storage, demo, Date.now()).tier !== AI_TIER.Free;
  }

  private answer<T>(run: () => T): Observable<T> {
    return defer(() => {
      try {
        return of(run());
      } catch (error) {
        return throwError(() => error);
      }
    }).pipe(delay(MOCK_LATENCY_MS.List));
  }

  private records(): McpTokenSummary[] {
    try {
      const parsed: unknown = JSON.parse(this.storage?.getItem(MOCK_MCP_STORAGE_KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isSummary) : [];
    } catch {
      return [];
    }
  }

  private save(records: readonly McpTokenSummary[]): void {
    try {
      this.storage?.setItem(MOCK_MCP_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Storage unavailable: the change lasts until the next read.
    }
  }
}
