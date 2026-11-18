import type { JsonRpcId } from './json-rpc-id.type';

/** One JSON-RPC 2.0 answer: a result, or an error (with `id: null` when the id could not be read). */
export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: Record<string, unknown> }
  | { jsonrpc: '2.0'; id: JsonRpcId | null; error: { code: number; message: string } };
