import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  MCP_ENDPOINT,
  type CreateMcpTokenRequest,
  type CreateMcpTokenResponse,
  type McpTokensResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';
import { skipErrorToast } from '../../../../core/api/skip-error-toast';
import type { McpApi } from '../models/mcp-api.interface';

/**
 * `McpApi` over `MCP_ENDPOINT`. Errors are shown by the Connect your assistant group and the create
 * dialog, so every call skips the global toast. The create response carries the secret: it goes
 * straight to the caller and is never logged or kept here.
 */
@Service()
export class HttpMcpApi implements McpApi {
  private readonly http = inject(HttpClient);

  list(): Observable<McpTokensResponse> {
    return this.http.get<McpTokensResponse>(MCP_ENDPOINT.Tokens, { context: skipErrorToast() });
  }

  create(request: CreateMcpTokenRequest): Observable<CreateMcpTokenResponse> {
    return this.http.post<CreateMcpTokenResponse>(MCP_ENDPOINT.Tokens, request, {
      context: skipErrorToast(),
    });
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(MCP_ENDPOINT.Token.replace(':id', encodeURIComponent(id)), {
      context: skipErrorToast(),
    });
  }
}
