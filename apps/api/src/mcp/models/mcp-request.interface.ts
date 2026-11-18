import type { Request } from 'express';
import type { McpPrincipal } from './mcp-principal.interface';

/** A request on `POST /api/mcp` after `McpTokenGuard`: `mcp` is set, `auth` (the session) never is. */
export interface McpRequest extends Request {
  mcp?: McpPrincipal;
}
