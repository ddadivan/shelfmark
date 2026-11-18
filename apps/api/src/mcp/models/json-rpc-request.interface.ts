import type { JsonRpcId } from './json-rpc-id.type';

/** A parsed JSON-RPC request: an id, a method and the params object (`{}` when absent). */
export interface JsonRpcRequest {
  id: JsonRpcId;
  method: string;
  params: Record<string, unknown>;
}
