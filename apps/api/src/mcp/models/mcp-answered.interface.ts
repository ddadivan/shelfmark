import type { JsonRpcResponse } from './json-rpc-response.type';

/** A JSON-RPC answer plus what may be logged about it (never arguments or results). */
export interface McpAnswered {
  response: JsonRpcResponse;
  /** A known tool name, or a placeholder for an unknown one. */
  tool?: string;
  /** Items the tool returned. */
  count?: number;
}
