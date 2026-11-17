import type { JsonRpcResponse } from './json-rpc-response.type';

/** What `POST /api/mcp` sends: 200 with a JSON-RPC answer, or 202 without a body. */
export interface McpHttpAnswer {
  status: number;
  body: JsonRpcResponse | null;
}
