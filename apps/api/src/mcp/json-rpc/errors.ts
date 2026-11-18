import type { JsonRpcId } from '../models/json-rpc-id.type';
import type { JsonRpcResponse } from '../models/json-rpc-response.type';

const JSON_RPC_VERSION = '2.0';

/** A JSON-RPC error answer. The message is a fixed text, never user input or internal details. */
export function jsonRpcError(id: JsonRpcId | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: JSON_RPC_VERSION, id, error: { code, message } };
}

/** A JSON-RPC result answer. */
export function jsonRpcResult(id: JsonRpcId, result: Record<string, unknown>): JsonRpcResponse {
  return { jsonrpc: JSON_RPC_VERSION, id, result };
}
