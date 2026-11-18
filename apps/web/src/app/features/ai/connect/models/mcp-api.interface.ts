import type {
  CreateMcpTokenRequest,
  CreateMcpTokenResponse,
  McpTokensResponse,
} from '@shelfmark/contracts';
import type { Observable } from 'rxjs';

/** Seam for the personal MCP token endpoints (#395): list, create (the secret answered once), revoke. */
export interface McpApi {
  /** `GET /api/mcp/tokens`: whether the account can connect an assistant, and its tokens. */
  list(): Observable<McpTokensResponse>;
  /** `POST /api/mcp/tokens`: 403 for demo or non-Pro, 409 at the token limit. */
  create(request: CreateMcpTokenRequest): Observable<CreateMcpTokenResponse>;
  /** `DELETE /api/mcp/tokens/:id`: the token stops working at once; 404 when unknown. */
  revoke(id: string): Observable<void>;
}
